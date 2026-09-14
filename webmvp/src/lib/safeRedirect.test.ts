import { describe, expect, it } from "vitest";

import {
  ADMIN_HOME_PATH,
  getSafeRedirectPath,
  resolvePostAuthPath,
} from "@/lib/safeRedirect";

describe("getSafeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(getSafeRedirectPath("/playlists/abc")).toBe("/playlists/abc");
  });

  it("rejects external and malformed paths", () => {
    expect(getSafeRedirectPath("//evil.com")).toBeNull();
    expect(getSafeRedirectPath("https://evil.com")).toBeNull();
    expect(getSafeRedirectPath(null)).toBeNull();
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
