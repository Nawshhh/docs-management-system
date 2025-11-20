# backend/app/repos/audit_logs.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional, Any

from ..models import AuditLogDB, AuditLogOut
from .utils import to_obj_id
from zoneinfo import ZoneInfo


COLL = "audit_logs"

def _doc_to_out(doc) -> AuditLogOut:
    return AuditLogOut(
        id=str(doc["_id"]),
        actor_id=str(doc["actor_id"]),
        action=doc["action"],
        resource_type=doc["resource_type"],
        resource_id=str(doc["resource_id"]) if doc.get("resource_id") else None,
        details=doc.get("details"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )

async def ensure_indexes(db: AsyncIOMotorDatabase):
    await db[COLL].create_index([("created_at", -1)])
    await db[COLL].create_index("action")
    await db[COLL].create_index("resource_type")

async def log_event(
    db: AsyncIOMotorDatabase,
    actor_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict | None = None,
) -> AuditLogOut:
    now = datetime.now(timezone.utc)

    if actor_id is None:
        actor_id = "000000000000000000000000"  # system actor

    # normalize details into a dict
    normalized_details: dict[str, Any]
    if details is None:
        normalized_details = {}
    elif isinstance(details, dict):
        normalized_details = details
    else:
        # in case someone passes a string or other type
        normalized_details = {"raw": details}

    doc = {
        "actor_id": to_obj_id(actor_id),
        "action": action,
        "resource_type": resource_type,
        "resource_id": to_obj_id(resource_id) if resource_id else None,
        "details": normalized_details,
        "created_at": now,
        "updated_at": now,
    }

    res = await db[COLL].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _doc_to_out(doc)

async def list_logs(db: AsyncIOMotorDatabase, limit: int = 50) -> list[AuditLogOut]:
    cursor = db[COLL].find({}).sort("created_at", -1).limit(limit)
    return [_doc_to_out(d) async for d in cursor]
