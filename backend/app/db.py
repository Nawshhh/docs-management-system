from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGO_URI)
    return client

def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.MONGO_DB]