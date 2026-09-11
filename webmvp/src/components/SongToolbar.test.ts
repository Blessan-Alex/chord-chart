import { describe, expect, it } from "vitest";

import { adminSongActionLabels } from "./SongToolbar";

describe("SongToolbar", () => {
  it("shows admin actions only for admins", () => {
    expect(adminSongActionLabels(true)).toEqual(["Edit", "+ Session", "Delete"]);
    expect(adminSongActionLabels(false)).toEqual([]);
  });
});
