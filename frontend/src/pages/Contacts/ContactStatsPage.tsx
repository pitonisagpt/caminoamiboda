import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookUser, Loader2, Phone, Instagram, Mail, ArrowUpRight } from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import type { ContactStatsResponse } from '../../api/contacts';
import type { Contact } from '../../types/contact';
import { CONTACT_TYPE_COLOR, CONTACT_TYPE_LABEL, CONTACT_STATUS_COLOR, CONTACT_STATUS_LABEL } from '../../types/contact';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import type { ReservationStatus } from '../../types/reservation';
import DateRangeFilter, { buildPresets, type DateRange } from '../Dashboard/DateRangeFilter';

// Unlike vehicles (booked regularly, "este mes" is a useful default), a
// planner's few events tend to be scattered many months into the future —
// default to "Todo el tiempo" so the page isn't empty on first load.
const ALL_TIME_RANGE: DateRange = buildPresets().find(p => p.preset === 'all')!;
import SimpleRevenueChart from '../Dashboard/charts/SimpleRevenueChart';
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

interface EventRow {
  id: number;
  reservation_number: string;
  title: string;
  date: string;
  status: string;
  total_amount: number;
}

function EventList({ events, emptyLabel, onOpen }: { events: EventRow[]; emptyLabel: string; onOpen: (id: number) => void }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-1">
      {events.map(e => (
        <div
          key={e.id}
          onClick={() => onOpen(e.id)}
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
  );
}

export default function ContactStatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>(ALL_TIME_RANGE);
  const [contact, setContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<ContactStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      contactsApi.get(Number(id)),
      contactsApi.stats(Number(id), { date_from: range.from, date_to: range.to }),
    ]).then(([cRes, sRes]) => {
      setContact(cRes.data);
      setStats(sRes.data);
    }).finally(() => setLoading(false));
  }, [id, range.from, range.to]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/contactos')}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <BookUser size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-800">{contact?.full_name ?? '…'}</h1>
            {contact && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTACT_TYPE_COLOR[contact.contact_type]}`}>
                  {CONTACT_TYPE_LABEL[contact.contact_type]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTACT_STATUS_COLOR[contact.status]}`}>
                  {CONTACT_STATUS_LABEL[contact.status]}
                </span>
                {contact.phone && (
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} /> {contact.phone}</span>
                )}
                {contact.instagram && (
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Instagram size={11} /> {contact.instagram}</span>
                )}
                {contact.email && (
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} /> {contact.email}</span>
                )}
              </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryCard label="Total eventos" value={String(stats.summary.total_events)} sub={`${stats.summary.upcoming_count} próximos`} />
            <SummaryCard label="Completados" value={String(stats.summary.completed_events)} />
            <SummaryCard label="Promedio por evento" value={formatCOPShort(stats.summary.avg_revenue_per_event)} sub="solo completados" />
            <SummaryCard label="Cobrado" value={formatCOPShort(stats.summary.deposits_received)} sub={formatCOP(stats.summary.deposits_received)} />
            <SummaryCard label="Saldo pendiente" value={formatCOPShort(stats.summary.outstanding_balance)} sub={formatCOP(stats.summary.outstanding_balance)} />
            <SummaryCard label="Ingresos (eventos completados)" value={formatCOPShort(stats.summary.total_revenue)} sub={formatCOP(stats.summary.total_revenue)} />
          </div>

          {/* Row 1: Revenue trend + Status breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Tendencia de ingresos</h3>
              <p className="text-xs text-gray-400 mb-4">Eventos completados · {range.label}</p>
              <SimpleRevenueChart data={stats.monthly_trend} />
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

          {/* Row 2: Seasonality + Upcoming + Recent events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Estacionalidad</h3>
              <p className="text-xs text-gray-400 mb-4">Eventos completados por mes</p>
              <SeasonalityChart data={stats.seasonality} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">Próximos eventos</h3>
                <button
                  onClick={() => navigate(`/reservas?contact=${id}`)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  Ver todas <ArrowUpRight size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Próximos 10 eventos</p>
              <EventList events={stats.upcoming_events} emptyLabel="Sin eventos próximos." onOpen={eid => navigate(`/reservas/${eid}`)} />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Eventos recientes</h3>
              <p className="text-xs text-gray-400 mb-4">Últimos 10 eventos históricos</p>
              <EventList events={stats.recent_events} emptyLabel="Sin eventos en este período." onOpen={eid => navigate(`/reservas/${eid}`)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
