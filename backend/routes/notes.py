import logging
import uuid
import time
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from ..models import Note
from ..db import SessionLocal
from .auth import user_required, limiter

notes = Blueprint("notes", __name__)

IDEMPOTENCY_CACHE = {}



def parse_uuid(val):
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    if isinstance(val, str):
        try:
            return uuid.UUID(val)
        except ValueError:
            return None
    return None


def parse_iso_datetime(dt_str):
    """Safely parse ISO datetime strings, handling 'Z' suffix and enforcing timezone awareness."""
    if not dt_str:
        return None
    try:
        clean_str = dt_str.strip()
        if clean_str.endswith("Z"):
            clean_str = clean_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def ensure_tz_aware(dt):
    """Ensure a datetime object is timezone aware (default UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@notes.route("/notes", methods=["GET"])
@user_required
def list_notes(user):
    """List notes for the authenticated user (supports optional pagination)."""
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    has_page_param = "page" in request.args

    db = SessionLocal()
    try:
        base_query = db.query(Note).filter(
            Note.user_id == user_id,
            Note.is_deleted.is_(False)
        )
        total = base_query.count()

        if not has_page_param:
            # Unpaginated fallback for legacy clients expecting full note list
            notes_list = base_query.all()
            return jsonify({
                "success": True,
                "data": [
                    {
                        "id": str(n.id),
                        "title": n.title,
                        "content": n.content,
                        "last_modified": n.last_modified.isoformat(),
                        "created_at": n.created_at.isoformat(),
                        "is_deleted": n.is_deleted,
                        "version": n.version
                    }
                    for n in notes_list
                ],
                "total": total
            }), 200

        try:
            page = int(request.args.get("page", 1))
            if page < 1:
                page = 1
        except (ValueError, TypeError):
            page = 1

        try:
            per_page = int(request.args.get("per_page", 50))
            per_page = min(max(1, per_page), 100)  # Bound per_page between 1 and 100
        except (ValueError, TypeError):
            per_page = 50

        notes_list = base_query.offset((page - 1) * per_page).limit(per_page).all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 0

        return jsonify({
            "success": True,
            "data": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "content": n.content,
                    "last_modified": n.last_modified.isoformat(),
                    "created_at": n.created_at.isoformat(),
                    "is_deleted": n.is_deleted,
                    "version": n.version
                }
                for n in notes_list
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }), 200
    except Exception as e:
        logging.exception("Error listing notes")
        return jsonify({"success": False, "message": "Failed to fetch notes"}), 500
    finally:
        db.close()


MAX_BATCH_SIZE = 100
MAX_TITLE_LENGTH = 500
MAX_CONTENT_LENGTH = 1_000_000


@notes.route("/notes", methods=["POST"])
@user_required
@limiter.limit("30 per minute")
def create_note(user):
    """Create a new note."""
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    data = request.get_json() or {}
    
    # Pre-strip content for basic empty check before pydantic
    content = data.get("content", "")
    if isinstance(content, str) and not content.strip():
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400
        
    try:
        note_data = NoteCreate(**data)
    except ValidationError as e:
        for err in e.errors():
            if err["loc"][0] == "title" and err["type"] == "value_error.any_str.max_length":
                return jsonify({"success": False, "message": f"Title exceeds maximum length of 500 characters"}), 400
            if err["loc"][0] == "content" and err["type"] == "value_error.any_str.max_length":
                return jsonify({"success": False, "message": "Content exceeds maximum limit of 1MB"}), 400
        return jsonify({"success": False, "message": str(e)}), 400

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        note = Note(
            user_id=user_id,
            title=note_data.title,
            content=note_data.content,
            last_modified=now,
            created_at=now,
            is_deleted=False
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return jsonify({
            "success": True,
            "data": {
                "id": str(note.id),
                "title": note.title,
                "content": note.content,
                "last_modified": note.last_modified.isoformat(),
                "created_at": note.created_at.isoformat(),
                "is_deleted": note.is_deleted,
                "version": note.version
            }
        }), 201
    except Exception as e:
        db.rollback()
        logging.exception("Error creating note")
        return jsonify({"success": False, "message": "Failed to create note"}), 500
    finally:
        db.close()


@notes.route("/notes/<note_id>", methods=["PUT"])
@user_required
@limiter.limit("30 per minute")
def update_note(user, note_id):
    """Update a note."""
    user_id = parse_uuid(user.get("id"))
    note_uuid = parse_uuid(note_id)
    if not user_id or not note_uuid:
        return jsonify({"success": False, "message": "Invalid ID format"}), 400

    data = request.get_json() or {}
    client_version = data.get("version")
    
    # Pre-strip content for basic empty check before pydantic
    content = data.get("content", "")
    if isinstance(content, str) and not content.strip():
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400
        
    try:
        note_data = NoteUpdate(**data)
    except ValidationError as e:
        for err in e.errors():
            if err["loc"][0] == "title" and err["type"] == "value_error.any_str.max_length":
                return jsonify({"success": False, "message": f"Title exceeds maximum length of 500 characters"}), 400
            if err["loc"][0] == "content" and err["type"] == "value_error.any_str.max_length":
                return jsonify({"success": False, "message": "Content exceeds maximum limit of 1MB"}), 400
        return jsonify({"success": False, "message": str(e)}), 400

    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_uuid,
            Note.user_id == user_id,
            Note.is_deleted.is_(False)
        ).first()

        if not note:
            return jsonify({"success": False, "message": "Note not found"}), 404

        if client_version is not None and client_version < note.version:
            return jsonify({
                "success": False,
                "message": "Conflict: Stale version",
                "server_note": {
                    "id": str(note.id),
                    "title": note.title,
                    "content": note.content,
                    "last_modified": note.last_modified.isoformat(),
                    "created_at": note.created_at.isoformat(),
                    "is_deleted": note.is_deleted,
                    "version": note.version
                }
            }), 409

        note.content = note_data.content
        note.title = note_data.title
        note.last_modified = datetime.now(timezone.utc)
        note.version += 1
        db.commit()
        db.refresh(note)

        return jsonify({
            "success": True,
            "data": {
                "id": str(note.id),
                "title": note.title,
                "content": note.content,
                "last_modified": note.last_modified.isoformat(),
                "created_at": note.created_at.isoformat(),
                "is_deleted": note.is_deleted,
                "version": note.version
            }
        }), 200
    except Exception as e:
        db.rollback()
        logging.exception("Error updating note")
        return jsonify({"success": False, "message": "Failed to update note"}), 500
    finally:
        db.close()


@notes.route("/notes/<note_id>", methods=["DELETE"])
@user_required
@limiter.limit("30 per minute")
def delete_note(user, note_id):
    """Soft delete a note."""
    user_id = parse_uuid(user.get("id"))
    note_uuid = parse_uuid(note_id)
    if not user_id or not note_uuid:
        return jsonify({"success": False, "message": "Invalid ID format"}), 400

    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_uuid,
            Note.user_id == user_id
        ).first()

        if not note:
            return jsonify({"success": False, "message": "Note not found"}), 404

        note.is_deleted = True
        note.last_modified = datetime.now(timezone.utc)
        note.version += 1
        db.commit()

        return jsonify({"success": True, "message": "Note deleted"}), 200
    except Exception as e:
        db.rollback()
        logging.exception("Error deleting note")
        return jsonify({"success": False, "message": "Failed to delete note"}), 500
    finally:
        db.close()


from pydantic import ValidationError
from ..schemas.note_schema import NoteCreate, NoteUpdate, NoteSyncBatch

@notes.route("/sync", methods=["POST"])
@user_required
@limiter.limit("10 per minute")
def sync(user):
    """Sync notes: client sends local changes, server returns server changes since last_sync_timestamp."""
    from ..services.sync_service import SyncService
    
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    idempotency_key = request.headers.get("Idempotency-Key")
    now_ts = time.time()
    cache_key = f"{user_id}:{idempotency_key}" if idempotency_key else None
    
    if cache_key:
        if cache_key in IDEMPOTENCY_CACHE:
            resp_data, status_code, timestamp = IDEMPOTENCY_CACHE[cache_key]
            if now_ts - timestamp < 86400:
                return jsonify(resp_data), status_code
            else:
                del IDEMPOTENCY_CACHE[cache_key]

    data = request.get_json() or {}
    
    client_notes_raw = data.get("notes", [])
    if isinstance(client_notes_raw, list) and len(client_notes_raw) > 100:
        return jsonify({
            "success": False,
            "message": "Batch size exceeds maximum limit of 100 notes"
        }), 400
        
    try:
        sync_batch = NoteSyncBatch(**data)
    except ValidationError as e:
        return jsonify({"success": False, "message": "Invalid notes format", "errors": e.errors()}), 400

    db = SessionLocal()
    try:
        # Pydantic parsed data
        client_notes = [note.dict() for note in sync_batch.notes]
        
        server_notes, conflicts = SyncService.process_sync(
            db=db,
            user_id=user_id,
            client_notes=client_notes,
            last_sync_timestamp=sync_batch.last_sync_timestamp
        )
        
        response_data = {
            "success": True,
            "notes": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "content": n.content,
                    "last_modified": n.last_modified.isoformat(),
                    "is_deleted": n.is_deleted,
                    "version": n.version
                }
                for n in server_notes
            ],
            "conflicts": conflicts,
            "server_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if cache_key:
            IDEMPOTENCY_CACHE[cache_key] = (response_data, 200, time.time())
            
        return jsonify(response_data), 200
    except Exception as e:
        db.rollback()
        logging.exception("Error syncing notes")
        return jsonify({"success": False, "message": "Sync failed"}), 500
    finally:
        db.close()