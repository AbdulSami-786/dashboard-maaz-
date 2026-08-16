import { Link } from 'react-router-dom';
import { Clock, DollarSign, Package, Star, Users } from 'lucide-react';
import { useOrders, useReviews, useUsers } from '../lib/queries';
import { ErrorState, LoadingState } from '../components/States';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import RatingStars from '../components/RatingStars';
import OrdersStatusChart from '../components/OrdersStatusChart';
import { formatCurrency, timeAgo } from '../lib/format';

export default function Overview() {
  const ordersQuery = useOrders();
  const reviewsQuery = useReviews();
  const usersQuery = useUsers();

  if (ordersQuery.isLoading || reviewsQuery.isLoading || usersQuery.isLoading) {
    return <LoadingState label="Loading dashboard…" />;
  }

  const error = ordersQuery.error || reviewsQuery.error || usersQuery.error;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load dashboard.'}
        onRetry={() => {
          ordersQuery.refetch();
          reviewsQuery.refetch();
          usersQuery.refetch();
        }}
      />
    );
  }

  const orders = ordersQuery.data ?? [];
  const reviews = reviewsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const revenue = orders
    .filter((o) => o.status.toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingOrders = orders.filter((o) => o.status.toLowerCase() === 'pending').length;
  const pendingReviews = reviews.filter((r) => !r.approved).length;
  const approvedReviews = reviews.filter((r) => r.approved);
  const avgRating = approvedReviews.length
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : 0;

  const recentOrders = orders.slice(0, 5);
  const recentPendingReviews = reviews.filter((r) => !r.approved).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Overview</h1>
        <p className="text-sm text-[var(--text-secondary)]">What's happening at MD Fashion right now.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Revenue" value={formatCurrency(revenue)} icon={DollarSign} accent="var(--status-good)" hint="Excludes cancelled" />
        <StatCard label="Orders" value={String(orders.length)} icon={Package} accent="var(--brand)" />
        <StatCard label="Pending orders" value={String(pendingOrders)} icon={Clock} accent="var(--status-warning)" />
        <StatCard label="Pending reviews" value={String(pendingReviews)} icon={Star} accent="var(--status-serious)" />
        <StatCard label="Customers" value={String(users.length)} icon={Users} accent="var(--series-7)" hint={avgRating ? `${avgRating.toFixed(1)} avg rating` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 xl:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Orders by status</h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">Across all {orders.length} orders</p>
          <OrdersStatusChart orders={orders} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Awaiting approval</h2>
            <Link to="/reviews" className="text-xs font-medium text-[var(--brand)] hover:underline">
              View all
            </Link>
          </div>
          {recentPendingReviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">No pending reviews.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentPendingReviews.map((r) => (
                <li key={r.id} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{r.customerName}</p>
                    <RatingStars rating={r.rating} />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{r.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent orders</h2>
          <Link to="/orders" className="text-xs font-medium text-[var(--brand)] hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Placed</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 font-medium text-[var(--text-primary)]">{o.id}</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{o.name}</td>
                  <td className="py-2.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{timeAgo(o.createdAt)}</td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
