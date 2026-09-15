"use client";

import { useEffect, useRef, useState } from "react";

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export function useWakeLock(enabled: boolean): { supported: boolean; active: boolean } {
  const supported = isWakeLockSupported();
  const [active, setActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!supported) {
      return;
    }

    let cancelled = false;

    const release = () => {
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setActive(false);
    };

    const acquire = async () => {
      if (cancelled || !enabled) {
        return;
      }

      try {
        const sentinel = await navigator.wakeLock!.request("screen");
        if (cancelled || !enabled) {
          await sentinel.release();
          return;
        }

        void sentinelRef.current?.release().catch(() => {});
        sentinelRef.current = sentinel;
        setActive(true);
      } catch {
        if (!cancelled) {
          setActive(false);
        }
      }
    };

    if (enabled) {
      void acquire();
    } else {
      release();
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled && !cancelled) {
        void acquire();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      release();
    };
  }, [enabled, supported]);

  return { supported, active };
}
