import { Clock } from 'lucide-react';

const MONTHS_ES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Mirrors `_format_date_es`/`_updated_at_str` in
// backend/app/services/google_calendar_service.py byte-for-byte (down to
// the " · " separator and the zero-padded 12h time) — that's the exact
// text the owner sees inside a Google Calendar event's own description
// ("Última actualización: 27 de julio de 2026 · 08:34 p.m."). Showing the
// same format here (wishlist fila 72) lets a plain visual diff catch drift
// between a reservation/timeline and its Calendar event, which is exactly
// what the incident in incidente-gcal-historicos.md would have surfaced
// earlier had this existed then.
//
// Computed manually from Intl parts instead of trusting
// toLocaleString(...) directly — browsers vary in exactly how they render
// "a. m."/"p. m." (spacing, periods), and this needs to match byte-for-byte,
// not just look similar. `timeZone: 'America/Bogota'` matches the backend,
// which always renders in that timezone regardless of server locale.
export function formatLastUpdated(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') % 24; // some engines return "24" for midnight with hour12:false
  const minute = get('minute');
  const period = hour >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = hour % 12 || 12;
  const datePart = `${day} de ${MONTHS_ES[month]} de ${year}`;
  const timePart = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  return `${datePart} · ${timePart}`;
}

export default function LastUpdated({ date, className = '' }: { date: string | null | undefined; className?: string }) {
  if (!date) return null;
  return (
    <p className={`flex items-center gap-1 text-xs text-gray-400 ${className}`}>
      <Clock size={11} className="shrink-0" />
      Última actualización: {formatLastUpdated(date)}
    </p>
  );
}
