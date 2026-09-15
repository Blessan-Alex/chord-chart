import { describe, expect, it } from "vitest";

import {
  ADMIN_HOME_PATH,
  USERNAME_ONBOARDING_PATH,
  getSafeRedirectPath,
  resolvePostAuthDestination,
  resolvePostAuthPath,
} from "@/lib/safeRedirect";
import type { UserProfile } from "@/lib/types";

describe("getSafeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(getSafeRedirectPath("/playlists/abc")).toBe("/playlists/abc");
  });

  it("rejects external and malformed paths", () => {
    expect(getSafeRedirectPath("//evil.com")).toBeNull();
    expect(getSafeRedirectPath("https://evil.com")).toBeNull();
    expect(getSafeRedirectPath(null)).toBeNull();
    expect(getSafeRedirectPath(USERNAME_ONBOARDING_PATH)).toBeNull();
  });
});

describe("resolvePostAuthPath", () => {
  it("sends admins to the dashboard by default", () => {
    expect(resolvePostAuthPath(null, true)).toBe(ADMIN_HOME_PATH);
  });

  it("sends musicians to home by default", () => {
    expect(resolvePostAuthPath(null, false)).toBe("/");
  });

  it("honours an explicit next path for admins", () => {
    expect(resolvePostAuthPath("/join/p/token", true)).toBe("/join/p/token");
  });
});

describe("resolvePostAuthDestination", () => {
  const profileWithUsername = {
    email: "alex@example.com",
    displayName: "Alex",
    username: "alexrivera",
    usernameLower: "alexrivera",
    role: "musician" as const,
  } satisfies Pick<UserProfile, "email" | "displayName" | "username" | "usernameLower" | "role">;

  it("routes users without a username to onboarding", () => {
    expect(resolvePostAuthDestination(null, false, {
      email: "alex@example.com",
      displayName: "Alex",
      role: "musician",
    } as UserProfile)).toBe(USERNAME_ONBOARDING_PATH);
    expect(
      resolvePostAuthDestination("/playlists/abc", false, {
        ...profileWithUsername,
        username: undefined,
        usernameLower: undefined,
      }),
    ).toBe(
      `${USERNAME_ONBOARDING_PATH}?next=${encodeURIComponent("/playlists/abc")}`,
    );
  });

  it("does not route to onboarding when profile failed to load", () => {
    expect(resolvePostAuthDestination(null, false, null)).toBe("/");
    expect(resolvePostAuthDestination("/playlists/abc", false, null)).toBe(
      "/playlists/abc",
    );
  });

  it("sends users with a username to their destination", () => {
    expect(resolvePostAuthDestination(null, false, profileWithUsername)).toBe("/");
    expect(resolvePostAuthDestination("/playlists/abc", false, profileWithUsername)).toBe(
      "/playlists/abc",
    );
    expect(resolvePostAuthDestination(null, true, profileWithUsername)).toBe(
      ADMIN_HOME_PATH,
    );
  });
});
