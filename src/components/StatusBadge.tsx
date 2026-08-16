import { CheckCircle2, Clock, PackageCheck, Truck, XCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: 'var(--status-warning)', icon: Clock },
  processing: { color: 'var(--brand)', icon: PackageCheck },
  shipped: { color: 'var(--series-7)', icon: Truck },
  delivered: { color: 'var(--status-good)', icon: CheckCircle2 },
  cancelled: { color: 'var(--status-critical)', icon: XCircle },
};

export default function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] ?? { color: 'var(--text-muted)', icon: Clock };
  const Icon = style.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: style.color, backgroundColor: `color-mix(in srgb, ${style.color} 14%, transparent)` }}
    >
      <Icon size={13} />
      {status || 'Unknown'}
    </span>
  );
}
