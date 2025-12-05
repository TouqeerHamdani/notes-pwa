import logging
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from ..models import Note
from ..db import SessionLocal
from .auth import user_required

notes = Blueprint("notes", __name__)


@notes.route("/notes", methods=["GET"])
@user_required
def list_notes(user):
    """List all notes for the authenticated user."""
    db = SessionLocal()
    try:
        notes_list = db.query(Note).filter(
            Note.user_id == user["id"]  
        ).filter(Note.is_deleted == False).all()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": str(n.id),
                    "content": n.content,
                    "last_modified": n.last_modified.isoformat(),
                    "created_at": n.created_at.isoformat(),
                    "is_deleted": n.is_deleted
                }
                for n in notes_list
            ]
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
    data = request.get_json() or {}
    content = data.get("content", "").strip()
    title = data.get("title", "").strip()

    if not content:
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        note = Note(
            user_id=user["id"], 
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
    data = request.get_json() or {}
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"success": False, "message": "Content cannot be empty"}), 400

    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == user["id"],
            Note.is_deleted.is_(False)
        ).first()

        if not note:
            return jsonify({"success": False, "message": "Note not found"}), 404
        note.content = content
        note.last_modified = datetime.now(timezone.utc)
        db.commit()
        db.refresh(note)

        return jsonify({
            "success": True,
            "data": {
                "id": str(note.id),
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
    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == user["id"]  
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
    data = request.get_json() or {}
    client_notes = data.get("notes", [])
    last_sync_timestamp = data.get("last_sync_timestamp")

    db = SessionLocal()
    try:
        # Upsert client notes
        for note_data in client_notes:
            note_id = note_data.get("id")
            content = note_data.get("content", "")
            last_modified = note_data.get("last_modified")
            is_deleted = note_data.get("is_deleted", False)

            if not note_id or not last_modified:
                continue

            existing = db.query(Note).filter(
                Note.id == note_id,
                Note.user_id == user["id"]  
            ).first()

            if existing:
                # Last-write-wins: only update if client's last_modified is newer
                if last_modified > existing.last_modified.isoformat():
                    existing.content = content
                    existing.last_modified = datetime.fromisoformat(last_modified)
                    existing.is_deleted = is_deleted
            else:
                # Create new note
                note = Note(
                    id=note_id,
                    user_id=user["id"],  
                    content=content,
                    last_modified=datetime.fromisoformat(last_modified),
                    created_at=datetime.now(timezone.utc),
                    is_deleted=is_deleted
                )
                db.add(note)

        db.commit()

        # Fetch server changes since last_sync_timestamp
        query = db.query(Note).filter(Note.user_id == user["id"]) 
        if last_sync_timestamp:
            query = query.filter(Note.last_modified > datetime.fromisoformat(last_sync_timestamp))

        server_notes = query.all()

        return jsonify({
            "success": True,
            "notes": [
                {
                    "id": str(n.id),
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