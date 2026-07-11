from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ── Request / Response models ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, summary="User login")
async def login(body: LoginRequest):
    """
    Placeholder login endpoint.
    Replace with real auth logic (JWT, OAuth, etc.).
    """
    # TODO: validate credentials against DB and issue a real JWT
    return TokenResponse(access_token="placeholder-token")


@router.post("/logout", summary="User logout")
async def logout():
    return {"message": "Logged out successfully"}
