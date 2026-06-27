import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Toast } from '../../components/ui/Toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft, Edit, Trash2, Plus, GripVertical, Copy, Check,
  MapPin, Clock, Phone, User, Car, RefreshCw, ExternalLink,
  ChevronDown, ChevronUp, Info, MessageCircle, CalendarDays,
} from 'lucide-react';
import { timelinesApi } from '../../api/timelines';
import type {
  EventTimeline, EventLocation, TimelineActivity,
  LocationType, LocationFormData, ActivityFormData,
} from '../../types/timeline';

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  photoshoot: 'Sesión de fotos',
  other: 'Otro',
};

const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  pickup: 'bg-blue-100 text-blue-700',
  ceremony: 'bg-pink-100 text-pink-700',
  reception: 'bg-purple-100 text-purple-700',
  photoshoot: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

// ─── Sortable Activity Row ────────────────────────────────────────────────────
function SortableActivity({
  activity,
  locations,
  onEdit,
  onDelete,
}: {
  activity: TimelineActivity;
  locations: EventLocation[];
  onEdit: (a: TimelineActivity) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const loc = locations.find(l => l.id === activity.location_id);

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3 group">
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-rose-600 shrink-0">{activity.time}</span>
          <span className="text-sm text-gray-900 truncate">{activity.description}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {loc && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {loc.location_name}
            </span>
          )}
          {activity.estimated_duration && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {activity.estimated_duration}
            </span>
          )}
          {activity.notes && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" /> {activity.notes}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(activity)}
          className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(activity.id)}
          className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Location Form Modal ─────────────────────────────────────────────────────
function LocationModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: EventLocation | null;
  onSave: (data: LocationFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LocationFormData>({
    location_name: initial?.location_name || '',
    location_type: initial?.location_type || 'other',
    address: initial?.address || '',
    google_maps_link: initial?.google_maps_link || '',
    contact_person: initial?.contact_person || '',
    contact_phone: initial?.contact_phone || '',
    notes: initial?.notes || '',
  });

  const f = (k: keyof LocationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar ubicación' : 'Nueva ubicación'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.location_name} onChange={f('location_name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Catedral de Laureles" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.location_type} onChange={f('location_type')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
              <input value={form.contact_person} onChange={f('contact_person')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Padre Martínez" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
            <input value={form.address} onChange={f('address')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Cra 80 # 33-02, Medellín" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
            <input value={form.google_maps_link} onChange={f('google_maps_link')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="https://maps.google.com/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tel. contacto</label>
              <input value={form.contact_phone} onChange={f('contact_phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <input value={form.notes} onChange={f('notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Entrar por la puerta sur" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
          <button
            onClick={() => { if (form.location_name.trim()) onSave(form); }}
            className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Form Modal ─────────────────────────────────────────────────────
function ActivityModal({
  initial,
  locations,
  onSave,
  onClose,
}: {
  initial?: TimelineActivity | null;
  locations: EventLocation[];
  onSave: (data: ActivityFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({
    time: initial?.time || '',
    description: initial?.description || '',
    location_id: initial?.location_id ?? null,
    estimated_duration: initial?.estimated_duration || '',
    notes: initial?.notes || '',
  });

  const f = (k: keyof ActivityFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = k === 'location_id'
      ? (e.target.value ? Number(e.target.value) : null)
      : e.target.value;
    setForm(prev => ({ ...prev, [k]: val }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar actividad' : 'Nueva actividad'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hora *</label>
              <input
                type="time"
                value={form.time}
                onChange={f('time')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duración estimada</label>
              <input value={form.estimated_duration} onChange={f('estimated_duration')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="30 min" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
            <input value={form.description} onChange={f('description')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Llegada del novio a la ceremonia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación relacionada</label>
            <select
              value={form.location_id ?? ''}
              onChange={f('location_id')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <option value="">Sin ubicación</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.location_name} ({LOCATION_TYPE_LABELS[l.location_type]})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" placeholder="Instrucciones adicionales..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
          <button
            onClick={() => { if (form.time && form.description.trim()) onSave(form); }}
            className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp helpers ────────────────────────────────────────────────────────
const OPS_PHONE = '+573147372030';

const LOCATION_TYPE_WA_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  photoshoot: 'Sesión de fotos',
  other: 'Ubicación',
};

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function formatEventDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function computeDuration(activities: TimelineActivity[]): string {
  if (activities.length < 2) return '';
  const sorted = [...activities].sort((a, b) => a.display_order - b.display_order);
  const [fh, fm] = sorted[0].time.split(':').map(Number);
  const [lh, lm] = sorted[sorted.length - 1].time.split(':').map(Number);
  const totalMins = (lh * 60 + lm) - (fh * 60 + fm);
  if (totalMins <= 0) return '';
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function buildFullMsg(t: EventTimeline): string {
  const date = formatEventDate(t.event_date);
  const vehicle = t.assigned_vehicle || '';
  const lines: string[] = [];

  const EVENT_TYPE_LABELS: Record<string, string> = {
    wedding: 'Boda', brand_activation: 'Activación de marca',
    audiovisual_production: 'Producción audiovisual', quinceanera: 'Quinceañera', other: 'Evento',
  };
  const eventTypeLabel = EVENT_TYPE_LABELS[t.event_type] ?? 'Evento';
  lines.push(`*Minuto a Minuto – ${eventTypeLabel} · ${t.event_name}*`);
  lines.push(`*Fecha:* ${date}`);
  if (vehicle) lines.push(`*Vehiculo:* ${vehicle}`);

  lines.push('');
  if (t.main_contact_name) {
    lines.push(`*Contacto:* ${t.main_contact_name}${t.main_contact_phone ? ' – ' + t.main_contact_phone : ''}`);
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
    lines.push('');
    lines.push(`*Itinerario${duration ? ` (${duration})` : ''}*`);
    sortedActs.forEach(act => {
      lines.push(`${formatTime12h(act.time)} – ${act.description}`);
    });
  }

  lines.push('');
  lines.push(`_Camino a mi Boda_`);

  return lines.join('\n').trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimelineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [gcalToast, setGcalToast] = useState(() => !!(location.state as any)?.gcalSynced);
  const timelineId = Number(id);

  const [timeline, setTimeline] = useState<EventTimeline | null>(null);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [locModal, setLocModal] = useState<{ open: boolean; editing: EventLocation | null }>({ open: false, editing: null });
  const [actModal, setActModal] = useState<{ open: boolean; editing: TimelineActivity | null }>({ open: false, editing: null });
  const [showLocations, setShowLocations] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const r = await timelinesApi.get(timelineId);
    setTimeline(r.data);
    setActivities([...r.data.activities].sort((a, b) => a.display_order - b.display_order));
    setLoading(false);
  }, [timelineId]);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex(a => a.id === active.id);
    const newIndex = activities.findIndex(a => a.id === over.id);
    const reordered = arrayMove(activities, oldIndex, newIndex).map((a, i) => ({ ...a, display_order: i }));
    setActivities(reordered);
    await timelinesApi.reorderActivities(timelineId, reordered.map(a => ({ id: a.id, display_order: a.display_order })));
  };

  const saveLocation = async (data: LocationFormData) => {
    const payload = {
      ...data,
      address: data.address || null,
      google_maps_link: data.google_maps_link || null,
      contact_person: data.contact_person || null,
      contact_phone: data.contact_phone || null,
      notes: data.notes || null,
    };
    if (locModal.editing) {
      await timelinesApi.updateLocation(timelineId, locModal.editing.id, payload);
    } else {
      await timelinesApi.createLocation(timelineId, payload);
    }
    setLocModal({ open: false, editing: null });
    load();
  };

  const deleteLocation = async (locId: number) => {
    if (!confirm('¿Eliminar esta ubicación?')) return;
    await timelinesApi.deleteLocation(timelineId, locId);
    load();
  };

  const saveActivity = async (data: ActivityFormData) => {
    const payload = {
      ...data,
      estimated_duration: data.estimated_duration || null,
      notes: data.notes || null,
    };
    if (actModal.editing) {
      await timelinesApi.updateActivity(timelineId, actModal.editing.id, payload);
    } else {
      await timelinesApi.createActivity(timelineId, payload);
    }
    setActModal({ open: false, editing: null });
    load();
  };

  const deleteActivity = async (actId: number) => {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await timelinesApi.deleteActivity(timelineId, actId);
    load();
  };

  const copyLink = async (token: string, label: string) => {
    const url = `${window.location.origin}/evento/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const regenerateTokens = async () => {
    if (!confirm('¿Regenerar todos los enlaces? Los enlaces anteriores dejarán de funcionar.')) return;
    await timelinesApi.regenerateTokens(timelineId);
    load();
  };

  if (loading || !timeline) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600" />
    </div>
  );

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const gcalLink = timeline.gcal_html_link
    ? `${timeline.gcal_html_link}&authuser=caminoatuboda@gmail.com`
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {gcalToast && (
        <Toast
          message="Sincronizado con Google Calendar"
          onDismiss={() => setGcalToast(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/eventos')} className="text-gray-400 hover:text-gray-600 mt-1 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{timeline.event_name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-500 capitalize">{formatDate(timeline.event_date)}</p>
              {timeline.reservation_id && (
                <button
                  onClick={() => navigate(`/reservas/${timeline.reservation_id}`)}
                  className="text-xs text-pink-600 hover:underline cursor-pointer"
                >
                  · Ver reserva →
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">

          {gcalLink && (
            <a
              href={gcalLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              title="Ver en Google Calendar"
            >
              <CalendarDays className="w-3.5 h-3.5" /> GCal
            </a>
          )}
          <Link
            to={`/eventos/${id}/editar`}
            className="flex items-center gap-1.5 text-sm border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Editar
          </Link>
          <button
            onClick={async () => {
              if (!confirm(`¿Eliminar el evento "${timeline.event_name}"? Esta acción no se puede deshacer.`)) return;
              await timelinesApi.delete(timelineId);
              navigate('/eventos');
            }}
            className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>

      {/* Event info strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
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
            <Car className="w-4 h-4 text-gray-400 shrink-0" />
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
        {timeline.special_instructions && (
          <div className="col-span-2 text-gray-600 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-medium text-gray-500 mb-1">Instrucciones especiales</p>
            <p>{timeline.special_instructions}</p>
          </div>
        )}
      </div>

      {/* Share links */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Enlaces de compartir</h2>
          <button
            onClick={regenerateTokens}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Regenerar
          </button>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Conductor', token: timeline.share_token_driver },
            { label: 'Cliente', token: timeline.share_token_customer },
            { label: 'Operaciones', token: timeline.share_token_ops },
          ].map(({ label, token }) => (
            <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 font-medium w-24 shrink-0">{label}</span>
              <code className="text-xs text-gray-400 flex-1 truncate">{window.location.origin}/evento/{token}</code>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => copyLink(token, label)}
                  className="text-gray-400 hover:text-rose-600 cursor-pointer"
                  title="Copiar enlace"
                >
                  {copiedToken === label ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a href={`/evento/${token}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-rose-600" title="Abrir">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp messages */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Enviar por WhatsApp</h2>
        </div>
        <div className="space-y-2">
          {/* Conductor */}
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">Conductor</span>
              {timeline.assigned_driver && (
                <span className="text-sm text-gray-500 ml-2">{timeline.assigned_driver}</span>
              )}
              {timeline.assigned_driver_phone && (
                <span className="text-xs text-gray-400 ml-2">· {timeline.assigned_driver_phone}</span>
              )}
            </div>
            {timeline.assigned_driver_phone ? (
              <a
                href={buildWaUrl(timeline.assigned_driver_phone, buildFullMsg(timeline))}
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

          {/* Cliente */}
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">Cliente</span>
              {timeline.main_contact_name && (
                <span className="text-sm text-gray-500 ml-2">{timeline.main_contact_name}</span>
              )}
              {timeline.main_contact_phone && (
                <span className="text-xs text-gray-400 ml-2">· {timeline.main_contact_phone}</span>
              )}
            </div>
            {timeline.main_contact_phone ? (
              <a
                href={buildWaUrl(timeline.main_contact_phone, buildFullMsg(timeline))}
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

          {/* Operaciones */}
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">Operaciones</span>
              <span className="text-xs text-gray-400 ml-2">· {OPS_PHONE}</span>
            </div>
            <a
              href={buildWaUrl(OPS_PHONE, buildFullMsg(timeline))}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Enviar
            </a>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
          onClick={() => setShowLocations(v => !v)}
        >
          <h2 className="font-semibold text-gray-900">Ubicaciones ({timeline.locations.length})</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); setLocModal({ open: true, editing: null }); }}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
            {showLocations ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        {showLocations && (
          <div className="px-5 pb-5 space-y-3">
            {timeline.locations.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No hay ubicaciones. Agrega una para el timeline.</p>
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
                    <button onClick={() => setLocModal({ open: true, editing: loc })} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteLocation(loc.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-semibold text-gray-900">Timeline ({activities.length} actividades)</h2>
          <button
            onClick={() => setActModal({ open: true, editing: null })}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar actividad
          </button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No hay actividades. Agrega la primera entrada del timeline.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                {activities.map(act => (
                  <SortableActivity
                    key={act.id}
                    activity={act}
                    locations={timeline.locations}
                    onEdit={a => setActModal({ open: true, editing: a })}
                    onDelete={deleteActivity}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Modals */}
      {locModal.open && (
        <LocationModal
          initial={locModal.editing}
          onSave={saveLocation}
          onClose={() => setLocModal({ open: false, editing: null })}
        />
      )}
      {actModal.open && (
        <ActivityModal
          initial={actModal.editing}
          locations={timeline.locations}
          onSave={saveActivity}
          onClose={() => setActModal({ open: false, editing: null })}
        />
      )}
    </div>
  );
}
