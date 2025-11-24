from fastapi import APIRouter, Depends, Header, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
import jwt

from ..db import get_db
from ..config import settings
from ..api import ok, fail, ApiEnvelope
from ..auth.jwt import verify_token
from ..repos import audit_logs as logs_repo
from ..models import Role

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+

router = APIRouter()

MANILA_TZ = ZoneInfo("Asia/Manila")

def format_datetime(dt: datetime | None) -> str:
    """
    Converts a UTC datetime to Manila time (Asia/Manila) for display.
    """
    if dt is None:
        return ""
    # assume dt is timezone-aware UTC from DB
    if dt.tzinfo is None:
        # if somehow naive, treat as UTC
        dt = dt.replace(tzinfo=timezone.utc)
    local_dt = dt.astimezone(MANILA_TZ)
    return local_dt.strftime("%Y-%m-%d %H:%M:%S")

@router.get("/", response_model=ApiEnvelope)
async def list_audit_logs(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    try:
        token: str | None = None

        # 1) Try Bearer header (for backwards compatibility)
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1]
        else:
            # 2) Fallback to access_token cookie (new flow)
            token = request.cookies.get("access_token")

        if not token:
            return fail("You are not authorized")

        decoded = verify_token(token, secret=settings.JWT_SECRET)
        role = decoded.get("role")

        if role != Role.ADMIN.value:
            return fail("Access denied — admins only")

        logs = await logs_repo.list_logs(db)
        serialized_logs = []

        for log in logs:
            log_dict = log.model_dump()
            log_dict["_id"] = str(log_dict.get("_id", ""))
            log_dict["actor_id"] = str(log_dict.get("actor_id", ""))
            log_dict["resource_id"] = str(log_dict.get("resource_id", ""))
            log_dict["created_at"] = format_datetime(log_dict.get("created_at"))
            log_dict["updated_at"] = format_datetime(log_dict.get("updated_at"))
            serialized_logs.append(log_dict)

        return ok(serialized_logs)

    except Exception as e:
        print(f"Error listing logs: {e}")
        return fail("Could not fetch audit logs")
    
