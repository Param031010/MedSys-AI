import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Search, Navigation, Phone, Building2, Locate } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import tt from "@tomtom-international/web-sdk-maps";
// CSS is imported globally in main.jsx

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY;

export const Route = createFileRoute("/find-care")({
  head: () => ({
    meta: [
      { title: "Find Care — MedsysAI" },
      {
        name: "description",
        content:
          "Find nearby hospitals, clinics and specialists. Book appointments filtered by your health condition.",
      },
    ],
  }),
  component: () => <AuthGuard><FindCarePage /></AuthGuard>,
});

const SLOTS = ["09:00", "09:30", "10:00", "11:30", "14:00", "15:30", "16:00", "17:30"];

const CATEGORY_QUERIES = {
  general: "general clinic",
  cardiologist: "cardiology hospital",
  neurologist: "neurology hospital",
  dermatologist: "dermatologist clinic",
  oncologist: "oncology hospital",
};

// ---------------------------------------------------------------------------
// TomTom POI search
// ---------------------------------------------------------------------------
async function searchNearby(lat, lng, query) {
  const url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(query)}.json?` +
    new URLSearchParams({
      key: TOMTOM_KEY,
      lat,
      lon: lng,
      radius: 8000,
      limit: 8,
      categorySet: "7321,7322,7323",  // hospital / clinic / medical
    });
  const res = await fetch(url);
  const data = await res.json();
  return (data.results ?? []).map((r, i) => ({
    id: i + 1,
    name: r.poi?.name ?? "Healthcare Facility",
    address: r.address?.freeformAddress ?? "",
    distance: r.dist ? `${(r.dist / 1000).toFixed(1)} km` : "—",
    lat: r.position.lat,
    lng: r.position.lon,
    phone: r.poi?.phone ?? null,
    doctors: [{ name: "Available on request", specialty: query.split(" ")[0] }],
  }));
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------
function TomTomMap({ center, results, selected, onSelect }) {
  const mapDiv = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Init map once — use explicit height on the div so TomTom knows its size
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;

    mapRef.current = tt.map({
      key: TOMTOM_KEY,
      container: mapDiv.current,
      center: [center.lng, center.lat],
      zoom: 13,
    });

    // Force a resize after the first render so tiles fill the container
    mapRef.current.once("load", () => {
      mapRef.current?.resize();
    });

    // Keep resizing as the card layout settles
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(mapDiv.current);

    return () => {
      ro.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Pan map when center changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 13 });
    }
  }, [center]);

  // Draw markers when results change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    results.forEach((r) => {
      // Simple circle pin — NO transform/rotation so it never "runs away" on hover
      const el = document.createElement("div");
      el.style.cssText = [
        "width:30px",
        "height:30px",
        "border-radius:50%",
        "background:oklch(0.52 0.12 200)",
        "border:3px solid white",
        "box-shadow:0 2px 8px rgba(0,0,0,0.28)",
        "cursor:pointer",
        "transition:box-shadow 0.15s",
      ].join(";");

      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 4px 18px rgba(0,0,0,0.42)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28)";
      });

      const popup = new tt.Popup({ offset: 18, closeButton: false })
        .setHTML(`<div style="font-family:Inter,sans-serif;font-size:13px;max-width:180px;padding:4px 2px">
          <div style="font-weight:600;margin-bottom:2px">${r.name}</div>
          <div style="color:#6b7280;font-size:12px">${r.distance}</div>
        </div>`);

      // anchor:center keeps the circle dot exactly on the coordinate
      const marker = new tt.Marker({ element: el, anchor: "center" })
        .setLngLat([r.lng, r.lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      el.addEventListener("click", () => onSelect(r));
      markersRef.current.push(marker);
    });
  }, [results]); // eslint-disable-line

  // Fly to selected hospital
  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.flyTo({ center: [selected.lng, selected.lat], zoom: 15 });
    }
  }, [selected]);

  return (
    <div
      ref={mapDiv}
      style={{ width: "100%", height: "100%", minHeight: "520px", borderRadius: "0.75rem" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function FindCarePage() {
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 });
  const [query, setQuery] = useState("general");
  const [locationInput, setLocationInput] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Refs for each card so we can scroll to it when a pin is clicked
  const cardRefs = useRef({});
  const listRef = useRef(null);

  // Search on mount with default center
  useEffect(() => {
    doSearch(center, query);
  }, []); // eslint-disable-line

  async function doSearch(coords, specialtyQuery) {
    setLoading(true);
    setResults([]);
    try {
      const q = CATEGORY_QUERIES[specialtyQuery] ?? specialtyQuery;
      const data = await searchNearby(coords.lat, coords.lng, q);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function geocodeLocation(address) {
    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${TOMTOM_KEY}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const pos = data.results?.[0]?.position;
    return pos ? { lat: pos.lat, lng: pos.lon } : null;
  }

  async function handleSearch() {
    let coords = center;
    if (locationInput.trim()) {
      const geo = await geocodeLocation(locationInput.trim());
      if (geo) {
        coords = geo;
        setCenter(geo);
      }
    }
    doSearch(coords, query);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setLocating(false);
        doSearch(coords, query);
      },
      () => setLocating(false)
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-tight text-foreground">Find Care</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Nearby hospitals and specialists matched to your health profile.
        </p>
      </div>

      {/* Search bar */}
      <Card className="p-4 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 rounded-lg border border-border bg-background">
            <MapPin className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} />
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter city or address…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
            />
          </div>

          <Select value={query} onValueChange={setQuery}>
            <SelectTrigger className="md:w-52 h-11">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="cardiologist">Cardiologist</SelectItem>
              <SelectItem value="neurologist">Neurologist</SelectItem>
              <SelectItem value="dermatologist">Dermatologist</SelectItem>
              <SelectItem value="oncologist">Oncologist</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="h-11 gap-2 px-4"
            onClick={useMyLocation}
            disabled={locating}
          >
            <Locate className={cn("h-4 w-4", locating && "animate-spin")} />
            {locating ? "Locating…" : "My location"}
          </Button>

          <Button className="h-11 px-6 gap-2" onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
      </Card>

      {/* Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Map */}
        <Card className="shadow-[var(--shadow-soft)] overflow-hidden" style={{ minHeight: "520px", position: "relative" }}>
          <TomTomMap
            center={center}
            results={results}
            selected={selected}
          onSelect={(r) => {
            setSelected(r);
            // Scroll the matching card into view in the right panel
            setTimeout(() => {
              cardRefs.current[r.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 50);
          }}
          />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground">Finding facilities…</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-md bg-card/90 backdrop-blur border border-border text-xs text-muted-foreground">
            {loading ? "Searching…" : `${results.length} facilities found`}
          </div>
        </Card>

        {/* List */}
        <div ref={listRef} className="space-y-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-1">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="p-5 shadow-[var(--shadow-soft)]">
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-8 w-full rounded bg-muted" />
                </div>
              </Card>
            ))
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
              <MapPin className="h-8 w-8 opacity-30" />
              <p className="text-sm">No facilities found. Try a different location or specialty.</p>
            </div>
          ) : (
            results.map((h) => (
              <Card
                key={h.id}
                ref={(el) => { cardRefs.current[h.id] = el; }}
                className={cn(
                  "p-5 shadow-[var(--shadow-soft)] transition-all cursor-pointer hover:shadow-[var(--shadow-card)]",
                  selected?.id === h.id && "border-primary/50 bg-primary-soft/30"
                )}
                onClick={() => setSelected(h)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-medium text-foreground">{h.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {h.address}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">{h.distance}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    Directions
                  </a>

                  {h.phone ? (
                    <a
                      href={`tel:${h.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : (
                    <span className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md border border-border bg-background text-muted-foreground text-sm cursor-not-allowed opacity-50">
                      <Phone className="h-4 w-4" />
                      No number
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

    </AppShell>
  );
}
