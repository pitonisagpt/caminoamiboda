import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, Edit, Trash2, MapPin, Clock, Info,
  Copy, Check, ExternalLink, RefreshCw, MessageCircle, FileText, Eye,
  User, Car, Phone, ChevronDown, ChevronUp, CalendarDays, Loader2, Route,
} from 'lucide-react';
import EventRouteMap from '../../../components/EventRouteMap';
import VehiclePhotoTooltip from '../../../components/VehiclePhotoTooltip';
import { FilePreviewModal } from '../../../components/FilePreviewModal';
import { timelinesApi } from '../../../api/timelines';
import { catalogLocationsApi } from '../../../api/catalogLocations';
import { Toast } from '../../../components/ui/Toast';
import Combobox from '../../../components/ui/Combobox';
import type { ComboboxOption } from '../../../components/ui/Combobox';
import type {
  EventTimeline, EventLocation, TimelineActivity, EventType,
  LocationType, LocationFormData, ActivityFormData,
} from '../../../types/timeline';
import type { Reservation } from '../../../types/reservation';
import type { CatalogLocation } from '../../../types/catalogLocation';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida', ceremony: 'Ceremonia', reception: 'Recepción',
  photoshoot: 'Sesión de fotos', other: 'Otro',
};
const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  pickup: 'bg-blue-100 text-blue-700', ceremony: 'bg-brand-100 text-brand-600',
  reception: 'bg-purple-100 text-purple-700', photoshoot: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};
