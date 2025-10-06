# backend/app/documents/routes.py
from fastapi import APIRouter, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from uuid import uuid4
from datetime import datetime

from ..db import get_db
from ..api import ok, fail, ApiEnvelope
from ..models import DocumentCreate, DocumentOut, DocStatus, Role, Attachment
from ..repos import documents as docs_repo
from ..repos import users as users_repo
from ..repos import audit_logs as logs_repo
from ..deps import require_user, require_manager_or_admin

router = APIRouter()

# ---------- DTOs (lighter request bodies) ----------
from pydantic import BaseModel

class DocCreateBody(BaseModel):
    title: str
    description: Optional[str] = None

class DocUpdateBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class ReviewBody(BaseModel):
    comment: Optional[str] = None

# ---------- CRUD (owner-scoped) ----------

@router.post("", response_model=ApiEnvelope)
async def create_document(
    body: DocCreateBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        payload = DocumentCreate(title=body.title, description=body.description, attachments=[])
        doc = await docs_repo.create_document(db, me.id, payload)
        await logs_repo.log_event(db, me.id, "DOC_CREATE", "DOCUMENT", doc.id, {"title": doc.title})
        return ok(doc)
    except Exception:
        return fail("Could not create document")

@router.get("/mine", response_model=ApiEnvelope)
async def list_my_documents(
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        items = await docs_repo.list_my_documents(db, me.id)
        return ok(items)
    except Exception:
        return fail("Could not list documents")

@router.get("/{doc_id}", response_model=ApiEnvelope)
async def get_document(
    doc_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        doc = await docs_repo.get_document(db, doc_id)
        if not doc:
            return fail("Document not found")

        # Access rules: owner OR admin
        if doc.owner_id != me.id:
            role = me.role if isinstance(me.role, Role) else Role(me.role)
            if role == Role.ADMIN:
                return ok(doc)
            else:
                return fail("Forbidden")
        return ok(doc)
    except Exception:
        return fail("Could not load document")

@router.patch("/{doc_id}", response_model=ApiEnvelope)
async def update_draft(
    doc_id: str,
    body: DocUpdateBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        updated = await docs_repo.update_draft(db, doc_id, me.id, body.title, body.description)
        if not updated:
            return fail("Only the owner can update while status is DRAFT")
        await logs_repo.log_event(db, me.id, "DOC_UPDATE", "DOCUMENT", doc_id, {"title": body.title, "description": body.description})
        return ok(updated)
    except Exception:
        return fail("Could not update document")

@router.post("/{doc_id}/submit", response_model=ApiEnvelope)
async def submit_for_review(
    doc_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        doc_status = await docs_repo.get_document(db, doc_id)
        if doc_status.status == DocStatus.PENDING_REVIEW:
            return fail("Document is already in PENDING REVIEW status")
        elif doc_status.status == DocStatus.APPROVED:
            return fail("Document has already been APPROVED")
        else:
            ok_flag = await docs_repo.submit_for_review(db, doc_id, me.id)
            if not ok_flag:
                return fail("Only DRAFT documents owned by you can be submitted")
            await logs_repo.log_event(db, me.id, "DOC_SUBMIT", "DOCUMENT", doc_id)
            return ok()
    except Exception:
        return fail("Could not submit document")

# ---------- Attachments (demo: local placeholder id) ----------
# Note: we just store metadata + a generated UUID as file_id.
# You can swap this to GridFS later and keep the same route shape.

@router.post("/{doc_id}/attachments", response_model=ApiEnvelope)
async def add_attachment(
    doc_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user),
):
    try:
        # DEMO storage: read to memory & drop (or persist to /tmp if you like)
        content = await file.read()
        fake_file_id = str(uuid4())

        updated = await docs_repo.add_attachment(
            db,
            doc_id,
            me.id,
            file_id=fake_file_id,
            filename=file.filename or "upload.bin",
            size=len(content),
            content_type=file.content_type or "application/octet-stream",
        )
        if not updated:
            return fail("Only the owner can add attachments while status is DRAFT")

        await logs_repo.log_event(db, me.id, "DOC_UPDATE", "DOCUMENT", doc_id, {"added_attachment": file.filename})
        return ok(updated)
    except Exception:
        return fail("Could not add attachment")

# ---------- Review queue & decisions (Manager/Admin) ----------

@router.get("/reviews/pending", response_model=ApiEnvelope)
async def list_pending_in_scope(
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_manager_or_admin),
):
    try:
        role = me.role if isinstance(me.role, Role) else Role(me.role)
        if role == Role.ADMIN:
            # Admin sees all pending; reuse repo by passing all employee ids
            # Fetch employees quickly (index on role exists)
            cursor = db["users"].find({"role": Role.EMPLOYEE.value}, {"_id": 1})
            emp_ids = [str(d["_id"]) async for d in cursor]
            items = await docs_repo.list_pending_in_scope(db, emp_ids)
            return ok(items)
        else:
            manager = await users_repo.get_user(db, me.id)
            items = await docs_repo.list_pending_in_scope(db)
            return ok(items)
    except Exception:
        return fail("Could not list pending reviews")

@router.post("/reviews/{doc_id}/approve", response_model=ApiEnvelope)
async def approve_document(
    doc_id: str,
    body: ReviewBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_manager_or_admin),
):
    try:
        # Scope enforcement for managers
        role = me.role if isinstance(me.role, Role) else Role(me.role)
        if role == Role.MANAGER:
            doc = await docs_repo.get_document(db, doc_id)
            if not doc:
                return fail("Document not found")

        decided = await docs_repo.decide_review(db, doc_id, me.id, DocStatus.APPROVED, body.comment)
        if not decided:
            return fail("Only PENDING_REVIEW documents can be approved")
        await logs_repo.log_event(db, me.id, "DOC_APPROVE", "DOCUMENT", doc_id, {"comment": body.comment})
        return ok(decided)
    except Exception:
        return fail("Could not approve document")

@router.post("/reviews/{doc_id}/reject", response_model=ApiEnvelope)
async def reject_document(
    doc_id: str,
    body: ReviewBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_manager_or_admin),
):
    try:
        # Require non-empty comment on reject
        if not (body.comment and body.comment.strip()):
            return fail("Reject requires a non-empty comment")

        role = me.role if isinstance(me.role, Role) else Role(me.role)
        if role == Role.MANAGER:
            doc = await docs_repo.get_document(db, doc_id)
            if not doc:
                return fail("Document not found")

        decided = await docs_repo.decide_review(db, doc_id, me.id, DocStatus.REJECTED, body.comment)
        if not decided:
            return fail("Only PENDING_REVIEW documents can be rejected")
        await logs_repo.log_event(db, me.id, "DOC_REJECT", "DOCUMENT", doc_id, {"comment": body.comment})
        return ok(decided)
    except Exception:
        return fail("Could not reject document")
    
@router.delete("/{doc_id}/attachments", response_model=ApiEnvelope)
async def delete_document(
    doc_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    me = Depends(require_user)
):
    try:
        docs = await docs_repo.get_document(db, doc_id)
        if not docs:
            return fail("Document not found")
        elif docs.status != DocStatus.DRAFT:
            return fail("Only the owner can delete attachments while status is DRAFT")
        
        is_deleted = await docs_repo.delete_document(db, doc_id, me.id)
        if not is_deleted:
            return fail("Only the owner can delete attachments")
        
        await logs_repo.log_event(db, me.id, "DOC_UPDATE", "DOCUMENT", doc_id)
        return ok(is_deleted)
    except Exception as e:
        return fail("Error, can't delete attachment: ", e)
