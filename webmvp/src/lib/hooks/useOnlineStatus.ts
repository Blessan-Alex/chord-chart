"use client";

import { useEffect, useState } from "react";

/** Network-only probe — must not be cached by the service worker. */
export const CONNECTIVITY_PROBE_URL = "/connectivity.txt";

const OFFLINE_DEBOUNCE_MS = 2000;
const POLL_MS = 30000;
const PROBE_TIMEOUT_MS = 5000;

export async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      PROBE_TIMEOUT_MS,
    );

    const response = await fetch(CONNECTIVITY_PROBE_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const applyStatus = (reachable: boolean) => {
      if (cancelled) {
        return;
      }

      if (reachable) {
        if (offlineTimer) {
          clearTimeout(offlineTimer);
          offlineTimer = undefined;
        }
        setOnline(true);
        return;
      }

      if (offlineTimer) {
        clearTimeout(offlineTimer);
      }

      offlineTimer = setTimeout(() => {
        if (!cancelled) {
          setOnline(false);
        }
      }, OFFLINE_DEBOUNCE_MS);
    };

    const check = async () => {
      applyStatus(await probeConnectivity());
    };

    const handleConnectivityChange = () => {
      void check();
    };

    void check();

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);
    window.addEventListener("focus", handleConnectivityChange);

    const pollTimer = setInterval(() => {
      void check();
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (offlineTimer) {
        clearTimeout(offlineTimer);
      }
      clearInterval(pollTimer);
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
      window.removeEventListener("focus", handleConnectivityChange);
    };
  }, []);

  return online;
}
