from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Health check")
async def health_check():
    """Returns server status and version."""
    return {"status": "ok", "service": "MedsysAI Health Hub API", "version": "0.1.0"}
