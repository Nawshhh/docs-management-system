# backend/app/deps.py
from fastapi import Depends, Header, HTTPException, Security, status
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
    db: AsyncIOMotorDatabase = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> UserDB:
    if credentials is None or not credentials.scheme.lower() == "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = credentials.credentials
    try:
        decoded = verify_token(token, secret=settings.JWT_SECRET)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    uid = decoded.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token (no sub)")
    # load latest user
    user = await users_repo.get_user(db, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return user

def require_admin(user: UserDB = Depends(get_current_user)) -> UserDB:
    role = user.role if isinstance(user.role, Role) else Role(user.role)
    if role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user

# (from earlier answer — keep these if you added them)
def require_user(user: UserDB = Depends(get_current_user)) -> UserDB:
    return user

def require_manager_or_admin(user: UserDB = Depends(get_current_user)) -> UserDB:
    role = user.role if isinstance(user.role, Role) else Role(user.role)
    if role not in (Role.MANAGER, Role.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager or Admin only")
    return user