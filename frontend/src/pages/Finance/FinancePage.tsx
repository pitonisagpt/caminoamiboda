import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { financeApi } from '../../api/finance';
import type { FinanceSummary, OwnerRevenueStat, DepositPoint, AgingItem } from '../../api/finance';
import { dashboardApi } from '../../api/dashboard';
import type { RevenueTrendPoint } from '../../api/dashboard';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import type { ReservationStatus } from '../../types/reservation';
import DateRangeFilter, { DEFAULT_RANGE, type DateRange } from '../Dashboard/DateRangeFilter';
import RevenueTrendChart from '../Dashboard/charts/RevenueTrendChart';
import OwnerRevenueChart from './charts/OwnerRevenueChart';
import DepositsChart from './charts/DepositsChart';

const formatCOP = (v: number) => `$${Number(v).toLocaleString('es-CO')}`;
const formatCOPShort = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

function KpiCard({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: { text: string; positive: boolean } | null;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {badge && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold mb-0.5 ${badge.positive ? 'text-green-600' : 'text-red-500'}`}>
            {badge.positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {badge.text}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-48 text-pink-400">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{title}</h3>
      {sub && <p className="text-xs text-gray-400 mb-4">{sub}</p>}
      {children}
    </div>
  );
}

export default function FinancePage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [owners, setOwners] = useState<OwnerRevenueStat[]>([]);
  const [deposits, setDeposits] = useState<DepositPoint[]>([]);
  const [aging, setAgingData] = useState<AgingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [agingLoading, setAgingLoading] = useState(true);

  // Aging: once on mount
  useEffect(() => {
    financeApi.aging()
      .then(r => setAgingData(r.data.items))
      .finally(() => setAgingLoading(false));
  }, []);

  // Range-dependent data
  useEffect(() => {
    setLoading(true);
    const params = { date_from: range.from ?? undefined, date_to: range.to ?? undefined };
    Promise.all([
      financeApi.summary(params),
      financeApi.ownerRevenue(params),
      financeApi.deposits(params),
      dashboardApi.revenueTrend(params),
    ]).then(([sRes, oRes, dRes, tRes]) => {
      setSummary(sRes.data);
      setOwners(oRes.data.owners);
      setDeposits(dRes.data.data);
      setTrend(tRes.data.data);
    }).finally(() => setLoading(false));
  }, [range.from, range.to]);

  const yoyBadge = summary?.yoy_change_pct != null
    ? { text: `${summary.yoy_change_pct > 0 ? '+' : ''}${summary.yoy_change_pct}%`, positive: summary.yoy_change_pct >= 0 }
    : null;

  const agingPast = aging.filter(a => a.days_to_event < 0);
  const agingFuture = aging.filter(a => a.days_to_event >= 0);
  const agingDisplayed = [...agingPast, ...agingFuture].slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Métricas financieras y estado de cobros</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 h-24 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard
            label="Ingresos este año"
            value={formatCOPShort(summary.revenue_this_year)}
            sub={formatCOP(summary.revenue_this_year)}
          />
          <KpiCard
            label={`Ingresos ${new Date().getFullYear() - 1}`}
            value={formatCOPShort(summary.revenue_last_year)}
            sub={formatCOP(summary.revenue_last_year)}
            badge={yoyBadge}
          />
          <KpiCard
            label={`Ingresos · ${range.label}`}
            value={formatCOPShort(summary.revenue_period)}
            sub={`Empresa: ${formatCOPShort(summary.company_revenue_period)}`}
          />
          <KpiCard
            label="Depósitos cobrados"
            value={formatCOPShort(summary.deposits_received_period)}
            sub={`En período · ${range.label}`}
          />
          <KpiCard
            label="Saldo pendiente"
            value={formatCOPShort(summary.outstanding_balance_total)}
            sub="Reservas activas · todo el tiempo"
          />
          <KpiCard
            label="Liquidaciones pendientes"
            value={formatCOPShort(summary.pending_owner_payments)}
            sub="Propietarios sin liquidar"
          />
        </div>
      )}

      {/* Row 2: Revenue trend + Owner revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Tendencia de ingresos" sub={`Eventos completados · ${range.label}`}>
            {loading ? <Spinner /> : <RevenueTrendChart data={trend} />}
          </ChartCard>
        </div>
        <ChartCard title="Ingresos por propietario" sub={`Eventos completados · ${range.label}`}>
          {loading ? <Spinner /> : <OwnerRevenueChart owners={owners} />}
        </ChartCard>
      </div>

      {/* Row 3: Deposits chart + Aging table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Depósitos cobrados vs saldo pendiente" sub={range.label}>
          {loading ? <Spinner /> : <DepositsChart data={deposits} />}
        </ChartCard>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Saldos pendientes de cobro</h3>
              <p className="text-xs text-gray-400 mt-0.5">Reservas activas con saldo &gt; 0 · todo el tiempo</p>
            </div>
            {aging.length > 0 && (
              <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                {aging.length} reservas
              </span>
            )}
          </div>

          {agingLoading ? (
            <Spinner />
          ) : aging.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin saldos pendientes.</p>
          ) : (
            <div className="space-y-1">
              {agingDisplayed.map(item => {
                const isPast = item.days_to_event < 0;
                const isOverdue30 = item.days_to_event < -30;
                const daysLabel = isPast
                  ? `hace ${Math.abs(item.days_to_event)}d`
                  : `en ${item.days_to_event}d`;
                const daysColor = isOverdue30
                  ? 'text-red-600 bg-red-50'
                  : isPast
                  ? 'text-yellow-600 bg-yellow-50'
                  : 'text-gray-500 bg-gray-100';

                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/reservas/${item.id}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-pink-50/50 cursor-pointer transition-colors"
                  >
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${daysColor}`}>
                      {daysLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.display_customer}</p>
                      <p className="text-[10px] text-gray-400">{item.reservation_number} · {new Date(item.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCOPShort(item.remaining_balance)}</p>
                      <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[item.status as ReservationStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {RESERVATION_STATUS_LABEL[item.status as ReservationStatus] ?? item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {aging.length > 20 && (
                <p className="text-xs text-center text-gray-400 pt-2">
                  Mostrando 20 de {aging.length} —{' '}
                  <button onClick={() => navigate('/reservas')} className="text-pink-600 hover:underline cursor-pointer">
                    ver todas las reservas
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
