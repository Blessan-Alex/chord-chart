import type { AdminStats } from "@/lib/firestore/adminStats";

type AdminStatsProps = {
  stats: AdminStats;
  loading?: boolean;
};

const STAT_ITEMS: { key: keyof AdminStats; label: string }[] = [
  { key: "songCount", label: "Total songs" },
  { key: "playlistCount", label: "Playlists" },
  { key: "groupCount", label: "Groups" },
];

export function AdminStatsCards({ stats, loading = false }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STAT_ITEMS.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated px-4 py-5 text-center"
        >
          <p className="text-3xl font-semibold tabular-nums text-lf-text-primary">
            {loading ? "…" : stats[key]}
          </p>
          <p className="mt-1 text-sm text-lf-text-secondary">{label}</p>
        </div>
      ))}
    </div>
  );
}
