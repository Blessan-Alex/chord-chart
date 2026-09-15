"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  decreaseAutoscrollSpeed,
  detectTouchAutoscrollDevice,
  increaseAutoscrollSpeed,
  resolveAutoscrollPixelsPerSecond,
  resolveDefaultAutoscrollSpeed,
} from "@/lib/autoscrollSpeed";

export { clampAutoscrollSpeed } from "@/lib/autoscrollSpeed";

function scrollBy(delta: number, scrollRef?: RefObject<HTMLElement | null>) {
  const container = scrollRef?.current;
  if (container && container.scrollHeight - container.clientHeight > 4) {
    container.scrollTop += delta;
    return;
  }

  const root = document.scrollingElement ?? document.documentElement;
  if (root.scrollHeight - root.clientHeight > 4) {
    root.scrollTop += delta;
    return;
  }

  window.scrollBy(0, delta);
}

export function useAutoscroll(scrollRef?: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(() =>
    resolveDefaultAutoscrollSpeed(false),
  );
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollRefStable = useRef(scrollRef);
  const isTouchDeviceRef = useRef(false);

  useEffect(() => {
    scrollRefStable.current = scrollRef;
  }, [scrollRef]);

  useEffect(() => {
    const query = window.matchMedia(
      "(max-width: 1024px), (pointer: coarse), (hover: none)",
    );

    const update = () => {
      const touch = detectTouchAutoscrollDevice();
      isTouchDeviceRef.current = touch;
      setIsTouchDevice(touch);
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setPaused(false);
  }, []);

  const start = useCallback(() => {
    const container = scrollRefStable.current?.current;
    if (container) {
      const root = document.scrollingElement ?? document.documentElement;
      if (root.scrollTop > 0) {
        container.scrollTop = root.scrollTop;
        root.scrollTop = 0;
      }
    }
    setSpeed(resolveDefaultAutoscrollSpeed(isTouchDeviceRef.current));
    setActive(true);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  const decreaseSpeed = useCallback(() => {
    setSpeed((current) => decreaseAutoscrollSpeed(current));
  }, []);

  const increaseSpeed = useCallback(() => {
    setSpeed((current) => increaseAutoscrollSpeed(current));
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  useEffect(() => {
    if (!active || paused) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (time - lastTimeRef.current) / 1000;
        scrollBy(
          deltaSeconds *
            resolveAutoscrollPixelsPerSecond(speed, isTouchDeviceRef.current),
          scrollRefStable.current,
        );
      }
      lastTimeRef.current = time;
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [active, paused, speed]);

  return {
    active,
    paused,
    speed,
    isTouchDevice,
    start,
    stop,
    pause,
    resume,
    decreaseSpeed,
    increaseSpeed,
  };
}
