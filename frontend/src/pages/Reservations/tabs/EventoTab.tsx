import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus, Edit, Trash2, MapPin,
  Copy, Check, ExternalLink, RefreshCw, MessageCircle, FileText, Eye,
  User, UserPlus, Car, Phone, ChevronDown, ChevronUp, CalendarDays, Loader2, Route, Mail, Users, Navigation,
} from 'lucide-react';
import EventRouteMap from '../../../components/EventRouteMap';
import VehiclePhotoTooltip from '../../../components/VehiclePhotoTooltip';
import { FilePreviewModal } from '../../../components/FilePreviewModal';
import { timelinesApi } from '../../../api/timelines';
import { Toast } from '../../../components/ui/Toast';
import { useGcalSyncToast } from '../../../hooks/useGcalSyncToast';
import type {
  EventTimeline, EventLocation, TimelineActivity, EventType,
  LocationFormData, ActivityFormData,
  TimelineContact, TimelineContactFormData, ClientInviteResult, TeamInviteResult,
} from '../../../types/timeline';
import type { Reservation } from '../../../types/reservation';
import { buildContactWaUrl, whatsAppLinkProps } from '../../../utils/whatsapp';
import LastUpdated from '../../../components/ui/LastUpdated';
import { EntityLink, DriverLink } from '../../../components/EntityLink';

