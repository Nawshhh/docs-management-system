from fastapi import APIRouter, Depends, Header, Request
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
from ..models import UserOut, Role
from .jwt import make_token, verify_token
from ..repos import audit_logs as logs_repo

from pydantic import BaseModel

router = APIRouter()

ACCESS_TTL_MIN = 15
REFRESH_TTL_MIN = 5  # 5 minutes

class LoginBody(BaseModel):
    email: str
    password: str

LOGIN_MAX_ATTEMPTS = 3
LOGIN_LOCK_MINUTES = 1
COLL = "users"  # your users collection name

@router.post("/login", response_model=ApiEnvelope)
async def login(body: LoginBody, request: Request, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        email = body.email.lower().strip()

        # 1) Fetch user by email
        user_doc = await db[COLL].find_one({"email": email})
        if not user_doc:
            # you could also track attempts per IP/email here if you like
            return fail("User does not exist.")

        now = datetime.utcnow()
        client_ip = request.client.host if request.client else None

        # Capture PREVIOUS last use before we overwrite it
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

        # 3) Verify password
        stored_hash = user_doc.get("password_hash")
        if not stored_hash or not bcrypt.checkpw(body.password.encode(), stored_hash.encode()):
            # Wrong password → increment attempts + record last use (failed)
            current_attempts = user_doc.get("login_attempts", 0) + 1

            update_doc = {
                "login_attempts": current_attempts,
                "last_use_at": now,
                "last_use_success": False,
                "last_use_ip": client_ip,
            }

            # If 3 or more failures, lock for 1 minute
            if current_attempts >= LOGIN_MAX_ATTEMPTS:
                update_doc["login_lock_until"] = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
                # optionally reset attempts back to 0 once locked
                update_doc["login_attempts"] = 0

            await db[COLL].update_one(
                {"_id": user_doc["_id"]},
                {"$set": update_doc} 
            )

            await logs_repo.log_event(db, user_doc.get("_id"), "USER_LOGIN_FAIL", "USER", user_doc.get("_id"), {"role": user_doc.get("role")})
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

        # If role is stored as a string, just use it;
        # if you still have an Enum Role, you can map it.
        role_value = role.value if hasattr(role, "value") else role

        # 5) Create tokens
        access = make_token(
            user_id,
            secret=settings.JWT_SECRET,
            ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": role_value, "email": email},
        )
        refresh = make_token(
            user_id,
            secret=settings.JWT_REFRESH_SECRET,
            ttl_minutes=REFRESH_TTL_MIN,
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
            secure=False,       # True in production (HTTPS)
            samesite="lax",
            max_age=ACCESS_TTL_MIN * 60,
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=False,      # True in prod
            samesite="lax",
            max_age=60 * 60 * 24 * 7,
        )
        return response

    except Exception as e:
        print("Login error:", e)
        import traceback; traceback.print_exc()
        return fail("Could not login")

class AccessBody(BaseModel):
    page: str

@router.post("/admin-breach", response_model=ApiEnvelope)
async def admin_beach_log(
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
                resource_type="USER",
                resource_id=None,                     #  also None
                details={"page": "MANAGER", "status": "UNKNOWN"},
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
            return fail("Missing token (no header or cookie)")

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
    
@router.post("/logout")
async def logout():
    try:
        response = JSONResponse(content={"ok": True, "message": "Logged out successfully"})
        # delete refresh token cookie if it exists
        response.delete_cookie(
            key="access_token",
            samesite="lax",
            secure=False,  # True in production
        )
        return response
    except Exception as e:
        print("Logout error:", e)
        return JSONResponse(
            content={"ok": False, "error": "Logout failed"},
            status_code=500
        )
