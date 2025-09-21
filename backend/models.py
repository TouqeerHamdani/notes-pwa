from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
	__tablename__ = "users"
	id = Column(Integer, primary_key=True)
	email = Column(String, unique=True, nullable=False)
	password_hash = Column(String, nullable=False)
	created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
	notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")

class Note(Base):
	__tablename__ = "notes"
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
	content = Column(Text)
	last_modified = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
	is_deleted = Column(Boolean, default=False)
	created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
	user = relationship("User", back_populates="notes")
