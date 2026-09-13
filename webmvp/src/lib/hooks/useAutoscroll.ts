"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
const SPEED_STEP = 0.1;
const BASE_PIXELS_PER_SECOND = 40;

export function clampAutoscrollSpeed(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(speed.toFixed(1))));
}

export function useAutoscroll() {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

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
        window.scrollBy(0, deltaSeconds * BASE_PIXELS_PER_SECOND * speed);
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
