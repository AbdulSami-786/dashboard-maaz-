import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useOrders, useUpdateOrderStatus } from '../lib/queries';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../lib/format';
import { ORDER_STATUSES } from '../lib/types';

export default function Orders() {
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.name?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) return <LoadingState label="Loading orders…" />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load orders.'} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Orders</h1>
          <p className="text-sm text-[var(--text-secondary)]">{orders?.length ?? 0} total orders</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, name, email, phone…"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] sm:w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState label={orders?.length ? 'No orders match your filters.' : 'No orders yet.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="w-8"></th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const isOpen = expanded.has(order.id);
                  const pending = updateStatus.isPending && updateStatus.variables?.id === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
                        onClick={() => toggleExpanded(order.id)}
                      >
                        <td className="pl-4 text-[var(--text-muted)]">
                          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{order.id}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          <div>{order.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{order.email}</div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-3 uppercase text-[var(--text-secondary)]">{order.payment}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              disabled={pending}
                              onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                              className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] outline-none disabled:opacity-50"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                              {!ORDER_STATUSES.some((s) => s.toLowerCase() === order.status.toLowerCase()) && (
                                <option value={order.status}>{order.status}</option>
                              )}
                            </select>
                            <StatusBadge status={order.status} />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-0)] last:border-0">
                          <td></td>
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Delivery
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">{order.phone}</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {order.address}, {order.city} {order.postalCode}
                                </p>
                              </div>
                              <div>
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Items
                                </p>
                                <ul className="flex flex-col gap-1">
                                  {order.items?.length ? (
                                    order.items.map((item, i) => (
                                      <li key={i} className="flex justify-between text-sm text-[var(--text-secondary)]">
                                        <span>
                                          {item.name ?? item.id} {item.qty ? `× ${item.qty}` : ''}
                                        </span>
                                        {item.price != null && <span className="tabular-nums">{formatCurrency(Number(item.price) * (item.qty || 1))}</span>}
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-sm text-[var(--text-muted)]">No item details.</li>
                                  )}
                                </ul>
                                <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-sm">
                                  <span className="text-[var(--text-muted)]">Subtotal + shipping</span>
                                  <span className="tabular-nums text-[var(--text-secondary)]">
                                    {formatCurrency(order.subtotal)} + {formatCurrency(order.shipping)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