import SortableActivity from './SortableActivity';
import LocationModal from './LocationModal';
import ActivityModal from './ActivityModal';
import ContactModal from './ContactModal';
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_COLORS, OPS_PHONE, EVENT_TYPE_OPTIONS } from './eventoConstants';
import { formatEventDate, addDays, formatShortDate, buildFullMsg } from './eventoHelpers';

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
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [actModal, setActModal] = useState<{ open: boolean; editing: TimelineActivity | null }>({ open: false, editing: null });
  const [contactModal, setContactModal] = useState<{ open: boolean; editing: TimelineContact | null }>({ open: false, editing: null });
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [invitingClients, setInvitingClients] = useState(false);
  const [inviteResult, setInviteResult] = useState<ClientInviteResult | null>(null);
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [teamInviteResult, setTeamInviteResult] = useState<TeamInviteResult | null>(null);
  const { toast: gcalToast, notify: notifyGcalSync, dismiss: dismissGcalToast } = useGcalSyncToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
    setSavingLocation(true);
    try {
      const payload = { ...data, address: data.address || null, google_maps_link: data.google_maps_link || null, waze_link: data.waze_link || null, contact_person: data.contact_person || null, contact_phone: data.contact_phone || null, notes: data.notes || null };
      const res = locModal.editing
        ? await timelinesApi.updateLocation(timelineId, locModal.editing.id, payload)
        : await timelinesApi.createLocation(timelineId, payload);
      setLocModal({ open: false, editing: null });
      await load();
      notifyGcalSync(res.data.gcal_synced);
      // Geocoding (address/Maps link -> lat/lng) runs as a backend background
      // task so this request doesn't block on it (timelines.py's
      // _background_location_sync, up to ~45s worst case) — the location
      // just saved above almost always still has lat/lng null in that
      // reload. Poll a few more times so the map/"Sin ubicar" list picks up
      // the coordinates on their own, instead of only updating after a full
      // page refresh (which just happens to land after the task finishes).
      if (res.data.lat == null || res.data.lng == null) {
        [3000, 6000, 12000].forEach(delay => setTimeout(load, delay));
      }
    } catch {
      setLocationError('No se pudo guardar la ubicación, intenta de nuevo.');
    } finally {
      setSavingLocation(false);
    }
  };

  const deleteLocation = async (locId: number) => {
    if (!timelineId || !confirm('¿Eliminar esta ubicación?')) return;
    const res = await timelinesApi.deleteLocation(timelineId, locId);
    await load();
    notifyGcalSync(res.data.gcal_synced);
  };

  const saveActivity = async (data: ActivityFormData) => {
    if (!timelineId) return;
    const payload = { ...data, estimated_duration: data.estimated_duration || null, notes: data.notes || null };
    const res = actModal.editing
      ? await timelinesApi.updateActivity(timelineId, actModal.editing.id, payload)
      : await timelinesApi.createActivity(timelineId, payload);
    setActModal({ open: false, editing: null });
    await load();
    notifyGcalSync(res.data.gcal_synced);
  };

  const deleteActivity = async (actId: number) => {
    if (!timelineId || !confirm('¿Eliminar esta actividad?')) return;
    const res = await timelinesApi.deleteActivity(timelineId, actId);
    await load();
    notifyGcalSync(res.data.gcal_synced);
  };

  const saveContact = async (data: TimelineContactFormData) => {
    if (!timelineId) return;
    const payload = { ...data, phone: data.phone || null, role: data.role || null };
    const res = contactModal.editing
      ? await timelinesApi.updateContact(timelineId, contactModal.editing.id, payload)
      : await timelinesApi.createContact(timelineId, payload);
    setContactModal({ open: false, editing: null });
    await load();
    notifyGcalSync(res.data.gcal_synced);
  };

  const deleteContact = async (contactId: number) => {
    if (!timelineId || !confirm('¿Eliminar este contacto?')) return;
    const res = await timelinesApi.deleteContact(timelineId, contactId);
    await load();
    notifyGcalSync(res.data.gcal_synced);
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

  const handleInviteClients = async () => {
    if (!timelineId) return;
    setInvitingClients(true);
    setInviteResult(null);
    try {
      const res = await timelinesApi.inviteClients(timelineId);
      setInviteResult(res.data);
      if (!res.data.error) load();
    } finally {
      setInvitingClients(false);
    }
  };

  const handleDeleteClientInvite = async () => {
    if (!timelineId || !confirm('¿Borrar el evento de clientes en Google Calendar? Esto cancela la invitación para los invitados.')) return;
    setInvitingClients(true);
    try {
      await timelinesApi.deleteClientInvite(timelineId);
      setInviteResult(null);
      load();
    } finally {
      setInvitingClients(false);
    }
  };

  const handleInviteTeam = async () => {
    if (!timelineId) return;
    setInvitingTeam(true);
    setTeamInviteResult(null);
    try {
      const res = await timelinesApi.inviteTeam(timelineId);
      setTeamInviteResult(res.data);
      if (!res.data.error) load();
    } finally {
      setInvitingTeam(false);
    }
  };

  const handleDeleteTeamInvite = async () => {
    if (!timelineId || !confirm('¿Borrar el evento del equipo en Google Calendar? Esto cancela la invitación para los invitados.')) return;
    setInvitingTeam(true);
    try {
      await timelinesApi.deleteTeamInvite(timelineId);
      setTeamInviteResult(null);
      load();
    } finally {
      setInvitingTeam(false);
    }
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
  const gcalClientLink = timeline.gcal_client_html_link
    ? `${timeline.gcal_client_html_link}&authuser=caminoatuboda@gmail.com`
    : null;
  const gcalTeamLink = timeline.gcal_team_html_link
    ? `${timeline.gcal_team_html_link}&authuser=caminoatuboda@gmail.com`
    : null;

  return (
    <div className="space-y-4">
      {gcalToast && <Toast message={gcalToast.message} variant={gcalToast.variant} onDismiss={dismissGcalToast} />}
      {locationError && <Toast message={locationError} variant="warning" onDismiss={() => setLocationError(null)} />}
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
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
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
          <div className="flex gap-2 flex-wrap">
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
        {/* Same wording/format as the "Última actualización" line Google
            Calendar itself shows in the event description — lets a plain
            visual diff catch drift between the two (wishlist fila 72). */}
        <LastUpdated date={timeline.updated_at} className="justify-end -mt-1 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {timeline.main_contact_name && (
            <div className="flex items-center gap-2 text-gray-700 min-w-0">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{timeline.main_contact_name}</span>
              {timeline.main_contact_phone && (
                <a href={`https://wa.me/${timeline.main_contact_phone.replace(/\D/g, '')}`} {...whatsAppLinkProps()} className="ml-auto shrink-0">
                  <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                </a>
              )}
            </div>
          )}
          {reservation.vehicles.length > 0 ? (
            reservation.vehicles.map(v => (
              // min-w-0 on the grid item itself, not just the inner flex
              // child below — a CSS grid item's default min-width is
              // `auto` (refuses to shrink below content), so the inner
              // `truncate` had nothing to truncate against and a long
              // vehicle+driver name still pushed 43px past the viewport
              // at 375px (wishlist fila 49).
              <div key={v.id} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 text-gray-700 min-w-0">
                  {v.photo_url ? (
                    <VehiclePhotoTooltip
                      photoUrl={v.photo_url}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                      vehicleName={v.display_name}
                      licensePlate={v.license_plate}
                      driverName={v.display_driver}
                      driverPhone={v.display_driver_phone}
                      ownerName={v.owner_name}
                      ownerPhone={v.owner_whatsapp}
                      vehicleId={v.id}
                      ownerId={v.owner_id}
                    />
                  ) : (
                    <Car className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">
                    <EntityLink to={`/vehiculos/${v.id}`} id={v.id}>{v.display_name}</EntityLink>
                    {v.display_driver && (
                      <span className="text-gray-400"> · <DriverLink driverId={v.driver_id} ownerDriverId={v.owner_driver_id}>{v.display_driver}</DriverLink></span>
                    )}
                  </span>
                </div>
                {v.display_driver_phone && (
                  <a href={`https://wa.me/${v.display_driver_phone.replace(/\D/g, '')}`} {...whatsAppLinkProps()} className="shrink-0">
                    <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <>
              {timeline.assigned_vehicle && (
                <div className="flex items-center gap-2 text-gray-700 min-w-0">
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
                      vehicleId={reservation.vehicle_id}
                      ownerId={reservation.owner_id}
                    />
                  ) : (
                    <Car className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">
                    <EntityLink to={`/vehiculos/${reservation.vehicle_id}`} id={reservation.vehicle_id}>{timeline.assigned_vehicle}</EntityLink>
                  </span>
                </div>
              )}
              {timeline.assigned_driver && (
                <div className="flex items-center justify-between gap-2">
                  {/* min-w-0 + truncate, matching the multi-vehicle branch
                      above — this single-vehicle fallback was missing both,
                      so a long driver name (e.g. "Juan Camilo Yepes" +
                      " (conductor)") pushed the row 43px past the viewport
                      at 375px (wishlist fila 49). */}
                  <div className="flex items-center gap-2 text-gray-700 min-w-0">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">
                      <DriverLink driverId={reservation.driver_id} ownerDriverId={reservation.owner_driver_id}>{timeline.assigned_driver}</DriverLink> (conductor)
                    </span>
                  </div>
                  {timeline.assigned_driver_phone && (
                    <a href={`https://wa.me/${timeline.assigned_driver_phone.replace(/\D/g, '')}`} {...whatsAppLinkProps()} className="shrink-0">
                      <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                    </a>
                  )}
                </div>
              )}
            </>
          )}
          {reservation.display_contact && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  <EntityLink to={`/contactos/editar/${reservation.contact_id}`} id={reservation.contact_id}>{reservation.display_contact}</EntityLink>
                  {' '}<span className="text-gray-400 text-xs">(planeador)</span>
                </span>
              </div>
              {(reservation.contact_phone || reservation.contact_whatsapp_username) ? (
                <a href={buildContactWaUrl(reservation.contact_phone, reservation.contact_whatsapp_username) ?? undefined} {...whatsAppLinkProps()}>
                  <Phone className="w-4 h-4 text-green-500 hover:text-green-600 cursor-pointer" />
                </a>
              ) : null}
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
            { label: 'Conductor', token: timeline.share_token_driver, phone: timeline.assigned_driver_phone, username: null as string | null, name: timeline.assigned_driver,
              to: reservation.driver_id ? `/conductores/editar/${reservation.driver_id}` : `/propietarios/editar/${reservation.owner_driver_id}`,
              id: reservation.driver_id ?? reservation.owner_driver_id, requireAdmin: !reservation.driver_id },
            { label: 'Propietario', token: timeline.share_token_driver, phone: reservation.owner_whatsapp, username: reservation.owner_whatsapp_username, name: reservation.owner_name,
              to: `/propietarios/editar/${reservation.owner_id}`, id: reservation.owner_id, requireAdmin: true },
            { label: 'Cliente', token: timeline.share_token_customer, phone: timeline.main_contact_phone, username: reservation.customer_whatsapp_username, name: timeline.main_contact_name,
              to: `/clientes/editar/${reservation.customer_id}`, id: reservation.customer_id, requireAdmin: false },
            ...(reservation.display_contact ? [{ label: 'Planeador', token: timeline.share_token_customer, phone: reservation.contact_phone, username: reservation.contact_whatsapp_username, name: reservation.display_contact,
              to: `/contactos/editar/${reservation.contact_id}`, id: reservation.contact_id, requireAdmin: false }] : []),
            { label: 'Operaciones', token: timeline.share_token_ops, phone: OPS_PHONE, username: null as string | null, name: null, to: '', id: null, requireAdmin: false },
          ].map(({ label, token, phone, username, name, to, id, requireAdmin }) => {
            const link = `${window.location.origin}/evento/${token}`;
            const eventDate = formatEventDate(timeline.event_date);
            const vehicle = timeline.assigned_vehicle || '';
            const detailLines = [
              eventDate && `*Fecha:* ${eventDate}`,
              vehicle && `*Vehiculo:* ${vehicle}`,
            ].filter(Boolean);
            const waMsg = [
              name ? `Hola ${name.split(' ')[0]}, aquí está el enlace del evento:` : 'Aquí está el enlace del evento:',
              ...detailLines,
              link,
            ].join('\n');
            return (
              <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-600 font-medium">{label}</span>
                  {name && <span className="text-xs text-gray-400 ml-2"><EntityLink to={to} id={id} requireAdmin={requireAdmin}>{name}</EntityLink></span>}
                  <code className="block text-xs text-gray-500 truncate mt-0.5">/evento/{token}</code>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(phone || username) ? (
                    <a
                      href={buildContactWaUrl(phone, username, waMsg) ?? undefined}
                      {...whatsAppLinkProps()}
                      className="text-gray-400 hover:text-green-600 cursor-pointer"
                      title={`Enviar a ${label} por WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  ) : null}
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

      {/* Client invite */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-brand-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Invitar a clientes por Google Calendar</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Crea (o actualiza) una copia del evento en el calendario "Clientes" — con una descripción cálida y sin info interna — e invita por correo a la novia, el novio y el planeador según los emails registrados.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleInviteClients}
            disabled={invitingClients}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {invitingClients ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Invitar a clientes al evento
          </button>
          {timeline.gcal_client_html_link && (
            <button
              onClick={handleDeleteClientInvite}
              disabled={invitingClients}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              Borrar evento
            </button>
          )}
        </div>

        {inviteResult && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${inviteResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {inviteResult.error === 'no_emails' && (
              <>No hay correos registrados para invitar. Agrega el email de la novia o el novio en la ficha del cliente, o el email del planeador en el contacto.</>
            )}
            {inviteResult.error === 'not_configured' && (
              <>El calendario de clientes todavía no está configurado.</>
            )}
            {!inviteResult.error && (
              <>Invitación enviada a: {inviteResult.invited.join(', ')}</>
            )}
          </div>
        )}

        {timeline.gcal_client_invited_at && (
          <p className="text-xs text-gray-400 mt-2">
            Última invitación: {new Date(timeline.gcal_client_invited_at).toLocaleString('es-CO')}
            {gcalClientLink && (
              <> · <a href={gcalClientLink} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">ver evento</a></>
            )}
          </p>
        )}
      </div>

      {/* Team invite */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-brand-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Invitar a propietarios y conductores por Google Calendar</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Crea (o actualiza) una copia operativa del evento en el calendario "Equipo" — vehículo, conductor, contactos, ubicaciones con acceso y minuto a minuto, sin cifras — e invita por correo al propietario del vehículo y a quien maneje (propietario-conductor o conductor asignado).
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleInviteTeam}
            disabled={invitingTeam}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {invitingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Invitar al equipo del evento
          </button>
          {timeline.gcal_team_html_link && (
            <button
              onClick={handleDeleteTeamInvite}
              disabled={invitingTeam}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              Borrar evento
            </button>
          )}
        </div>

        {teamInviteResult && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${teamInviteResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {teamInviteResult.error === 'no_emails' && (
              <>No hay correos registrados para invitar. Agrega el email del propietario del vehículo y/o del conductor asignado.</>
            )}
            {teamInviteResult.error === 'not_configured' && (
              <>El calendario del equipo todavía no está configurado.</>
            )}
            {!teamInviteResult.error && (
              <>Invitación enviada a: {teamInviteResult.invited.join(', ')}</>
            )}
          </div>
        )}

        {timeline.gcal_team_invited_at && (
          <p className="text-xs text-gray-400 mt-2">
            Última invitación: {new Date(timeline.gcal_team_invited_at).toLocaleString('es-CO')}
            {gcalTeamLink && (
              <> · <a href={gcalTeamLink} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">ver evento</a></>
            )}
          </p>
        )}
      </div>

      {/* WhatsApp */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Enviar minuto a minuto</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Conductor', name: timeline.assigned_driver, phone: timeline.assigned_driver_phone, username: null as string | null,
              to: reservation.driver_id ? `/conductores/editar/${reservation.driver_id}` : `/propietarios/editar/${reservation.owner_driver_id}`,
              id: reservation.driver_id ?? reservation.owner_driver_id, requireAdmin: !reservation.driver_id },
            { label: 'Propietario', name: reservation.owner_name, phone: reservation.owner_whatsapp, username: reservation.owner_whatsapp_username,
              to: `/propietarios/editar/${reservation.owner_id}`, id: reservation.owner_id, requireAdmin: true },
            { label: 'Cliente', name: timeline.main_contact_name, phone: timeline.main_contact_phone, username: reservation.customer_whatsapp_username,
              to: `/clientes/editar/${reservation.customer_id}`, id: reservation.customer_id, requireAdmin: false },
            ...(reservation.display_contact ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone, username: reservation.contact_whatsapp_username,
              to: `/contactos/editar/${reservation.contact_id}`, id: reservation.contact_id, requireAdmin: false }] : []),
            { label: 'Operaciones', name: null, phone: OPS_PHONE, username: null as string | null, to: '', id: null, requireAdmin: false },
          ].map(({ label, name, phone, username, to, id, requireAdmin }) => (
            <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {name && <span className="text-sm text-gray-500 ml-2"><EntityLink to={to} id={id} requireAdmin={requireAdmin}>{name}</EntityLink></span>}
                {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
              </div>
              {(phone || username) ? (
                <a href={buildContactWaUrl(phone, username, buildFullMsg(timeline)) ?? undefined} {...whatsAppLinkProps()}
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
                      <a href={loc.google_maps_link} target="_blank" rel="noreferrer" title="Abrir en Google Maps" className="p-1 text-gray-400 hover:text-blue-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {loc.effective_waze_link && (
                      <a href={loc.effective_waze_link} target="_blank" rel="noreferrer" title="Abrir en Waze" className="p-1 text-gray-400 hover:text-blue-600">
                        <Navigation className="w-3.5 h-3.5" />
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

      {/* Additional contacts */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="font-semibold text-gray-900 text-sm">Contactos adicionales ({timeline.contacts.length})</h3>
          <button onClick={() => setContactModal({ open: true, editing: null })}
            className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        <div className="px-5 pb-5 space-y-2">
          {timeline.contacts.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Sin contactos adicionales — ej. el otro novio, decorador, wedding planner.</p>
          ) : (
            [...timeline.contacts].sort((a, b) => a.display_order - b.display_order).map(c => (
              <div key={c.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3 group">
                <UserPlus className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    {c.role && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{c.role}</span>}
                  </div>
                  {c.phone && <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {c.phone && (
                    <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} {...whatsAppLinkProps()} className="p-1 text-gray-400 hover:text-green-600">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button onClick={() => setContactModal({ open: true, editing: c })} className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteContact(c.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
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
      {locModal.open && <LocationModal initial={locModal.editing} saving={savingLocation} onSave={saveLocation} onClose={() => setLocModal({ open: false, editing: null })} />}
      {actModal.open && <ActivityModal initial={actModal.editing} locations={timeline.locations} eventDate={timeline.event_date} onSave={saveActivity} onClose={() => setActModal({ open: false, editing: null })} />}
      {contactModal.open && <ContactModal initial={contactModal.editing} onSave={saveContact} onClose={() => setContactModal({ open: false, editing: null })} />}
    </div>
  );
}
