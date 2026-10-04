import { describe, expect, it, vi } from "vitest";

import { caretIndexFromPointer } from "@/lib/lyricCaretHitTest";

vi.mock("@/lib/lyricMeasurement", () => ({
  measureLyricCharOffset: vi.fn((_: HTMLElement, index: number) => index * 10),
}));

function mockElement(left: number): HTMLElement {
  return {
    getBoundingClientRect: () =>
      ({ left, top: 0, width: 200, height: 20 }) as DOMRect,
  } as HTMLElement;
}

describe("caretIndexFromPointer", () => {
  it("returns 0 for empty lyrics", () => {
    expect(caretIndexFromPointer(mockElement(0), 5, 0)).toBe(0);
  });

  it("picks the nearest boundary index", () => {
    const element = mockElement(100);

    expect(caretIndexFromPointer(element, 125, 5)).toBe(2);

    expect(caretIndexFromPointer(element, 105, 5)).toBe(0);
    expect(caretIndexFromPointer(element, 150, 5)).toBe(5);
  });
});
