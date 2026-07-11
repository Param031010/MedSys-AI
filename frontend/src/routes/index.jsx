import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Wind, CloudSun, Droplets, Moon, Activity } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import aiDoctor from "@/assets/ai-doctor.png";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home \u2014 MedsysAI" },
      { name: "description", content: "Your daily health overview: air quality, weather, personalised tips and current severity status." }
    ]
  }),
  component: () => <AuthGuard><HomePage /></AuthGuard>
});
function HomePage() {
  return <AppShell>
      <div className="flex items-center justify-between gap-6 mb-10">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Tuesday, 21 October</p>
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Hello, <span className="font-normal">Aarav</span>
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground max-w-md">
            Here's your health snapshot for today. Everything looks steady.
          </p>
        </div>
        <img
    src={aiDoctor}
    alt="MedsysAI assistant"
    width={112}
    height={112}
    loading="lazy"
    className="h-28 w-28 rounded-2xl bg-primary-soft p-2 shrink-0"
  />
      </div>

      {
    /* Severity — hero card */
  }
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

      {
    /* Row of cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {
    /* AQI */
  }
        <Card className="p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wind className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-sm font-medium">Air Quality</span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-status-monitor-soft text-status-monitor">
              Moderate
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-light text-foreground">86</span>
            <span className="text-sm text-muted-foreground">AQI</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
    className="h-full rounded-full bg-gradient-to-r from-status-stable via-status-monitor to-status-urgent"
    style={{ width: "45%" }}
  />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sensitive groups should limit outdoor activity.
          </p>
        </Card>

        {
    /* Weather */
  }
        <Card className="p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CloudSun className="h-4 w-4" strokeWidth={1.75} />
              <span className="text-sm font-medium">Weather</span>
            </div>
            <span className="text-xs text-muted-foreground">Bengaluru</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-light text-foreground">27°</span>
            <span className="text-sm text-muted-foreground">Partly cloudy</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-status-monitor" strokeWidth={2} />
            High pollen count today — consider a mask outdoors.
          </div>
        </Card>

        {
    /* Tips */
  }
        <Card className="p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 mb-5 text-muted-foreground">
            <Activity className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">Today's Tips</span>
          </div>
          <ul className="space-y-3">
            {[
    { icon: Droplets, text: "Drink at least 2.5L of water" },
    { icon: Moon, text: "Aim for 7\u20138 hours of sleep tonight" },
    { icon: Activity, text: "Light stretching recommended" }
  ].map((tip) => <li key={tip.text} className="flex items-start gap-3 text-sm text-foreground">
                <span className="mt-0.5 grid place-items-center h-5 w-5 rounded-md bg-primary-soft text-primary shrink-0">
                  <tip.icon className="h-3 w-3" strokeWidth={2} />
                </span>
                <span className="leading-snug">{tip.text}</span>
              </li>)}
          </ul>
        </Card>
      </div>
    </AppShell>;
}
