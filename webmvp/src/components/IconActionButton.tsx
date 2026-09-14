"use client";

type IconActionButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  children: React.ReactNode;
  className?: string;
};

const VARIANT_CLASS = {
  default:
    "border border-lf-border text-lf-text-primary hover:bg-lf-bg-muted",
  primary:
    "bg-lf-action-primary text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50",
  danger:
    "border border-lf-danger/30 text-lf-danger hover:bg-lf-danger-bg",
};

export function IconActionButton({
  label,
  onClick,
  disabled = false,
  variant = "default",
  children,
  className = "",
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--lf-radius-md)] transition-colors disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
