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



router = APIRouter()

class CreateUserBody(BaseModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None

class ChangeRoleBody(BaseModel):
    role: Role  # ADMIN | MANAGER | EMPLOYEE

class ScopeBody(BaseModel):
    employee_ids: list[str]

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
        return fail("Email already exists")
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

@router.post("/{manager_id}/scope", response_model=ApiEnvelope)
async def set_manager_scope(
    manager_id: str,
    body: ScopeBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin = Depends(require_admin),
):
    try:
        manager = await users_repo.get_user(db, manager_id)
        if not manager:
            return fail("Manager not found")
        if (manager.role if isinstance(manager.role, Role) else Role(manager.role)) != Role.MANAGER:
            return fail("Target user is not a MANAGER")

        ok_flag = await users_repo.set_manager_scope(db, manager_id, body.employee_ids)
        if not ok_flag:
            return fail("Failed updating scope")

        await logs_repo.log_event(db, _admin.id, "ROLE_ASSIGN", "USER", manager_id, {"scope_set": body.employee_ids})
        return ok()  # no data
    except Exception:
        return fail("Could not set manager scope")

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