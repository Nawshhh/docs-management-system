from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import jwt  # PyJWT

ALGO = "HS256"

def _now() -> datetime:
    return datetime.now(tz=timezone.utc)

def make_token(subject: str, *, secret: str, ttl_minutes: int, extra: Dict[str, Any] | None = None) -> str:
    now = _now()
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, secret, algorithm=ALGO)

def verify_token(token: str, *, secret: str) -> Dict[str, Any]:
    # raises jwt.ExpiredSignatureError / jwt.InvalidTokenError if bad
    return jwt.decode(token, secret, algorithms=[ALGO])
