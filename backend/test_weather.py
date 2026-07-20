"""
test_weather.py — CLI test for free-tier OpenWeather APIs.

Usage (from the backend/ directory):
    python test_weather.py

Reads OPENWEATHER_API_KEY from .env and prints:
  1. Geocoding result      (city name → lat/lon)
  2. Current weather JSON  (/data/2.5/weather)
  3. 24-h forecast JSON    (/data/2.5/forecast, cnt=8 slots)
  4. Air Pollution / AQI   (/data/2.5/air_pollution)
"""

import asyncio
import json
import os
import sys

# Force UTF-8 output on Windows terminals
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
CITY  = "Bengaluru,IN"  # change to any city (add ,<country_code> for precision)
UNITS = "metric"        # metric | imperial | standard
OW_KEY = os.getenv("OPENWEATHER_API_KEY", "")

GEOCODE_URL  = "https://api.openweathermap.org/geo/1.0/direct"
CURRENT_URL  = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
AQI_URL      = "https://api.openweathermap.org/data/2.5/air_pollution"

# ─────────────────────────────────────────────────────────────────────────────

def pp(label: str, data) -> None:
    print("\n" + "=" * 70)
    print(f"  {label}")
    print("=" * 70)
    print(json.dumps(data, indent=2, ensure_ascii=True))


async def main() -> None:
    if not OW_KEY:
        print("\n[ERROR] OPENWEATHER_API_KEY not set in backend/.env")
        print("  Open backend/.env and paste your key after OPENWEATHER_API_KEY=")
        return

    async with httpx.AsyncClient(timeout=15) as client:

        # ── 1. Geocode city → lat/lon ─────────────────────────────────────
        print(f"\n[1/4] Geocoding: '{CITY}' ...")
        geo_r = await client.get(GEOCODE_URL, params={"q": CITY, "limit": 1, "appid": OW_KEY})
        geo_data = geo_r.json()

        if not geo_data or geo_r.status_code != 200:
            print(f"[ERROR] Geocoding failed (HTTP {geo_r.status_code})")
            pp("Raw response", geo_data)
            return

        pp("Geocoding result", geo_data[0])
        lat = geo_data[0]["lat"]
        lon = geo_data[0]["lon"]
        print(f"\n    → lat={lat}, lon={lon}")

        # ── 2. Current weather ────────────────────────────────────────────
        print(f"\n[2/4] Current weather (/data/2.5/weather) ...")
        cur_r = await client.get(CURRENT_URL, params={
            "lat": lat, "lon": lon, "appid": OW_KEY, "units": UNITS,
        })
        cur_data = cur_r.json()
        if cur_r.status_code != 200:
            print(f"[ERROR] HTTP {cur_r.status_code}")
            pp("Error", cur_data)
        else:
            pp("Current weather", cur_data)

        # ── 3. 24-hour forecast (8 × 3 h slots) ──────────────────────────
        print(f"\n[3/4] 24-h forecast (/data/2.5/forecast, cnt=8) ...")
        fc_r = await client.get(FORECAST_URL, params={
            "lat": lat, "lon": lon, "appid": OW_KEY, "units": UNITS, "cnt": 8,
        })
        fc_data = fc_r.json()
        if fc_r.status_code != 200:
            print(f"[ERROR] HTTP {fc_r.status_code}")
            pp("Error", fc_data)
        else:
            # Print a compact summary of each slot
            slots = [
                {
                    "time":    slot.get("dt_txt"),
                    "temp":    slot["main"]["temp"],
                    "feels":   slot["main"]["feels_like"],
                    "desc":    slot["weather"][0]["description"],
                    "icon":    slot["weather"][0]["icon"],
                    "humidity":slot["main"]["humidity"],
                    "wind_ms": slot["wind"]["speed"],
                    "rain_mm": slot.get("rain", {}).get("3h", 0),
                }
                for slot in fc_data.get("list", [])
            ]
            pp("24-h forecast (next 8 slots, 3 h each)", slots)

        # ── 4. AQI + pollutants ───────────────────────────────────────────
        print(f"\n[4/4] Air Pollution / AQI (/data/2.5/air_pollution) ...")
        aqi_r = await client.get(AQI_URL, params={"lat": lat, "lon": lon, "appid": OW_KEY})
        aqi_data = aqi_r.json()
        if aqi_r.status_code != 200:
            print(f"[ERROR] HTTP {aqi_r.status_code}")
            pp("Error", aqi_data)
        else:
            pp("Air Pollution / AQI", aqi_data)

    print("\n[DONE] All responses printed above.\n")


if __name__ == "__main__":
    asyncio.run(main())
