import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'var(--brand)',
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
