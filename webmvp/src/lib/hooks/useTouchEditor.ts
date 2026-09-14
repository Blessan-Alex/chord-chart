"use client";

import { useEffect, useState } from "react";

/** True on phones, tablets, and other touch-primary editing surfaces. */
export function useTouchEditor(): boolean {
  const [touchEditor, setTouchEditor] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      "(max-width: 1024px), (pointer: coarse), (hover: none)",
    );

    const update = () => {
      const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      setTouchEditor(query.matches || hasTouch);
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return touchEditor;
}
