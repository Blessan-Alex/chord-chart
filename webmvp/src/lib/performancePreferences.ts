export type ChartTheme = "system" | "dark" | "stage";

const ZOOM_KEY = "lf-zoom-level";
const THEME_KEY = "lf-theme";
const VIEW_MODE_KEY = "lf-view-mode";

export const CHART_SCALE_MIN = 0.85;
export const CHART_SCALE_MAX = 2;
export const CHART_SCALE_STEP = 0.05;

export function clampChartScale(scale: number): number {
  return Math.min(CHART_SCALE_MAX, Math.max(CHART_SCALE_MIN, scale));
}

export function snapChartScale(scale: number): number {
  const snapped = Math.round(scale / CHART_SCALE_STEP) * CHART_SCALE_STEP;
  return clampChartScale(Math.round(snapped * 100) / 100);
}

export function readGlobalZoom(): number {
  if (typeof window === "undefined") {
    return 1;
  }
  const raw = window.localStorage.getItem(ZOOM_KEY);
  if (!raw) {
    return 1;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? snapChartScale(parsed) : 1;
}

export function writeGlobalZoom(scale: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ZOOM_KEY, String(snapChartScale(scale)));
}

export function readSessionZoom(sessionId: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(`lf-session-${sessionId}-zoom`);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? snapChartScale(parsed) : null;
}

export function writeSessionZoom(sessionId: string, scale: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    `lf-session-${sessionId}-zoom`,
    String(snapChartScale(scale)),
  );
}

export function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") {
    return "system";
  }
  const raw = window.localStorage.getItem(THEME_KEY);
  if (raw === "dark" || raw === "stage" || raw === "system") {
    return raw;
  }
  return "system";
}

/** Playlist performance context defaults to stage unless the user picked dark/stage. */
export function resolveChartTheme(sessionId: string | null): ChartTheme {
  const saved = readChartTheme();
  if (sessionId && saved === "system") {
    return "stage";
  }
  return saved;
}

export function writeChartTheme(theme: ChartTheme): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(THEME_KEY, theme);
}

export function readViewMode(): "scroll" | "sections" {
  if (typeof window === "undefined") {
    return "scroll";
  }
  return window.localStorage.getItem(VIEW_MODE_KEY) === "sections"
    ? "sections"
    : "scroll";
}

export function writeLastSessionIndex(sessionId: string, index: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`lf-session-${sessionId}-last-index`, String(index));
}

export function readLastSessionIndex(sessionId: string): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(`lf-session-${sessionId}-last-index`);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
