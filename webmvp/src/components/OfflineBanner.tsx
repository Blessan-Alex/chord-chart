"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-50 border-b border-amber-400 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
      role="status"
    >
      You&apos;re offline. Cached songs and sessions may still be available.
    </div>
  );
}
