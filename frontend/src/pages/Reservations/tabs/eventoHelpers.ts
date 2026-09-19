import type { EventTimeline, TimelineActivity } from '../../../types/timeline';
import { withSignature } from '../../../utils/whatsapp';
import { EVENT_TYPE_LABELS, LOCATION_TYPE_WA_LABELS } from './eventoConstants';

export function formatEventDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function addDays(d: string, n: number): string {
  const date = new Date(d + 'T00:00:00');
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
}

export function formatShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function totalMinutes(a: TimelineActivity): number {
  const [h, m] = a.time.split(':').map(Number);
  return (a.day_number - 1) * 1440 + h * 60 + m;
}

export function computeDuration(activities: TimelineActivity[]): string {
  if (activities.length < 2) return '';
  const sorted = [...activities].sort((a, b) => a.display_order - b.display_order);
  const totalMins = totalMinutes(sorted[sorted.length - 1]) - totalMinutes(sorted[0]);
  if (totalMins <= 0) return '';
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function buildFullMsg(t: EventTimeline): string {
  const date = formatEventDate(t.event_date);
  const vehicle = t.assigned_vehicle || '';
  const lines: string[] = [];

  const eventTypeLabel = EVENT_TYPE_LABELS[t.event_type] ?? 'Evento';
  lines.push(`*Minuto a Minuto – ${eventTypeLabel} · ${t.event_name}*`);
  lines.push(`*Fecha:* ${date}`);
  if (vehicle) lines.push(`*Vehiculo:* ${vehicle}`);

  lines.push('');
  if (t.main_contact_name) {
    lines.push(`*Contacto:* ${t.main_contact_name}${t.main_contact_phone ? ' – ' + t.main_contact_phone : ''}`);
  }
  if (t.planner_name) {
    lines.push(`*Planeador:* ${t.planner_name}${t.planner_phone ? ' – ' + t.planner_phone : ''}`);
  }
  [...t.contacts].sort((a, b) => a.display_order - b.display_order).forEach(c => {
    lines.push(`*${c.role || 'Contacto'}:* ${c.name}${c.phone ? ' – ' + c.phone : ''}`);
  });
  lines.push(t.assigned_driver
    ? `*Conductor:* ${t.assigned_driver.split(' ')[0]}${t.assigned_driver_phone ? ' – ' + t.assigned_driver_phone : ''}`
    : `*Conductor:* Pendiente de asignar`);
  if (t.special_instructions) {
    lines.push('');
    lines.push(`*Instrucciones especiales*`);
    lines.push(t.special_instructions);
  }

  if (t.locations.length > 0) {
    lines.push('');
    lines.push(`*Ubicaciones*`);
    const sortedLocs = [...t.locations].sort((a, b) => a.display_order - b.display_order);
    sortedLocs.forEach(loc => {
      const label = LOCATION_TYPE_WA_LABELS[loc.location_type];
      lines.push(`- *${label}:* ${loc.location_name}${loc.address ? ` – ${loc.address}` : ''}`);
      if (loc.google_maps_link) lines.push(`  ${loc.google_maps_link}`);
      if (loc.effective_waze_link) lines.push(`  Waze: ${loc.effective_waze_link}`);
    });
  }

  if (t.activities.length > 0) {
    const sortedActs = [...t.activities].sort((a, b) => a.display_order - b.display_order);
    const duration = computeDuration(sortedActs);
    const multiDay = new Set(sortedActs.map(a => a.day_number)).size > 1;
    lines.push('');
    lines.push(`*Itinerario${duration ? ` (${duration})` : ''}*`);
    let lastDay: number | null = null;
    sortedActs.forEach(act => {
      if (multiDay && act.day_number !== lastDay) {
        lines.push(`*Día ${act.day_number} — ${formatEventDate(addDays(t.event_date, act.day_number - 1))}*`);
        lastDay = act.day_number;
      }
      lines.push(`${formatTime12h(act.time)} – ${act.description}`);
    });
  }

  return withSignature(lines.join('\n').trim());
}
