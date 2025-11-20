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

router = APIRouter()

def format_datetime(dt):
    """Convert UTC datetime to Philippines local time (GMT+8) and format."""
    if not dt:
        return None
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    # Convert UTC → GMT+8 (Philippines)
    dt = dt.astimezone(timezone(timedelta(hours=8)))
    return dt.strftime("%b %d, %Y, %I:%M %p")  # e.g. "Oct 04, 2025, 03:42 PM"

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
    
