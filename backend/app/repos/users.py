# backend/app/repos/users.py
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import bcrypt

from ..models import UserCreate, UserDB, UserOut, Role
from .utils import to_obj_id, from_obj_id

COLL = "users"

def _doc_to_out(doc) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        email=doc["email"],
        role=doc["role"],
        profile=doc.get("profile"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )

async def ensure_indexes(db: AsyncIOMotorDatabase):
    await db[COLL].create_index("email", unique=True)
    await db[COLL].create_index("role")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

async def create_user(db: AsyncIOMotorDatabase, payload: UserCreate, role_override: Optional[Role] = None) -> UserOut:
    now = datetime.utcnow()
    doc = {
        "email": payload.email.lower().strip(),
        "password_hash": hash_password(payload.password),
        "role": (role_override or payload.role).value if isinstance((role_override or payload.role), Role) else (role_override or payload.role),
        "profile": payload.profile or {},
        "created_at": now,
        "updated_at": now,
    }
    res = await db[COLL].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _doc_to_out(doc)

async def find_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserDB]:
    doc = await db[COLL].find_one({"email": email.lower().strip()})
    if not doc: return None
    return UserDB(
        id=str(doc["_id"]),
        email=doc["email"],
        password_hash=doc["password_hash"],
        role=doc["role"],
        profile=doc.get("profile"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )

async def get_user(db: AsyncIOMotorDatabase, user_id: str) -> Optional[UserOut]:
    doc = await db[COLL].find_one({"_id": to_obj_id(user_id)})
    return _doc_to_out(doc) if doc else None

async def delete_user(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    res = await db[COLL].delete_one({"_id": to_obj_id(user_id)})
    return res.deleted_count == 1

async def get_all_users(db):
    try:
        cursor = db.users.find({})
        users = await cursor.to_list(length=None)
        return users
    except Exception as e:
        print(f"[get_all_users] DB error: {e}")
        return []