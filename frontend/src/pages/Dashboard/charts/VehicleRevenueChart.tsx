import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { VehicleUsageStat } from '../../../api/dashboard';

const formatCOP = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

const formatCOPFull = (v: number) => `$${Number(v).toLocaleString('es-CO')}`;

interface Props {
  vehicles: VehicleUsageStat[];
}

export default function VehicleRevenueChart({ vehicles }: Props) {
  const navigate = useNavigate();

  if (!vehicles.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período.</p>
  );

  const sorted = [...vehicles].sort((a, b) => b.total_revenue - a.total_revenue);
  const height = Math.max(200, sorted.length * 52);

  const data = [...sorted].reverse().map(v => ({
    id: v.id,
    name: v.display_name.length > 22 ? v.display_name.slice(0, 20) + '…' : v.display_name,
    revenue: v.total_revenue,
    company: v.company_share,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatCOP} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(value, name) => [
            formatCOPFull(Number(value)),
            name === 'revenue' ? 'Ingresos totales' : 'Empresa (30%)',
          ]}
        />
        <Bar
          dataKey="revenue"
          fill="#db2777"
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          onClick={(entry: any) => navigate(`/vehiculos/${entry.id}/estadisticas`)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
