import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Car, ClipboardList, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { dashboardApi, type DashboardSummary } from '../../api/dashboard';
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_COLOR } from '../../types/reservation';
import type { ReservationStatus } from '../../types/reservation';
import AnalyticsSection from './AnalyticsSection';

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_ORDER: ReservationStatus[] = [
  'lead', 'quoted', 'deposit_received', 'reserved', 'confirmed', 'completed', 'cancelled',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de operaciones</h1>

      {/* Finance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <TrendingUp size={14} />
            Ingresos este mes
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCOP(data.finance.revenue_this_month)}</p>
          <p className="text-xs text-gray-400">Reservas completadas</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <AlertCircle size={14} />
            Saldo pendiente
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCOP(data.finance.pending_collections)}</p>
          <p className="text-xs text-gray-400">Por cobrar a clientes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <CheckCircle2 size={14} />
            Pagos a propietarios
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCOP(data.finance.pending_owner_payments)}</p>
          <p className="text-xs text-gray-400">70% acumulado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming events */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                    {r.remaining_balance > 0 && (
                      <p className="text-xs text-red-500 font-medium">{formatCOP(r.remaining_balance)} pendiente</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
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
              onClick={() => navigate('/eventos/nuevo')}
              className="w-full text-left text-sm text-pink-700 font-medium hover:underline cursor-pointer py-0.5"
            >
              + Nuevo evento
            </button>
            <button
              onClick={() => navigate('/calendario')}
              className="w-full text-left text-sm text-gray-600 hover:underline cursor-pointer py-0.5"
            >
              Ver calendario →
            </button>
          </div>
        </div>
      </div>

      <AnalyticsSection />
    </div>
  );
}
