"use client";

type ChartZoomButtonsProps = {
  onZoomOut: () => void;
  onZoomIn: () => void;
  variant?: "bar" | "desktop";
};

function BarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-lf-text-primary transition-colors hover:bg-lf-bg-muted"
    >
      {children}
    </button>
  );
}

export function ChartZoomButtons({
  onZoomOut,
  onZoomIn,
  variant = "bar",
}: ChartZoomButtonsProps) {
  if (variant === "desktop") {
    return (
      <div className="flex items-center gap-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated p-1">
        <button
          type="button"
          aria-label="Text smaller"
          onClick={onZoomOut}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
        >
          A−
        </button>
        <button
          type="button"
          aria-label="Text larger"
          onClick={onZoomIn}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--lf-radius-sm)] text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
        >
          A+
        </button>
      </div>
    );
  }

  return (
    <>
      <BarIconButton label="Text smaller" onClick={onZoomOut}>
        A−
      </BarIconButton>
      <BarIconButton label="Text larger" onClick={onZoomIn}>
        A+
      </BarIconButton>
    </>
  );
}
