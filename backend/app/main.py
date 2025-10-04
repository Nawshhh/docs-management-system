# backend/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from pymongo.errors import DuplicateKeyError

from .api import ApiEnvelope
from .db import get_db
from .repos import users as users_repo
from .repos import documents as docs_repo
from .repos import audit_logs as logs_repo
from .models import UserCreate, Role, DocumentCreate, Attachment, AuditAction, ResourceType
from .config import settings
from .users.routes import router as users_router
from .documents.routes import router as documents_router

app = FastAPI(title="Simple DMS (RBAC Demo)")
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])

@app.on_event("startup")
async def startup():
    db = get_db()
    # Ensure indexes
    await users_repo.ensure_indexes(db)
    await docs_repo.ensure_indexes(db)
    await logs_repo.ensure_indexes(db)
    # Optional: seed on first run (idempotent-ish)
    await _seed_if_empty()

async def _seed_if_empty():
    db = get_db()
    if await db["users"].count_documents({}) > 0:
        return
    # Create users
    admin = await users_repo.create_user(db, UserCreate(email="admin@dms.local", password="Admin123!", role=Role.ADMIN))
    manager = await users_repo.create_user(db, UserCreate(email="manager@dms.local", password="Manager123!", role=Role.MANAGER))
    employee = await users_repo.create_user(db, UserCreate(email="employee@dms.local", password="Employee123!", role=Role.EMPLOYEE))

    await users_repo.set_manager_scope(db, manager.id, [employee.id])
    await logs_repo.log_event(db, admin.id, AuditAction.USER_CREATE, ResourceType.USER, admin.id, {"seed": True})
    await logs_repo.log_event(db, admin.id, AuditAction.USER_CREATE, ResourceType.USER, manager.id, {"seed": True})
    await logs_repo.log_event(db, admin.id, AuditAction.USER_CREATE, ResourceType.USER, employee.id, {"seed": True})

    # Documents for employee
    d1 = await docs_repo.create_document(db, employee.id, DocumentCreate(title="Draft Doc", description="Still editing", attachments=[]))
    d2 = await docs_repo.create_document(db, employee.id, DocumentCreate(
        title="Needs Review", description="Please approve", attachments=[
            Attachment(file_id="000000000000000000000000", filename="placeholder.pdf", size=12345, content_type="application/pdf")
        ]))
    await docs_repo.submit_for_review(db, d2.id, employee.id)
    await logs_repo.log_event(db, employee.id, AuditAction.DOC_CREATE, ResourceType.DOCUMENT, d1.id)
    await logs_repo.log_event(db, employee.id, AuditAction.DOC_CREATE, ResourceType.DOCUMENT, d2.id)
    await logs_repo.log_event(db, employee.id, AuditAction.DOC_SUBMIT, ResourceType.DOCUMENT, d2.id)

@app.get("/health")
async def health():
    return {"ok": True}

# @app.exception_handler(HTTPException)
# async def http_exception_to_envelope(request: Request, exc: HTTPException):
#     # Convert HTTP errors to 200 with {ok:false}
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error=str(exc.detail)).model_dump())

# @app.exception_handler(RequestValidationError)
# async def body_validation_to_envelope(request: Request, exc: RequestValidationError):
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error="Invalid request body").model_dump())

# @app.exception_handler(ValidationError)
# async def pydantic_validation_to_envelope(request: Request, exc: ValidationError):
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error="Validation error").model_dump())

# @app.exception_handler(DuplicateKeyError)
# async def duplicate_key_to_envelope(request: Request, exc: DuplicateKeyError):
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error="Email already exists").model_dump())

# @app.exception_handler(Exception)
# async def unhandled_to_envelope(request: Request, exc: Exception):
#     # Last resort: log server-side, respond safely client-side
#     # (You can add real logging here.)
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error="Unexpected server error").model_dump())

# @app.exception_handler(RequestValidationError)
# async def body_validation_to_envelope(request, exc: RequestValidationError):
#     # surface the first concrete error to the client
#     if exc.errors():
#         e = exc.errors()[0]
#         loc = ".".join(str(p) for p in e.get("loc", []))
#         msg = e.get("msg", "Invalid request body")
#         detail = f"{loc}: {msg}" if loc else msg
#     else:
#         detail = "Invalid request body"
#     return JSONResponse(status_code=200, content=ApiEnvelope(ok=False, error=detail).model_dump())