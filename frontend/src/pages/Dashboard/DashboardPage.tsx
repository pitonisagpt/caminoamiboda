import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Car, ClipboardList, TrendingUp, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { dashboardApi, type DashboardSummary } from '../../api/dashboard';
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_COLOR } from '../../types/reservation';
import type { ReservationStatus } from '../../types/reservation';
import AnalyticsSection from './AnalyticsSection';
import VehicleStatsSection from './VehicleStatsSection';
import DateRangeFilter, { DEFAULT_RANGE, buildPresets, type DateRange } from './DateRangeFilter';

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip ml-auto">
      <Info size={13} className="text-gray-300 hover:text-gray-400 cursor-default transition-colors" />
      <span className="pointer-events-none absolute right-0 top-5 z-20 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-gray-100 leading-relaxed shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        {text}
      </span>
    </span>
  );
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_ORDER: ReservationStatus[] = [
  'lead', 'quoted', 'deposit_received', 'reserved', 'confirmed', 'completed', 'cancelled',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PAGE_SIZE = 20;

  // Derive range from URL — preset param, or custom from+to
  const rangeFromUrl = (): DateRange => {
    const preset = searchParams.get('range');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (preset === 'custom' && (from || to)) {
      return {
        preset: 'custom',
        label: `${from || '…'} → ${to || '…'}`,
        from: from,
        to: to,
      };
    }
    const PRESETS_MAP = buildPresets();
    return PRESETS_MAP.find(p => p.preset === preset) ?? DEFAULT_RANGE;
  };

  const range = rangeFromUrl();

  const setRange = (r: DateRange) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (r.preset === DEFAULT_RANGE.preset) {
        next.delete('range');
      } else {
        next.set('range', r.preset);
      }
      if (r.preset === 'custom') {
        if (r.from) next.set('from', r.from); else next.delete('from');
        if (r.to) next.set('to', r.to); else next.delete('to');
      } else {
        next.delete('from');
        next.delete('to');
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    setEventsPage(1);
    dashboardApi.summary({ date_from: range.from, date_to: range.to })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-pink-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const totalReservations = Object.values(data.reservations_by_status).reduce((a, b) => a + b, 0);
  const totalVehicles = Object.values(data.vehicles_by_status).reduce((a, b) => a + b, 0);
  const totalEventPages = Math.ceil(data.period_events.length / EVENTS_PAGE_SIZE);
  const pagedEvents = data.period_events.slice((eventsPage - 1) * EVENTS_PAGE_SIZE, eventsPage * EVENTS_PAGE_SIZE);


  return (
    <div className="space-y-6">
      {/* Header — sticky so the date selection stays visible while scrolling */}
      <div className="sticky top-14 lg:top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-pink-50 border-b border-pink-100 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Panel de operaciones</h1>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Finance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <TrendingUp size={14} />
            Facturado · {range.label}
            <Tooltip text="Suma de reservas completadas en el período. La ganancia empresa es el 100% para vehículos propios y el 30% para vehículos de socios." />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCOP(data.finance.revenue_this_month)}</p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-gray-400">Ganancia empresa</span>
            <span className="text-xs font-semibold text-pink-600">{formatCOP(data.finance.company_revenue_this_month)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <AlertCircle size={14} />
            Saldo pendiente
            <Tooltip text="Lo que los clientes todavía deben pagar en reservas activas del período. La parte empresa se calcula según la propiedad del vehículo de cada reserva." />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCOP(data.finance.pending_collections)}</p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-gray-400">Por cobrar a clientes ·</span>
            <span className="text-xs font-semibold text-yellow-600">{formatCOP(data.finance.company_pending_collections)} empresa</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <CheckCircle2 size={14} />
            Liquidaciones pendientes
            <Tooltip text="Eventos completados sin liquidación pagada al propietario. Para vehículos de socios: 70% propietario / 30% empresa. Para vehículos propios: 100% empresa." />
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCOP(data.finance.pending_owner_payments)}</p>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-gray-400">Propietarios ·</span>
            <span className="text-xs font-semibold text-pink-600">{formatCOP(data.finance.pending_company_revenue)} empresa</span>
          </div>
        </div>
      </div>

      {/* Upcoming events — full width */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Calendar size={16} className="text-pink-500" />
              Próximos eventos (30 días)
            </div>
            <button
              onClick={() => navigate('/reservas')}
              className="text-xs text-pink-600 hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          </div>

          {data.upcoming.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin eventos próximos.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.upcoming.map(r => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/reservas/${r.id}`)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-pink-50/50 transition-colors cursor-pointer"
                >
                  <div className="text-center shrink-0 w-12">
                    <p className="text-xs text-gray-400 leading-tight">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' }).toUpperCase()}
                    </p>
                    <p className="text-xl font-bold text-gray-900 leading-tight">
                      {new Date(r.date + 'T12:00:00').getDate()}
                    </p>
                  </div>
                  <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {r.vehicle_photo_url
                      ? <img src={r.vehicle_photo_url} alt={r.vehicle} className="w-full h-full object-cover" />
                      : <Car size={20} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.vehicle !== '—' ? r.vehicle : 'Sin vehículo'}
                      {r.driver !== '—' ? ` · ${r.driver}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[r.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {RESERVATION_STATUS_LABEL[r.status as ReservationStatus] ?? r.status}
                    </span>
                    {(() => {
                      const diff = Math.round((new Date(r.date + 'T12:00:00').getTime() - new Date().setHours(12,0,0,0)) / 86400000);
                      if (diff === 0) return <p className="text-[11px] font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">hoy</p>;
                      if (diff === 1) return <p className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">mañana</p>;
                      return <p className="text-[11px] text-gray-400">en {diff} días</p>;
                    })()}
                    {r.remaining_balance > 0 && (
                      <p className="text-xs text-red-500 font-medium">{formatCOP(r.remaining_balance)} pendiente</p>
                    )}
                    <p className="text-xs text-pink-500">empresa {formatCOP(r.total_amount * (r.vehicle_is_company_owned ? 1 : 0.3))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Reservas · Vehículos · Acciones rápidas — 3-column row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reservations by status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <ClipboardList size={16} className="text-pink-500" />
            Reservas
          </div>
          <div className="space-y-2">
            {STATUS_ORDER.map(s => {
              const count = data.reservations_by_status[s] ?? 0;
              if (count === 0) return null;
              return (
                <div key={s} className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[s]}`}>
                    {RESERVATION_STATUS_LABEL[s]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-500">
              <span>Total</span>
              <span className="font-semibold text-gray-900">{totalReservations}</span>
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Car size={16} className="text-pink-500" />
            Vehículos
          </div>
          <div className="space-y-2">
            {Object.entries(data.vehicles_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 capitalize">{status}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-500">
              <span>Total</span>
              <span className="font-semibold text-gray-900">{totalVehicles}</span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Acciones rápidas</p>
          <button
            onClick={() => navigate('/reservas/nueva')}
            className="w-full text-left text-sm text-pink-700 font-medium hover:underline cursor-pointer py-0.5"
          >
            + Nueva reserva
          </button>
          <button
            onClick={() => navigate('/cotizaciones/nuevo')}
            className="w-full text-left text-sm text-pink-700 font-medium hover:underline cursor-pointer py-0.5"
          >
            + Nueva cotización
          </button>
          <button
            onClick={() => navigate('/calendario')}
            className="w-full text-left text-sm text-gray-600 hover:underline cursor-pointer py-0.5"
          >
            Ver calendario →
          </button>
        </div>
      </div>

      {/* Period events table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <ClipboardList size={16} className="text-pink-500" />
            Eventos · {range.label}
            <span className="text-xs font-normal text-gray-400 ml-1">({data.period_events.length})</span>
          </div>
          <button onClick={() => navigate('/reservas')} className="text-xs text-pink-600 hover:underline cursor-pointer">
            Ver todas
          </button>
        </div>
        {data.period_events.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Sin eventos en este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 w-12" />
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Vehículo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-5 py-3 hidden sm:table-cell">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedEvents.map((r, i) => {
                  const d = new Date(r.date + 'T12:00:00');
                  const prevD = i > 0 ? new Date(pagedEvents[i - 1].date + 'T12:00:00') : null;
                  const newMonth = !prevD || d.getMonth() !== prevD.getMonth() || d.getFullYear() !== prevD.getFullYear();
                  const monthLabel = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                  return (
                    <React.Fragment key={r.id}>
                      {newMonth && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={7} className="px-5 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest capitalize">
                            {monthLabel}
                          </td>
                        </tr>
                      )}
                      <tr
                        onClick={() => navigate(`/reservas/${r.id}`)}
                        className="hover:bg-pink-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                            {r.vehicle_photo_url
                              ? <img src={r.vehicle_photo_url} alt={r.vehicle} className="w-full h-full object-cover" />
                              : <Car size={16} className="text-gray-300" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                          {d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{r.title}</td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[140px] truncate">{r.vehicle !== '—' ? r.vehicle : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${RESERVATION_STATUS_COLOR[r.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {RESERVATION_STATUS_LABEL[r.status as ReservationStatus] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{formatCOP(r.total_amount)}</p>
                          <p className="text-xs text-pink-500">empresa {formatCOP(r.total_amount * (r.vehicle_is_company_owned ? 1 : 0.3))}</p>
                        </td>
                        <td className="px-5 py-3 text-right hidden sm:table-cell whitespace-nowrap">
                          {Number(r.remaining_balance) > 0
                            ? <span className="text-red-500 font-medium text-xs">{formatCOP(r.remaining_balance)}</span>
                            : <span className="text-green-600 text-xs">Pagado</span>}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalEventPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              {(eventsPage - 1) * EVENTS_PAGE_SIZE + 1}–{Math.min(eventsPage * EVENTS_PAGE_SIZE, data.period_events.length)} de {data.period_events.length} eventos
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                disabled={eventsPage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <span className="px-3 text-xs text-gray-500">Página {eventsPage} de {totalEventPages}</span>
              <button
                onClick={() => setEventsPage(p => Math.min(totalEventPages, p + 1))}
                disabled={eventsPage === totalEventPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      <AnalyticsSection range={range} />
      <VehicleStatsSection range={range} />
    </div>
  );
}
