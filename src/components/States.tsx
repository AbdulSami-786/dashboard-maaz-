import { AlertTriangle, Loader2, Inbox } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--text-muted)]">
      <Loader2 size={22} className="animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
      <AlertTriangle size={22} color="var(--status-critical)" />
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
      <Inbox size={22} color="var(--text-muted)" />
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
