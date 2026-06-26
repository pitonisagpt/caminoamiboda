import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { OwnerRevenueStat } from '../../../api/finance';

const formatCOP = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

const formatCOPFull = (v: number) => `$${Number(v).toLocaleString('es-CO')}`;

interface Props {
  owners: OwnerRevenueStat[];
}

export default function OwnerRevenueChart({ owners }: Props) {
  if (!owners.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período.</p>
  );

  const height = Math.max(200, owners.length * 52);
  const data = [...owners].reverse().map(o => ({
    name: o.owner_name.length > 20 ? o.owner_name.slice(0, 18) + '…' : o.owner_name,
    revenue: o.total_revenue,
    owner_amount: o.owner_amount,
    company_amount: o.company_amount,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatCOP} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(value, name) => {
            if (name === 'revenue') return [formatCOPFull(Number(value)), 'Ingresos totales'];
            return [formatCOPFull(Number(value)), name === 'owner_amount' ? 'Propietario (70%)' : 'Empresa (30%)'];
          }}
        />
        <Bar dataKey="revenue" fill="#db2777" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
