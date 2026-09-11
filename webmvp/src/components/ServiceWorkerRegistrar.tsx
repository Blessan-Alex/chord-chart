"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on unsupported hosts; non-fatal.
    });
  }, []);

  return null;
}
