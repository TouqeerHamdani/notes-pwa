from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import Note
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID

def parse_iso_datetime(dt_str):
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

def ensure_tz_aware(dt: datetime) -> datetime:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

class SyncService:
    @staticmethod
    def process_sync(db: Session, user_id: UUID, client_notes: List[dict], last_sync_timestamp: Optional[str]) -> Tuple[List[Note], List[dict]]:
        conflicts = []
        MAX_TITLE_LENGTH = 500
        MAX_CONTENT_LENGTH = 1_000_000

        # Upsert client notes
        for note_data in client_notes:
            raw_id = note_data.get("id")
            if not raw_id:
                continue
            
            note_uuid = UUID(str(raw_id)) if not isinstance(raw_id, UUID) else raw_id
            title = (note_data.get("title") or "").strip()[:MAX_TITLE_LENGTH]
            content = (note_data.get("content") or "").strip()[:MAX_CONTENT_LENGTH]
            raw_modified = note_data.get("last_modified")
            
            # Pydantic models might provide datetime directly
            if isinstance(raw_modified, datetime):
                client_dt = ensure_tz_aware(raw_modified)
            else:
                client_dt = parse_iso_datetime(raw_modified)

            if not client_dt:
                continue
                
            is_deleted = bool(note_data.get("is_deleted", False))
            client_version = note_data.get("version", 1)

            existing = db.query(Note).filter(
                Note.id == note_uuid,
                Note.user_id == user_id
            ).first()

            if existing:
                existing_last_mod = ensure_tz_aware(existing.last_modified)
                if client_version < existing.version:
                    conflicts.append({
                        "id": str(existing.id),
                        "title": existing.title,
                        "content": existing.content,
                        "last_modified": existing.last_modified.isoformat(),
                        "is_deleted": existing.is_deleted,
                        "version": existing.version
                    })
                elif client_dt > existing_last_mod and client_version >= existing.version:
                    existing.content = content
                    existing.title = title
                    existing.last_modified = client_dt
                    existing.is_deleted = is_deleted
                    existing.version = max(existing.version + 1, client_version + 1)
            else:
                note = Note(
                    id=note_uuid,
                    user_id=user_id,
                    title=title,
                    content=content,
                    last_modified=client_dt,
                    created_at=datetime.now(timezone.utc),
                    is_deleted=is_deleted,
                    version=client_version
                )
                db.add(note)

        db.commit()

        # Fetch server changes since last_sync_timestamp
        query = db.query(Note).filter(Note.user_id == user_id)
        if last_sync_timestamp:
            sync_dt = parse_iso_datetime(last_sync_timestamp) if isinstance(last_sync_timestamp, str) else ensure_tz_aware(last_sync_timestamp)
            if sync_dt:
                query = query.filter(Note.last_modified > sync_dt)

        server_notes = query.all()
        return server_notes, conflicts
