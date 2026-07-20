/**
 * weather-widget.jsx — Live weather + AQI dashboard cards
 *
 * Data source: FastAPI backend proxy → OpenWeather free-tier APIs
 *   /api/weather/current  → /data/2.5/weather
 *   /api/weather/aqi      → /data/2.5/air_pollution
 *
 * Props:
 *   lat      {number}  Latitude of the location to show
 *   lon      {number}  Longitude of the location to show
 *   city     {string}  Fallback city label
 *   units    {string}  "metric" | "imperial" (default: "metric")
 *   usingGPS {boolean} True if coords came from browser GPS
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  Wind, CloudSun, Droplets, Thermometer, Eye, Gauge,
  RefreshCw, AlertTriangle, Sun, Cloud, CloudRain,
  CloudSnow, CloudLightning, CloudDrizzle, MapPin, Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// ── Weather condition icon ────────────────────────────────────────────────────
function WeatherIcon({ code, className }) {
  const id  = code ? code.slice(0, 2) : "";
  const cls = cn("shrink-0", className);
  if (id === "01") return <Sun className={cls} />;
  if (id === "02" || id === "03" || id === "04") return <Cloud className={cls} />;
  if (id === "09") return <CloudDrizzle className={cls} />;
  if (id === "10") return <CloudRain className={cls} />;
  if (id === "11") return <CloudLightning className={cls} />;
  if (id === "13") return <CloudSnow className={cls} />;
  return <CloudSun className={cls} />;
}

// ── PM2.5 → US EPA AQI ───────────────────────────────────────────────────────
function pm25ToAQI(pm25) {
  const c  = Math.round(pm25 * 10) / 10;
  const bp = [
    [0.0,   12.0,   0,   50],
    [12.1,  35.4,  51,  100],
    [35.5,  55.4, 101,  150],
    [55.5, 150.4, 151,  200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ];
  for (const [cL, cH, aL, aH] of bp) {
    if (c >= cL && c <= cH)
      return Math.round(((aH - aL) / (cH - cL)) * (c - cL) + aL);
  }
  return 500;
}

// ── US AQI tier metadata ──────────────────────────────────────────────────────
function usAqiInfo(aqi) {
  if (aqi === null || aqi === undefined) return null;
  if (aqi <=  50) return { label: "Good",                   color: "text-emerald-600", bg: "bg-emerald-50",  bar: "bg-emerald-500",  pct: (aqi / 500) * 100, tip: "Air quality is satisfactory. Great day for outdoor activity." };
  if (aqi <= 100) return { label: "Moderate",               color: "text-yellow-600",  bg: "bg-yellow-50",   bar: "bg-yellow-400",   pct: (aqi / 500) * 100, tip: "Acceptable. Unusually sensitive people may notice mild effects." };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "text-orange-600", bg: "bg-orange-50",   bar: "bg-orange-400",   pct: (aqi / 500) * 100, tip: "Sensitive groups (asthma, elderly, children) should limit outdoor exertion." };
  if (aqi <= 200) return { label: "Unhealthy",               color: "text-red-600",    bg: "bg-red-50",      bar: "bg-red-500",      pct: (aqi / 500) * 100, tip: "Everyone may experience effects. Limit prolonged outdoor activity." };
  if (aqi <= 300) return { label: "Very Unhealthy",          color: "text-purple-600", bg: "bg-purple-50",   bar: "bg-purple-500",   pct: (aqi / 500) * 100, tip: "Health alert — everyone should avoid prolonged outdoor exertion." };
  return           { label: "Hazardous",                      color: "text-rose-800",   bg: "bg-rose-50",     bar: "bg-rose-700",     pct: Math.min((aqi / 500) * 100, 100), tip: "Health emergency. Stay indoors and keep windows closed." };
}

// ── OpenWeather native 1-5 label ─────────────────────────────────────────────
const OW_LABEL = { 1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor" };

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

// ── WeatherWidget ─────────────────────────────────────────────────────────────
export function WeatherWidget({ lat, lon, city, units = "metric", usingGPS = false }) {
  const [weather,     setWeather]     = useState(null);
  const [aqi,         setAqi]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async () => {
    if (lat == null || lon == null) return;
    setLoading(true);
    setError(null);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/weather/current?lat=${lat}&lon=${lon}&units=${units}`),
        fetch(`${API_BASE}/api/weather/aqi?lat=${lat}&lon=${lon}`),
      ]);
      if (!wRes.ok) throw new Error(`Weather: HTTP ${wRes.status}`);
      if (!aRes.ok) throw new Error(`AQI: HTTP ${aRes.status}`);
      const [wData, aData] = await Promise.all([wRes.json(), aRes.json()]);
      setWeather(wData);
      setAqi(aData);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, units]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tempUnit = units === "imperial" ? "°F" : "°C";
  const windUnit = units === "imperial" ? "mph" : "m/s";

  const cityLabel = weather?.name || city || "—";
  const owAqi     = aqi?.list?.[0]?.main?.aqi ?? null;
  const pm25      = aqi?.list?.[0]?.components?.pm2_5 ?? null;
  const usAqi     = pm25 != null ? pm25ToAQI(pm25) : null;
  const aqiInfo   = usAqiInfo(usAqi);

  // ── Location source badge ────────────────────────────────────────────────
  const LocationBadge = () => (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
      usingGPS ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"
    )}>
      {usingGPS
        ? <><Navigation className="h-2.5 w-2.5" /> GPS</>
        : <><MapPin className="h-2.5 w-2.5" /> Address</>}
    </span>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* ── Current Weather card ─────────────────────────────────── */}
      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CloudSun className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">Weather</span>
          </div>
          <div className="flex items-center gap-2">
            <LocationBadge />
            {!loading && (
              <span className="text-xs text-muted-foreground truncate max-w-[90px]">{cityLabel}</span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh weather"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Could not load weather. Is the backend running?</span>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : weather ? (
          <>
            <div className="flex items-end gap-3 mb-4">
              <WeatherIcon code={weather.weather?.[0]?.icon} className="h-10 w-10 text-primary" strokeWidth={1.5} />
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-light text-foreground">{Math.round(weather.main?.temp ?? 0)}</span>
                  <span className="text-xl text-muted-foreground">{tempUnit}</span>
                </div>
                <div className="text-sm text-muted-foreground capitalize">{weather.weather?.[0]?.description ?? "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5" />Feels like {Math.round(weather.main?.feels_like ?? 0)}{tempUnit}</div>
              <div className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" />Humidity {weather.main?.humidity ?? "—"}%</div>
              <div className="flex items-center gap-1.5"><Wind className="h-3.5 w-3.5" />Wind {weather.wind?.speed ?? "—"} {windUnit}</div>
              <div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Vis. {weather.visibility != null ? `${(weather.visibility / 1000).toFixed(1)} km` : "—"}</div>
              <div className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />Pressure {weather.main?.pressure ?? "—"} hPa</div>
            </div>

            {lastFetched && (
              <p className="mt-4 text-[11px] text-muted-foreground/60">
                Live · Updated {lastFetched.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </>
        ) : null}
      </Card>

      {/* ── Air Quality card — US AQI as headline ──────────────────── */}
      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wind className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">Air Quality</span>
          </div>
          <div className="flex items-center gap-2">
            <LocationBadge />
            {/* OW 1-5 scale as a secondary badge */}
            {owAqi != null && !loading && (
              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded-full bg-muted">
                OW {owAqi}/5 · {OW_LABEL[owAqi]}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Could not load AQI data.</span>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-56" />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          </div>
        ) : aqi ? (
          <>
            {/* Big US AQI number */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-5xl font-light", aqiInfo?.color ?? "text-foreground")}>
                    {usAqi ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground self-end pb-2">US AQI</span>
                </div>
                {aqiInfo && (
                  <span className={cn(
                    "inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5",
                    aqiInfo.color, aqiInfo.bg
                  )}>
                    {aqiInfo.label}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground pt-1">{cityLabel}</span>
            </div>

            {/* AQI progress bar — 0 to 500 scale */}
            <div className="h-2 rounded-full bg-muted overflow-hidden my-3">
              <div
                className={cn("h-full rounded-full transition-all duration-700", aqiInfo?.bar ?? "bg-emerald-500")}
                style={{ width: `${aqiInfo?.pct ?? 0}%` }}
              />
            </div>

            {/* Health advisory */}
            {aqiInfo && (
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{aqiInfo.tip}</p>
            )}

            {/* Pollutant chips */}
            {aqi.list?.[0]?.components && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { key: "pm2_5", label: "PM₂.₅", unit: "μg/m³" },
                  { key: "pm10",  label: "PM₁₀",  unit: "μg/m³" },
                  { key: "co",    label: "CO",     unit: "μg/m³" },
                  { key: "no2",   label: "NO₂",    unit: "μg/m³" },
                  { key: "o3",    label: "O₃",     unit: "μg/m³" },
                  { key: "so2",   label: "SO₂",    unit: "μg/m³" },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="mt-0.5 font-medium text-foreground">
                      {aqi.list[0].components[key]?.toFixed(1) ?? "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70">{unit}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
}
