import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, Loader2 } from 'lucide-react';
import { vehiclesApi } from '../../api/vehicles';
import type { VehicleStatsResponse } from '../../api/vehicles';
import type { Vehicle } from '../../types/vehicle';
import type { RevenueTrendPoint } from '../../api/dashboard';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import type { ReservationStatus } from '../../types/reservation';
import DateRangeFilter, { DEFAULT_RANGE, type DateRange } from '../Dashboard/DateRangeFilter';
import RevenueTrendChart from '../Dashboard/charts/RevenueTrendChart';
import SeasonalityChart from '../Dashboard/charts/SeasonalityChart';

const formatCOP = (v: number) => `$${Number(v).toLocaleString('es-CO')}`;
const formatCOPShort = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function VehicleStatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState<VehicleStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      vehiclesApi.get(Number(id)),
      vehiclesApi.stats(Number(id), { date_from: range.from, date_to: range.to }),
    ]).then(([vRes, sRes]) => {
      setVehicle(vRes.data);
      setStats(sRes.data);
    }).finally(() => setLoading(false));
  }, [id, range.from, range.to]);

  const photoUrl = vehicle?.photos?.find(p => p.is_visible)?.file_name
    ? `/api/uploads/vehicles/${vehicle!.photos!.find(p => p.is_visible)!.file_name}`
    : null;

  const displayName = vehicle
    ? [vehicle.brand, vehicle.color].filter(Boolean).join(' ')
    : '…';

  // Map monthly_trend to RevenueTrendPoint shape
  const isCompanyOwned = vehicle?.is_company_owned ?? false;
  const trendData: RevenueTrendPoint[] = (stats?.monthly_trend ?? []).map(m => ({
    month: m.month,
    revenue: m.revenue,
    company_share: Math.round(m.revenue * (isCompanyOwned ? 1 : 0.30)),
    count: m.count,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vehiculos')}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Car size={22} className="text-gray-300" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-brand-800">{displayName}</h1>
            {vehicle && (
              <p className="text-sm text-gray-400">{vehicle.license_plate} · {vehicle.year ?? '—'}</p>
            )}
          </div>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-brand-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : !stats ? null : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Total eventos" value={String(stats.summary.total_events)} sub={`${stats.summary.upcoming_count} próximos`} />
            <SummaryCard label="Completados" value={String(stats.summary.completed_events)} />
            <SummaryCard label="Ingresos totales" value={formatCOPShort(stats.summary.total_revenue)} sub={formatCOP(stats.summary.total_revenue)} />
            <SummaryCard label={isCompanyOwned ? 'Empresa (100%)' : 'Empresa (30%)'} value={formatCOPShort(stats.summary.company_share)} sub={`Prom. ${formatCOPShort(stats.summary.avg_revenue_per_event)}/evento`} />
          </div>

          {/* Row 1: Revenue trend + Status breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Tendencia de ingresos</h3>
              <p className="text-xs text-gray-400 mb-4">Eventos completados · {range.label}</p>
              <RevenueTrendChart data={trendData} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Estado de reservas</h3>
              <p className="text-xs text-gray-400 mb-4">{range.label}</p>
              {stats.status_breakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos.</p>
              ) : (
                <div className="space-y-2">
                  {stats.status_breakdown.map(s => {
                    const max = stats.status_breakdown[0]?.count || 1;
                    const pct = Math.round((s.count / max) * 100);
                    return (
                      <div key={s.status}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[s.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {RESERVATION_STATUS_LABEL[s.status as ReservationStatus] ?? s.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-700 ml-auto">{s.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Seasonality + Recent events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Estacionalidad</h3>
              <p className="text-xs text-gray-400 mb-4">Eventos completados por mes</p>
              <SeasonalityChart data={stats.seasonality} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Eventos recientes</h3>
              <p className="text-xs text-gray-400 mb-4">Últimos 10 eventos históricos</p>
              {stats.recent_events.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin eventos en este período.</p>
              ) : (
                <div className="space-y-1">
                  {stats.recent_events.map(e => (
                    <div
                      key={e.id}
                      onClick={() => navigate(`/reservas/${e.id}`)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50/50 cursor-pointer transition-colors"
                    >
                      <div className="text-center shrink-0 w-10">
                        <p className="text-[10px] text-gray-500 leading-tight uppercase">
                          {new Date(e.date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' })}
                        </p>
                        <p className="text-base font-bold text-gray-900 leading-tight">
                          {new Date(e.date + 'T12:00:00').getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-400">{e.reservation_number}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[e.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                          {RESERVATION_STATUS_LABEL[e.status as ReservationStatus] ?? e.status}
                        </span>
                        <p className="text-xs text-gray-500">{formatCOPShort(e.total_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