const OPS_PHONE = '+573147372030';
const LOCATION_TYPE_WA_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida', ceremony: 'Ceremonia', reception: 'Recepción',
  photoshoot: 'Sesión de fotos', other: 'Ubicación',
};
const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'wedding', label: 'Boda' },
  { value: 'brand_activation', label: 'Activación de marca' },
  { value: 'audiovisual_production', label: 'Producción audiovisual' },
  { value: 'quinceanera', label: 'Quinceañera' },
  { value: 'other', label: 'Otro' },
];
const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(o => [o.value, o.label])
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function formatEventDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function addDays(d: string, n: number): string {
  const date = new Date(d + 'T00:00:00');
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function totalMinutes(a: TimelineActivity): number {
  const [h, m] = a.time.split(':').map(Number);
  return (a.day_number - 1) * 1440 + h * 60 + m;
}

function computeDuration(activities: TimelineActivity[]): string {
  if (activities.length < 2) return '';
  const sorted = [...activities].sort((a, b) => a.display_order - b.display_order);
  const totalMins = totalMinutes(sorted[sorted.length - 1]) - totalMinutes(sorted[0]);
  if (totalMins <= 0) return '';
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function buildFullMsg(t: EventTimeline): string {
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
  lines.push(t.assigned_driver
    ? `*Conductor:* ${t.assigned_driver}${t.assigned_driver_phone ? ' – ' + t.assigned_driver_phone : ''}`
    : `*Conductor:* Pendiente de asignar`);
  if (t.special_instructions) {
    lines.push('');
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

  lines.push('');
  lines.push(`_Camino a mi Boda_`);
  lines.push(`https://www.instagram.com/caminoamiboda`);

  return lines.join('\n').trim();
}

// ─── Sortable Activity ─────────────────────────────────────────────────────────

function SortableActivity({ activity, locations, dayLabel, onEdit, onDelete }: {
  activity: TimelineActivity;
  locations: EventLocation[];
  dayLabel: string | null;
  onEdit: (a: TimelineActivity) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const loc = locations.find(l => l.id === activity.location_id);

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3 group">
      <button {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {dayLabel && (
            <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5 shrink-0">
              {dayLabel}
            </span>
          )}
          <span className="text-sm font-mono font-semibold text-brand-700 shrink-0">{activity.time}</span>
          <span className="text-sm text-gray-900 truncate">{activity.description}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {loc && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {loc.location_name}</span>}
          {activity.estimated_duration && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.estimated_duration}</span>}
          {activity.notes && <span className="text-xs text-gray-400 flex items-center gap-1"><Info className="w-3 h-3" /> {activity.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(activity)} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(activity.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Location Modal ────────────────────────────────────────────────────────────

function LocationModal({ initial, onSave, onClose }: {
  initial?: EventLocation | null;
  onSave: (data: LocationFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LocationFormData>({
    location_name: initial?.location_name || '', location_type: initial?.location_type || 'other',
    address: initial?.address || '', google_maps_link: initial?.google_maps_link || '',
    contact_person: initial?.contact_person || '', contact_phone: initial?.contact_phone || '',
    notes: initial?.notes || '', road_access_notes: initial?.road_access_notes || '',
  });
  const [catalog, setCatalog] = useState<CatalogLocation[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<ComboboxOption[]>([]);
  const f = (k: keyof LocationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    catalogLocationsApi.list({}).then(r => {
      setCatalog(r.data);
      setCatalogOptions(r.data.map(c => ({
        value: String(c.id),
        label: c.address ? `${c.name} — ${c.address}` : c.name,
      })));
    }).catch(() => {});
  }, []);

  const handleCatalogSelect = (val: string) => {
    if (!val) return;
    const found = catalog.find(c => c.id === Number(val));
    if (found) {
      setForm({
        location_name: found.name,
        location_type: (found.location_type as LocationType),
        address: found.address || '',
        google_maps_link: found.google_maps_link || '',
        contact_person: found.contact_person || '',
        contact_phone: found.contact_phone || '',
        notes: found.notes || '',
        road_access_notes: '',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar ubicación' : 'Nueva ubicación'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {catalogOptions.length > 0 && (
            <div>
              <Combobox
                label="Buscar en catálogo (opcional)"
                options={catalogOptions}
                value=""
                onChange={handleCatalogSelect}
                placeholder="Buscar ubicación guardada..."
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.location_name} onChange={f('location_name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Catedral de Laureles" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.location_type} onChange={f('location_type')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
              <input value={form.contact_person} onChange={f('contact_person')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Padre Martínez" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
            <input value={form.address} onChange={f('address')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Cra 80 # 33-02, Medellín" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
            <input value={form.google_maps_link} onChange={f('google_maps_link')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://maps.google.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tel. contacto</label>
              <input value={form.contact_phone} onChange={f('contact_phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <input value={form.notes} onChange={f('notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Entrar por la puerta sur" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
          <button onClick={() => { if (form.location_name.trim()) onSave(form); }} className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg cursor-pointer">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Modal ────────────────────────────────────────────────────────────

function ActivityModal({ initial, locations, eventDate, onSave, onClose }: {
  initial?: TimelineActivity | null;
  locations: EventLocation[];
  eventDate: string;
  onSave: (data: ActivityFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({
    time: initial?.time || '', day_number: initial?.day_number ?? 1, description: initial?.description || '',
    location_id: initial?.location_id ?? null,
    estimated_duration: initial?.estimated_duration || '', notes: initial?.notes || '',
  });
  const activityDate = addDays(eventDate, form.day_number - 1);
  const f = (k: keyof ActivityFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = k === 'location_id' ? (e.target.value ? Number(e.target.value) : null) : e.target.value;
    setForm(prev => ({ ...prev, [k]: val }));
  };
  const onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, day_number: daysBetween(eventDate, e.target.value) + 1 }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar actividad' : 'Nueva actividad'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hora *</label>
              <input type="time" value={form.time} onChange={f('time')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={activityDate} onChange={onDateChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duración estimada</label>
              <input value={form.estimated_duration} onChange={f('estimated_duration')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="30 min" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
            <input value={form.description} onChange={f('description')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Llegada del novio a la ceremonia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación relacionada</label>
            <select value={form.location_id ?? ''} onChange={f('location_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Sin ubicación</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.location_name} ({LOCATION_TYPE_LABELS[l.location_type]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Instrucciones adicionales..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
          <button onClick={() => { if (form.time && form.description.trim()) onSave(form); }} className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg cursor-pointer">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EventoTab ────────────────────────────────────────────────────────────

export default function EventoTab({
  reservation,
  onReservationChange,
}: {
  reservation: Reservation;
  onReservationChange: () => void;
}) {
  const timelineId = reservation.timeline_id;

  const [timeline, setTimeline] = useState<EventTimeline | null>(null);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(!!timelineId);
  const [creating, setCreating] = useState(false);
  const [showLocations, setShowLocations] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [locModal, setLocModal] = useState<{ open: boolean; editing: EventLocation | null }>({ open: false, editing: null });
  const [actModal, setActModal] = useState<{ open: boolean; editing: TimelineActivity | null }>({ open: false, editing: null });
  const [gcalToast, setGcalToast] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const showGcalToast = () => {
    setGcalToast(true);
    setTimeout(() => setGcalToast(false), 4000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    if (!timelineId) return;
    const r = await timelinesApi.get(timelineId);
    setTimeline(r.data);
    setActivities([...r.data.activities].sort((a, b) => a.display_order - b.display_order));
    setLoading(false);
  }, [timelineId]);

  useEffect(() => { if (timelineId) load(); else setLoading(false); }, [timelineId, load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const defaultEventType: EventType =
        reservation.event_category === 'publicidad' ? 'brand_activation' : 'wedding';
      await timelinesApi.create({
        event_name: reservation.display_customer,
        event_date: reservation.event_date,
        event_type: defaultEventType,
        reservation_id: reservation.id,
      } as any);
      onReservationChange();
    } finally {
      setCreating(false);
    }
  };

  const changeEventType = async (eventType: string) => {
    if (!timelineId) return;
    await timelinesApi.update(timelineId, { event_type: eventType });
    await load();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!timelineId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex(a => a.id === active.id);
    const newIndex = activities.findIndex(a => a.id === over.id);
    const reordered = arrayMove(activities, oldIndex, newIndex).map((a, i) => ({ ...a, display_order: i }));
    setActivities(reordered);
    await timelinesApi.reorderActivities(timelineId, reordered.map(a => ({ id: a.id, display_order: a.display_order })));
  };

  const saveLocation = async (data: LocationFormData) => {
    if (!timelineId) return;
    const payload = { ...data, address: data.address || null, google_maps_link: data.google_maps_link || null, contact_person: data.contact_person || null, contact_phone: data.contact_phone || null, notes: data.notes || null };
    if (locModal.editing) await timelinesApi.updateLocation(timelineId, locModal.editing.id, payload);
    else await timelinesApi.createLocation(timelineId, payload);
    setLocModal({ open: false, editing: null });
    await load();
    showGcalToast();
  };

  const deleteLocation = async (locId: number) => {
    if (!timelineId || !confirm('¿Eliminar esta ubicación?')) return;
    await timelinesApi.deleteLocation(timelineId, locId);
    await load();
    showGcalToast();
  };

  const saveActivity = async (data: ActivityFormData) => {
    if (!timelineId) return;
    const payload = { ...data, estimated_duration: data.estimated_duration || null, notes: data.notes || null };
    if (actModal.editing) await timelinesApi.updateActivity(timelineId, actModal.editing.id, payload);
    else await timelinesApi.createActivity(timelineId, payload);
    setActModal({ open: false, editing: null });
    await load();
    showGcalToast();
  };

  const deleteActivity = async (actId: number) => {
    if (!timelineId || !confirm('¿Eliminar esta actividad?')) return;
    await timelinesApi.deleteActivity(timelineId, actId);
    await load();
    showGcalToast();
  };

  const copyLink = async (token: string, label: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/evento/${token}`);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const regenerateTokens = async () => {
    if (!timelineId || !confirm('¿Regenerar todos los enlaces? Los anteriores dejarán de funcionar.')) return;
    await timelinesApi.regenerateTokens(timelineId);
    load();
  };

  const handlePreviewPdf = async () => {
    if (!timelineId) return;
    setPdfPreviewLoading(true);
    try {
      setPdfPreviewUrl(await timelinesApi.fetchPdfBlob(timelineId));
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  );

  // No timeline yet
  if (!timelineId || !timeline) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays size={40} className="text-gray-200 mb-4" />
        <p className="text-sm text-gray-500 mb-1">No hay un evento creado para esta reserva.</p>
        <p className="text-xs text-gray-400 mb-6">Crea el minuto a minuto, ubicaciones y links de compartir.</p>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Crear evento
        </button>
      </div>
    );
  }

  const gcalLink = timeline.gcal_html_link
    ? `${timeline.gcal_html_link}&authuser=caminoatuboda@gmail.com`
    : null;

  return (
    <div className="space-y-4">
      {gcalToast && <Toast message="Sincronizado con Google Calendar" onDismiss={() => setGcalToast(false)} />}
      {pdfPreviewUrl && (
        <FilePreviewModal
          src={pdfPreviewUrl}
          contentType="application/pdf"
          fileName={`Minuto-a-Minuto-${timeline.event_name}.pdf`}
          onClose={() => setPdfPreviewUrl(null)}
          onDownload={() => timelineId && timelinesApi.downloadPdf(timelineId, timeline.event_name)}
        />
      )}
      {/* Event info strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">Detalles del evento</h3>
            <select
              value={timeline.event_type}
              onChange={(e) => changeEventType(e.target.value)}
              title="Tipo de evento"
              className="text-xs border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-600 bg-gray-50 hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              {EVENT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {gcalLink && (
              <a href={gcalLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors"
                title="Ver en Google Calendar">
                <CalendarDays className="w-3.5 h-3.5" /> GCal
              </a>
            )}
            <button
              onClick={handlePreviewPdf}
              disabled={pdfPreviewLoading}
              className="flex items-center gap-1.5 text-xs border border-brand-200 text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              title="Ver PDF minuto a minuto"
            >
              {pdfPreviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Ver
            </button>
            <button
              onClick={() => timelineId && timelinesApi.downloadPdf(timelineId, timeline.event_name)}
              className="flex items-center gap-1.5 text-xs border border-brand-200 text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Descargar PDF minuto a minuto"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {timeline.main_contact_name && (
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{timeline.main_contact_name}</span>
              {timeline.main_contact_phone && (
                <a href={`https://wa.me/${timeline.main_contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="ml-auto">
                  <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                </a>
              )}
            </div>
          )}
          {timeline.assigned_vehicle && (
            <div className="flex items-center gap-2 text-gray-700">
              {reservation.vehicle_photo_url ? (
                <VehiclePhotoTooltip
                  photoUrl={reservation.vehicle_photo_url}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                  vehicleName={timeline.assigned_vehicle}
                  licensePlate={reservation.vehicle_license_plate}
                  driverName={timeline.assigned_driver}
                  driverPhone={timeline.assigned_driver_phone}
                  ownerName={reservation.owner_name}
                  ownerPhone={reservation.owner_whatsapp}
                />
              ) : (
                <Car className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span>{timeline.assigned_vehicle}</span>
            </div>
          )}
          {timeline.assigned_driver && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{timeline.assigned_driver} (conductor)</span>
              </div>
              {timeline.assigned_driver_phone && (
                <a href={`https://wa.me/${timeline.assigned_driver_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                </a>
              )}
            </div>
          )}
          {reservation.display_contact && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{reservation.display_contact} <span className="text-gray-400 text-xs">(planeador)</span></span>
              </div>
              {reservation.contact_phone && (
                <a href={`https://wa.me/${reservation.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                </a>
              )}
            </div>
          )}
          {timeline.special_instructions && (
            <div className="col-span-2 text-gray-600 border-t border-gray-100 pt-3 mt-1">
              <p className="text-xs font-medium text-gray-500 mb-1">Instrucciones especiales</p>
              <p className="text-sm">{timeline.special_instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Share links */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Enlaces de compartir</h3>
          <button onClick={regenerateTokens} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Regenerar
          </button>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Conductor', token: timeline.share_token_driver, phone: timeline.assigned_driver_phone, name: timeline.assigned_driver },
            { label: 'Propietario', token: timeline.share_token_driver, phone: reservation.owner_whatsapp, name: reservation.owner_name },
            { label: 'Cliente', token: timeline.share_token_customer, phone: timeline.main_contact_phone, name: timeline.main_contact_name },
            ...(reservation.display_contact ? [{ label: 'Planeador', token: timeline.share_token_customer, phone: reservation.contact_phone, name: reservation.display_contact }] : []),
            { label: 'Operaciones', token: timeline.share_token_ops, phone: null, name: null },
          ].map(({ label, token, phone, name }) => {
            const link = `${window.location.origin}/evento/${token}`;
            const waMsg = `Hola${name ? ` ${name.split(' ')[0]}` : ''}, aquí está el enlace del evento:\n${link}`;
            return (
              <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-600 font-medium">{label}</span>
                  {name && <span className="text-xs text-gray-400 ml-2">{name}</span>}
                  <code className="block text-xs text-gray-500 truncate mt-0.5">/evento/{token}</code>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {phone && (
                    <a
                      href={buildWaUrl(phone, waMsg)}
                      target="_blank" rel="noreferrer"
                      className="text-gray-400 hover:text-green-600 cursor-pointer"
                      title={`Enviar a ${label} por WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => copyLink(token, label)} className="text-gray-400 hover:text-brand-500 cursor-pointer" title="Copiar enlace">
                    {copiedToken === label ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a href={`/evento/${token}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-500" title="Abrir">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Enviar minuto a minuto</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Conductor', name: timeline.assigned_driver, phone: timeline.assigned_driver_phone },
            { label: 'Propietario', name: reservation.owner_name, phone: reservation.owner_whatsapp },
            { label: 'Cliente', name: timeline.main_contact_name, phone: timeline.main_contact_phone },
            ...(reservation.display_contact ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone }] : []),
            { label: 'Operaciones', name: null, phone: OPS_PHONE },
          ].map(({ label, name, phone }) => (
            <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {name && <span className="text-sm text-gray-500 ml-2">{name}</span>}
                {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
              </div>
              {phone ? (
                <a href={buildWaUrl(phone, buildFullMsg(timeline))} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" /> Enviar
                </a>
              ) : (
                <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 cursor-pointer select-none" onClick={() => setShowLocations(v => !v)}>
          <h3 className="font-semibold text-gray-900 text-sm">Ubicaciones ({timeline.locations.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setLocModal({ open: true, editing: null }); }}
              className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
            {showLocations ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        {showLocations && (
          <div className="px-5 pb-5 space-y-3">
            {timeline.locations.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No hay ubicaciones.</p>
            ) : (
              timeline.locations.map(loc => (
                <div key={loc.id} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 group">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{loc.location_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LOCATION_TYPE_COLORS[loc.location_type]}`}>
                        {LOCATION_TYPE_LABELS[loc.location_type]}
                      </span>
                    </div>
                    {loc.address && <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>}
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {loc.contact_person && <span className="text-xs text-gray-400">{loc.contact_person}</span>}
                      {loc.contact_phone && <span className="text-xs text-gray-400">{loc.contact_phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {loc.google_maps_link && (
                      <a href={loc.google_maps_link} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-blue-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => setLocModal({ open: true, editing: loc })} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteLocation(loc.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Route map */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Route className="w-4 h-4" /> Ruta del evento
          </h3>
        </div>
        <div className="px-5 pb-5">
          <EventRouteMap locations={timeline.locations} activities={activities} />
        </div>
      </div>

      {/* Activities */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm">Timeline ({activities.length} actividades)</h3>
          <button onClick={() => setActModal({ open: true, editing: null })}
            className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Agregar actividad
          </button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No hay actividades. Agrega la primera.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                {activities.map(act => {
                  const isMultiDay = new Set(activities.map(a => a.day_number)).size > 1;
                  const dayLabel = isMultiDay
                    ? `${formatShortDate(addDays(timeline.event_date, act.day_number - 1))} · Día ${act.day_number}`
                    : null;
                  return (
                    <SortableActivity key={act.id} activity={act} locations={timeline.locations}
                      dayLabel={dayLabel}
                      onEdit={a => setActModal({ open: true, editing: a })}
                      onDelete={deleteActivity}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Modals */}
      {locModal.open && <LocationModal initial={locModal.editing} onSave={saveLocation} onClose={() => setLocModal({ open: false, editing: null })} />}
      {actModal.open && <ActivityModal initial={actModal.editing} locations={timeline.locations} eventDate={timeline.event_date} onSave={saveActivity} onClose={() => setActModal({ open: false, editing: null })} />}
    </div>
  );
}
