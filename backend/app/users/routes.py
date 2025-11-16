# backend/app/users/routes.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from ..deps import require_admin
from ..db import get_db
from ..models import Role, UserCreate, UserOut
from ..repos import users as users_repo
from ..repos import audit_logs as logs_repo
from ..api import ok, fail, ApiEnvelope

from bson import ObjectId
from datetime import datetime

router = APIRouter()

class CreateUserBody(BaseModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    security_answer: str | None = None

class ChangeRoleBody(BaseModel):
    role: Role  # ADMIN | MANAGER | EMPLOYEE

@router.post("/admins", response_model=ApiEnvelope)
async def create_admin(
    body: CreateUserBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin = Depends(require_admin),
):
    try:
        payload = UserCreate(
            email=body.email, password=body.password, role=Role.ADMIN,
            profile={"first_name": body.first_name, "last_name": body.last_name}
        )
        user = await users_repo.create_user(db, payload, role_override=Role.ADMIN)
        await logs_repo.log_event(db, _admin.id, "USER_CREATE", "USER", user.id, {"role": "ADMIN"})
        return ok(user)
    except DuplicateKeyError:
        return fail("Email/User already exists")
    except Exception as e:
        return fail(f"Could not create admin")

@router.post("/managers", response_model=ApiEnvelope)
async def create_manager(
    body: CreateUserBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin = Depends(require_admin),
):
    try:
        payload = UserCreate(
            email=body.email, password=body.password, role=Role.MANAGER,
            profile={"first_name": body.first_name, "last_name": body.last_name}
        )
        user = await users_repo.create_user(db, payload, role_override=Role.MANAGER)
        await logs_repo.log_event(db, _admin.id, "USER_CREATE", "USER", user.id, {"role": "MANAGER"})
        return ok(user)
    except DuplicateKeyError:
        return fail("Email already exists")
    except Exception:
        return fail("Could not create manager")

@router.patch("/{user_id}/role", response_model=ApiEnvelope)
async def change_role(
    user_id: str,
    body: ChangeRoleBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin = Depends(require_admin),
):
    try:
        user = await users_repo.get_user(db, user_id)
        if not user:
            return fail("User not found")
        if user.id == _admin.id and body.role != Role.ADMIN:
            return fail("Refusing to demote the only active admin")

        from datetime import datetime
        res = await db["users"].find_one_and_update(
            {"_id": users_repo.to_obj_id(user_id)},
            {"$set": {"role": body.role.value, "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if not res:
            return fail("Role update failed")
        await logs_repo.log_event(db, _admin.id, "ROLE_ASSIGN", "USER", user_id, {"new_role": body.role.value})
        return ok(await users_repo.get_user(db, user_id))
    except Exception:
        return fail("Could not change role")

@router.delete("/{user_id}", response_model=ApiEnvelope)
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin = Depends(require_admin),
):
    try:
        if user_id == _admin.id:
            return fail("Admins cannot delete themselves via this endpoint")
        ok_flag = await users_repo.delete_user(db, user_id)
        if not ok_flag:
            return fail("User not found or already deleted")
        await logs_repo.log_event(db, _admin.id, "USER_DELETE", "USER", user_id)
        return ok()
    except Exception:
        return fail("Could not delete user")
    
@router.post("/employee", response_model=ApiEnvelope)
async def create_employee(
    body: CreateUserBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:

        placeholder_id = None

        payload = UserCreate(
            email = body.email, password=body.password, profile={"first_name" : body.first_name, "last_name": body.last_name}, security_answer=body.security_answer
        )
        user = await users_repo.create_user(db, payload)
        await logs_repo.log_event(db, placeholder_id,"USER_CREATE", "USER", user.id, {"role": "EMPLOYEE"})
        return ok(user)
    except DuplicateKeyError:
        return fail("Email/User already exists")
    

def serialize_user(user):
    """Convert MongoDB types into JSON-safe values"""
    safe_user = {}

    for key, value in user.items():
        if isinstance(value, ObjectId):
            safe_user[key] = str(value)
        elif isinstance(value, list):
            safe_user[key] = [str(v) if isinstance(v, ObjectId) else v for v in value]
        elif isinstance(value, datetime):
            safe_user[key] = value.isoformat()
        elif isinstance(value, dict):
            safe_user[key] = {
                k: (str(v) if isinstance(v, ObjectId) else v) for k, v in value.items()
            }
        else:
            safe_user[key] = value

    return safe_user

@router.get("", tags=["users"])
async def get_all_users(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        users = await users_repo.get_all_users(db)
        serialized_users = [serialize_user(u) for u in users]
        return {"ok": True, "data": serialized_users, "error": None}
    except Exception as e:
        print(f"Error fetching users: {e}")
        return {"ok": False, "data": None, "error": str(e)}
    

