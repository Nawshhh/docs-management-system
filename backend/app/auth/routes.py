from fastapi import APIRouter, Depends, Header
from fastapi import status
from motor.motor_asyncio import AsyncIOMotorDatabase
import bcrypt
import jwt

from ..db import get_db
from ..config import settings
from ..api import ok, fail, ApiEnvelope
from ..repos import users as users_repo
from ..models import UserOut, Role
from .jwt import make_token, verify_token

from pydantic import BaseModel

router = APIRouter()

ACCESS_TTL_MIN = 15
REFRESH_TTL_MIN = 5  # 5 minutes

class LoginBody(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=ApiEnvelope)
async def login(body: LoginBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        user = await users_repo.find_by_email(db, body.email)
        if not user:
            return fail("Invalid credentials")
        if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
            return fail("Invalid credentials")

        access = make_token(
            user.id, secret=settings.JWT_SECRET, ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": (user.role.value if isinstance(user.role, Role) else user.role), "email": user.email}
        )
        refresh = make_token(user.id, secret=settings.JWT_REFRESH_SECRET, ttl_minutes=REFRESH_TTL_MIN)
        # return a light user payload to the client
        uout = await users_repo.get_user(db, user.id)
        return ok({"access": access, "refresh": refresh, "user": uout})
    except Exception:
        return fail("Could not login")

class RefreshBody(BaseModel):
    refresh: str

@router.post("/refresh", response_model=ApiEnvelope)
async def refresh_token(body: RefreshBody, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        decoded = verify_token(body.refresh, secret=settings.JWT_REFRESH_SECRET)
        uid = decoded.get("sub")
        if not uid:
            return fail("Invalid refresh token")

        u = await users_repo.get_user(db, uid)
        if not u:
            return fail("User no longer exists")

        access = make_token(
            uid, secret=settings.JWT_SECRET, ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": (u.role.value if isinstance(u.role, Role) else u.role), "email": u.email}
        )
        return ok({"access": access})
    except jwt.ExpiredSignatureError:
        return fail("Refresh token expired")
    except jwt.InvalidTokenError:
        return fail("Invalid refresh token")
    except Exception:
        return fail("Could not refresh token")

@router.get("/me", response_model=ApiEnvelope)
async def me(db: AsyncIOMotorDatabase = Depends(get_db), authorization: str | None = Header(default=None, alias="Authorization")):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return fail("Missing or invalid authorization header")
        token = authorization.split(" ", 1)[1]
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
async def logout():
    # Stateless JWT: client should discard tokens. (Add blacklist if you need server-side revocation.)
    return ok()
