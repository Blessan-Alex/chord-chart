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

function scrollContainerBy(
  delta: number,
  scrollRef?: RefObject<HTMLElement | null>,
) {
  const container = scrollRef?.current;
  if (!container) {
    return;
  }

  if (container.scrollHeight - container.clientHeight > 4) {
    container.scrollTop += delta;
  }
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
  const speedRef = useRef(speed);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);

  speedRef.current = speed;
  activeRef.current = active;
  pausedRef.current = paused;

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
    setSpeed(resolveDefaultAutoscrollSpeed(isTouchDeviceRef.current));
    setActive(true);
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = scrollRefStable.current?.current;
    if (container) {
      const root = document.scrollingElement ?? document.documentElement;
      if (root.scrollTop > 0) {
        container.scrollTop = root.scrollTop;
        root.scrollTop = 0;
      }
    }
  }, [active]);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    lastTimeRef.current = null;
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
    if (!active) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    let cancelled = false;

    const runLoop = () => {
      if (cancelled) {
        return;
      }

      const tick = (time: number) => {
        if (cancelled || !activeRef.current) {
          return;
        }

        if (!pausedRef.current && lastTimeRef.current !== null) {
          const deltaSeconds = (time - lastTimeRef.current) / 1000;
          scrollContainerBy(
            deltaSeconds *
              resolveAutoscrollPixelsPerSecond(
                speedRef.current,
                isTouchDeviceRef.current,
              ),
            scrollRefStable.current,
          );
        }
        if (!pausedRef.current) {
          lastTimeRef.current = time;
        }
        frameRef.current = requestAnimationFrame(tick);
      };

      lastTimeRef.current = null;
      frameRef.current = requestAnimationFrame(tick);
    };

    requestAnimationFrame(runLoop);

    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [active]);

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
