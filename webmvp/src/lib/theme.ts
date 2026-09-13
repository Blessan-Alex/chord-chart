export type AppTheme = "light" | "dark";

const STORAGE_KEY = "lf-theme";

export function readAppTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function writeAppTheme(theme: AppTheme): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyAppTheme(theme);
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = theme;
}

/** Inline script for layout.tsx — prevents light flash before hydration. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;
