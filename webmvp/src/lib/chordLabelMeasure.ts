/** Measure rendered chord label widths for skyline layout. */

export const CHORD_LABEL_FALLBACK_FONT = "700 16px system-ui, sans-serif";

let measureCanvas: HTMLCanvasElement | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas");
  }

  return measureCanvas.getContext("2d");
}

/** Font string matching `.chord-row` computed styles. */
export function chordRowFontFromElement(element: HTMLElement | null): string {
  if (!element || typeof window === "undefined") {
    return CHORD_LABEL_FALLBACK_FONT;
  }

  const style = window.getComputedStyle(element);
  const weight = style.fontWeight || "700";
  const size = style.fontSize || "16px";
  const family = style.fontFamily || "system-ui, sans-serif";
  return `${weight} ${size} ${family}`;
}

export function measureChordLabelWidths(
  labels: readonly string[],
  font: string,
): number[] {
  const ctx = getMeasureContext();
  if (!ctx) {
    return labels.map(() => 0);
  }

  ctx.font = font;
  return labels.map((label) => ctx.measureText(label).width);
}
