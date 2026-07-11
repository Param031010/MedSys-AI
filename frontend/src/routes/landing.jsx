import { createFileRoute, Link } from "@tanstack/react-router";
import { useClerk, SignedIn, SignedOut } from "@clerk/clerk-react";
import {
  Stethoscope,
  MessageSquareHeart,
  MapPin,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "MedsysAI — Your AI Health Hub" },
      {
        name: "description",
        content:
          "MedsysAI is a calm, clinical AI health assistant that helps you track wellbeing, chat with a medical assistant, and find nearby care.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: MessageSquareHeart,
    title: "AI Medical Chat",
    description:
      "Ask about symptoms, medications, and lab results. Get structured, empathetic guidance powered by Groq.",
  },
  {
    icon: BarChart3,
    title: "Health Dashboard",
    description:
      "Track your daily wellbeing snapshot — air quality, weather, vitals, and personalised health tips.",
  },
  {
    icon: MapPin,
    title: "Find Nearby Care",
    description:
      "Locate clinics, pharmacies, and specialists near you when you need in-person attention.",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure",
    description:
      "Your data stays yours. We use industry-leading auth and encryption — no data sold, ever.",
  },
  {
    icon: Zap,
    title: "Instant Answers",
    description:
      "Streaming AI responses via Groq mean you get answers in real time, not after a loading spinner.",
  },
  {
    icon: Activity,
    title: "Severity Tracking",
    description:
      "Know at a glance whether your health status is stable, needs monitoring, or requires urgent action.",
  },
];

function LandingPage() {
  const { openSignIn, openSignUp } = useClerk();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">MedsysAI</span>
          </div>

          <div className="flex items-center gap-3">
            <SignedIn>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </SignedIn>
            <SignedOut>
              <button
                onClick={() => openSignIn({ afterSignInUrl: "/" })}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted"
              >
                Sign in
              </button>
              <button
                onClick={() => openSignUp({ afterSignUpUrl: "/" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get started free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </SignedOut>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.58 0.09 200 / 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center relative">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 mb-8 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-status-stable animate-pulse" />
            Powered by Groq — real-time AI responses
          </div>

          <h1 className="text-5xl sm:text-6xl font-light tracking-tight text-foreground leading-[1.1] mb-6">
            Your health,{" "}
            <span
              className="font-normal"
              style={{ color: "oklch(0.58 0.09 200)" }}
            >
              understood.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            MedsysAI is a calm, clinical AI health companion. Ask about symptoms,
            track your wellbeing, and find care — all in one private space.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <SignedOut>
              <button
                id="hero-signup-btn"
                onClick={() => openSignUp({ afterSignUpUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </button>
              <button
                id="hero-signin-btn"
                onClick={() => openSignIn({ afterSignInUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-[15px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                Sign in
              </button>
            </SignedOut>
            <SignedIn>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-light tracking-tight text-foreground mb-3">
            Everything your health needs
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Built for everyday people who want clarity, not complexity, when it comes to their health.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:border-primary/30 transition-all duration-200"
            >
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary-soft text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-border p-12 text-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.025 200) 0%, oklch(0.99 0.002 240) 60%, oklch(0.96 0.035 155 / 0.4) 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse 60% 70% at 50% 120%, oklch(0.58 0.09 200 / 0.12) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground mx-auto mb-6 shadow-lg shadow-primary/30">
              <Stethoscope className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h2 className="text-3xl font-light tracking-tight text-foreground mb-3">
              Ready to take control of your health?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join MedsysAI today — it's free to start, no credit card required.
            </p>
            <SignedOut>
              <button
                id="cta-signup-btn"
                onClick={() => openSignUp({ afterSignUpUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </button>
            </SignedOut>
            <SignedIn>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="grid place-items-center h-6 w-6 rounded-md bg-primary-soft text-primary">
              <Stethoscope className="h-3 w-3" strokeWidth={2} />
            </div>
            <span>MedsysAI Health Hub</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MedsysAI. For informational purposes only — not a substitute for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
