"use client";

type FullscreenToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  variant?: "bar" | "desktop";
};

export function FullscreenToggleButton({
  active,
  onClick,
  variant = "bar",
}: FullscreenToggleButtonProps) {
  const base =
    variant === "bar"
      ? "inline-flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold"
      : "inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold";

  return (
    <button
      type="button"
      aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
      aria-pressed={active}
      onClick={onClick}
      className={`${base} ${
        active
          ? "bg-lf-brand text-lf-text-inverse"
          : variant === "desktop"
            ? "border border-lf-border bg-lf-bg-elevated text-lf-text-primary hover:bg-lf-bg-muted"
            : "text-lf-text-primary hover:bg-lf-bg-muted"
      }`}
    >
      ⛶
    </button>
  );
}
