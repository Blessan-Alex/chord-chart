"use client";

import { useEffect, useState } from "react";

const PERF_BREAKPOINT = 768;

export function usePerformanceMode(sessionId: string | null): boolean {
  const [isPerformance, setIsPerformance] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${PERF_BREAKPOINT - 1}px)`);

    const update = () => {
      setIsPerformance(query.matches || sessionId !== null);
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [sessionId]);

  return isPerformance;
}
