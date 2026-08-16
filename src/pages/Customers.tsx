import { useMemo, useState } from 'react';
import { Search, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
import { useDeleteUser, useOrders, useSetUserSuspended, useUsers } from '../lib/queries';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { formatCurrency, formatDate } from '../lib/format';
import type { AdminUser, Order } from '../lib/types';

export default function Customers() {
  const usersQuery = useUsers();
  const ordersQuery = useOrders();
  const [search, setSearch] = useState('');

  if (usersQuery.isLoading || ordersQuery.isLoading) return <LoadingState label="Loading customers…" />;

  const error = usersQuery.error || ordersQuery.error;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load customers.'}
        onRetry={() => {
          usersQuery.refetch();
          ordersQuery.refetch();
        }}
      />
    );
  }

  const users = usersQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  return <CustomersTable users={users} orders={orders} search={search} onSearchChange={setSearch} />;
}

function CustomersTable({
  users,
  orders,
  search,
  onSearchChange,
}: {
  users: AdminUser[];
  orders: Order[];
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const setSuspended = useSetUserSuspended();
  const removeUser = useDeleteUser();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const entry = map.get(o.userId) ?? { count: 0, total: 0 };
      entry.count += 1;
      if (o.status.toLowerCase() !== 'cancelled') entry.total += Number(o.total) || 0;
      map.set(o.userId, entry);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q));
  }, [users, search]);

  const confirmTarget = users.find((u) => u.id === confirmDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Customers</h1>
          <p className="text-sm text-[var(--text-secondary)]">{users.length} registered</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)] sm:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState label={users.length ? 'No customers match your search.' : 'No customers yet.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Lifetime spend</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const entry = stats.get(u.id) ?? { count: 0, total: 0 };
                  const toggling = setSuspended.isPending && setSuspended.variables?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{u.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        <div>{u.email}</div>
                        {u.phone && <div className="text-xs text-[var(--text-muted)]">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">{entry.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">{formatCurrency(entry.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={
                            u.suspended
                              ? { color: 'var(--status-critical)', backgroundColor: 'color-mix(in srgb, var(--status-critical) 14%, transparent)' }
                              : { color: 'var(--status-good)', backgroundColor: 'color-mix(in srgb, var(--status-good) 14%, transparent)' }
                          }
                        >
                          {u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={toggling}
                            onClick={() => setSuspended.mutate({ id: u.id, suspended: !u.suspended })}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                          >
                            {u.suspended ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                            {u.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(u.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-2.5 py-1.5 text-xs font-medium text-[var(--status-critical)] hover:bg-[var(--surface-2)]"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Delete {confirmTarget.name}?</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              This removes their account and logs them out everywhere. Their past orders and reviews stay on record. This can't be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeUser.mutate(confirmTarget.id);
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
