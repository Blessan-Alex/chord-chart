export function AuthDivider() {
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-lf-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-lf-bg-elevated px-2 text-lf-text-tertiary">or</span>
      </div>
    </div>
  );
}
