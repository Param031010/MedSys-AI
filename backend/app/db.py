import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        url = os.getenv("MONGODB_URL")
        if not url:
            raise RuntimeError("MONGODB_URL not set in environment")
        _client = AsyncIOMotorClient(url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Returns the medsysai database handle."""
    return get_client()["medsysai"]


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
