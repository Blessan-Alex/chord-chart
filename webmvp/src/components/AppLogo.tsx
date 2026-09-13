type AppLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
};

export function AppLogo({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
}: AppLogoProps) {
  const tileSize =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const noteSize =
    size === "sm" ? "text-base" : size === "lg" ? "text-xl" : "text-lg";

  return (
    <div
      className={`${showTagline ? "flex flex-col items-center gap-2" : "flex items-center gap-2.5"} ${className}`}
    >
      <div className={`flex items-center gap-2.5 ${showTagline ? "justify-center" : ""}`}>
        <div
          className={`${tileSize} flex shrink-0 items-center justify-center rounded-[10px] bg-lf-brand text-lf-text-inverse`}
          aria-hidden
        >
          <span className={`${noteSize} leading-none`}>♪</span>
        </div>
        {showText && (
          <span className="text-base font-semibold text-lf-text-primary">
            LF Chords
          </span>
        )}
      </div>
      {showTagline && (
        <p className="text-sm text-lf-text-secondary">
          For musicians and worship teams
        </p>
      )}
    </div>
  );
}
