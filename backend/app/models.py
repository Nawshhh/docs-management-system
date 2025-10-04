from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# Enums
class Role(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class DocStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AuditAction(str, Enum):
    LOGIN = "LOGIN"
    USER_CREATE = "USER_CREATE"
    USER_DELETE = "USER_DELETE"
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

class UserBase(BaseModel):
    email: str
    role: Role = Role.EMPLOYEE
    profile: dict[str, Any] | None = None

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
    decision: str | None = None  # "APPROVED" | "REJECTED" | None
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
    status: DocStatus = DocStatus.DRAFT
    attachments: list[Attachment] = []
    review: ReviewInfo | None = None

class DocumentDB(DocumentBase, TsMixin):
    id: str | None = None
    owner_id: str
    status: DocStatus = DocStatus.DRAFT
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
