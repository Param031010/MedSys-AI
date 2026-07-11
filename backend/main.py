import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # load .env before any module reads env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_client, close_db
from app.routers import health, auth, chat, sessions


# ---------------------------------------------------------------------------
# Lifespan — connect / disconnect MongoDB
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify MongoDB connection
    try:
        await get_client().admin.command("ping")
        print("✅  MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
    yield
    # Shutdown
    await close_db()
    print("🔌  MongoDB disconnected")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MedsysAI Health Hub API",
    description="Backend API for MedsysAI — AI-powered health assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow any localhost port in dev + production domain
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost(:\d+)?",  # covers :5173, :5174, :3000, etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router,   prefix="/api/health",    tags=["Health"])
app.include_router(auth.router,     prefix="/api/auth",      tags=["Auth"])
app.include_router(chat.router,     prefix="/api/chat",      tags=["Chat"])
app.include_router(sessions.router, prefix="/api/sessions",  tags=["Sessions"])


@app.get("/", tags=["Root"])
async def root():
    return {"message": "MedsysAI Health Hub API is running 🚀"}


# ---------------------------------------------------------------------------
# Entrypoint — run with: python main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
