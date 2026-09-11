import { describe, expect, it } from "vitest";

import { formatError } from "./formatError";

describe("formatError", () => {
  it("returns the message from an Error", () => {
    expect(formatError(new Error("msg"))).toBe("msg");
  });

  it("returns a string unchanged", () => {
    expect(formatError("string")).toBe("string");
  });

  it("formats a browser Event object", () => {
    const event = { type: "error" };
    expect(formatError(event)).toBe("Unexpected browser event: error");
  });
});
