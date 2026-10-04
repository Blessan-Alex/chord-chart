"use client";

import { useEffect, useState } from "react";

import { useTouchEditor } from "@/lib/hooks/useTouchEditor";

/**
 * Scrub placement on touch-primary surfaces (coarse pointer).
 * Touch-capable laptops with a fine mouse keep click/drag-select.
 */
export function usePreferLyricScrub(): boolean {
  const touchEditor = useTouchEditor();
  const [preferScrub, setPreferScrub] = useState(false);

  useEffect(() => {
    const coarseQuery = window.matchMedia("(pointer: coarse)");

    const update = () => {
      setPreferScrub(touchEditor && coarseQuery.matches);
    };

    update();
    coarseQuery.addEventListener("change", update);
    return () => coarseQuery.removeEventListener("change", update);
  }, [touchEditor]);

  return preferScrub;
}
