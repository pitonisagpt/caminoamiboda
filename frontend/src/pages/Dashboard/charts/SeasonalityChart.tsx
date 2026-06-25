import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import type { SeasonalityPoint } from '../../../api/dashboard';

export default function SeasonalityChart({ data }: { data: SeasonalityPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);

  const getColor = (count: number) => {
    const ratio = count / max;
    if (ratio >= 0.8) return '#9d174d';
    if (ratio >= 0.6) return '#be185d';
    if (ratio >= 0.4) return '#db2777';
    if (ratio >= 0.2) return '#ec4899';
    return '#f9a8d4';
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(v) => [Number(v), 'Eventos']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[3,3,0,0]}>
          {data.map(d => (
            <Cell key={d.month} fill={getColor(d.count)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
