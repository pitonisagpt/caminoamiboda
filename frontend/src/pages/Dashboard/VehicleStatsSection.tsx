import { useEffect, useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import type { VehicleUsageStat } from '../../api/dashboard';
import type { DateRange } from './DateRangeFilter';
import VehicleUsageChart from './charts/VehicleUsageChart';
import VehicleRevenueChart from './charts/VehicleRevenueChart';

function formatCOP(v: number) {
  return v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : `$${(v / 1_000).toFixed(0)}K`;
}

interface Props {
  range: DateRange;
}

export default function VehicleStatsSection({ range }: Props) {
  const [vehicles, setVehicles] = useState<VehicleUsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    setSelectedIds(new Set());
    dashboardApi.vehicleUsage({
      date_from: range.from ?? undefined,
      date_to: range.to ?? undefined,
    }).then(r => setVehicles(r.data.vehicles))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const toggleId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayed = selectedIds.size === 0
    ? vehicles
    : vehicles.filter(v => selectedIds.has(v.id));

  const totalRevenue = displayed.reduce((s, v) => s + v.total_revenue, 0);
  const totalCompleted = displayed.reduce((s, v) => s + v.completed_count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Vehículos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Uso y facturación por vehículo · {range.label}</p>
        </div>
        {!loading && vehicles.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-900">{totalCompleted}</span> completados</span>
            <span><span className="font-semibold text-gray-900">{formatCOP(totalRevenue)}</span> facturados</span>
          </div>
        )}
      </div>

      {/* Vehicle chips */}
      {!loading && vehicles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedIds(new Set())}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedIds.size === 0
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => toggleId(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedIds.has(v.id)
                  ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.photo_url ? (
                <img src={v.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <Car size={12} className="text-gray-400" />
              )}
              {v.display_name}
              {v.completed_count > 0 && (
                <span className="ml-0.5 text-[10px] opacity-60">({v.completed_count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48 text-pink-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          Sin datos de vehículos para este período.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Eventos por vehículo</h3>
              <p className="text-xs text-gray-400 mt-0.5">Total vs completados · haz clic para ver detalle</p>
            </div>
            <VehicleUsageChart vehicles={displayed} />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Ingresos por vehículo</h3>
              <p className="text-xs text-gray-400 mt-0.5">Solo eventos completados · haz clic para ver detalle</p>
            </div>
            <VehicleRevenueChart vehicles={displayed} />
          </div>
        </div>
      )}
    </div>
  );
}
