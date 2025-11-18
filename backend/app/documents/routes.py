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

from bson import ObjectId
from pydantic import BaseModel

router = APIRouter()

# ---------- DTOs (lighter request bodies) ----------

class DocCreateBody(BaseModel):
    title: str
    description: Optional[str] = None
    user_id: Optional[str] = None   # owner id

class DocUpdateBody(BaseModel):
    user_id: str                    # who is updating
    title: Optional[str] = None
    description: Optional[str] = None

class SubmitBody(BaseModel):
    user_id: str                    # who is submitting

class ReviewBody(BaseModel):
    reviewer_id: str                # who is approving/rejecting
    comment: Optional[str] = None

class PendingScopeBody(BaseModel):
    manager_id: str  # ID of the manager whose scope we want to see

# ---------- CRUD (owner-scoped, but no auth enforced) ----------

@router.post("/", response_model=ApiEnvelope)
async def create_document(
    body: DocCreateBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller must provide user_id (owner) explicitly in the body.
    """
    try:
        payload = DocumentCreate(
            title=body.title,
            description=body.description,
            attachments=[],
        )
        doc = await docs_repo.create_document(db, body.user_id, payload)

        await logs_repo.log_event(
            db,
            body.user_id or "000000000000000000000000",
            "DOC_CREATE",
            "DOCUMENT",
            doc.id,
            {"title": doc.title},
        )
        return ok(doc)
    except Exception as e:
        print("Error creating document:", e)
        return fail("Could not create document")


@router.get("/mine", response_model=ApiEnvelope)
async def list_my_documents(
    user_id: str,  # passed as query param ?user_id=...
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller passes user_id; returns that user's documents.
    """
    try:
        items = await docs_repo.list_my_documents(db, user_id)
        return ok(items)
    except Exception as e:
        print("Error listing my documents:", e)
        return fail("Could not list documents")


@router.get("/{doc_id}", response_model=ApiEnvelope)
async def get_document(
    doc_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: returns document by id. No owner/admin checks.
    """
    try:
        doc = await docs_repo.get_document(db, doc_id)
        if not doc:
            return fail("Document not found")
        return ok(doc)
    except Exception as e:
        print("Error loading document:", e)
        return fail("Could not load document")


@router.patch("/{doc_id}", response_model=ApiEnvelope)
async def update_draft(
    doc_id: str,
    body: DocUpdateBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller provides user_id; repo enforces "owner can update" logic.
    """
    try:
        updated = await docs_repo.update_draft(
            db,
            doc_id,
            body.user_id,
            body.title,
            body.description,
        )
        if not updated:
            return fail("Only the owner can update while status is DRAFT")

        await logs_repo.log_event(
            db,
            body.user_id,
            "DOC_UPDATE",
            "DOCUMENT",
            doc_id,
            {"title": body.title, "description": body.description},
        )
        return ok(updated)
    except Exception as e:
        print("Error updating document:", e)
        return fail("Could not update document")


@router.post("/{doc_id}/submit", response_model=ApiEnvelope)
async def submit_for_review(
    doc_id: str,
    body: SubmitBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller provides user_id; repo enforces owner + status logic.
    """
    try:
        doc_status = await docs_repo.get_document(db, doc_id)
        if not doc_status:
            return fail("Document not found")

        if doc_status.status == DocStatus.PENDING_REVIEW:
            return fail("Document is already in PENDING REVIEW status")
        elif doc_status.status == DocStatus.APPROVED:
            return fail("Document has already been APPROVED")

        ok_flag = await docs_repo.submit_for_review(db, doc_id, body.user_id)
        if not ok_flag:
            return fail("Only DRAFT documents owned by you can be submitted")

        await logs_repo.log_event(
            db,
            body.user_id,
            "DOC_SUBMIT",
            "DOCUMENT",
            doc_id,
        )
        return ok()
    except Exception as e:
        print("Error submitting document:", e)
        return fail("Could not submit document")


# ---------- Attachments (no auth; user_id passed explicitly) ----------

@router.post("/{doc_id}/attachments", response_model=ApiEnvelope)
async def add_attachment(
    doc_id: str,
    user_id: str = Form(...),          # caller includes user_id as form field
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller passes user_id via form-data along with the file.
    """
    try:
        content = await file.read()
        fake_file_id = str(uuid4())

        updated = await docs_repo.add_attachment(
            db,
            doc_id,
            user_id,
            file_id=fake_file_id,
            filename=file.filename or "upload.bin",
            size=len(content),
            content_type=file.content_type or "application/octet-stream",
        )
        if not updated:
            return fail("Only the owner can add attachments while status is DRAFT")

        await logs_repo.log_event(
            db,
            user_id,
            "DOC_UPDATE",
            "DOCUMENT",
            doc_id,
            {"added_attachment": file.filename},
        )
        return ok(updated)
    except Exception as e:
        print("Error adding attachment:", e)
        return fail("Could not add attachment")


# ---------- Review queue & decisions (Manager-only by body, no auth) ----------

@router.post("/view-docs", response_model=ApiEnvelope)
async def list_docs_in_scope(
    body: PendingScopeBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Given a manager_id in the body, return ALL documents
    (any status) for employees whose manager_id == body.manager_id.
    """
    try:
        manager_id = body.manager_id
        manager_obj_id = ObjectId(manager_id)

        cursor = db["users"].find(
            {
                "role": Role.EMPLOYEE.value,
                "manager_id": manager_obj_id,
            },
            {"_id": 1},
        )

        emp_ids: list[str] = [str(d["_id"]) async for d in cursor]

        if not emp_ids:
            return ok([])

        all_docs: list[DocumentOut] = []
        for emp_id in emp_ids:
            docs_for_emp = await docs_repo.get_documents(db, emp_id)  # list
            all_docs.extend(docs_for_emp) 

        return ok(all_docs)
    except Exception as e:
        print("Error listing docs:", e)
        return fail("Could not list documents")

@router.post("/view-docs/pending", response_model=ApiEnvelope)
async def list_pending_in_scope(
    body: PendingScopeBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        manager_id = body.manager_id
        manager_obj_id = ObjectId(manager_id) 

        cursor = db["users"].find(
            {
                "role": Role.EMPLOYEE.value,
                "manager_id": manager_obj_id,
            },
            {"_id": 1},
        )

        emp_ids: list[str] = [str(d["_id"]) async for d in cursor]
        print("Employee IDs under manager:", emp_ids)
        if not emp_ids:
            return ok([])

        all_docs = []
        for emp_id in emp_ids:
            docs_for_emp = await docs_repo.get_documents_status(db, emp_id, "PENDING_REVIEW") 
            all_docs.extend(docs_for_emp)

        return ok(all_docs)
    except Exception as e:
        print("Error listing pending reviews:", e)
        return fail("Could not list pending reviews")


@router.post("/reviews/{doc_id}/approve", response_model=ApiEnvelope)
async def approve_document(
    doc_id: str,
    body: ReviewBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller provides reviewer_id. No role checks.
    """
    try:
        decided = await docs_repo.decide_review(
            db,
            doc_id,
            body.reviewer_id,
            DocStatus.APPROVED,
            body.comment,
        )
        if not decided:
            return fail("Only PENDING_REVIEW documents can be approved")

        await logs_repo.log_event(
            db,
            body.reviewer_id,
            "DOC_APPROVE",
            "DOCUMENT",
            doc_id,
            {"comment": body.comment},
        )
        return ok(decided)
    except Exception as e:
        print("Error approving document:", e)
        return fail("Could not approve document")


@router.post("/reviews/{doc_id}/reject", response_model=ApiEnvelope)
async def reject_document(
    doc_id: str,
    body: ReviewBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller provides reviewer_id; reject still requires non-empty comment.
    """
    try:
        if not (body.comment and body.comment.strip()):
            return fail("Reject requires a non-empty comment")

        decided = await docs_repo.decide_review(
            db,
            doc_id,
            body.reviewer_id,
            DocStatus.REJECTED,
            body.comment,
        )
        if not decided:
            return fail("Only PENDING_REVIEW documents can be rejected")

        await logs_repo.log_event(
            db,
            body.reviewer_id,
            "DOC_REJECT",
            "DOCUMENT",
            doc_id,
            {"comment": body.comment},
        )
        return ok(decided)
    except Exception as e:
        print("Error rejecting document:", e)
        return fail("Could not reject document")


@router.delete("/{doc_id}/attachments", response_model=ApiEnvelope)
async def delete_document(
    doc_id: str,
    user_id: str,  # passed as query param ?user_id=...
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: caller passes user_id; repo handles ownership logic.
    """
    try:
        is_deleted = await docs_repo.delete_document(db, doc_id)
        if not is_deleted:
            return fail("Only the owner can delete attachments")

        await logs_repo.log_event(
            db,
            user_id,
            "DOC_DELETE",
            "DOCUMENT",
            doc_id,
        )
        return ok(is_deleted)
    except Exception as e:
        print("Error, can't delete attachment:", e)
        return fail("Error, can't delete attachment")


@router.get("/", response_model=ApiEnvelope)
async def list_all_documents(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Public: list all documents, sorted by created_at desc.
    """
    try:
        items = await docs_repo.list_all_documents(db)

        items_sorted = sorted(
            items,
            key=lambda d: d["created_at"] if isinstance(d, dict) else d.created_at,
            reverse=True,
        )

        return ok(items_sorted)
    except Exception as e:
        print("Could not list documents:", e)
        return fail("Could not list documents")
