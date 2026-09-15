"use client";

import { useCallback, useEffect, useState } from "react";

export function isNativeFullscreenSupported(): boolean {
  return typeof document !== "undefined" && document.fullscreenEnabled === true;
}

export function isNativeFullscreenActive(): boolean {
  return typeof document !== "undefined" && document.fullscreenElement !== null;
}

export async function requestNativeFullscreen(): Promise<boolean> {
  if (!isNativeFullscreenSupported()) {
    return false;
  }

  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitNativeFullscreen(): Promise<void> {
  if (!isNativeFullscreenActive()) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch {
    // Ignore — pseudo-fullscreen still exits via state.
  }
}

export function usePerformanceFullscreen() {
  const [active, setActive] = useState(false);
  const [nativeActive, setNativeActive] = useState(false);
  const nativeSupported = isNativeFullscreenSupported();

  useEffect(() => {
    if (active) {
      document.documentElement.classList.add("song-fullscreen-active");
    } else {
      document.documentElement.classList.remove("song-fullscreen-active");
    }

    return () => {
      document.documentElement.classList.remove("song-fullscreen-active");
    };
  }, [active]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const isNative = isNativeFullscreenActive();
      setNativeActive(isNative);
      if (!isNative) {
        setActive(false);
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const enter = useCallback(async () => {
    setActive(true);
    const acquired = await requestNativeFullscreen();
    setNativeActive(acquired);
  }, []);

  const exit = useCallback(async () => {
    setActive(false);
    setNativeActive(false);
    await exitNativeFullscreen();
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      await exit();
    } else {
      await enter();
    }
  }, [active, enter, exit]);

  return {
    active,
    enter,
    exit,
    toggle,
    nativeActive,
    nativeSupported,
  };
}
