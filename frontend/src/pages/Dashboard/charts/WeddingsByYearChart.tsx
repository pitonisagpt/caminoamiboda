import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeddingsByYearPoint } from '../../../api/dashboard';

export default function WeddingsByYearChart({ data }: { data: WeddingsByYearPoint[] }) {
  const currentYear = new Date().getFullYear();
  const firstYear = data.length ? Math.min(...data.map(d => d.year)) : null;
  // Exclude the first year on record (usually a partial year of data) and
  // the current/future years (still in progress) — average only full years.
  const fullYears = data.filter(d => d.year !== firstYear && d.year < currentYear);
  const avg = fullYears.length
    ? Math.round(fullYears.reduce((s, d) => s + d.count, 0) / fullYears.length)
    : 0;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(v, _n, item) => [Number(v), item.payload.year === currentYear ? 'Bodas (año en curso)' : 'Bodas']}
          labelFormatter={(y) => y}
          contentStyle={{ fontSize: 12 }}
        />
        {avg > 0 && (
          <ReferenceLine y={avg} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: `Prom. ${avg}`, fontSize: 10, fill: '#9ca3af', position: 'insideTopRight' }} />
        )}
        <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#2bbec3" />
      </BarChart>
    </ResponsiveContainer>
  );
}
