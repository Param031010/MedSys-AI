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
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { MapPin, Search, Calendar, Building2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
export const Route = createFileRoute("/find-care")({
  head: () => ({
    meta: [
      { title: "Find Care \u2014 MedsysAI" },
      { name: "description", content: "Find nearby hospitals, clinics and specialists. Book appointments filtered by your health condition." }
    ]
  }),
  component: () => <AuthGuard><FindCarePage /></AuthGuard>
});
const HOSPITALS = [
  {
    id: 1,
    name: "Manipal Heart Institute",
    distance: "1.2 km",
    doctors: [{ name: "Dr. Priya Sharma", specialty: "Cardiologist" }],
    address: "HAL Airport Road",
    top: "22%",
    left: "38%"
  },
  {
    id: 2,
    name: "Apollo Speciality Hospital",
    distance: "2.8 km",
    doctors: [
      { name: "Dr. Rohan Mehta", specialty: "Cardiologist" },
      { name: "Dr. Kavya Iyer", specialty: "Neurologist" }
    ],
    address: "Bannerghatta Road",
    top: "56%",
    left: "62%"
  },
  {
    id: 3,
    name: "Fortis Clinic",
    distance: "3.5 km",
    doctors: [{ name: "Dr. Arjun Nair", specialty: "General" }],
    address: "Cunningham Road",
    top: "40%",
    left: "18%"
  },
  {
    id: 4,
    name: "Narayana Health City",
    distance: "5.1 km",
    doctors: [{ name: "Dr. Sneha Patel", specialty: "Dermatologist" }],
    address: "Hosur Road",
    top: "72%",
    left: "45%"
  }
];
const SLOTS = ["09:00", "09:30", "10:00", "11:30", "14:00", "15:30", "16:00", "17:30"];
function FindCarePage() {
  const [selected, setSelected] = useState(null);
  const [pickedSlot, setPickedSlot] = useState(null);
  return <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-foreground">Find Care</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Nearby hospitals and specialists matched to your health profile.
        </p>
      </div>

      <Card className="p-4 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 rounded-lg border border-border bg-background">
            <MapPin className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} />
            <Input
    defaultValue="Bengaluru, Karnataka"
    className="border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
  />
          </div>
          <Select defaultValue="cardiologist">
            <SelectTrigger className="md:w-56 h-11">
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
          <Button className="h-11 px-6 gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {
    /* Map */
  }
        <Card className="relative overflow-hidden shadow-[var(--shadow-soft)] min-h-[520px]">
          <div
    className="absolute inset-0"
    style={{
      background: "radial-gradient(circle at 30% 30%, oklch(0.95 0.03 200 / 0.6), transparent 60%), radial-gradient(circle at 70% 70%, oklch(0.95 0.03 200 / 0.5), transparent 60%), linear-gradient(180deg, oklch(0.97 0.005 240), oklch(0.955 0.006 240))"
    }}
  />
          {
    /* Grid lines */
  }
          <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {
    /* Roads */
  }
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M0 40 Q30 45 50 40 T100 50" stroke="oklch(0.88 0.01 240)" strokeWidth="0.6" fill="none" />
            <path d="M20 0 Q22 30 35 60 T50 100" stroke="oklch(0.88 0.01 240)" strokeWidth="0.6" fill="none" />
            <path d="M100 20 Q70 40 60 70 T30 100" stroke="oklch(0.88 0.01 240)" strokeWidth="0.6" fill="none" />
          </svg>
          {
    /* Pins */
  }
          {HOSPITALS.map((h) => <button
    key={h.id}
    onClick={() => setSelected(h)}
    style={{ top: h.top, left: h.left }}
    className="absolute -translate-x-1/2 -translate-y-full group"
    aria-label={h.name}
  >
              <div className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                <MapPin className="h-4 w-4" strokeWidth={2.25} fill="currentColor" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap px-2 py-0.5 rounded bg-card border border-border text-xs font-medium text-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                {h.name}
              </div>
            </button>)}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-md bg-card/90 backdrop-blur border border-border text-xs text-muted-foreground">
            Showing 4 facilities within 6 km
          </div>
        </Card>

        {
    /* List */
  }
        <div className="space-y-4 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-1">
          {HOSPITALS.map((h) => <Card
    key={h.id}
    className={cn(
      "p-5 shadow-[var(--shadow-soft)] transition-colors cursor-pointer",
      selected?.id === h.id && "border-primary/50 bg-primary-soft/30"
    )}
    onClick={() => setSelected(h)}
  >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium text-foreground truncate">{h.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {h.address}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{h.distance}</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {h.doctors.map((d) => <div key={d.name} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground/90">{d.name}</span>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {d.specialty}
                    </Badge>
                  </div>)}
              </div>
              <Button
    size="sm"
    className="w-full h-9 gap-2"
    onClick={(e) => {
      e.stopPropagation();
      setSelected(h);
      setPickedSlot(null);
    }}
  >
                <Calendar className="h-4 w-4" />
                Book appointment
              </Button>
            </Card>)}
        </div>
      </div>


      <Dialog open={!!selected} onOpenChange={(o) => {
    if (!o) {
      setSelected(null);
      setPickedSlot(null);
    }
  }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-normal text-xl">{selected?.name}</DialogTitle>
            <DialogDescription>
              Available slots today for {selected?.doctors[0]?.specialty} — matched to your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Tuesday, 21 October
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SLOTS.map((s) => <button
    key={s}
    onClick={() => setPickedSlot(s)}
    className={cn(
      "h-10 rounded-md border text-sm transition-colors",
      pickedSlot === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary-soft"
    )}
  >
                  {s}
                </button>)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
    setSelected(null);
    setPickedSlot(null);
  }}>
              Cancel
            </Button>
            <Button disabled={!pickedSlot}>Confirm booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>;
}
