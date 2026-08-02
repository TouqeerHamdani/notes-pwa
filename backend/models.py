from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'auth'}
    id = Column(Uuid(as_uuid=True), primary_key=True)
    email = Column(String)
    notes = relationship("Note", back_populates="user")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey('auth.users.id', ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text)
    content = Column(Text)
    last_modified = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), index=True)
    is_synced = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    user = relationship("User", back_populates="notes")
