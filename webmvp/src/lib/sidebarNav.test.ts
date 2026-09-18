import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV_ENTRY,
  buildSidebarNav,
  MAIN_NAV_ENTRIES,
  resolveMobilePageTitle,
} from "./sidebarNav";

describe("buildSidebarNav", () => {
  it("returns main nav only for non-admins", () => {
    expect(buildSidebarNav(false)).toEqual(MAIN_NAV_ENTRIES);
    expect(buildSidebarNav(false).map((item) => item.href)).toEqual([
      "/",
      "/playlists",
      "/groups",
      "/profile",
    ]);
  });

  it("puts admin first for admins", () => {
    const nav = buildSidebarNav(true);
    expect(nav[0]).toEqual(ADMIN_NAV_ENTRY);
    expect(nav.map((item) => item.href)).toEqual([
      "/admin",
      "/",
      "/playlists",
      "/groups",
      "/profile",
    ]);
  });
});

describe("resolveMobilePageTitle", () => {
  it("returns undefined on home", () => {
    expect(resolveMobilePageTitle("/", MAIN_NAV_ENTRIES)).toBeUndefined();
  });

  it("labels admin and import routes", () => {
    const adminNav = buildSidebarNav(true);
    expect(resolveMobilePageTitle("/admin", adminNav)).toBe("Admin");
    expect(resolveMobilePageTitle("/import", adminNav)).toBe("Add song");
  });
});
