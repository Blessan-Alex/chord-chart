"use client";

import { AppLogo } from "@/components/AppLogo";

export function AuthLoadingOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-lf-bg-page/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <AppLogo showText={false} size="lg" />
        </div>
        <p className="text-sm text-lf-text-secondary">Loading…</p>
      </div>
    </div>
  );
}
