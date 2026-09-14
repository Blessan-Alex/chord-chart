export function SongRowSkeleton() {
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-lf-border px-4 py-3 last:border-b-0">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-[var(--lf-radius-sm)] bg-lf-bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-lf-bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-lf-bg-muted" />
      </div>
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-lf-bg-muted" />
    </li>
  );
}
