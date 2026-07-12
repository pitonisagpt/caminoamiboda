import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const formatCOP = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : `$${(v / 1_000).toFixed(0)}K`;

const formatCOPFull = (v: number) => `$${v.toLocaleString('es-CO')}`;

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${labels[Number(mo) - 1]} ${y.slice(2)}`;
};

export default function SimpleRevenueChart({ data }: { data: { month: string; revenue: number; count: number }[] }) {
  if (!data.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos de ingresos en este período.</p>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="simpleRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#21b2b8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#21b2b8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11 }} width={52} />
        <Tooltip
          formatter={(value) => [formatCOPFull(Number(value)), 'Ingresos']}
          labelFormatter={(m) => formatMonth(String(m))}
          contentStyle={{ fontSize: 12 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#21b2b8" strokeWidth={2} fill="url(#simpleRevGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
