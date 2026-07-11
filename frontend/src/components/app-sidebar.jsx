import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircle, MapPin, User, Stethoscope, LogOut } from "lucide-react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/find-care", label: "Find Care", icon: MapPin },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useClerk();
  const { user } = useUser();

  const initials = user
    ? (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")
    : "?";
  const displayName = user?.fullName ?? user?.username ?? "User";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
          <Stethoscope className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="text-[15px] font-medium tracking-tight text-foreground">
          Medsys<span className="text-primary">AI</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {nav.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary-soft text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px]",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                strokeWidth={1.75}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 min-w-0">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/15 text-primary grid place-items-center text-sm font-medium shrink-0 uppercase">
              {initials || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/landing" })}
            title="Sign out"
            className="grid place-items-center h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
