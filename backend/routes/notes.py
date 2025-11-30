from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..models import Note
from ..db import SessionLocal
from .auth import user_required

notes = Blueprint("notes", __name__)

@notes.route("/notes", methods=["GET"])
@user_required
def get_notes(current_user):
    """Get all notes for the current user"""
    db = SessionLocal()
    try:
        notes = db.query(Note).filter(
            Note.user_id == current_user.id,
            Note.is_deleted == False
        ).all()
        return jsonify({
            "success": True,
            "data": [{
                "id": str(note.id),
                "content": note.content,
                "last_modified": note.last_modified.isoformat(),
                "created_at": note.created_at.isoformat()
            } for note in notes],
            "message": "Notes retrieved successfully"
        })
    finally:
        db.close()

@notes.route("/notes", methods=["POST"])
@user_required
def create_note(current_user):
    """Create a new note"""
    data = request.get_json()
    
    if not data or "content" not in data:
        return jsonify({
            "success": False,
            "message": "Content is required"
        }), 400
    
    if not data["content"].strip():
        return jsonify({
            "success": False,
            "message": "Content cannot be empty"
        }), 400    
    db = SessionLocal()
    try:
        new_note = Note(
            user_id=current_user.id,
            content=data["content"]
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        return jsonify({
            "success": True,
            "data": {
                "id": str(new_note.id),
                "content": new_note.content,
                "last_modified": new_note.last_modified.isoformat(),
                "created_at": new_note.created_at.isoformat()
            },
            "message": "Note created successfully"
        }), 201
    except Exception as e:
        db.rollback()
        import logging
        logging.exception("Error creating note")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500
    finally:
        db.close()

@notes.route("/notes/<note_id>", methods=["PUT"])
@user_required
def update_note(current_user, note_id):
    """Update a specific note"""
    data = request.get_json()
    content = (data.get("content") if data else "")
    content = content.strip() if content else ""
    if not content:
        return jsonify({
            "success": False,
            "message": "Content cannot be empty"
        }), 400
    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == current_user.id,
            Note.is_deleted == False
        ).first()

        if not note:
            return jsonify({
                "success": False,
                "message": "Note not found"
            }), 404

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
                "created_at": note.created_at.isoformat()
            },
            "message": "Note updated successfully"
        })
    except Exception as e:
        db.rollback()
        import logging
        logging.exception("Error updating note")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500
    finally:
        db.close()

@notes.route("/notes/<note_id>", methods=["DELETE"])
@user_required
def delete_note(current_user, note_id):
    """Soft delete a note"""
    db = SessionLocal()
    try:
        note = db.query(Note).filter(
            Note.id == note_id,
            Note.user_id == current_user.id,
            Note.is_deleted == False
        ).first()

        if not note:
            return jsonify({
                "success": False,
                "message": "Note not found"
            }), 404

        note.is_deleted = True
        db.commit()
        return jsonify({
            "success": True,
            "message": "Note deleted successfully"
        })
    except Exception as e:
        db.rollback()
        import logging
        logging.exception("Error deleting note")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500
    finally:
        db.close()
@notes.route("/sync", methods=["POST"])
@user_required
def sync_notes(current_user):
    """Sync notes between client and server (batch upsert and fetch)."""
    data = request.get_json()
    client_notes = data.get("notes", [])
    last_sync = data.get("last_sync_timestamp")
    updated_notes = []
    db = SessionLocal()
    try:
        # Upsert each note from client
        for note_data in client_notes:
            note_id = note_data.get("id")
            content = note_data.get("content", "")
            last_modified = note_data.get("last_modified")
            is_deleted = note_data.get("is_deleted", False)
            if not note_id or not last_modified:
                continue  # skip invalid
            note = db.query(Note).filter_by(id=note_id, user_id=current_user.id).first()
            if note:
                # Only update if client is newer
                if str(note.last_modified) < last_modified:
                    note.content = content
                    note.last_modified = last_modified
                    note.is_deleted = is_deleted
                    db.add(note)
            else:
                # Create new note
                db.add(Note(id=note_id, user_id=current_user.id, content=content, last_modified=last_modified, is_deleted=is_deleted))
        db.commit()
        # Fetch notes changed since last sync
        query = db.query(Note).filter(Note.user_id == current_user.id)
        if last_sync:
            query = query.filter(Note.last_modified > last_sync)
        updated_notes = [
            {
                "id": str(n.id),
                "content": n.content,
                "last_modified": n.last_modified.isoformat(),
                "created_at": n.created_at.isoformat(),
                "is_deleted": n.is_deleted            }
            for n in query.all()
        ]
        return jsonify({
            "success": True,
            "notes": updated_notes,
            "message": "Sync successful"
        })
    except Exception as e:
        db.rollback()
        import logging
        logging.exception("Error during sync")
        return jsonify({"success": False, "message": "Internal server error"}), 500
    finally:
         db.close()