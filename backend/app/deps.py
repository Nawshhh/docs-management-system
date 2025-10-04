# backend/app/deps.py
from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from .db import get_db
from .repos import users as users_repo
from .models import Role, UserDB

async def get_current_user(
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> UserDB:
    """
    TEMP AUTH for demo: read X-User-Email, load user.
    Replace with real JWT later.
    """
    if not x_user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Email")
    user = await users_repo.find_by_email(db, x_user_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return user

def require_admin(user: UserDB = Depends(get_current_user)) -> UserDB:
    if (user.role if isinstance(user.role, Role) else Role(user.role)) != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user
