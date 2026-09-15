export const AUTOSCROLL_MIN_SPEED = 0.1;
export const AUTOSCROLL_MAX_SPEED = 2;
export const AUTOSCROLL_DEFAULT_DESKTOP = 0.7;
export const AUTOSCROLL_DEFAULT_TOUCH = 0.4;
export const AUTOSCROLL_TOUCH_RATE_MULTIPLIER = 0.85;
export const AUTOSCROLL_BASE_PX_PER_SEC = 20;

const SLOW_STEP = 0.05;
const FAST_STEP = 0.1;
const STEP_THRESHOLD = 1;

export function clampAutoscrollSpeed(speed: number): number {
  return Math.min(
    AUTOSCROLL_MAX_SPEED,
    Math.max(AUTOSCROLL_MIN_SPEED, Number(speed.toFixed(2))),
  );
}

export function getAutoscrollSpeedStep(speed: number): number {
  return speed < STEP_THRESHOLD ? SLOW_STEP : FAST_STEP;
}

export function decreaseAutoscrollSpeed(current: number): number {
  return clampAutoscrollSpeed(current - getAutoscrollSpeedStep(current));
}

export function increaseAutoscrollSpeed(current: number): number {
  return clampAutoscrollSpeed(current + getAutoscrollSpeedStep(current));
}

export function resolveDefaultAutoscrollSpeed(isTouchDevice: boolean): number {
  return isTouchDevice
    ? AUTOSCROLL_DEFAULT_TOUCH
    : AUTOSCROLL_DEFAULT_DESKTOP;
}

export function resolveAutoscrollPixelsPerSecond(
  speed: number,
  isTouchDevice: boolean,
): number {
  const multiplier = isTouchDevice ? AUTOSCROLL_TOUCH_RATE_MULTIPLIER : 1;
  return AUTOSCROLL_BASE_PX_PER_SEC * speed * multiplier;
}

export function formatAutoscrollSpeed(speed: number): string {
  return speed < STEP_THRESHOLD ? speed.toFixed(2) : speed.toFixed(1);
}

/** Client-only: touch-primary devices get slower default scroll rate. */
export function detectTouchAutoscrollDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const query = window.matchMedia(
    "(max-width: 1024px), (pointer: coarse), (hover: none)",
  );
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return query.matches || hasTouch;
}
