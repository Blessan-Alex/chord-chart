"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const MIN_SPEED = 0.3;
const MAX_SPEED = 2;
const SPEED_STEP = 0.1;
/** Slow default scroll — ~18px/s at speed 1.0 */
const BASE_PIXELS_PER_SECOND = 18;

export function clampAutoscrollSpeed(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(speed.toFixed(1))));
}

function scrollBy(delta: number, scrollRef?: RefObject<HTMLElement | null>) {
  const container = scrollRef?.current;
  if (container && container.scrollHeight - container.clientHeight > 1) {
    container.scrollTop += delta;
    return;
  }

  const root = document.scrollingElement ?? document.documentElement;
  if (root.scrollHeight - root.clientHeight > 1) {
    root.scrollTop += delta;
  }
}

export function useAutoscroll(scrollRef?: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(0.8);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollRefStable = useRef(scrollRef);

  useEffect(() => {
    scrollRefStable.current = scrollRef;
  }, [scrollRef]);

  const stop = useCallback(() => {
    setActive(false);
    setPaused(false);
  }, []);

  const start = useCallback(() => {
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
    setSpeed((current) => clampAutoscrollSpeed(current - SPEED_STEP));
  }, []);

  const increaseSpeed = useCallback(() => {
    setSpeed((current) => clampAutoscrollSpeed(current + SPEED_STEP));
  }, []);

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
          deltaSeconds * BASE_PIXELS_PER_SECOND * speed,
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
    start,
    stop,
    pause,
    resume,
    decreaseSpeed,
    increaseSpeed,
  };
}
