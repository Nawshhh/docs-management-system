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
from datetime import datetime, timedelta


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
            email = body.email, password=body.password, profile={"first_name" : body.first_name, "last_name": body.last_name}, security_answer=body.security_answer,
            reset_attempts=0, reset_lock_until=None
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
    

class FindByEmailBody(BaseModel):
    email: str | None = None

@router.post("/find-by-email", response_model=ApiEnvelope)
async def find_user_by_email(
    body: FindByEmailBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        user = await users_repo.find_by_email(db, body.email)
        if not user:
            return fail("User not found")
        return ok(user)
    except Exception:
        return fail("Could not fetch user by email")
    
class FindNicknameBody(BaseModel):
    email: str | None = None
    security_answer : str | None = None


@router.post("/find-nickname", response_model=ApiEnvelope)
async def find_user_nickname(
    body: FindNicknameBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    COLL = "users"

    try:
        # 1) Fetch user by email
        user_doc = await db[COLL].find_one(
            {"email": body.email.lower().strip()}
        )
        if not user_doc:
            return fail("User not found")

        now = datetime.utcnow()

        # 2) Check if user is currently locked
        reset_lock_until = user_doc.get("reset_lock_until")
        if reset_lock_until and reset_lock_until > now:
            remaining = int((reset_lock_until - now).total_seconds())
            return fail(f"Too many attempts. Try again in {remaining} seconds.")

        # 3) compare nn
        stored_answer = (user_doc.get("security_answer") or "").strip().lower()
        provided_answer = (body.security_answer or "").strip().lower()

        if stored_answer != provided_answer:
            # 4) increment failed attempts
            current_attempts = user_doc.get("reset_attempts", 0) + 1

            update_doc = {"reset_attempts": current_attempts}

            # if 3 or more fail, set lock 1 minute
            if current_attempts >= 3:
                update_doc["reset_lock_until"] = now + timedelta(minutes=1)
                # reset attempts back to 0 after locking
                update_doc["reset_attempts"] = 0

            await db[COLL].update_one(
                {"_id": user_doc["_id"]},
                {"$set": update_doc}
            )

            return fail("Incorrect security answer")

        # 5) succes, reset attempts + lock
        await db[COLL].update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"reset_attempts": 0, "reset_lock_until": None}}
        )
        
        return ok({"security_answer_valid": True})

    except Exception as e:
        print("Error in find_user_nickname:", e)
        return fail("Could not verify security answer")



class ResetPasswordBody(BaseModel):
    user_id: str | None = None
    new_password : str | None = None

@router.post("/reset-password", response_model=ApiEnvelope)
async def reset_user_password(
    body: ResetPasswordBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        ok_flag = await users_repo.update_password(
            db, body.user_id, body.new_password
        )
        if not ok_flag:
            return fail("Password reset failed")
        return ok()
    except Exception as e:
        print(f"Error resetting user password: {e}")
        return fail("Could not reset password")
    
class GetUserByEmailBody(BaseModel):
    email: str | None = None

@router.post("/get-user-by-email", response_model=ApiEnvelope)
async def get_user_by_id(
    body: GetUserByEmailBody,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        user = await users_repo.get_user_by_email(db, body.email)
        if not user:
            return fail("User not found")
        return ok(user)
    except Exception as e:
        print(f"Error fetching user by ID: {e}")
        return fail("Could not fetch user by ID")