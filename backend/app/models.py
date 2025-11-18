from datetime import datetime
from enum import Enum
from typing import Any, Optional, List

from pydantic import BaseModel, Field

# Enums
class Role(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class DocStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AuditAction(str, Enum):
    LOGIN = "LOGIN"
    USER_CREATE = "USER_CREATE"
    USER_DELETE = "USER_DELETE"
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_UPDATE = "USER_UPDATE"
    ROLE_ASSIGN = "ROLE_ASSIGN"
    DOC_CREATE = "DOC_CREATE"
    DOC_UPDATE = "DOC_UPDATE"
    DOC_SUBMIT = "DOC_SUBMIT"
    DOC_APPROVE = "DOC_APPROVE"
    DOC_REJECT = "DOC_REJECT"


class ResourceType(str, Enum):
    DOCUMENT = "DOCUMENT"
    USER = "USER"
    AUTH = "AUTH"

class TsMixin(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PasswordHistoryEntry(BaseModel):
    password_hash: str
    changed_at: datetime

class UserBase(BaseModel):
    email: str
    role: Role = Role.EMPLOYEE
    profile: dict[str, Any] | None = None
    security_answer: str | None = None
    reset_attempts: int = 0
    reset_lock_until: Optional[datetime] = None
    password_history: List[PasswordHistoryEntry] = []
    last_use_at: Optional[datetime] = None
    last_use_success: Optional[bool] = None
    last_use_ip: Optional[str] = None
    manager_id: Optional[str] = None  # stores the _id of the MANAGER user

class UserCreate(UserBase):
    password: str

class UserOut(UserBase, TsMixin):
    id: str = Field(..., description="Mongo _id as string")

class UserDB(UserBase, TsMixin):
    id: str | None = None
    password_hash: str

# Documents
class Attachment(BaseModel):
    file_id: str    #GridFS file id (as string)
    filename: str
    size: int
    content_type: str

class ReviewInfo(BaseModel):
    reviewer_id: str | None = None
    comment: str | None = None
    decided_at: datetime | None = None

class DocumentBase(BaseModel):
    title: str
    description: str | None = None

class DocumentCreate(DocumentBase):
    attachments: list[Attachment] = []

class DocumentOut(DocumentBase, TsMixin):
    id: str
    owner_id: str
    status: DocStatus = DocStatus.PENDING_REVIEW
    attachments: list[Attachment] = []
    review: ReviewInfo | None = None

class DocumentDB(DocumentBase, TsMixin):
    id: str | None = None
    owner_id: str
    status: DocStatus = DocStatus.PENDING_REVIEW
    attachments: list[Attachment] = []
    review: ReviewInfo | None = None

# ---------- Audit Logs ----------
class AuditLogBase(BaseModel):
    actor_id: str
    action: AuditAction
    resource_type: ResourceType
    resource_id: str | None = None
    details: dict[str, Any] | None = None

class AuditLogOut(AuditLogBase, TsMixin):
    id: str

class AuditLogDB(AuditLogBase, TsMixin):
    id: str | None = None
