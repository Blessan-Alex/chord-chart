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
    if (!supported || !enabled) {
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setActive(false);
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock!.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }

        sentinelRef.current = sentinel;
        setActive(true);
        sentinel.addEventListener("release", () => {
          if (!cancelled) {
            setActive(false);
          }
        });
      } catch {
        if (!cancelled) {
          setActive(false);
        }
      }
    };

    void acquire();

    return () => {
      cancelled = true;
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
      setActive(false);
    };
  }, [enabled, supported]);

  useEffect(() => {
    if (!supported || !enabled) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void navigator.wakeLock
        ?.request("screen")
        .then((sentinel) => {
          void sentinelRef.current?.release().catch(() => {});
          sentinelRef.current = sentinel;
          setActive(true);
        })
        .catch(() => {
          setActive(false);
        });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, supported]);

  return { supported, active };
}
