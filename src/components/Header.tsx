import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, Plus, Users } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              P
            </div>
            <span className="text-sm font-semibold text-ink">Project Demo</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {/* desktop nav lives in sidebar; mobile nav lives here */}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                isActive ? "bg-primary-soft text-primary" : "text-muted"
              }`
            }
          >
            <span className="flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              `rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                isActive ? "bg-primary-soft text-primary" : "text-muted"
              }`
            }
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              Leads
            </span>
          </NavLink>
          <NavLink
            to="/new"
            className="rounded-lg bg-primary px-2.5 py-1.5 text-sm font-medium text-white"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              New
            </span>
          </NavLink>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">Admin</span>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
            aria-hidden
          >
            A
          </div>
        </div>
      </div>
    </header>
  );
}