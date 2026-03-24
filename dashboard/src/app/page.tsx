const metricCards = [
  { title: "Today's Order", value: '7,552.8 lbs', sub: 'For today' },
  { title: 'Yesterday Production Volume', value: '7,552.8 lbs', sub: 'As of yesterday' },
  { title: 'Total MTD Volume', value: '7,552.8 lbs', sub: 'Month to date' },
];

const recentOrders = [
  {
    id: '#ORD-#ORD-2852',
    customer: 'RK - Robert King',
    product: 'Gasket Set B-2',
    weight: '240',
    status: 'On Hold',
    statusColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  },
  {
    id: '#ORD-#ORD-2851',
    customer: 'TC - TechCorp Inc.',
    product: 'Assembly Sensor S9',
    weight: '890',
    status: 'Shipped',
    statusColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  },
  {
    id: '#ORD-#ORD-2850',
    customer: 'SM - Sarah Miller',
    product: 'Hydraulic Pump V4',
    weight: '4,850',
    status: 'Processing',
    statusColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
  },
];

const bottomStats = [
  { title: 'Total Revenue', value: '$128,450', sub: 'For current period' },
  { title: 'Order Count', value: '1,240 orders', sub: 'Total orders' },
  { title: 'Avg. Order Value', value: '$103.50', sub: 'This month' },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#08101b] text-slate-100 p-6 lg:p-8">
      <section className="rounded-xl border border-slate-700/60 bg-[#132133] px-5 py-4 mb-4">
        <h1 className="text-5xl font-bold tracking-tight">Current Orders</h1>
        <p className="text-slate-300 mt-2 text-lg">Real-time overview of business fulfillment and revenue performance.</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {metricCards.map((card) => (
          <article key={card.title} className="rounded-xl border border-slate-700/60 bg-[#132133] p-5">
            <p className="text-slate-300 text-xl font-semibold">{card.title}</p>
            <p className="text-5xl font-bold mt-1">{card.value}</p>
            <p className="text-slate-400 text-xl mt-1">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700/60 bg-[#132133] p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-5xl font-bold tracking-tight">Recent Order Details</h2>
          <button className="rounded-full bg-blue-600 px-6 py-2 text-xl font-semibold text-white hover:bg-blue-500">
            View All Orders
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-left text-xl">
            <thead className="bg-[#162638] text-slate-300">
              <tr>
                <th className="px-4 py-3">Order ID ↓</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Weight (lbs)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-700/60">
                  <td className="px-4 py-4 font-semibold text-slate-200">{order.id}</td>
                  <td className="px-4 py-4 text-slate-300">{order.customer}</td>
                  <td className="px-4 py-4 text-slate-200">{order.product}</td>
                  <td className="px-4 py-4 text-right font-semibold">{order.weight}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-base font-semibold ${order.statusColor}`}>{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {bottomStats.map((stat) => (
          <article key={stat.title} className="rounded-xl border border-slate-700/60 bg-[#132133] p-5">
            <p className="text-slate-300 text-2xl font-semibold">{stat.title}</p>
            <p className="text-5xl font-bold mt-1">{stat.value}</p>
            <p className="text-slate-400 text-xl mt-1">{stat.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-700/60 bg-[#132133] p-5">
        <h2 className="text-5xl font-bold tracking-tight">Sales Trends</h2>
        <p className="text-slate-300 text-lg mt-2">Net revenue growth over the last 7 days</p>
        <div className="mt-5 h-48 rounded-lg border border-slate-700/60 bg-[#0d1a2a] p-4 relative overflow-hidden">
          <div className="absolute inset-x-0 top-1/3 border-t border-slate-600/50" />
          <div className="absolute inset-x-0 top-2/3 border-t border-slate-600/50" />
          <svg viewBox="0 0 600 160" className="h-full w-full">
            <polyline
              fill="none"
              stroke="#1e88ff"
              strokeWidth="3"
              points="0,130 120,100 220,110 340,85 460,60 600,30"
            />
          </svg>
        </div>
      </section>
    </div>
  );
}
