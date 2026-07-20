import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_db

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _group_label(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    delta = now.date() - dt.date()
    if delta.days == 0:
        return "Today"
    if delta.days == 1:
        return "Yesterday"
    if delta.days <= 7:
        return "Previous 7 Days"
    return "Older"


async def _require_session_owner(session_id: str, user_id: str) -> dict:
    """Fetch a session and verify it belongs to the requesting user.
    Raises 404 if not found, 403 if the owner does not match.
    """
    db = get_db()
    session = await db.sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return session


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    user_id: str
    title: str = "New chat"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", summary="List sessions for a user")
async def list_sessions(user_id: str = Query(...)):
    """Returns all sessions for a user, ordered by most-recent first."""
    db = get_db()
    cursor = db.sessions.find(
        {"user_id": user_id},
        sort=[("updated_at", -1)],
    )
    sessions = await cursor.to_list(length=100)
    return [_serialize(s) for s in sessions]


@router.post("/", summary="Create a new chat session")
async def create_session(body: CreateSessionRequest):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": body.user_id,
        "title": body.title,
        "created_at": now,
        "updated_at": now,
    }
    await db.sessions.insert_one(doc)
    return _serialize(doc)


@router.get("/{session_id}/messages", summary="Get messages for a session")
async def get_messages(session_id: str, user_id: str = Query(...)):
    """Returns all messages for a session.
    Requires user_id to verify ownership before returning any data.
    """
    await _require_session_owner(session_id, user_id)
    db = get_db()
    cursor = db.messages.find(
        {"session_id": session_id},
        sort=[("created_at", 1)],
    )
    messages = await cursor.to_list(length=500)
    return [_serialize(m) for m in messages]


@router.delete("/{session_id}", summary="Delete a session and all its messages")
async def delete_session(session_id: str, user_id: str = Query(...)):
    """Deletes a session and all its messages.
    Requires user_id to verify ownership before deleting.
    """
    await _require_session_owner(session_id, user_id)
    db = get_db()
    await db.sessions.delete_one({"session_id": session_id})
    await db.messages.delete_many({"session_id": session_id})
    return {"ok": True}
