from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi.responses import JSONResponse
import bcrypt
import jwt
from datetime import datetime, timedelta

from ..db import get_db
from ..config import settings
from ..api import ok, fail, ApiEnvelope
from ..repos import users as users_repo
from ..models import UserOut, Role, UserDB
from .jwt import make_token, verify_token
from ..repos import audit_logs as logs_repo
from ..deps import get_current_user

from pydantic import BaseModel

import re

router = APIRouter()

ACCESS_TTL_MIN = 15

class LoginBody(BaseModel):
    email: str
    password: str

LOGIN_MAX_ATTEMPTS = 4
LOGIN_LOCK_MINUTES = 1
COLL = "users"  # your users collection name

@router.post("/login", response_model=ApiEnvelope)
async def login(body: LoginBody, request: Request, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        password = body.password
        email_raw = body.email

        # Email pattern REGEX
        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.fullmatch(email_pattern, email_raw):
            return fail("Invalid credentials")

        # Password checks equivalent to your frontend:
        # - 7–20 chars
        # - at least one number
        # - at least one special char (non-alphanumeric)

        email = email_raw.lower().strip()

        # 1) Fetch user by email
        user_doc = await db[COLL].find_one({"email": email})
        if not user_doc:
            return fail("Invalid credentials.")

        now = datetime.utcnow()
        client_ip = request.client.host if request.client else None

        # Capture PREVIOUS last use before overwrite it
        prev_last_use = {
            "at": user_doc.get("last_use_at"),
            "success": user_doc.get("last_use_success"),
            "ip": user_doc.get("last_use_ip"),
        }

        # 2) Check if user is currently locked
        login_lock_until = user_doc.get("login_lock_until")
        if login_lock_until and login_lock_until > now:
            remaining = int((login_lock_until - now).total_seconds())
            await logs_repo.log_event(db, user_doc.get("_id"), "USER_LOCKOUT", "USER", user_doc.get("_id"), {"role": user_doc.get("role")})
            return fail(f"Too many login attempts. Try again in {remaining} seconds.")

        password = body.password

        async def needs_format_fail() -> bool:
            if not (7 <= len(password) <= 20):
                await logs_repo.log_event(
                    db,
                    actor_id=user_doc.get("_id"),
                    action="OUT_OF_RANGE_PASS",
                    resource_type="VALIDATION",
                    resource_id=None,
                    details={},
                )
                return True

            if not any(ch.isdigit() for ch in password):
                await logs_repo.log_event(
                    db,
                    actor_id=user_doc.get("_id"),
                    action="NO_DIGIT_PASS",
                    resource_type="VALIDATION",
                    resource_id=None,
                    details={},
                )
                return True

            if not re.search(r"[^A-Za-z0-9]", password):
                await logs_repo.log_event(
                    db,
                    actor_id=user_doc.get("_id"),
                    action="INC_CHAR_PASS",
                    resource_type="VALIDATION",
                    resource_id=None,
                    details={},
                )
                return True

            return False

        
        if await needs_format_fail():
            current_attempts = user_doc.get("login_attempts", 0) + 1

            update_doc = {
                "login_attempts": current_attempts,
                "last_use_at": now,
                "last_use_success": False,
                "last_use_ip": client_ip,
            }

            if current_attempts >= LOGIN_MAX_ATTEMPTS:
                update_doc["login_lock_until"] = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
                update_doc["login_attempts"] = 0

            await db[COLL].update_one(
                {"_id": user_doc["_id"]},
                {"$set": update_doc},
            )

            await logs_repo.log_event(
                db,
                user_doc.get("_id"),
                "USER_LOGIN_FAIL",
                "USER",
                user_doc.get("_id"),
                {"role": user_doc.get("role"), "reason": "password_format"},
            )

            return fail("Invalid credentials")
        
        # 3) Verify password (hash)
        stored_hash = user_doc.get("password_hash")
        if not stored_hash or not bcrypt.checkpw(password.encode(), stored_hash.encode()):
            current_attempts = user_doc.get("login_attempts", 0) + 1

            update_doc = {
                "login_attempts": current_attempts,
                "last_use_at": now,
                "last_use_success": False,
                "last_use_ip": client_ip,
            }

            if current_attempts >= LOGIN_MAX_ATTEMPTS:
                update_doc["login_lock_until"] = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
                update_doc["login_attempts"] = 0

            await db[COLL].update_one(
                {"_id": user_doc["_id"]},
                {"$set": update_doc},
            )

            user = await users_repo.find_by_email(db, body.email)

            await logs_repo.log_event(
                db,
                user_doc.get("_id"),
                "USER_LOGIN_FAIL",
                "USER",
                user_doc.get("_id"),
                {"role": user_doc.get("role"), "reason": "bad_hash"},
            )

            return fail("Invalid credentials")       

        # 4) On successful login, reset attempts & lock + record last use (success)
        update_doc = {
            "login_attempts": 0,
            "login_lock_until": None,
            "last_use_at": now,
            "last_use_success": True,
            "last_use_ip": client_ip,
        }

        await logs_repo.log_event(db, user_doc.get("_id"), "USER_LOGIN", "USER", user_doc.get("_id"), {"role": user_doc.get("role")})

        await db[COLL].update_one(
            {"_id": user_doc["_id"]},
            {"$set": update_doc}
        )

        user_id = str(user_doc["_id"])
        role = user_doc.get("role")
        email = user_doc.get("email")

        role_value = role.value if hasattr(role, "value") else role

        # 5) Create tokens
        access = make_token(
            user_id,
            secret=settings.JWT_SECRET,
            ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": role_value, "email": email},
        )

        # 6) Load full user representation (as you already do)
        uout = await users_repo.get_user(db, user_id)
        if hasattr(uout, "dict"):
            uout = uout.dict()
        if "_id" in uout:
            uout["_id"] = str(uout["_id"])

        # include previous last use in response
        envelope = ok({
            "access": access,
            "user": uout,
            "last_use": prev_last_use,
        })

        response = JSONResponse(content=jsonable_encoder(envelope))

        response.set_cookie(
            key="access_token",
            value=access,
            httponly=True,
            secure=False,       
            samesite="lax",
            max_age=ACCESS_TTL_MIN * 60,
        )

        return response

    except Exception as e:
        print("Login error:", e)
        import traceback; traceback.print_exc()
        return fail("Could not login")

class AccessBody(BaseModel):
    page: str

@router.post("/page-breach", response_model=ApiEnvelope)
async def page_breach_log(
    body: AccessBody,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        if body.page == "ADMIN":
            await logs_repo.log_event(
                db,
                actor_id="000000000000000000000000",   # system
                action="FAILED_ADMIN_PAGE_ACCESS",
                resource_type="AUTH",
                resource_id=None,                     #  no ObjectId here
                details={"page": "ADMIN", "status": "UNKNOWN"},
            )
        elif body.page == "MANAGER":
            await logs_repo.log_event(
                db,
                actor_id="000000000000000000000000",
                action="FAILED_MANAGER_PAGE_ACCESS",
                resource_type="AUTH",
                resource_id=None,                     #  also None
                details={"page": "MANAGER", "status": "UNKNOWN"},
            )
        else:
            await logs_repo.log_event(
                db,
                actor_id="000000000000000000000000",
                action="FAILED_EMPLOYEE_PAGE_ACCESS",
                resource_type="AUTH",
                resource_id=None,                     #  also None
                details={"page": "EMPLOYEE", "status": "UNKNOWN"},
            )

        return ok()
    except Exception as e:
        print("Error logging breach:", e)
        return fail("Failed auth")



class RefreshBody(BaseModel):
    refresh: str

@router.post("/refresh", response_model=ApiEnvelope)
async def refresh_token(request: Request, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        refresh = request.cookies.get("refresh_token")
        if not refresh:
            return fail("No refresh token")

        decoded = verify_token(refresh, secret=settings.JWT_REFRESH_SECRET)
        uid = decoded.get("sub")
        if not uid:
            return fail("Invalid refresh token")

        u = await users_repo.get_user(db, uid)
        if not u:
            return fail("User no longer exists")

        access = make_token(
            uid,
            secret=settings.JWT_SECRET,
            ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": u.role.value, "email": u.email},
        )
        return ok({"access": access})
    except jwt.ExpiredSignatureError:
        return fail("Refresh token expired")
    except jwt.InvalidTokenError:
        return fail("Invalid refresh token")
    except Exception:
        return fail("Could not refresh token")

@router.get("/me", response_model=ApiEnvelope)
async def me(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    try:
        token: str | None = None

        # 1) Try Authorization header first
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
        else:
            # 2) Fallback: try cookie
            token = request.cookies.get("access_token")

        if not token:
            return fail("You need to log-in.")

        decoded = verify_token(token, secret=settings.JWT_SECRET)
        uid = decoded.get("sub")
        u = await users_repo.get_user(db, uid)
        if not u:
            return fail("User not found")

        return ok(u)

    except jwt.ExpiredSignatureError:
        return fail("Access token expired")
    except jwt.InvalidTokenError:
        return fail("Invalid access token")
    except Exception:
        return fail("Could not fetch profile")
    
@router.post("/logout", response_model=ApiEnvelope)
async def logout(
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    try:
        response.delete_cookie("access_token", samesite="lax", secure=False)

        print("Current User: ", current_user.id)
        print("Current Role: ", current_user.role)


        await logs_repo.log_event(
            db,
            actor_id=str(current_user.id),
            action="USER_LOGOUT",
            resource_type="USER",
            resource_id=str(current_user.id),
            details={"role": str(current_user.role)},
        )

        return ok({"message": "Logged out successfully"})
    except Exception as e:
        print("Logout error:", e)
        return fail("Logout failed")

