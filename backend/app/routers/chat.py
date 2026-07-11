import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import APIRouter
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

MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = (
    "You are MedAssist, an AI medical assistant in MedsysAI. "
    "Help users with symptoms, medications, and health questions. "
    "Be concise, warm, and always note that responses are informational, not a diagnosis."
)

MAX_TOKENS = 1024
MAX_HISTORY = 6   # keep well under the 8 000 TPM free-tier cap


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str      # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: str
    user_id: str
    content: str                      # the new user message
    history: list[ChatMessage] = []   # previous messages (for context)


# ---------------------------------------------------------------------------
# Streaming endpoint — persists both user + assistant messages to MongoDB
# ---------------------------------------------------------------------------

@router.post("/message", summary="Stream a Groq reply and persist to MongoDB")
async def chat_message(body: ChatRequest):
    db = get_db()
    now = datetime.now(timezone.utc)

    # 1️⃣  Persist the user message immediately
    await db.messages.insert_one({
        "session_id": body.session_id,
        "role": "user",
        "content": body.content,
        "created_at": now,
    })

    # 2️⃣  Update session: set title on first message, always bump updated_at
    session = await db.sessions.find_one({"session_id": body.session_id})
    is_first = session and not session.get("titled", False)
    update: dict = {"updated_at": now}
    if is_first:
        update["title"] = body.content[:60]
        update["titled"] = True
    await db.sessions.update_one(
        {"session_id": body.session_id},
        {"$set": update},
    )

    # 3️⃣  Build context for Groq (system + last N turns + new user message)
    recent = body.history[-(MAX_HISTORY - 1):]   # leave room for new msg
    groq_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    groq_messages += [{"role": m.role, "content": m.content} for m in recent]
    groq_messages.append({"role": "user", "content": body.content})

    # 4️⃣  Stream and persist the assistant reply
    async def event_stream():
        collected: list[str] = []
        try:
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=groq_messages,
                temperature=1,
                max_completion_tokens=MAX_TOKENS,
                top_p=1,
                reasoning_effort="medium",
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
