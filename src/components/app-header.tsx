"use client";

import Link from "next/link";
import {
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  UserCircle2
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function AppHeader({
  user,
  children
}: {
  user: { displayName: string; role: string };
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isGuest = user.role === "GUEST";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="modern-topbar">
      <div className="topbar-inner">
        <Link className="obs-bygg-wordmark" href="/" aria-label="Obs BYGG">
          <span>OBS</span>
          <span>BYGG</span>
        </Link>

        <nav className="main-nav" aria-label="Hovedmeny">
          <Link
            className={pathname === "/" ? "nav-link active" : "nav-link"}
            href="/"
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </Link>

          <Link
            className={
              pathname.startsWith("/orders") ? "nav-link active" : "nav-link"
            }
            href="/"
          >
            <ClipboardList size={19} />
            <span>Ordre</span>
          </Link>
        </nav>

        <div className="modern-header-actions">
          {children}

          {isGuest ? (
            <Link className="header-login-button" href="/login">
              <LogIn size={18} />
              <span>Logg inn</span>
            </Link>
          ) : (
            <>
              {user.role === "ADMIN" && (
                <Link
                  className="header-icon-button"
                  href="/admin"
                  aria-label="Administrasjon"
                  title="Administrasjon"
                >
                  <Settings size={19} />
                </Link>
              )}

              <div className="header-user">
                <UserCircle2 size={36} />
                <div>
                  <strong>{user.displayName}</strong>
                  <span>{user.role === "ADMIN" ? "Administrator" : user.role}</span>
                </div>
              </div>

              <button
                className="header-icon-button"
                onClick={logout}
                aria-label="Logg ut"
                title="Logg ut"
              >
                <LogOut size={19} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
