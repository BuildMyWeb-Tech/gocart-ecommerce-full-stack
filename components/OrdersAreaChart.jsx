// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\components\OrdersAreaChart.jsx
'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

export default function OrdersAreaChart({ allOrders }) {
  if (!allOrders || allOrders.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No sales data available
      </div>
    );
  }

  // ✅ Guard against invalid/null createdAt values
  const ordersPerDay = allOrders.reduce((acc, order) => {
    if (!order?.createdAt) return acc;

    const d = new Date(order.createdAt);
    if (isNaN(d.getTime())) return acc; // skip invalid dates

    // Support both { date } shape from dashboard OR raw order object
    const date = order.date || d.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + (order.count || 1);
    return acc;
  }, {});

  const chartData = Object.entries(ordersPerDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      orders: count,
    }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-slate-400 text-sm">
        No sales data for this period
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            formatter={(v) => [`${v} orders`, 'Orders']}
          />
          <Area
            type="monotone" dataKey="orders"
            stroke="#22c55e" strokeWidth={2.5}
            fill="url(#ordersGrad)"
            dot={false} activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}