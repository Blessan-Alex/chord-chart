"use client";

import { useEffect } from "react";

import { applyAppTheme, readAppTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyAppTheme(readAppTheme());
  }, []);

  return children;
}
