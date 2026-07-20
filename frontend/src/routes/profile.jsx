import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pill, Phone, User as UserIcon, CheckCircle, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef, useCallback } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MedsysAI" },
      { name: "description", content: "Your personal details, medical history, current medications and emergency contacts." }
    ]
  }),
  component: () => <AuthGuard><ProfilePage /></AuthGuard>
});

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const TIMELINE = [
  { year: "2024", title: "Hypertension diagnosis", note: "Started on Amlodipine 5mg", severity: "monitor" },
  { year: "2022", title: "Seasonal allergic rhinitis", note: "Recurring, spring months", severity: "stable" },
  { year: "2019", title: "Appendectomy", note: "Laparoscopic procedure — full recovery", severity: "stable" },
  { year: "2015", title: "Mild concussion", note: "Cycling accident — no long-term effects", severity: "stable" }
];
const MEDS = [
  { name: "Amlodipine", dose: "5 mg", freq: "Once daily, morning", since: "Jan 2024" },
  { name: "Vitamin D3", dose: "60,000 IU", freq: "Weekly", since: "Aug 2024" },
  { name: "Cetirizine", dose: "10 mg", freq: "As needed", since: "2022" }
];

function getPatientId(userId) {
  if (!userId) return "MS-208441";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idNum = Math.abs(hash) % 900000 + 100000;
  return `MS-${idNum}`;
}

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------
function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4 ${
        type === "success"
          ? "bg-green-500/10 border border-green-500/30 text-green-600"
          : "bg-red-500/10 border border-red-500/30 text-red-600"
      }`}
    >
      <CheckCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function ProfilePage() {
  const { user } = useUser();
  const fileInputRef = useRef(null);

  // ── Form state ──────────────────────────────────────────────────────────
  const [fullName,   setFullName]   = useState("");
  const [dob,        setDob]        = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [address,    setAddress]    = useState("");
  const [lang,       setLang]       = useState("");
  const [age,        setAge]        = useState("");
  const [weight,     setWeight]     = useState("");
  const [height,     setHeight]     = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [bmi,        setBmi]        = useState("");
  const [profilePic, setProfilePic] = useState("");

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);   // { message, type }

  // ── Load profile from MongoDB ────────────────────────────────────────────
  const applyProfile = useCallback((data, clerkUser) => {
    setFullName  (data.full_name   || clerkUser?.fullName || clerkUser?.username || "");
    setDob       (data.dob         || "");
    setEmail     (data.email       || clerkUser?.primaryEmailAddress?.emailAddress || "");
    setPhone     (data.phone       || "");
    setAddress   (data.address     || "");
    setLang      (data.lang        || "English");
    setAge       (data.age         || "");
    setWeight    (data.weight      || "");
    setHeight    (data.height      || "");
    setBloodGroup(data.blood_group || "");
    setBmi       (data.bmi         || "");
    setProfilePic(data.profile_pic || clerkUser?.imageUrl || "");
  }, []);

  const fetchProfile = useCallback(async (clerkUser) => {
    if (!clerkUser) return;
    // Instant fill from localStorage while the API responds
    const cached = localStorage.getItem(`medsys_profile_${clerkUser.id}`);
    if (cached) {
      try { applyProfile(JSON.parse(cached), clerkUser); } catch { /* ignore */ }
    }
    try {
      const res  = await fetch(`${API_BASE}/api/profile?user_id=${clerkUser.id}`);
      const data = await res.json();
      applyProfile(data, clerkUser);
      // Update cache
      localStorage.setItem(`medsys_profile_${clerkUser.id}`, JSON.stringify(data));
    } catch {
      // DB unavailable — cached/defaults already applied, do nothing
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    if (user) fetchProfile(user);
  }, [user, fetchProfile]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name:   fullName,
      dob,
      email,
      phone,
      address,
      lang,
      age,
      weight,
      height,
      blood_group: bloodGroup,
      bmi,
      profile_pic: profilePic,
    };
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Update local cache with what the server returned
      localStorage.setItem(`medsys_profile_${user.id}`, JSON.stringify(data));
      // Propagate name/pic to sidebar
      window.dispatchEvent(new Event("medsys_profile_updated"));
      setToast({ message: "Profile saved successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save — please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel — re-fetch from DB ────────────────────────────────────────────
  const handleCancel = () => {
    setLoading(true);
    fetchProfile(user);
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarClick  = () => fileInputRef.current?.click();
  const handleFileChange   = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result;
      setProfilePic(b64);
      // Will be persisted to DB on next "Save changes"
    };
    reader.readAsDataURL(file);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* ── Profile header card ─────────────────────────────────────────── */}
      <Card className="p-8 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div
            onClick={handleAvatarClick}
            className="relative group cursor-pointer h-20 w-20 rounded-2xl bg-primary/15 text-primary grid place-items-center text-2xl font-medium shrink-0 overflow-hidden"
          >
            {profilePic ? (
              <img src={profilePic} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="uppercase">{loading ? "…" : initials}</div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-medium">
              Upload
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-light text-foreground">
              {loading ? <span className="inline-block h-6 w-40 rounded bg-muted animate-pulse" /> : (fullName || "—")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Patient ID · {getPatientId(user?.id)}
            </p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Age",        value: age,        unit: "yrs" },
                { label: "Weight",     value: weight,     unit: "kg"  },
                { label: "Height",     value: height,     unit: "cm"  },
                { label: "Blood group",value: bloodGroup, unit: ""    },
                { label: "BMI",        value: bmi,        unit: ""    },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    {loading
                      ? <span className="inline-block h-5 w-8 rounded bg-muted animate-pulse" />
                      : <span className="text-lg font-medium text-foreground">{s.value || "—"}</span>
                    }
                    {!loading && s.unit && <span className="text-xs text-muted-foreground">{s.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="personal">
        <TabsList className="bg-transparent p-0 h-auto border-b border-border rounded-none w-full justify-start gap-6">
          {[
            { v: "personal",  l: "Personal details" },
            { v: "history",   l: "Medical history"  },
            { v: "meds",      l: "Medications"      },
            { v: "emergency", l: "Emergency"        },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 py-3 text-sm text-muted-foreground"
            >
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Personal details ──────────────────────────────────────────── */}
        <TabsContent value="personal" className="mt-6">
          <Card className="p-6 shadow-[var(--shadow-soft)]">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4 font-normal">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Full name</Label>
                    <Input value={fullName}   onChange={(e) => setFullName(e.target.value)}   className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Date of birth</Label>
                    <Input value={dob}        onChange={(e) => setDob(e.target.value)}         className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input value={email}      onChange={(e) => setEmail(e.target.value)}       className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                    <Input value={phone}      onChange={(e) => setPhone(e.target.value)}       className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                    <Input value={address}    onChange={(e) => setAddress(e.target.value)}     className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Preferred language</Label>
                    <Input value={lang}       onChange={(e) => setLang(e.target.value)}        className="h-10" disabled={loading} />
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4 font-normal">Vitals &amp; Health Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 max-w-2xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Age (years)</Label>
                    <Input value={age}        onChange={(e) => setAge(e.target.value)}         className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Weight (kg)</Label>
                    <Input value={weight}     onChange={(e) => setWeight(e.target.value)}      className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Height (cm)</Label>
                    <Input value={height}     onChange={(e) => setHeight(e.target.value)}      className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Blood group</Label>
                    <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}  className="h-10" disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">BMI</Label>
                    <Input value={bmi}        onChange={(e) => setBmi(e.target.value)}         className="h-10" disabled={loading} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button onClick={handleSave} disabled={saving || loading} className="min-w-[130px]">
                {saving
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : "Save changes"
                }
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving || loading}>
                Cancel
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── Medical history ───────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-6">
          <Card className="p-8 shadow-[var(--shadow-soft)]">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <ul className="space-y-8">
                {TIMELINE.map((e) => {
                  const dot = e.severity === "monitor"
                    ? "bg-status-monitor"
                    : e.severity === "stable"
                    ? "bg-status-stable"
                    : "bg-status-urgent";
                  return (
                    <li key={e.year + e.title} className="relative">
                      <span className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-background ${dot}`} />
                      <div className="text-xs font-medium text-muted-foreground">{e.year}</div>
                      <div className="mt-0.5 text-[15px] font-medium text-foreground">{e.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{e.note}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </TabsContent>

        {/* ── Medications ───────────────────────────────────────────────── */}
        <TabsContent value="meds" className="mt-6">
          <Card className="p-6 shadow-[var(--shadow-soft)]">
            <ul className="divide-y divide-border">
              {MEDS.map((m) => (
                <li key={m.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary-soft text-primary shrink-0">
                    <Pill className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-foreground">{m.name}</span>
                      <Badge variant="secondary" className="text-[11px] font-normal">{m.dose}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{m.freq}</div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <div>Since</div>
                    <div className="text-foreground/80 mt-0.5">{m.since}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        {/* ── Emergency ─────────────────────────────────────────────────── */}
        <TabsContent value="emergency" className="mt-6">
          <Card className="p-6 shadow-[var(--shadow-soft)] max-w-xl">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary-soft text-primary">
                  <UserIcon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-foreground">Meera Rao</div>
                  <div className="text-sm text-muted-foreground">Spouse · Primary contact</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary-soft text-primary">
                  <Phone className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[15px] font-medium text-foreground">+91 98450 12345</div>
                  <div className="text-sm text-muted-foreground">Available 24/7</div>
                </div>
              </div>
              <Button variant="outline" className="mt-2">Edit emergency contact</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
