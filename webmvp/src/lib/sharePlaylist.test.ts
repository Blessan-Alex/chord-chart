import { describe, expect, it } from "vitest";

import {
  playlistInvitePath,
  playlistInviteUrl,
  playlistShareResultMessage,
  shareResultMessage,
  songShareUrl,
} from "@/lib/sharePlaylist";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { generatePlaylistInviteToken, normalizeInviteToken } from "@/lib/playlistInviteToken";

describe("sharePlaylist", () => {
  it("builds invite path and url", () => {
    expect(playlistInvitePath("abc123xyz")).toBe("/join/p/abc123xyz");
    expect(playlistInviteUrl("tok", "https://lfchords.vercel.app")).toBe(
      "https://lfchords.vercel.app/join/p/tok",
    );
  });

  it("builds public song share url", () => {
    expect(songShareUrl("song1", "https://lfchords.vercel.app")).toBe(
      "https://lfchords.vercel.app/song/song1",
    );
  });

  it("maps share results to user messages", () => {
    expect(playlistShareResultMessage("copied")).toContain("Invite link copied");
    expect(shareResultMessage("copied")).toContain("Link copied");
    expect(shareResultMessage("cancelled")).toBeNull();
  });
});

describe("safeRedirect", () => {
  it("allows same-origin paths only", () => {
    expect(getSafeRedirectPath("/join/p/abc")).toBe("/join/p/abc");
    expect(getSafeRedirectPath("https://evil.test")).toBeNull();
    expect(getSafeRedirectPath("//evil.test")).toBeNull();
  });
});

describe("playlistInviteToken", () => {
  it("generates tokens with expected length", () => {
    expect(generatePlaylistInviteToken()).toHaveLength(16);
  });

  it("normalizes invite tokens", () => {
    expect(normalizeInviteToken("  abc  ")).toBe("abc");
  });
});
