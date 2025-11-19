# backend/app/deps.py
from fastapi import Depends, Header, HTTPException, Security, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .db import get_db
from .repos import users as users_repo
from .models import Role, UserDB
from .config import settings
from .auth.jwt import verify_token
import jwt

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> UserDB:
    token: str | None = None

    # 1) Try Authorization: Bearer <token> (old behavior, still supported)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    else:
        # 2) Fallback: use cookie-based auth
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated (no token in header or cookie)",
        )

    # 3) Decode JWT
    try:
        decoded = verify_token(token, secret=settings.JWT_SECRET)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # 4) Load user from DB
    user = await users_repo.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

def require_admin(user: UserDB = Depends(get_current_user)) -> UserDB:
    role = user.role if isinstance(user.role, Role) else Role(user.role)
    if role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user

def require_user(user: UserDB = Depends(get_current_user)) -> UserDB:
    return user

def require_manager_or_admin(user: UserDB = Depends(get_current_user)) -> UserDB:
    role = user.role if isinstance(user.role, Role) else Role(user.role)
    if role not in (Role.MANAGER, Role.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or Admin only")
    return user