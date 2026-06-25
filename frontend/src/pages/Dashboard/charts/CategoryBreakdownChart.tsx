import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryPoint } from '../../../api/dashboard';

const COLORS: Record<string, string> = {
  standard:   '#db2777',
  obsequio:   '#ca8a04',
  publicidad: '#9ca3af',
};

const formatCOP = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

export default function CategoryBreakdownChart({ data }: { data: CategoryPoint[] }) {
  if (!data.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos.</p>
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* By count */}
      <div>
        <p className="text-xs text-gray-500 text-center mb-1">Por eventos</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%"
              innerRadius={40} outerRadius={65} paddingAngle={2}>
              {data.map(d => (
                <Cell key={d.category} fill={COLORS[d.category] ?? '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [Number(v), name]}
              contentStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* By revenue */}
      <div>
        <p className="text-xs text-gray-500 text-center mb-1">Por ingresos</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="revenue" nameKey="label" cx="50%" cy="50%"
              innerRadius={40} outerRadius={65} paddingAngle={2}>
              {data.map(d => (
                <Cell key={d.category} fill={COLORS[d.category] ?? '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [formatCOP(Number(v)), name]}
              contentStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Shared legend */}
      <div className="col-span-2 flex justify-center gap-4 flex-wrap">
        {data.map(d => (
          <div key={d.category} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[d.category] ?? '#6b7280' }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
