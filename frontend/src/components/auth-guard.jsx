import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Stethoscope } from "lucide-react";

/**
 * Wraps any route component. Redirects unsigned users to /landing.
 */
export function AuthGuard({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: "/landing" });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Loading state while Clerk hydrates
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary-soft text-primary animate-pulse">
            <Stethoscope className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm text-muted-foreground">Loading MedsysAI…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return children;
}
