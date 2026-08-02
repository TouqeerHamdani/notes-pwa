import logging
import uuid
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from ..models import Note
from ..db import SessionLocal
from .auth import user_required

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


@notes.route("/notes", methods=["GET"])
@user_required
def list_notes(user):
    """List all notes for the authenticated user."""
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1

    try:
        per_page = int(request.args.get("per_page", 50))
        if per_page < 1:
            per_page = 50
    except (ValueError, TypeError):
        per_page = 50

    db = SessionLocal()
    try:
        base_query = db.query(Note).filter(
            Note.user_id == user_id,
            Note.is_deleted.is_(False)
        )
        total = base_query.count()
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


@notes.route("/notes", methods=["POST"])
@user_required
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
def sync(user):
    """Sync notes: client sends local changes, server returns server changes since last_sync_timestamp."""
    user_id = parse_uuid(user.get("id"))
    if not user_id:
        return jsonify({"success": False, "message": "Invalid user ID"}), 400

    data = request.get_json() or {}
    client_notes = data.get("notes", [])
    last_sync_timestamp = data.get("last_sync_timestamp")

    db = SessionLocal()
    try:
        # Upsert client notes
        for note_data in client_notes:
            raw_id = note_data.get("id")
            note_uuid = parse_uuid(raw_id)
            title = note_data.get("title", "").strip()
            content = note_data.get("content", "").strip()
            raw_modified = note_data.get("last_modified")
            is_deleted = note_data.get("is_deleted", False)

            if not note_uuid or not raw_modified:
                continue

            try:
                client_dt = datetime.fromisoformat(raw_modified)
            except ValueError:
                continue

            existing = db.query(Note).filter(
                Note.id == note_uuid,
                Note.user_id == user_id
            ).first()

            if existing:
                # Last-write-wins: only update if client's last_modified is newer (parsed datetime comparison)
                if client_dt > existing.last_modified:
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
            try:
                sync_dt = datetime.fromisoformat(last_sync_timestamp)
                query = query.filter(Note.last_modified > sync_dt)
            except ValueError:
                pass

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