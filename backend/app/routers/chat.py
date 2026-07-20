import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import AsyncGroq
from pydantic import BaseModel

from app.db import get_db

load_dotenv()

router = APIRouter()

# ---------------------------------------------------------------------------
# Async Groq client
# ---------------------------------------------------------------------------
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = (
    "You are MedAssist, an AI medical assistant in MedsysAI. "
    "Help users with symptoms, medications, and health questions. "
    "Be concise, warm, and always note that responses are informational, not a diagnosis."
)

MAX_TOKENS = 1024
MAX_HISTORY = 10  # number of past messages to load from DB as LLM context


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    session_id: str
    user_id: str   # Clerk user ID — used to verify session ownership
    content: str   # the new user message


# ---------------------------------------------------------------------------
# Streaming endpoint — loads history from MongoDB, persists both turns
# ---------------------------------------------------------------------------

@router.post("/message", summary="Stream a Groq reply and persist to MongoDB")
async def chat_message(body: ChatRequest):
    db = get_db()
    now = datetime.now(timezone.utc)

    # 1️⃣  Verify the session belongs to this Clerk user
    session = await db.sessions.find_one({"session_id": body.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != body.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # 2️⃣  Persist the user message immediately
    await db.messages.insert_one({
        "session_id": body.session_id,
        "role": "user",
        "content": body.content,
        "created_at": now,
    })

    # 3️⃣  Update session: set title on first message, always bump updated_at
    is_first = not session.get("titled", False)
    update: dict = {"updated_at": now}
    if is_first:
        update["title"] = body.content[:60]
        update["titled"] = True
    await db.sessions.update_one(
        {"session_id": body.session_id},
        {"$set": update},
    )

    # 4️⃣  Load history from MongoDB (server-side, scoped to this session)
    #     We fetch MAX_HISTORY messages *before* the one we just inserted,
    #     so we sort descending and reverse for chronological order.
    history_cursor = db.messages.find(
        {"session_id": body.session_id, "role": {"$in": ["user", "assistant"]}},
        sort=[("created_at", -1)],
    ).limit(MAX_HISTORY + 1)  # +1 to include the message we just inserted
    history_docs = await history_cursor.to_list(length=MAX_HISTORY + 1)
    history_docs.reverse()  # chronological order

    # 5️⃣  Build context for Groq
    groq_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for doc in history_docs:
        # Skip if role is unknown
        if doc["role"] in ("user", "assistant"):
            groq_messages.append({"role": doc["role"], "content": doc["content"]})

    # 6️⃣  Stream and persist the assistant reply
    async def event_stream():
        collected: list[str] = []
        try:
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=groq_messages,
                temperature=0.7,
                max_tokens=MAX_TOKENS,
                top_p=1,
                stream=True,
                stop=None,
            )
            async for chunk in stream:
                token = chunk.choices[0].delta.content or ""
                if token:
                    collected.append(token)
                    yield f"data: {token}\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            # Persist the full assistant reply
            if collected:
                full_reply = "".join(collected)
                await db.messages.insert_one({
                    "session_id": body.session_id,
                    "role": "assistant",
                    "content": full_reply,
                    "created_at": datetime.now(timezone.utc),
                })
                await db.sessions.update_one(
                    {"session_id": body.session_id},
                    {"$set": {"updated_at": datetime.now(timezone.utc)}},
                )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
