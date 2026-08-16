import { useState } from 'react';
import { Search } from 'lucide-react';
import { useWishlist } from '../lib/queries';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { formatDateTime } from '../lib/format';

export default function Wishlist() {
  const { data: wishlist, isLoading, error, refetch } = useWishlist();
  const [search, setSearch] = useState('');

  if (isLoading) return <LoadingState label="Loading wishlist…" />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load wishlist.'} onRetry={refetch} />;

  const items = wishlist ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (w) =>
          w.customerName?.toLowerCase().includes(q) ||
          w.customerEmail?.toLowerCase().includes(q) ||
          w.productId?.toLowerCase().includes(q),
      )
    : items;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Wishlist</h1>
          <p className="text-sm text-[var(--text-secondary)]">{items.length} saved items across all customers</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or product…"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] sm:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState label={items.length ? 'No wishlist items match your search.' : 'No wishlist items yet.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={`${w.userId}-${w.productId}-${i}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{w.customerName}</div>
                      {w.customerEmail && <div className="text-xs text-[var(--text-muted)]">{w.customerEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{w.productId}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDateTime(w.addedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
