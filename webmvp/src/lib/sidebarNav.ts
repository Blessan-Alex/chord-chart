export type SidebarNavEntry = {
  id: string;
  href: string;
  label: string;
  matchPrefix?: boolean;
};

export const MAIN_NAV_ENTRIES: SidebarNavEntry[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "playlists", href: "/playlists", label: "Playlists", matchPrefix: true },
  { id: "groups", href: "/groups", label: "Groups", matchPrefix: true },
  { id: "profile", href: "/profile", label: "Profile" },
];

export const ADMIN_NAV_ENTRY: SidebarNavEntry = {
  id: "admin",
  href: "/admin",
  label: "Admin",
  matchPrefix: true,
};

export function buildSidebarNav(isAdmin: boolean): SidebarNavEntry[] {
  if (!isAdmin) {
    return MAIN_NAV_ENTRIES;
  }
  return [ADMIN_NAV_ENTRY, ...MAIN_NAV_ENTRIES];
}

export function isSidebarNavActive(
  pathname: string,
  item: SidebarNavEntry,
): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

/** Mobile header title; home stays logo-only. */
export function resolveMobilePageTitle(
  pathname: string,
  navItems: SidebarNavEntry[],
): string | undefined {
  if (pathname === "/") {
    return undefined;
  }
  if (pathname === "/import" || pathname.startsWith("/import/")) {
    return "Add song";
  }

  return navItems.find((item) => isSidebarNavActive(pathname, item))?.label;
}
