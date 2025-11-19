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
    db = get_db()  # if get_db is async, make this: db = await get_db()

    # Ensure indexes
    await users_repo.ensure_indexes(db)
    await docs_repo.ensure_indexes(db)
    await logs_repo.ensure_indexes(db)

    # ---- Seed 3 admin accounts if users collection is empty ----
# ---- Seed 3 admin accounts if users collection is empty ----
    user_count = await db["users"].count_documents({})
    if user_count == 0:
        seed_admins = [
            {
                "email": "admin1@example.com",
                "password": "admin1!",
                "first_name": "Admin",
                "last_name": "One",
                "security_answer": "admin1",
            },
            {
                "email": "admin2@example.com",
                "password": "admin2!",
                "first_name": "Admin",
                "last_name": "Two",
                "security_answer": "admin2",
            },
            {
                "email": "admin3@example.com",
                "password": "admin3!",
                "first_name": "Admin",
                "last_name": "Three",
                "security_answer": "admin3",
            },
        ]

        for adm in seed_admins:
            payload = UserCreate(
                email=adm["email"],
                password=adm["password"],
                role=Role.ADMIN,
                profile={
                    "first_name": adm["first_name"],
                    "last_name": adm["last_name"],
                },
                security_answer=adm["security_answer"],
                reset_attempts=0,
                reset_lock_until=None,
                password_history=[],
                last_use_at=None,
                last_use_success=None,
                last_use_ip=None,
                manager_id=None,
                last_password_change_at=None,
            )

            try:
                user = await users_repo.create_user(db, payload)
                await logs_repo.log_event(
                    db,
                    actor_id=None,
                    action="USER_CREATE",
                    resource_type="USER",
                    resource_id=user.id,
                    details={"seed_admin": True, "email": adm["email"]},
                )
                print(f"Seeded admin user: {adm['email']}")
            except DuplicateKeyError:
                print(f"Admin user already exists: {adm['email']}")

        # ---- Seed 5 manager accounts ----
        seed_managers = [
            {
                "email": "manager1@example.com",
                "password": "manager1!",
                "first_name": "Manager",
                "last_name": "One",
                "security_answer": "manager1",
            },
            {
                "email": "manager2@example.com",
                "password": "manager2!",
                "first_name": "Manager",
                "last_name": "Two",
                "security_answer": "manager2",
            },
            {
                "email": "manager3@example.com",
                "password": "manager3!",
                "first_name": "Manager",
                "last_name": "Three",
                "security_answer": "manager3",
            },
            {
                "email": "manager4@example.com",
                "password": "manager4!",
                "first_name": "Manager",
                "last_name": "Four",
                "security_answer": "manager4",
            },
            {
                "email": "manager5@example.com",
                "password": "manager5!",
                "first_name": "Manager",
                "last_name": "Five",
                "security_answer": "manager5",
            },
        ]

        for mgr in seed_managers:
            payload = UserCreate(
                email=mgr["email"],
                password=mgr["password"],
                role=Role.MANAGER,
                profile={
                    "first_name": mgr["first_name"],
                    "last_name": mgr["last_name"],
                },
                security_answer=mgr["security_answer"],
                reset_attempts=0,
                reset_lock_until=None,
                password_history=[],
                last_use_at=None,
                last_use_success=None,
                last_use_ip=None,
                manager_id=None,
                last_password_change_at=None,
            )

            try:
                user = await users_repo.create_user(db, payload)
                await logs_repo.log_event(
                    db,
                    actor_id=None,
                    action="USER_CREATE",
                    resource_type="USER",
                    resource_id=user.id,
                    details={"seed_manager": True, "email": mgr["email"]},
                )
                print(f"Seeded manager user: {mgr['email']}")
            except DuplicateKeyError:
                print(f"Manager user already exists: {mgr['email']}")


