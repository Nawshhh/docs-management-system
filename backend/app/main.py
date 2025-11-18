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
    "http://localhost:5173"  # Vite/React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # for demo purposes, allow all origins
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
