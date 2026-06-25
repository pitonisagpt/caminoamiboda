import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { RevenueTrendPoint } from '../../../api/dashboard';

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

export default function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  if (!data.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos de ingresos en este período.</p>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#db2777" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11 }} width={52} />
        <Tooltip
          formatter={(value, name) => [
            formatCOPFull(Number(value)),
            name === 'revenue' ? 'Ingresos' : 'Parte empresa',
          ]}
          labelFormatter={(m) => formatMonth(String(m))}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend formatter={l => l === 'revenue' ? 'Ingresos totales' : 'Parte empresa (30%)'} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" stroke="#db2777" strokeWidth={2} fill="url(#revGrad)" dot={false} />
        <Area type="monotone" dataKey="company_share" stroke="#ca8a04" strokeWidth={1.5} fill="url(#compGrad)" dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
