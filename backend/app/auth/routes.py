from fastapi import APIRouter, Depends, Header, Request
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi.responses import JSONResponse
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
        if not user or not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
            return fail("Invalid credentials")

        access = make_token(
            user.id,
            secret=settings.JWT_SECRET,
            ttl_minutes=ACCESS_TTL_MIN,
            extra={"role": user.role.value, "email": user.email},
        )
        refresh = make_token(
            user.id,
            secret=settings.JWT_REFRESH_SECRET,
            ttl_minutes=REFRESH_TTL_MIN,
        )
        uout = await users_repo.get_user(db, user.id)
        # convert if needed
        if hasattr(uout, "dict"): 
            uout = uout.dict()
        if "_id" in uout:
            uout["_id"] = str(uout["_id"])

        envelope = ok({"access": access, "user": uout})
        response = JSONResponse(content=jsonable_encoder(envelope))
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

@router.post("/logout")
async def logout():
    try:
        response = JSONResponse(content={"ok": True, "message": "Logged out successfully"})
        # delete refresh token cookie if it exists
        response.delete_cookie(
            key="refresh_token",
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
