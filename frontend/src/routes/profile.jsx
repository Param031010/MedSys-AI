import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pill, Phone, User as UserIcon } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — MedsysAI" },
      { name: "description", content: "Your personal details, medical history, current medications and emergency contacts." }
    ]
  }),
  component: () => <AuthGuard><ProfilePage /></AuthGuard>
});
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
function ProfilePage() {
  const { user } = useUser();
  const fileInputRef = useRef(null);

  const defaultFullName = user?.fullName || user?.username || "Aarav Rao";
  const defaultEmail = user?.primaryEmailAddress?.emailAddress || "aarav.rao@example.com";

  // Form states
  const [fullName, setFullName] = useState(() => localStorage.getItem("medsys_fullName") || "");
  const [dob, setDob] = useState(() => localStorage.getItem("medsys_dob") || "12 March 1993");
  const [email, setEmail] = useState(() => localStorage.getItem("medsys_email") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("medsys_phone") || "+91 98765 43210");
  const [address, setAddress] = useState(() => localStorage.getItem("medsys_address") || "Indiranagar, Bengaluru");
  const [lang, setLang] = useState(() => localStorage.getItem("medsys_lang") || "English");

  // Stat states
  const [age, setAge] = useState(() => localStorage.getItem("medsys_age") || "32");
  const [weight, setWeight] = useState(() => localStorage.getItem("medsys_weight") || "72");
  const [height, setHeight] = useState(() => localStorage.getItem("medsys_height") || "178");
  const [bloodGroup, setBloodGroup] = useState(() => localStorage.getItem("medsys_bloodGroup") || "O+");
  const [bmi, setBmi] = useState(() => localStorage.getItem("medsys_bmi") || "22.7");

  // Profile pic state
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem("medsys_profilePic") || "");

  // Sync defaults
  useEffect(() => {
    if (user) {
      if (!localStorage.getItem("medsys_fullName")) {
        setFullName(user.fullName || user.username || "Aarav Rao");
      }
      if (!localStorage.getItem("medsys_email")) {
        setEmail(user.primaryEmailAddress?.emailAddress || "aarav.rao@example.com");
      }
      if (!localStorage.getItem("medsys_profilePic")) {
        setProfilePic(user.imageUrl || "");
      }
    }
  }, [user]);

  // Sync listener
  useEffect(() => {
    const handleUpdate = () => {
      setFullName(localStorage.getItem("medsys_fullName") || user?.fullName || user?.username || "Aarav Rao");
      setEmail(localStorage.getItem("medsys_email") || user?.primaryEmailAddress?.emailAddress || "aarav.rao@example.com");
      setProfilePic(localStorage.getItem("medsys_profilePic") || user?.imageUrl || "");
    };
    window.addEventListener("medsys_profile_updated", handleUpdate);
    return () => window.removeEventListener("medsys_profile_updated", handleUpdate);
  }, [user]);

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "?";

  const handleSave = () => {
    localStorage.setItem("medsys_fullName", fullName);
    localStorage.setItem("medsys_dob", dob);
    localStorage.setItem("medsys_email", email);
    localStorage.setItem("medsys_phone", phone);
    localStorage.setItem("medsys_address", address);
    localStorage.setItem("medsys_lang", lang);

    localStorage.setItem("medsys_age", age);
    localStorage.setItem("medsys_weight", weight);
    localStorage.setItem("medsys_height", height);
    localStorage.setItem("medsys_bloodGroup", bloodGroup);
    localStorage.setItem("medsys_bmi", bmi);

    window.dispatchEvent(new Event("medsys_profile_updated"));
    alert("Profile saved successfully!");
  };

  const handleCancel = () => {
    setFullName(localStorage.getItem("medsys_fullName") || defaultFullName);
    setDob(localStorage.getItem("medsys_dob") || "12 March 1993");
    setEmail(localStorage.getItem("medsys_email") || defaultEmail);
    setPhone(localStorage.getItem("medsys_phone") || "+91 98765 43210");
    setAddress(localStorage.getItem("medsys_address") || "Indiranagar, Bengaluru");
    setLang(localStorage.getItem("medsys_lang") || "English");

    setAge(localStorage.getItem("medsys_age") || "32");
    setWeight(localStorage.getItem("medsys_weight") || "72");
    setHeight(localStorage.getItem("medsys_height") || "178");
    setBloodGroup(localStorage.getItem("medsys_bloodGroup") || "O+");
    setBmi(localStorage.getItem("medsys_bmi") || "22.7");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePic(base64String);
        localStorage.setItem("medsys_profilePic", base64String);
        window.dispatchEvent(new Event("medsys_profile_updated"));
      };
      reader.readAsDataURL(file);
    }
  };

  return <AppShell>
      <Card className="p-8 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-6">
          <div 
            onClick={handleAvatarClick}
            className="relative group cursor-pointer h-20 w-20 rounded-2xl bg-primary/15 text-primary grid place-items-center text-2xl font-medium shrink-0 overflow-hidden"
          >
            {profilePic ? (
              <img
                src={profilePic}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="uppercase">{initials}</div>
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
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-light text-foreground">{fullName || defaultFullName}</h1>
            <p className="text-sm text-muted-foreground mt-1">Patient ID · {getPatientId(user?.id)}</p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Age", value: age, unit: "yrs" },
                { label: "Weight", value: weight, unit: "kg" },
                { label: "Height", value: height, unit: "cm" },
                { label: "Blood group", value: bloodGroup, unit: "" },
                { label: "BMI", value: bmi, unit: "" }
              ].map((s) => <div
    key={s.label}
    className="rounded-lg border border-border bg-background px-3 py-2.5"
  >
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-medium text-foreground">{s.value}</span>
                    {s.unit && <span className="text-xs text-muted-foreground">{s.unit}</span>}
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="bg-transparent p-0 h-auto border-b border-border rounded-none w-full justify-start gap-6">
          {[
    { v: "personal", l: "Personal details" },
    { v: "history", l: "Medical history" },
    { v: "meds", l: "Medications" },
    { v: "emergency", l: "Emergency" }
  ].map((t) => <TabsTrigger
    key={t.v}
    value={t.v}
    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-0 py-3 text-sm text-muted-foreground"
  >
              {t.l}
            </TabsTrigger>)}
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <Card className="p-6 shadow-[var(--shadow-soft)]">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4 font-normal">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Date of birth</Label>
                    <Input value={dob} onChange={(e) => setDob(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Address</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Preferred language</Label>
                    <Input value={lang} onChange={(e) => setLang(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4 font-normal">Vitals & Health Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 max-w-2xl">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Age (years)</Label>
                    <Input value={age} onChange={(e) => setAge(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Weight (kg)</Label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Height (cm)</Label>
                    <Input value={height} onChange={(e) => setHeight(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Blood group</Label>
                    <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">BMI</Label>
                    <Input value={bmi} onChange={(e) => setBmi(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button onClick={handleSave}>Save changes</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="p-8 shadow-[var(--shadow-soft)]">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <ul className="space-y-8">
                {TIMELINE.map((e) => {
    const dot = e.severity === "monitor" ? "bg-status-monitor" : e.severity === "stable" ? "bg-status-stable" : "bg-status-urgent";
    return <li key={e.year + e.title} className="relative">
                      <span
      className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-background ${dot}`}
    />
                      <div className="text-xs font-medium text-muted-foreground">{e.year}</div>
                      <div className="mt-0.5 text-[15px] font-medium text-foreground">{e.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{e.note}</div>
                    </li>;
  })}
              </ul>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="meds" className="mt-6">
          <Card className="p-6 shadow-[var(--shadow-soft)]">
            <ul className="divide-y divide-border">
              {MEDS.map((m) => <li key={m.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
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
                </li>)}
            </ul>
          </Card>
        </TabsContent>

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
    </AppShell>;
}
