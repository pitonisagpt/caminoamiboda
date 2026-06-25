import type { FunnelStage } from '../../../api/dashboard';

const COLORS = ['#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d'];

export default function ConversionFunnelChart({ data }: { data: FunnelStage[] }) {
  if (!data.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos.</p>
  );

  return (
    <div className="space-y-1">
      {data.map((stage, i) => {
        const max = data[0]?.count || 1;
        const pct = Math.round((stage.count / max) * 100);
        return (
          <div key={stage.status}>
            {i > 0 && stage.conversion != null && (
              <div className="text-xs text-gray-400 text-right pr-1 -mb-0.5">
                ↓ {stage.conversion}%
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20 shrink-0 text-right">{stage.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: COLORS[Math.min(i, COLORS.length - 1)],
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-10 shrink-0">{stage.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
