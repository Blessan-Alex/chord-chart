import { describe, expect, it } from "vitest";

import {
  firebaseAuthRedirectUri,
  resolveFirebaseAuthDomain,
} from "@/lib/firebaseAuthDomain";

describe("resolveFirebaseAuthDomain", () => {
  it("uses Firebase-hosted auth domain on localhost", () => {
    expect(
      resolveFirebaseAuthDomain({
        configured: "lfchords.vercel.app",
        hostname: "localhost",
        projectId: "song-db-5e4ed",
      }),
    ).toBe("song-db-5e4ed.firebaseapp.com");
  });

  it("uses configured auth domain in production", () => {
    expect(
      resolveFirebaseAuthDomain({
        configured: "lfchords.vercel.app",
        hostname: "lfchords.vercel.app",
        projectId: "song-db-5e4ed",
      }),
    ).toBe("lfchords.vercel.app");
  });

  it("requires configured auth domain in production", () => {
    expect(() =>
      resolveFirebaseAuthDomain({
        hostname: "lfchords.vercel.app",
        projectId: "song-db-5e4ed",
      }),
    ).toThrow("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required");
  });
});

describe("firebaseAuthRedirectUri", () => {
  it("builds the Google OAuth redirect URI", () => {
    expect(firebaseAuthRedirectUri("lfchords.vercel.app")).toBe(
      "https://lfchords.vercel.app/__/auth/handler",
    );
  });
});
