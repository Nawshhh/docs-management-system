# backend/app/repos/documents.py
from typing import Optional, Iterable
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from ..models import DocumentCreate, DocumentDB, DocumentOut, DocStatus, Attachment, ReviewInfo
from .utils import to_obj_id, from_obj_id

COLL = "documents"

def _doc_to_out(doc) -> DocumentOut:
    return DocumentOut(
        id=str(doc["_id"]),
        owner_id=str(doc["owner_id"]),
        title=doc["title"],
        description=doc.get("description"),
        status=DocStatus(doc.get("status", DocStatus.PENDING_REVIEW)),
        attachments=[
            Attachment(
                file_id=str(att["file_id"]),
                filename=att["filename"],
                size=att["size"],
                content_type=att["content_type"],
            ) for att in doc.get("attachments", [])
        ],
        review=ReviewInfo(**doc["review"]) if doc.get("review") else None,
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )

async def ensure_indexes(db: AsyncIOMotorDatabase):
    await db[COLL].create_index([("owner_id", 1), ("status", 1)])
    await db[COLL].create_index("status")
    await db[COLL].create_index("created_at")

async def create_document(db: AsyncIOMotorDatabase, owner_id: str, payload: DocumentCreate) -> DocumentOut:
    now = datetime.utcnow()
    doc = {
        "owner_id": to_obj_id(owner_id),
        "title": payload.title,
        "description": payload.description,
        "status": DocStatus.PENDING_REVIEW.value,
        "attachments": [
            {"file_id": to_obj_id(a.file_id), "filename": a.filename, "size": a.size, "content_type": a.content_type}
            for a in payload.attachments
        ],
        "review": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await db[COLL].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _doc_to_out(doc)

async def get_document(db: AsyncIOMotorDatabase, doc_id: str) -> Optional[DocumentOut]:
    doc = await db[COLL].find_one({"owner_id": to_obj_id(doc_id)})
    return _doc_to_out(doc) if doc else None

async def get_documents(db: AsyncIOMotorDatabase, owner_id: str) -> list[DocumentOut]:
    cursor = db[COLL].find({"owner_id": to_obj_id(owner_id)})

    docs = []
    async for d in cursor:
        docs.append(_doc_to_out(d))

    return docs

async def list_my_documents(db: AsyncIOMotorDatabase, owner_id: str) -> list[DocumentOut]:
    cursor = db[COLL].find({"owner_id": to_obj_id(owner_id)}).sort("created_at", -1)
    return [_doc_to_out(d) async for d in cursor]

async def update_draft(db: AsyncIOMotorDatabase, doc_id: str, owner_id: str, title: str | None, description: str | None) -> Optional[DocumentOut]:
    now = datetime.utcnow()
    update = {"$set": {"updated_at": now}}
    if title is not None:
        update["$set"]["title"] = title
    if description is not None:
        update["$set"]["description"] = description

    doc = await db[COLL].find_one_and_update(
        {"_id": to_obj_id(doc_id), "owner_id": to_obj_id(owner_id), "status": DocStatus.PENDING_REVIEW.value},
        update,
        return_document=True,
    )
    return _doc_to_out(doc) if doc else None

async def submit_for_review(db: AsyncIOMotorDatabase, doc_id: str, owner_id: str) -> bool:
    res = await db[COLL].update_one(
        {"_id": to_obj_id(doc_id), "owner_id": to_obj_id(owner_id), "status": DocStatus.PENDING_REVIEW.value},
        {"$set": {"status": DocStatus.PENDING_REVIEW.value, "updated_at": datetime.utcnow()}}
    )
    return res.modified_count == 1

async def list_pending_in_scope(db: AsyncIOMotorDatabase, employee_ids: Iterable[str]) -> list[DocumentOut]:
    cursor = db[COLL].find({
        "status": DocStatus.PENDING_REVIEW.value
    }).sort("created_at", 1)
    return [_doc_to_out(d) async for d in cursor]

async def decide_review(db: AsyncIOMotorDatabase, doc_id: str, reviewer_id: str, decision: DocStatus, comment: str | None) -> Optional[DocumentOut]:
    assert decision in (DocStatus.APPROVED, DocStatus.REJECTED)
    now = datetime.utcnow()
    doc = await db[COLL].find_one_and_update(
        {"_id": to_obj_id(doc_id), "status": DocStatus.PENDING_REVIEW.value},
        {"$set": {
            "status": decision.value,
            "review": {
                "reviewer_id": to_obj_id(reviewer_id),
                "decision": decision.value,
                "comment": comment,
                "decided_at": now
            },
            "updated_at": now
        }},
        return_document=True,
    )
    return _doc_to_out(doc) if doc else None

async def add_attachment(db: AsyncIOMotorDatabase, doc_id: str, owner_id: str, file_id: str, filename: str, size: int, content_type: str) -> Optional[DocumentOut]:
    # Only while DRAFT
    now = datetime.utcnow()
    doc = await db[COLL].find_one_and_update(
        {"_id": to_obj_id(doc_id), "owner_id": to_obj_id(owner_id), "status": DocStatus.PENDING_REVIEW.value},
        {"$push": {"attachments": {"file_id": to_obj_id(file_id), "filename": filename, "size": size, "content_type": content_type}},
         "$set": {"updated_at": now}},
        return_document=True
    )
    return _doc_to_out(doc) if doc else None


async def delete_document(db: AsyncIOMotorDatabase, doc_id: str, owner_id: str) -> bool:
    res = await db[COLL].delete_one({"_id": to_obj_id(doc_id), "owner_id": to_obj_id(owner_id), "status": DocStatus.PENDING_REVIEW.value})
    return res.deleted_count == 1

async def list_all_documents(db: AsyncIOMotorDatabase) -> list[DocumentOut]:
    cursor = db[COLL].find().sort("created_at", -1)
    return [_doc_to_out(d) async for d in cursor]