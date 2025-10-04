# backend/app/api.py
from typing import Any
from pydantic import BaseModel

class ApiEnvelope(BaseModel):
    ok: bool
    data: Any | None = None
    error: str | None = None

def ok(data: Any = None) -> ApiEnvelope:
    return ApiEnvelope(ok=True, data=data)

def fail(msg: str) -> ApiEnvelope:
    return ApiEnvelope(ok=False, error=msg)
