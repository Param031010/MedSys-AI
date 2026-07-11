import { AppSidebar } from "./app-sidebar";
export function AppShell({ children }) {
  return <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1280px] px-8 py-10">{children}</div>
      </main>
    </div>;
}
