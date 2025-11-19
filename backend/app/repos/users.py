# backend/app/repos/users.py
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
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
        "security_answer": payload.security_answer,
    }
    res = await db[COLL].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _doc_to_out(doc)

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserDB]:
    doc = await db[COLL].find_one({"email": email.lower().strip()})
    if not doc: return None
    return str(doc["_id"])

async def find_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserDB]:
    doc = await db[COLL].find_one({"email": email.lower().strip()})
    if not doc:
        return None
    return UserDB(
        id=str(doc["_id"]),
        email=doc["email"],
        password_hash=doc["password_hash"],
        role=doc["role"],            # if this is already a string, later don't use .value
        profile=doc.get("profile"),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )

async def find_by_security_answer(db: AsyncIOMotorDatabase, email: str, security_answer: str) -> Optional[UserDB]:
    doc = await db[COLL].find_one({"email": email.lower().strip(), "security_answer": security_answer})
    if not doc: return False
    return True

MAX_HISTORY = 5  # keep last 5 hashes

async def update_password(
    db: AsyncIOMotorDatabase,
    user_id: str,
    new_plain_password: str
) -> tuple[bool, str | None]:
    COLL = "users"
    user_doc = await db[COLL].find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        return False, "User not found"

    current_hash = user_doc.get("password_hash")
    history = user_doc.get("password_history", [])

    # 1) check new password against current + history
    all_hashes: list[str] = []
    if current_hash:
        all_hashes.append(current_hash)
    for entry in history:
        h = entry.get("password_hash")
        if h:
            all_hashes.append(h)

    for h in all_hashes:
        if bcrypt.checkpw(new_plain_password.encode(), h.encode()):
            return False, "New password was used recently. Please choose a different one."

    # 2) if valid, push current password into history
    now = datetime.now(timezone.utc)

    if current_hash:
        history.insert(0, {
            "password_hash": current_hash,
            "changed_at": now,   # timezone-aware
        })
        history = history[:MAX_HISTORY]

    # 3) hash the new password
    new_hash = bcrypt.hashpw(new_plain_password.encode(), bcrypt.gensalt()).decode()

    # 4) save new password, history, and last_password_change_at
    await db[COLL].update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "password_history": history,
                "last_password_change_at": now,
            }
        }
    )

    return True, None

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