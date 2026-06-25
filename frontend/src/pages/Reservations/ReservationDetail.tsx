import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, Loader2, Pencil, Trash2, User, DollarSign, CalendarClock, Plus } from 'lucide-react';
import { reservationsApi } from '../../api/reservations';
import type { Reservation, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../types/reservation';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

const STATUS_NEXT: Partial<Record<ReservationStatus, ReservationStatus>> = {
  lead: 'quoted',
  quoted: 'deposit_received',
  deposit_received: 'reserved',
  reserved: 'confirmed',
  confirmed: 'completed',
};

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    reservationsApi.get(Number(id))
      .then(r => setReservation(r.data))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading || !reservation) {
    return <div className="flex justify-center py-16 text-pink-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  const nextStatus = STATUS_NEXT[reservation.status];
  const pct = reservation.total_amount > 0
    ? Math.round((reservation.deposit_paid / reservation.total_amount) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/reservas')} className="text-gray-400 hover:text-gray-600 mt-1 cursor-pointer">
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
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
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

      {/* Status pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s => s !== 'cancelled').map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                s === reservation.status
                  ? RESERVATION_STATUS_COLOR[s]
                  : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(reservation.status)
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {RESERVATION_STATUS_LABEL[s as ReservationStatus]}
              </div>
              {i < arr.length - 1 && <span className="text-gray-300 text-xs">›</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Event info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500">Evento</h2>
          <div className="flex items-start gap-2 text-sm">
            <Calendar size={16} className="text-pink-400 mt-0.5 shrink-0" />
            <span className="text-gray-700 capitalize">{formatDate(reservation.event_date)}</span>
          </div>
          {reservation.display_vehicle !== '—' && (
            <div className="flex items-center gap-2 text-sm">
              <Car size={16} className="text-pink-400 shrink-0" />
              <span className="text-gray-700">{reservation.display_vehicle}</span>
            </div>
          )}
          {reservation.display_driver !== '—' && (
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-pink-400 shrink-0" />
              <span className="text-gray-700">{reservation.display_driver}</span>
            </div>
          )}
        </div>

        {/* Financial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500">Financiero</h2>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-pink-400 shrink-0" />
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold text-gray-900">{formatCOP(reservation.total_amount)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-green-400 shrink-0" />
            <span className="text-gray-500">Depósito:</span>
            <span className="font-semibold text-green-700">{formatCOP(reservation.deposit_paid)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign size={16} className={Number(reservation.remaining_balance) > 0 ? 'text-red-400 shrink-0' : 'text-green-400 shrink-0'} />
            <span className="text-gray-500">Saldo:</span>
            <span className={`font-semibold ${Number(reservation.remaining_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCOP(reservation.remaining_balance)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{pct}% pagado</p>
          </div>
        </div>
      </div>

      {/* Timeline link */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-pink-400" />
            <h2 className="font-semibold text-gray-800 text-sm">Evento / Minuto a minuto</h2>
          </div>
          {reservation.timeline_id ? (
            <button
              onClick={() => navigate(`/eventos/${reservation.timeline_id}`)}
              className="flex items-center gap-1.5 text-sm text-pink-700 font-medium border border-pink-200 hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <CalendarClock size={14} />
              {reservation.timeline_event_name ?? 'Ver evento'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/eventos/nuevo', { state: { reservation_id: reservation.id, prefill: { event_name: reservation.display_customer, event_date: reservation.event_date } } })}
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 hover:border-pink-300 hover:text-pink-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={14} /> Crear evento
            </button>
          )}
        </div>
        {!reservation.timeline_id && (
          <p className="text-xs text-gray-400 mt-2">No hay un evento creado para esta reserva todavía.</p>
        )}
      </div>

      {/* Notes */}
      {(reservation.special_instructions || reservation.notes) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {reservation.special_instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Instrucciones especiales</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.special_instructions}</p>
            </div>
          )}
          {reservation.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
