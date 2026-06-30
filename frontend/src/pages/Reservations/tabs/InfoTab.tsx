import { Calendar, Car, Network, User } from 'lucide-react';
import type { Reservation, ReservationStatus } from '../../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../../types/reservation';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function InfoTab({ reservation }: { reservation: Reservation }) {
  return (
    <div className="space-y-4">
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

      {/* Event info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Evento</h2>
        <div className="flex items-start gap-2 text-sm">
          <Calendar size={16} className="text-pink-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-700 capitalize">{formatDate(reservation.event_date)}</span>
            {reservation.is_tentative && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-yellow-100 text-yellow-700 align-middle">~ tentativa</span>
            )}
            {reservation.is_tentative && reservation.event_date_notes && (
              <p className="text-xs text-yellow-700 mt-0.5">{reservation.event_date_notes}</p>
            )}
          </div>
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
        {reservation.display_contact && (
          <div className="flex items-center gap-2 text-sm">
            <Network size={16} className="text-pink-400 shrink-0" />
            <span className="text-gray-500">Ref: <span className="text-gray-700">{reservation.display_contact}</span></span>
          </div>
        )}
      </div>

      {/* Notes */}
      {(reservation.special_instructions || reservation.notes) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {reservation.special_instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Instrucciones especiales</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.special_instructions}</p>
            </div>
          )}
          {reservation.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
