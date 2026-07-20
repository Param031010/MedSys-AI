import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        url = os.getenv("MONGODB_URL")
        if not url:
            raise RuntimeError("MONGODB_URL not set in environment")
        _client = AsyncIOMotorClient(
            url,
            serverSelectionTimeoutMS=10_000,
            tlsAllowInvalidCertificates=True,  # workaround for Windows/Python 3.12 TLS handshake issue
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Returns the medsysai database handle."""
    return get_client()["medsysai"]


async def ensure_indexes() -> None:
    """Create indexes required for efficient per-user history queries."""
    db = get_db()
    # sessions: fast lookup by user_id and by session_id
    await db.sessions.create_index([("user_id", pymongo.ASCENDING)])
    await db.sessions.create_index([("session_id", pymongo.ASCENDING)], unique=True)
    # messages: fast retrieval by session_id in chronological order
    await db.messages.create_index(
        [("session_id", pymongo.ASCENDING), ("created_at", pymongo.ASCENDING)]
    )
    # profiles: one document per Clerk user
    await db.profiles.create_index([("user_id", pymongo.ASCENDING)], unique=True)
    print("[OK] MongoDB indexes ensured")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
