import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Plus } from "lucide-react";
import { Header } from "./Header";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users, end: false },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="pl-0 md:pl-56">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-line bg-surface md:flex">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          P
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">Project Demo</p>
          <p className="text-xs text-muted">AI-powered lead operations</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-canvas hover:text-ink"
              }`
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/new"
          className="mt-4 flex items-center gap-2.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New Lead
        </NavLink>
      </nav>
      <div className="border-t border-line px-5 py-4 text-xs text-muted">
        AI Lead Qualifier
      </div>
    </aside>
  );
}