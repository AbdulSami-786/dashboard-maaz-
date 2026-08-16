import { useMemo, useState } from 'react';
import { Check, Search, Trash2, X } from 'lucide-react';
import { useDeleteReview, useReviews, useSetReviewApproved } from '../lib/queries';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import RatingStars from '../components/RatingStars';
import { formatDateTime } from '../lib/format';
import clsx from 'clsx';

type Filter = 'all' | 'pending' | 'approved';

export default function Reviews() {
  const { data: reviews, isLoading, error, refetch } = useReviews();
  const setApproved = useSetReviewApproved();
  const removeReview = useDeleteReview();
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesFilter = filter === 'all' || (filter === 'pending' ? !r.approved : r.approved);
      const matchesSearch =
        !q || r.customerName?.toLowerCase().includes(q) || r.productId?.toLowerCase().includes(q) || r.comment?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [reviews, search, filter]);

  if (isLoading) return <LoadingState label="Loading reviews…" />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load reviews.'} onRetry={refetch} />;

  const pendingCount = reviews?.filter((r) => !r.approved).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Reviews</h1>
          <p className="text-sm text-[var(--text-secondary)]">{pendingCount} awaiting approval</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, product, comment…"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] sm:w-72"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] p-1">
            {(['pending', 'approved', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition',
                  filter === f ? 'bg-[var(--brand)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No reviews match your filters." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((review) => {
            const approving = setApproved.isPending && setApproved.variables?.id === review.id;
            return (
              <div key={review.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)]">{review.customerName || 'Anonymous'}</p>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Product {review.productId} · {formatDateTime(review.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.approved ? (
                      <button
                        disabled={approving}
                        onClick={() => setApproved.mutate({ id: review.id, approved: false })}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                      >
                        <X size={13} />
                        Unapprove
                      </button>
                    ) : (
                      <button
                        disabled={approving}
                        onClick={() => setApproved.mutate({ id: review.id, approved: true })}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--status-good)' }}
                      >
                        <Check size={13} />
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(review.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--status-critical)] hover:bg-[var(--surface-2)]"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 text-sm text-[var(--text-secondary)]">{review.comment}</p>

                {!review.approved && (
                  <span className="mt-2.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ color: 'var(--status-warning)', backgroundColor: 'color-mix(in srgb, var(--status-warning) 14%, transparent)' }}>
                    Pending approval
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Delete this review?</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">This can't be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeReview.mutate(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--status-critical)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
