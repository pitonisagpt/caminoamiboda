import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { reservationsApi } from '../../api/reservations';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import InfoTab from './tabs/InfoTab';
import FinanceTab from './tabs/FinanceTab';
import EventoTab from './tabs/EventoTab';

const STATUS_NEXT: Partial<Record<ReservationStatus, ReservationStatus>> = {
  lead: 'quoted',
  quoted: 'deposit_received',
  deposit_received: 'reserved',
  reserved: 'confirmed',
  confirmed: 'completed',
};

const TABS = [
  { key: 'info',     label: 'Información' },
  { key: 'evento',   label: 'Evento' },
  { key: 'finanzas', label: 'Finanzas' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'info') as TabKey;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const load = () => {
    setLoading(true);
    reservationsApi.get(Number(id))
      .then(r => setReservation(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAdvanceStatus = async () => {
    if (!reservation) return;
    const next = STATUS_NEXT[reservation.status];
    if (!next) return;
    setAdvancing(true);
    try {
      const res = await reservationsApi.update(reservation.id, { status: next } as any);
      setReservation(res.data);
    } finally {
      setAdvancing(false);
    }
  };

  const handleDelete = async () => {
    if (!reservation) return;
    if (!confirm(`¿Eliminar reserva ${reservation.reservation_number}?`)) return;
    await reservationsApi.delete(reservation.id);
    navigate('/reservas');
  };

  const setTab = (tab: TabKey) => setSearchParams({ tab }, { replace: true });

  if (loading || !reservation) {
    return <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  const nextStatus = STATUS_NEXT[reservation.status];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/reservas')} aria-label="Volver" className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{reservation.display_customer}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESERVATION_STATUS_COLOR[reservation.status]}`}>
                {RESERVATION_STATUS_LABEL[reservation.status]}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{reservation.reservation_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {nextStatus && (
            <button
              onClick={handleAdvanceStatus}
              disabled={advancing}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {advancing ? <Loader2 size={14} className="animate-spin" /> : null}
              → {RESERVATION_STATUS_LABEL[nextStatus]}
            </button>
          )}
          <button
            onClick={() => navigate(`/reservas/${id}/editar`)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab reservation={reservation} />}
      {activeTab === 'evento' && (
        <EventoTab
          reservation={reservation}
          onReservationChange={load}
        />
      )}
      {activeTab === 'finanzas' && <FinanceTab reservation={reservation} onReservationChange={load} />}
    </div>
  );
}
