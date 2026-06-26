import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { VehicleUsageStat } from '../../../api/dashboard';

interface Props {
  vehicles: VehicleUsageStat[];
}

export default function VehicleUsageChart({ vehicles }: Props) {
  const navigate = useNavigate();

  if (!vehicles.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período.</p>
  );

  const height = Math.max(200, vehicles.length * 52);

  const data = [...vehicles].reverse().map(v => ({
    id: v.id,
    name: v.display_name.length > 22 ? v.display_name.slice(0, 20) + '…' : v.display_name,
    'Eventos': v.event_count,
    'Completados': v.completed_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="Eventos"
          fill="#e5e7eb"
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          onClick={(entry: any) => navigate(`/vehiculos/${entry.id}/estadisticas`)}
        />
        <Bar
          dataKey="Completados"
          fill="#db2777"
          radius={[0, 3, 3, 0]}
          cursor="pointer"
          onClick={(entry: any) => navigate(`/vehiculos/${entry.id}/estadisticas`)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
