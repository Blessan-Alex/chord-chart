"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/lib/hooks/useAuth";
import { userDisplayName, userInitials } from "@/lib/userDisplay";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: boolean;
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: "/playlists",
    label: "Playlists",
    matchPrefix: true,
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: "/groups",
    label: "Groups",
    matchPrefix: true,
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11Z" />
          <path d="M8 12c1.657 0 3-1.567 3-3.5S9.657 5 8 5 5 6.567 5 8.5 7.343 12 8 12Z" />
          <path d="M8 14c-2.761 0-5 1.79-5 4v1h10v-1c0-2.21-2.239-4-5-4Z" />
          <path d="M16 13c-2.761 0-5 1.79-5 4v1h5" />
        </svg>
      </NavIcon>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <NavIcon>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </NavIcon>
    ),
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { isAdmin } = useAuth();

  return (
    <nav className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-1">
        {MAIN_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-lf-bg-active text-lf-brand"
                    : "text-lf-text-secondary hover:bg-lf-bg-muted hover:text-lf-text-primary"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-lf-text-tertiary">
            Administration
          </p>
          <Link
            href="/admin/songs"
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-lf-bg-active text-lf-brand"
                : "text-lf-text-secondary hover:bg-lf-bg-muted hover:text-lf-text-primary"
            }`}
          >
            <NavIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </NavIcon>
            Admin
          </Link>
        </div>
      )}
    </nav>
  );
}

function UserFooter() {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="mt-auto border-t border-lf-border px-3 py-4">
        <div className="h-10 animate-pulse rounded-lg bg-lf-bg-muted" />
      </div>
    );
  }

  const name = profile
    ? profile.displayName
    : user
      ? userDisplayName(user.displayName, user.email)
      : "Guest";
  const initials = profile?.avatarInitials ?? userInitials(name);
  const role = user ? (isAdmin ? "Administrator" : "Musician") : "Sign in";
  const subtitle = profile?.username
    ? `@${profile.username}`
    : role;

  return (
    <div className="mt-auto border-t border-lf-border px-3 py-4">
      <Link
        href={user ? "/profile" : "/login"}
        className="flex items-center gap-3 rounded-[10px] p-2 transition-colors hover:bg-lf-bg-muted"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lf-brand-soft text-sm font-semibold text-lf-brand">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-lf-text-primary">
            {name}
          </p>
          <p className="truncate text-xs text-lf-text-secondary">{subtitle}</p>
        </div>
      </Link>
    </div>
  );
}

type AppShellSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function AppShellSidebar({
  mobileOpen,
  onMobileClose,
}: AppShellSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        role="dialog"
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[var(--lf-sidebar-width)] flex-col border-r border-lf-border bg-lf-bg-sidebar pt-[env(safe-area-inset-top)] transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5">
          <Link href="/" onClick={onMobileClose}>
            <AppLogo />
          </Link>
        </div>

        <div className="flex flex-1 flex-col px-3">
          <SidebarNav pathname={pathname} onNavigate={onMobileClose} />
          <UserFooter />
        </div>
      </aside>
    </>
  );
}

function MobileTopBar({
  onOpenMenu,
  pathname,
}: {
  onOpenMenu: () => void;
  pathname: string;
}) {
  const pageTitle = MAIN_NAV.find((item) => isActive(pathname, item))?.label;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-lf-border bg-lf-bg-sidebar/95 px-4 py-3 backdrop-blur-sm md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-lf-border text-lf-text-primary"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <AppLogo size="sm" showText={!pageTitle} />
      {pageTitle && (
        <span className="text-base font-semibold text-lf-text-primary">
          {pageTitle}
        </span>
      )}
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-lf-bg-page">
      <AppShellSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileTopBar
          onOpenMenu={() => setMobileOpen(true)}
          pathname={pathname}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
