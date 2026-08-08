from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class NoteCreate(BaseModel):
    title: str = Field(default="")
    content: str = Field(...)

    @validator('title')
    def validate_title(cls, v):
        if len(v) > 500:
            raise ValueError('Title exceeds maximum length')
        return v

    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        if len(v) > 1_000_000:
            raise ValueError('Content too long')
        return v

class NoteUpdate(BaseModel):
    title: str = Field(default="")
    content: str = Field(...)

    @validator('title')
    def validate_title(cls, v):
        if len(v) > 500:
            raise ValueError('Title exceeds maximum length')
        return v

    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        if len(v) > 1_000_000:
            raise ValueError('Content too long')
        return v

class NoteItem(BaseModel):
    id: UUID
    title: str = Field(default="", max_length=500)
    content: str = Field(default="", max_length=1_000_000)
    last_modified: datetime
    is_deleted: bool = False

class NoteSyncBatch(BaseModel):
    notes: List[NoteItem] = Field(max_items=100)
    last_sync_timestamp: Optional[datetime] = None

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    last_modified: str
    created_at: str
    is_deleted: bool

class SyncResponseItem(BaseModel):
    id: str
    title: str
    content: str
    last_modified: str
    is_deleted: bool

class SyncResponse(BaseModel):
    success: bool
    notes: List[SyncResponseItem]
