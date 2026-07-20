"""
profile.py — User profile CRUD router

Endpoints:
  GET  /api/profile          → fetch profile by user_id query param
  PUT  /api/profile          → upsert (create or update) a profile

Profile document shape (medsysai.profiles collection):
  {
    user_id:     str   (Clerk user ID — unique index)
    full_name:   str
    dob:         str
    email:       str
    phone:       str
    address:     str
    lang:        str
    age:         str
    weight:      str
    height:      str
    blood_group: str
    bmi:         str
    profile_pic: str   (base64 data-URL or Clerk image URL)
    updated_at:  datetime
  }
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db import get_db

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic model
# ---------------------------------------------------------------------------

class ProfilePayload(BaseModel):
    user_id:     str
    full_name:   str = ""
    dob:         str = ""
    email:       str = ""
    phone:       str = ""
    address:     str = ""
    lang:        str = ""
    age:         str = ""
    weight:      str = ""
    height:      str = ""
    blood_group: str = ""
    bmi:         str = ""
    profile_pic: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", summary="Get profile for a Clerk user")
async def get_profile(user_id: str = Query(..., description="Clerk user ID")):
    """
    Returns the profile document for the given user_id.
    Returns an empty dict if no profile has been saved yet (not a 404).
    """
    db = get_db()
    doc = await db.profiles.find_one({"user_id": user_id})
    if not doc:
        return {}
    return _serialize(doc)


@router.put("/", summary="Create or update a user profile")
async def upsert_profile(body: ProfilePayload):
    """
    Upserts the profile for the given user_id.
    All fields are replaced on each save (full document replace strategy).
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    payload = body.model_dump()
    payload["updated_at"] = now

    await db.profiles.update_one(
        {"user_id": body.user_id},
        {"$set": payload},
        upsert=True,
    )

    doc = await db.profiles.find_one({"user_id": body.user_id})
    return _serialize(doc)
