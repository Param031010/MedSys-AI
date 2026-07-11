import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pill, Phone, User as UserIcon } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile \u2014 MedsysAI" },
      { name: "description", content: "Your personal details, medical history, current medications and emergency contacts." }
    ]
  }),
  component: () => <AuthGuard><ProfilePage /></AuthGuard>
});
const STATS = [
  { label: "Age", value: "32", unit: "yrs" },
  { label: "Weight", value: "72", unit: "kg" },
  { label: "Height", value: "178", unit: "cm" },
  { label: "Blood group", value: "O+", unit: "" },
  { label: "BMI", value: "22.7", unit: "" }
];
const TIMELINE = [
  { year: "2024", title: "Hypertension diagnosis", note: "Started on Amlodipine 5mg", severity: "monitor" },
  { year: "2022", title: "Seasonal allergic rhinitis", note: "Recurring, spring months", severity: "stable" },
  { year: "2019", title: "Appendectomy", note: "Laparoscopic procedure \u2014 full recovery", severity: "stable" },
  { year: "2015", title: "Mild concussion", note: "Cycling accident \u2014 no long-term effects", severity: "stable" }
];
const MEDS = [
  { name: "Amlodipine", dose: "5 mg", freq: "Once daily, morning", since: "Jan 2024" },
  { name: "Vitamin D3", dose: "60,000 IU", freq: "Weekly", since: "Aug 2024" },
  { name: "Cetirizine", dose: "10 mg", freq: "As needed", since: "2022" }
];
function ProfilePage() {
  return <AppShell>
      <Card className="p-8 mb-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-6">
          <div className="h-20 w-20 rounded-2xl bg-primary/15 text-primary grid place-items-center text-2xl font-medium shrink-0">
            AR
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-light text-foreground">Aarav Rao</h1>
            <p className="text-sm text-muted-foreground mt-1">Patient ID · MS-208441</p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {STATS.map((s) => <div
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              {[
    { l: "Full name", v: "Aarav Rao" },
    { l: "Date of birth", v: "12 March 1993" },
    { l: "Email", v: "aarav.rao@example.com" },
    { l: "Phone", v: "+91 98765 43210" },
    { l: "Address", v: "Indiranagar, Bengaluru" },
    { l: "Preferred language", v: "English" }
  ].map((f) => <div key={f.l} className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{f.l}</Label>
                  <Input defaultValue={f.v} className="h-10" />
                </div>)}
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Save changes</Button>
              <Button variant="outline">Cancel</Button>
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
