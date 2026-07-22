import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Phone, Car, User, Navigation, Calendar, Route } from 'lucide-react';
import EventRouteMap from '../../components/EventRouteMap';
import { timelinesApi } from '../../api/timelines';
import type { TimelinePublic, EventLocation, LocationType } from '../../types/timeline';

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  photoshoot: 'Sesión de fotos',
  other: 'Otro',
};

const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  pickup: 'border-blue-300 bg-blue-50',
  ceremony: 'border-brand-300 bg-brand-50',
  reception: 'border-purple-300 bg-purple-50',
  photoshoot: 'border-green-300 bg-green-50',
  other: 'border-gray-300 bg-gray-50',
};

const LOCATION_DOT_COLORS: Record<LocationType, string> = {
  pickup: 'bg-blue-500',
  ceremony: 'bg-brand-500',
  reception: 'bg-purple-500',
  photoshoot: 'bg-green-500',
  other: 'bg-gray-400',
};

function LocationCard({ loc }: { loc: EventLocation }) {
  return (
    <div className={`border rounded-xl p-4 ${LOCATION_TYPE_COLORS[loc.location_type]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${LOCATION_DOT_COLORS[loc.location_type]}`} />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {LOCATION_TYPE_LABELS[loc.location_type]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base">{loc.location_name}</h3>
          {loc.address && <p className="text-sm text-gray-600 mt-0.5">{loc.address}</p>}
          <div className="flex flex-wrap gap-x-4 mt-2">
            {loc.contact_person && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {loc.contact_person}
              </span>
            )}
            {loc.contact_phone && (
              <a
                href={`https://wa.me/${loc.contact_phone.replace(/\D/g, '')}`}
                className="text-sm text-green-600 flex items-center gap-1 font-medium"
              >
                <Phone className="w-3.5 h-3.5" /> {loc.contact_phone}
              </a>
            )}
          </div>
          {loc.notes && <p className="text-sm text-gray-500 mt-2 italic">{loc.notes}</p>}
          {loc.road_access_notes && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mt-2">
              <span className="font-semibold">Acceso vial:</span> {loc.road_access_notes}
            </p>
          )}
        </div>
        {loc.google_maps_link && (
          <a
            href={loc.google_maps_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium shrink-0 shadow-sm"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
            Maps
          </a>
        )}
      </div>
    </div>
  );
}

export default function EventoPage() {
  const { token } = useParams<{ token: string }>();
  const [event, setEvent] = useState<TimelinePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    timelinesApi.getPublic(token)
      .then((r: { data: TimelinePublic }) => { setEvent(r.data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando evento...</p>
      </div>
    </div>
  );

  if (notFound || !event) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
        <p className="text-gray-500 text-sm">
          Este enlace de evento no existe o ha sido regenerado. Solicita un nuevo enlace al equipo de Camino a mi Boda.
        </p>
      </div>
    </div>
  );

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

  const formatShortDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

  const addDays = (d: string, n: number) => {
    const date = new Date(d + 'T00:00:00');
    date.setDate(date.getDate() + n);
    return date.toISOString().slice(0, 10);
  };

  const sortedActivities = [...event.activities].sort((a, b) => a.display_order - b.display_order);
  const multiDayEvent = new Set(sortedActivities.map(a => a.day_number)).size > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-brand-500 text-lg">💍</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">{event.event_name}</h1>
              <p className="text-sm text-gray-500 capitalize">{formatDate(event.event_date)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Event summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {event.main_contact_name && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">{event.main_contact_name}</span>
              </div>
              {event.main_contact_phone && (
                <a
                  href={`https://wa.me/${event.main_contact_phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 font-medium"
                >
                  <Phone className="w-4 h-4" />
                  {event.main_contact_phone}
                </a>
              )}
            </div>
          )}
          {event.assigned_vehicle && (
            <div className="flex items-center gap-2 text-gray-700">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="text-sm">{event.assigned_vehicle}</span>
            </div>
          )}
          {event.assigned_driver && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{event.assigned_driver} · Conductor</span>
              </div>
              {event.assigned_driver_phone && (
                <a
                  href={`https://wa.me/${event.assigned_driver_phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 font-medium"
                >
                  <Phone className="w-4 h-4" />
                  {event.assigned_driver_phone}
                </a>
              )}
            </div>
          )}
          {event.planner_name && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{event.planner_name} · Planeador</span>
              </div>
              {event.planner_phone && (
                <a
                  href={`https://wa.me/${event.planner_phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 font-medium"
                >
                  <Phone className="w-4 h-4" />
                  {event.planner_phone}
                </a>
              )}
            </div>
          )}
          {event.contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{c.name}{c.role ? ` · ${c.role}` : ''}</span>
              </div>
              {c.phone && (
                <a
                  href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 font-medium"
                >
                  <Phone className="w-4 h-4" />
                  {c.phone}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Special instructions */}
        {event.special_instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Instrucciones especiales</p>
            <p className="text-sm text-amber-900 leading-relaxed">{event.special_instructions}</p>
          </div>
        )}

        {/* Locations */}
        {event.locations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Ubicaciones
            </h2>
            <div className="space-y-3">
              {event.locations.map(loc => <LocationCard key={loc.id} loc={loc} />)}
            </div>
          </div>
        )}

        {/* Route map */}
        {event.locations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Route className="w-4 h-4" /> Ruta del evento
            </h2>
            <EventRouteMap locations={event.locations} activities={event.activities} />
          </div>
        )}

        {/* Timeline */}
        {sortedActivities.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Timeline del evento
            </h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[22px] top-3 bottom-3 w-0.5 bg-gray-200" />
              <div className="space-y-1">
                {sortedActivities.map((act, idx) => {
                  const loc = event.locations.find(l => l.id === act.location_id);
                  return (
                    <div key={act.id} className="flex gap-4 relative">
                      <div className="flex flex-col items-center shrink-0 z-10">
                        <div className={`w-[11px] h-[11px] rounded-full border-2 border-white ring-2 mt-3 ${
                          idx === 0 ? 'ring-brand-500 bg-brand-500' : 'ring-gray-300 bg-white'
                        }`} />
                      </div>
                      <div className="flex-1 bg-white border border-gray-200 rounded-xl p-3 mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {multiDayEvent && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 rounded-full px-1.5 py-0.5 mr-1.5 align-middle">
                                {formatShortDate(addDays(event.event_date, act.day_number - 1))} · Día {act.day_number}
                              </span>
                            )}
                            <span className="text-sm font-bold text-brand-700 font-mono">{act.time}</span>
                            <p className="text-sm text-gray-900 mt-0.5 leading-snug">{act.description}</p>
                          </div>
                          {act.estimated_duration && (
                            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                              <Clock className="w-3 h-3" /> {act.estimated_duration}
                            </span>
                          )}
                        </div>
                        {(loc || act.notes) && (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                            {loc && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {loc.location_name}
                                </span>
                                {loc.google_maps_link && (
                                  <a href={loc.google_maps_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-0.5 font-medium">
                                    <Navigation className="w-3 h-3" /> Abrir
                                  </a>
                                )}
                              </div>
                            )}
                            {act.notes && <p className="text-xs text-gray-400 italic">{act.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">Powered by Camino a mi Boda · Medellín, Colombia</p>
        </div>
      </div>
    </div>
  );
}
