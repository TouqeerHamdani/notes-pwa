import logging
import uuid
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from ..models import Note
from ..db import SessionLocal
from .auth import user_required, limiter

notes = Blueprint("notes", __name__)


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
                        "is_deleted": n.is_deleted
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
                    "is_deleted": n.is_deleted
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
    content = data.get("content", "").strip()
    title = data.get("title", "").strip()

    if not content:
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400
    if len(title) > MAX_TITLE_LENGTH:
        return jsonify({"success": False, "message": f"Title exceeds maximum length of {MAX_TITLE_LENGTH} characters"}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"success": False, "message": "Content exceeds maximum limit of 1MB"}), 400

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        note = Note(
            user_id=user_id,
            title=title,
            content=content,
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
                "is_deleted": note.is_deleted
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
    content = data.get("content", "").strip()
    title = data.get("title", "").strip()

    if not content:
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400
    if len(title) > MAX_TITLE_LENGTH:
        return jsonify({"success": False, "message": f"Title exceeds maximum length of {MAX_TITLE_LENGTH} characters"}), 400
    if len(content) > MAX_CONTENT_LENGTH:
        return jsonify({"success": False, "message": "Content exceeds maximum limit of 1MB"}), 400

    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_uuid,
            Note.user_id == user_id,
            Note.is_deleted.is_(False)
        ).first()

        if not note:
            return jsonify({"success": False, "message": "Note not found"}), 404

        note.content = content
        note.title = title
        note.last_modified = datetime.now(timezone.utc)
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
                "is_deleted": note.is_deleted
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
        db.commit()

        return jsonify({"success": True, "message": "Note deleted"}), 200
    except Exception as e:
        db.rollback()
        logging.exception("Error deleting note")
        return jsonify({"success": False, "message": "Failed to delete note"}), 500
    finally:
        db.close()


@notes.route("/sync", methods=["POST"])
@user_required
@limiter.limit("10 per minute")
def sync(user):
    """Sync notes: client sends local changes, server returns server changes since last_sync_timestamp."""
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    data = request.get_json() or {}
    client_notes = data.get("notes", [])
    last_sync_timestamp = data.get("last_sync_timestamp")

    if not isinstance(client_notes, list):
        return jsonify({"success": False, "message": "Invalid notes format"}), 400

    if len(client_notes) > MAX_BATCH_SIZE:
        return jsonify({
            "success": False,
            "message": f"Batch size exceeds maximum limit of {MAX_BATCH_SIZE} notes"
        }), 400

    db = SessionLocal()
    try:
        # Upsert client notes
        for note_data in client_notes:
            if not isinstance(note_data, dict):
                continue

            raw_id = note_data.get("id")
            note_uuid = parse_uuid(raw_id)
            title = (note_data.get("title") or "").strip()[:MAX_TITLE_LENGTH]
            content = (note_data.get("content") or "").strip()[:MAX_CONTENT_LENGTH]
            raw_modified = note_data.get("last_modified")
            is_deleted = bool(note_data.get("is_deleted", False))

            if not note_uuid or not raw_modified:
                continue

            client_dt = parse_iso_datetime(raw_modified)
            if not client_dt:
                continue

            existing = db.query(Note).filter(
                Note.id == note_uuid,
                Note.user_id == user_id
            ).first()

            if existing:
                # Last-write-wins: compare timezone-aware datetimes safely
                existing_last_mod = ensure_tz_aware(existing.last_modified)
                if client_dt > existing_last_mod:
                    existing.content = content
                    existing.title = title
                    existing.last_modified = client_dt
                    existing.is_deleted = is_deleted
            else:
                # Create new note
                note = Note(
                    id=note_uuid,
                    user_id=user_id,
                    title=title,
                    content=content,
                    last_modified=client_dt,
                    created_at=datetime.now(timezone.utc),
                    is_deleted=is_deleted
                )
                db.add(note)

        db.commit()

        # Fetch server changes since last_sync_timestamp
        query = db.query(Note).filter(Note.user_id == user_id)
        if last_sync_timestamp:
            sync_dt = parse_iso_datetime(last_sync_timestamp)
            if sync_dt:
                query = query.filter(Note.last_modified > sync_dt)

        server_notes = query.all()

        return jsonify({
            "success": True,
            "notes": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "content": n.content,
                    "last_modified": n.last_modified.isoformat(),
                    "is_deleted": n.is_deleted
                }
                for n in server_notes
            ]
        }), 200
    except Exception as e:
        db.rollback()
        logging.exception("Error syncing notes")
        return jsonify({"success": False, "message": "Sync failed"}), 500
    finally:
        db.close()