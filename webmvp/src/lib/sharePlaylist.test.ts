import { describe, expect, it } from "vitest";

import {
  playlistInvitePath,
  playlistInviteUrl,
  playlistShareMessage,
  playlistShareResultMessage,
  shareResultMessage,
  songShareMessage,
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

  it("formats LF Chords share messages", () => {
    expect(songShareMessage("Amazing Grace", "https://lfchords.vercel.app/song/1")).toBe(
      'Check out "Amazing Grace" from the LF Chords app https://lfchords.vercel.app/song/1',
    );
    expect(
      playlistShareMessage("Sunday Set", "https://lfchords.vercel.app/join/p/tok"),
    ).toBe(
      'Check out "Sunday Set" from the LF Chords app https://lfchords.vercel.app/join/p/tok',
    );
  });

  it("maps share results to user messages", () => {
    expect(playlistShareResultMessage("copied")).toContain("Message copied");
    expect(shareResultMessage("copied")).toContain("Message copied");
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
