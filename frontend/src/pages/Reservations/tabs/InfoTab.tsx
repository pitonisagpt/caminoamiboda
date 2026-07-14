import { Calendar, Car, MessageCircle, Network, Star, User } from 'lucide-react';
import type { Reservation, ReservationStatus } from '../../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../../types/reservation';

const GOOGLE_REVIEW_LINK = 'https://g.page/r/CZk-2HPmACi3EBM/review';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function buildReviewMsg(name?: string | null): string {
  const greeting = name ? `Hola ${name.split(' ')[0]}` : 'Hola';
  return `${greeting}, ¿cómo estás?\n\nFue un gusto trabajar contigo en este evento. Si tienes un minuto, ¿nos ayudarías dejando una reseña de 5 estrellas en Google sobre nuestro servicio? Nos ayuda muchísimo a seguir creciendo.\n\nAquí el enlace: ${GOOGLE_REVIEW_LINK}\n\n¡Mil gracias por el apoyo!`;
}

export default function InfoTab({
  reservation,
  onStatusChange,
}: {
  reservation: Reservation;
  onStatusChange?: (s: ReservationStatus) => void;
}) {
  const handleStageClick = (s: ReservationStatus) => {
    if (!onStatusChange || s === reservation.status) return;
    if (STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(reservation.status)) {
      if (!confirm(`¿Devolver la reserva al estado "${RESERVATION_STATUS_LABEL[s]}"?`)) return;
    }
    onStatusChange(s);
  };

  return (
    <div className="space-y-4">
      {/* Status pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s => s !== 'cancelled').map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleStageClick(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer hover:opacity-80 ${
                s === reservation.status
                  ? RESERVATION_STATUS_COLOR[s]
                  : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(reservation.status)
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {RESERVATION_STATUS_LABEL[s as ReservationStatus]}
              </button>
              {i < arr.length - 1 && <span className="text-gray-300 text-xs">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Event info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Evento</h2>
        <div className="flex items-start gap-2 text-sm">
          <Calendar size={16} className="text-brand-400 mt-0.5 shrink-0" />
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
            <Car size={16} className="text-brand-400 shrink-0" />
            <span className="text-gray-700">{reservation.display_vehicle}</span>
          </div>
        )}
        {reservation.display_driver !== '—' && (
          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-brand-400 shrink-0" />
            <span className="text-gray-700">{reservation.display_driver}</span>
          </div>
        )}
        {reservation.display_contact && (
          <div className="flex items-center gap-2 text-sm">
            <Network size={16} className="text-brand-400 shrink-0" />
            <span className="text-gray-500">Ref: <span className="text-gray-700">{reservation.display_contact}</span></span>
          </div>
        )}
      </div>

      {/* Review request */}
      {reservation.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pedir reseña en Google</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Cliente', name: reservation.display_customer, phone: reservation.customer_whatsapp || reservation.customer_phone },
              ...(reservation.display_contact
                ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone }]
                : []),
            ].map(({ label, name, phone }) => (
              <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm text-gray-500 ml-2">{name}</span>
                  {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
                </div>
                {phone ? (
                  <a
                    href={buildWaUrl(phone, buildReviewMsg(name))}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Enviar
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
