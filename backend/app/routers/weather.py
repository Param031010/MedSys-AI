"""
weather.py — Weather & AQI proxy router (FREE tier endpoints)

Free OpenWeather APIs used:
  - /data/2.5/weather        → current weather
  - /data/2.5/forecast       → 5-day / 3-hour forecast
  - /data/2.5/air_pollution  → AQI (1-5) + pollutants
  - /geo/1.0/direct          → city name → lat/lon geocoding

Also exposes:
  - /tips                    → returns JSON array of 3 LLM health tips
                               grounded in live weather data
                               (model controlled by TIPS_MODEL in .env)

API key: set OPENWEATHER_API_KEY in backend/.env
"""

import asyncio
import json
import os
import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from groq import AsyncGroq


router = APIRouter()

# Free-tier API base URLs (these are constants, not env vars — safe at module level)
OW_CURRENT_URL  = "https://api.openweathermap.org/data/2.5/weather"
OW_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OW_AQI_URL      = "https://api.openweathermap.org/data/2.5/air_pollution"
OW_GEOCODE_URL  = "https://api.openweathermap.org/geo/1.0/direct"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _require_ow_key() -> None:
    """Raise 503 if the OpenWeather key is missing (reads fresh from env each call)."""
    if not os.getenv("OPENWEATHER_API_KEY", ""):
        raise HTTPException(status_code=503, detail=(
            "OPENWEATHER_API_KEY is not configured. "
            "Add it to backend/.env and restart."
        ))


def _ow_key() -> str:
    return os.getenv("OPENWEATHER_API_KEY", "")


