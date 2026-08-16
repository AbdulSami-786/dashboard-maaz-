import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ORDER_STATUSES, type Order } from '../lib/types';

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: { status: string; count: number } }[];
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const { status, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-[var(--text-primary)]">{status}</p>
      <p className="text-[var(--text-secondary)]">
        {count} order{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function OrdersStatusChart({ orders }: { orders: Order[] }) {
  const counts = new Map<string, number>();
  for (const status of ORDER_STATUSES) counts.set(status, 0);
  for (const order of orders) {
    const key = ORDER_STATUSES.find((s) => s.toLowerCase() === (order.status || '').toLowerCase()) ?? order.status;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const data = Array.from(counts, ([status, count]) => ({ status, count }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--gridline)" strokeWidth={1} />
          <XAxis
            dataKey="status"
            tickLine={false}
            axisLine={{ stroke: 'var(--border-strong)' }}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTooltip />} />
          <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            <LabelList dataKey="count" position="top" fill="var(--text-secondary)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
