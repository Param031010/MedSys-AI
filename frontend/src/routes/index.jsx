import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Activity, Sparkles, RefreshCw } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { WeatherWidget } from "@/components/weather-widget";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Home — MedsysAI" },
      { name: "description", content: "Your daily health overview: air quality, weather, personalised tips and current severity status." }
    ]
  }),
  component: () => <AuthGuard><HomePage /></AuthGuard>
}));

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// Geocode an address string → { lat, lon } via the backend proxy
async function geocodeAddress(address) {
  try {
    const res = await fetch(
      `${API_BASE}/api/weather/geocode?q=${encodeURIComponent(address)}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: data[0].lat, lon: data[0].lon, label: data[0].name };
    }
  } catch {
    // fall through
  }
  return null;
}

// Get GPS coordinates from the browser
function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: null }),
      ()    => resolve(null),
      { timeout: 6000, maximumAge: 300_000 }
    );
  });
}

function HomePage() {
  const { user } = useUser();
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("medsys_fullName") || "");
  const [profilePic,  setProfilePic]  = useState(() => localStorage.getItem("medsys_profilePic") || "");
  const [address,     setAddress]     = useState(() => localStorage.getItem("medsys_address") || "Bengaluru, India");
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Resolved coordinates + source for the weather widget
  const [coords,       setCoords]       = useState(null);
  const [usingGPS,     setUsingGPS]     = useState(false);
  const [locationLabel, setLocationLabel] = useState(null);

  // LLM tips state
  const [tips,         setTips]         = useState("");
  const [tipsLoading,  setTipsLoading]  = useState(false);
  const [tipsError,    setTipsError]    = useState(false);
  const tipsAbort = useRef(null);

  // Sync from Clerk on first load
  useEffect(() => {
    if (user) {
      if (!localStorage.getItem("medsys_fullName"))
        setDisplayName(user.fullName || user.username || "User");
      else
        setDisplayName(localStorage.getItem("medsys_fullName") || "");

      if (!localStorage.getItem("medsys_profilePic"))
        setProfilePic(user.imageUrl || "");
      else
        setProfilePic(localStorage.getItem("medsys_profilePic") || "");
    }
  }, [user]);

  // Listen for profile updates from the profile page
  useEffect(() => {
    const handleUpdate = () => {
      setDisplayName(localStorage.getItem("medsys_fullName") || user?.fullName || user?.username || "User");
      setProfilePic(localStorage.getItem("medsys_profilePic") || user?.imageUrl || "");
      setAddress(localStorage.getItem("medsys_address") || "Bengaluru, India");
    };
    window.addEventListener("medsys_profile_updated", handleUpdate);
    return () => window.removeEventListener("medsys_profile_updated", handleUpdate);
  }, [user]);

  // Resolve location: GPS first, then geocode address
  useEffect(() => {
    let active = true;
    async function resolveLocation() {
      // 1. Try browser GPS
      const gps = await getBrowserLocation();
      if (!active) return;
      if (gps) {
        setCoords({ lat: gps.lat, lon: gps.lon });
        setUsingGPS(true);
        setLocationLabel(null);  // API will return the city name
        return;
      }
      // 2. Fall back to geocoding the stored profile address
      setUsingGPS(false);
      const geo = await geocodeAddress(address);
      if (!active) return;
      if (geo) {
        setCoords({ lat: geo.lat, lon: geo.lon });
        setLocationLabel(geo.label || displayCity);
      }
    }
    resolveLocation();
    return () => { active = false; };
  }, [address]);

  // Fetch LLM tips (JSON array) whenever coordinates are resolved
  const fetchTips = useCallback(async (lat, lon) => {
    if (lat == null || lon == null) return;
    if (tipsAbort.current) tipsAbort.current.abort();
    const controller = new AbortController();
    tipsAbort.current = controller;

    setTips([]);
    setTipsLoading(true);
    setTipsError(false);

    try {
      const res = await fetch(
        `${API_BASE}/api/weather/tips?lat=${lat}&lon=${lon}&units=metric`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // data = { tips: ["tip1", "tip2", "tip3"], city: "...", model: "..." }
      setTips(Array.isArray(data.tips) ? data.tips : []);
    } catch (err) {
      if (err.name !== "AbortError") setTipsError(true);
    } finally {
      setTipsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (coords?.lat != null) fetchTips(coords.lat, coords.lon);
  }, [coords, fetchTips]);

  const firstName    = displayName.split(" ")[0] || "User";
  const displayCity  = address.split(",")[0]?.trim() || "Bengaluru";
  const weatherCity  = locationLabel || displayCity;
  const formattedDate = new Date(currentDate).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <AppShell>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-6 mb-10">
        <div>
          <div className="relative inline-block mb-2">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
            <p className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer select-none">
              {formattedDate}
            </p>
          </div>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Hello, <span className="font-normal">{firstName}</span>
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-md">
            Here's your health snapshot for today. Everything looks steady.
          </p>
        </div>
        {profilePic ? (
          <img
            src={profilePic}
            alt={displayName}
            width={112}
            height={112}
            className="h-28 w-28 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div className="h-28 w-28 rounded-2xl bg-primary/15 text-primary grid place-items-center text-3xl font-medium shrink-0 uppercase">
            {firstName[0]}
          </div>
        )}
      </div>

      {/* ── Status card ───────────────────────────────────────── */}
      <Card className="relative overflow-hidden border-l-4 border-l-status-stable bg-status-stable-soft/60 p-8 mb-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-5">
          <div className="grid place-items-center h-12 w-12 rounded-full bg-status-stable/15 text-status-stable shrink-0">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-status-stable">
                Current status
              </span>
            </div>
            <h2 className="text-3xl font-light text-foreground">Stable</h2>
            <p className="mt-2 text-[15px] text-muted-foreground max-w-xl">
              Your vitals and reported symptoms are within your normal range. Continue with your regular routine and hydration.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-right">
            <span className="text-xs text-muted-foreground">Last updated</span>
            <span className="text-sm font-medium text-foreground">8 min ago</span>
          </div>
        </div>
      </Card>

      {/* ── Live Weather + AQI ──────────────────── */}
      <div className="mb-6">
        <WeatherWidget
          lat={coords?.lat}
          lon={coords?.lon}
          city={weatherCity}
          units="metric"
          usingGPS={usingGPS}
        />
      </div>

      {/* ── Today's Tips (LLM-generated from live weather) ─────── */}
      <Card className="p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">Today's Tips</span>
            {tips.length > 0 && !tipsLoading && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-1">
                AI · weather-grounded
              </span>
            )}
          </div>
          {coords && (
            <button
              onClick={() => fetchTips(coords.lat, coords.lon)}
              disabled={tipsLoading}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Regenerate tips"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", tipsLoading && "animate-spin")} />
            </button>
          )}
        </div>

        {/* Skeleton — shown while waiting for the JSON response */}
        {tipsLoading && tips.length === 0 && (
          <div className="space-y-3">
            {["w-full", "w-5/6", "w-4/6"].map((w) => (
              <div key={w} className={cn("h-4 rounded-md bg-muted animate-pulse", w)} />
            ))}
          </div>
        )}

        {/* Error state */}
        {tipsError && tips.length === 0 && (
          <p className="text-sm text-destructive">
            ⚠️ Could not load tips — check that{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">TIPS_MODEL</code>{" "}
            is set in{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">backend/.env</code>{" "}
            and the backend is running.
          </p>
        )}

        {/* Tips list — each element is already a clean sentence from the LLM JSON */}
        {tips.length > 0 && (
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-md bg-primary-soft text-primary shrink-0 text-[11px] font-semibold">
                  {i + 1}
                </span>
                <span className="leading-snug">{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Waiting for location */}
        {tips.length === 0 && !tipsLoading && !tipsError && (
          <p className="text-sm text-muted-foreground">Waiting for location to load tips…</p>
        )}
      </Card>
    </AppShell>
  );
}