async def _get(url: str, params: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()


# ---------------------------------------------------------------------------
# GET /api/weather/current
# ---------------------------------------------------------------------------

@router.get("/current", summary="Current weather (free tier)")
async def get_current_weather(
    lat:   float = Query(...),
    lon:   float = Query(...),
    units: str   = Query("metric"),
):
    _require_ow_key()
    ow = _ow_key()
    return await _get(OW_CURRENT_URL, {"lat": lat, "lon": lon, "appid": ow, "units": units})


# ---------------------------------------------------------------------------
# GET /api/weather/forecast
# ---------------------------------------------------------------------------

@router.get("/forecast", summary="5-day / 3-hour forecast (free tier)")
async def get_forecast(
    lat:   float = Query(...),
    lon:   float = Query(...),
    units: str   = Query("metric"),
    cnt:   int   = Query(8, ge=1, le=40),
):
    _require_ow_key()
    ow = _ow_key()
    return await _get(OW_FORECAST_URL, {"lat": lat, "lon": lon, "appid": ow, "units": units, "cnt": cnt})


# ---------------------------------------------------------------------------
# GET /api/weather/aqi
# ---------------------------------------------------------------------------

@router.get("/aqi", summary="Air Quality Index + pollutants (free tier)")
async def get_aqi(
    lat: float = Query(...),
    lon: float = Query(...),
):
    _require_ow_key()
    ow = _ow_key()
    return await _get(OW_AQI_URL, {"lat": lat, "lon": lon, "appid": ow})


# ---------------------------------------------------------------------------
# GET /api/weather/geocode
# ---------------------------------------------------------------------------

@router.get("/geocode", summary="Geocode a city name to lat/lon (free tier)")
async def geocode(
    q:     str = Query(...),
    limit: int = Query(1, ge=1, le=5),
):
    _require_ow_key()
    ow = _ow_key()
    return await _get(OW_GEOCODE_URL, {"q": q, "limit": limit, "appid": ow})


# ---------------------------------------------------------------------------
# GET /api/weather/dashboard  — combined weather + AQI
# ---------------------------------------------------------------------------

@router.get("/dashboard", summary="Current weather + AQI combined")
async def get_dashboard_weather(
    lat:   float = Query(...),
    lon:   float = Query(...),
    units: str   = Query("metric"),
):
    _require_ow_key()
    ow = _ow_key()
    weather, aqi = await asyncio.gather(
        _get(OW_CURRENT_URL, {"lat": lat, "lon": lon, "appid": ow, "units": units}),
        _get(OW_AQI_URL,     {"lat": lat, "lon": lon, "appid": ow}),
    )
    return {"weather": weather, "aqi": aqi}


# ---------------------------------------------------------------------------
# GET /api/weather/tips  — JSON array of 3 LLM health tips
# ---------------------------------------------------------------------------

@router.get("/tips", summary="Weather-grounded health tips as JSON array")
async def get_health_tips(
    lat:   float = Query(..., description="Latitude"),
    lon:   float = Query(..., description="Longitude"),
    units: str   = Query("metric", description="metric | imperial | standard"),
):
    """
    1. Fetches live weather + AQI for the given coordinates.
    2. Builds a grounding prompt with real-time conditions.
    3. Calls the Groq LLM (model = TIPS_MODEL in backend/.env) with
       JSON mode so it returns a structured { "tips": [str, str, str] }.
    4. Returns the parsed JSON directly.

    No fallback model — set TIPS_MODEL in backend/.env before calling.
    """
    _require_ow_key()
    ow         = _ow_key()
    groq_key   = os.getenv("GROQ_API_KEY", "")
    tips_model = os.getenv("TIPS_MODEL", "")

    if not groq_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured in backend/.env")

    if not tips_model:
        raise HTTPException(
            status_code=503,
            detail="TIPS_MODEL is not set in backend/.env. Add TIPS_MODEL=<groq-model-id> and restart.",
        )

    # ── 1. Fetch live weather + AQI in parallel ───────────────────────
    weather, aqi = await asyncio.gather(
        _get(OW_CURRENT_URL, {"lat": lat, "lon": lon, "appid": ow, "units": units}),
        _get(OW_AQI_URL,     {"lat": lat, "lon": lon, "appid": ow}),
    )

    # ── 2. Extract values ──────────────────────────────────────────────
    unit_label  = "°C" if units == "metric" else "°F"
    wind_unit   = "m/s" if units == "metric" else "mph"
    city        = weather.get("name", "your location")
    temp        = weather["main"]["temp"]
    feels_like  = weather["main"]["feels_like"]
    humidity    = weather["main"]["humidity"]
    wind_speed  = weather["wind"]["speed"]
    description = weather["weather"][0]["description"]
    visibility  = weather.get("visibility", 10000) / 1000

    ow_aqi  = aqi["list"][0]["main"]["aqi"]
    pm25    = aqi["list"][0]["components"]["pm2_5"]
    no2     = aqi["list"][0]["components"]["no2"]
    o3      = aqi["list"][0]["components"]["o3"]
    AQI_LBL = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}

    # ── 3. Build the grounding prompt ──────────────────────────────────
    user_prompt = (
        f"Current real-time conditions for {city}:\n"
        f"• Temperature: {temp}{unit_label} (feels like {feels_like}{unit_label})\n"
        f"• Sky: {description}\n"
        f"• Humidity: {humidity}%\n"
        f"• Wind: {wind_speed} {wind_unit}\n"
        f"• Visibility: {visibility:.1f} km\n"
        f"• Air Quality: {ow_aqi}/5 — {AQI_LBL.get(ow_aqi, str(ow_aqi))}\n"
        f"• PM2.5: {pm25:.1f} μg/m³  |  NO₂: {no2:.1f} μg/m³  |  O₃: {o3:.1f} μg/m³\n\n"
        "Return a JSON object with exactly this shape:\n"
        '{"tips": ["<tip 1>", "<tip 2>", "<tip 3>"]}\n\n'
        "Rules:\n"
        "- Exactly 3 tips, each a single complete sentence.\n"
        "- Each tip must be directly relevant to the conditions above.\n"
        "- No numbering, no bullet points, no markdown inside the strings.\n"
        "- Return ONLY the JSON object — no preamble, no code fences."
    )

    # ── 4. Call Groq — ask strongly for JSON, parse manually ─────────────
    groq_client = AsyncGroq(api_key=groq_key)
    try:
        response = await groq_client.chat.completions.create(
            model=tips_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise medical health advisor. "
                        "You receive real-time weather and air quality data. "
                        "You MUST respond with a single valid JSON object and nothing else. "
                        'Required format: {"tips": ["tip 1", "tip 2", "tip 3"]}'
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.35,  # lower = more deterministic, less verbose output
            max_tokens=700,    # 400 was too low — tips were being truncated mid-sentence
            stream=False,
            # No response_format — parse JSON ourselves to avoid model compatibility issues
        )
        raw = response.choices[0].message.content or ""

        # Strip markdown code fences if model wraps the JSON
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]          # drop opening fence + language tag
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.split("```")[0].strip()  # drop closing fence

        # Fallback: extract the first {...} JSON object via regex in case the model
        # adds preamble/postamble text despite being told not to
        if not raw.startswith("{"):
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                raw = m.group(0)

        data = json.loads(raw)

        # Normalise — always return exactly a list of tip strings
        tips_list = data.get("tips", [])
        if not isinstance(tips_list, list):
            tips_list = list(data.values())[0] if data else []
        tips_list = [str(t) for t in tips_list[:3]]

        return {"tips": tips_list, "city": city, "model": tips_model}

    except json.JSONDecodeError as exc:
        print(f"[ERROR] /api/weather/tips JSON parse failed. Raw: {raw!r}")
        raise HTTPException(status_code=502, detail=f"LLM returned non-JSON: {exc}")
    except Exception as exc:
        print(f"[ERROR] /api/weather/tips Groq call failed: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail=f"{type(exc).__name__}: {exc}")
