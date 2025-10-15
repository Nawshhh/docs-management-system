# backend/app/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from fastapi.exceptions import RequestValidationError
from pymongo.errors import DuplicateKeyError
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings 

from .api import ApiEnvelope
from .db import get_db
from .repos import users as users_repo
from .repos import documents as docs_repo
from .repos import audit_logs as logs_repo
from .models import UserCreate, Role, DocumentCreate, Attachment, AuditAction, ResourceType
from .config import settings

from .users.routes import router as users_router
from .documents.routes import router as documents_router
from .auth.routes import router as auth_router
from .audit.routes import router as audit_router

app = FastAPI(title="Simple DMS (RBAC Demo)")

origins = [
    "http://localhost:5173",  # Vite/React dev server
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,     # needed for cookies / tokens
    allow_methods=["*"],        # allow all HTTP methods
    allow_headers=["*"],        # allow all headers
)


app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(audit_router, prefix="/logs", tags=["audit logs"])

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