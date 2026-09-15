import { describe, expect, it } from "vitest";

import { resolveFirebaseAuthDomain } from "@/lib/firebaseAuthDomain";

describe("resolveFirebaseAuthDomain", () => {
  it("uses configured auth domain on localhost", () => {
    expect(
      resolveFirebaseAuthDomain({
        configured: "song-db-5e4ed.firebaseapp.com",
        hostname: "localhost",
        projectId: "song-db-5e4ed",
      }),
    ).toBe("song-db-5e4ed.firebaseapp.com");
  });

  it("falls back to project firebaseapp.com on localhost without config", () => {
    expect(
      resolveFirebaseAuthDomain({
        hostname: "127.0.0.1",
        projectId: "song-db-5e4ed",
      }),
    ).toBe("song-db-5e4ed.firebaseapp.com");
  });

  it("uses deployment hostname in production for same-origin auth handler", () => {
    expect(
      resolveFirebaseAuthDomain({
        configured: "song-db-5e4ed.firebaseapp.com",
        hostname: "lfchords.vercel.app",
        projectId: "song-db-5e4ed",
      }),
    ).toBe("lfchords.vercel.app");
  });
});
