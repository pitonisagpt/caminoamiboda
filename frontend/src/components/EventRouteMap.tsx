import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink } from 'lucide-react';
import type { EventLocation, TimelineActivity, LocationType } from '../types/timeline';

const TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida', ceremony: 'Ceremonia', reception: 'Recepción',
  photoshoot: 'Sesión de fotos', other: 'Otro',
};

const TYPE_HEX: Record<LocationType, string> = {
  pickup: '#3b82f6', ceremony: '#a855f7', reception: '#ec4899',
  photoshoot: '#22c55e', other: '#6b7280',
};

const ROUTE_COLOR = '#0d9488';

// ─── Leaflet custom numbered icon ───────────────────────────────────────────────

function makeIcon(color: string, label: string): L.DivIcon {
  const w = 28, h = 36;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <filter id="s" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    <path d="M15 0C7.27 0 1 6.27 1 14c0 10.5 14 24 14 24S29 24.5 29 14C29 6.27 22.73 0 15 0z"
      fill="${color}" filter="url(#s)"/>
    <circle cx="15" cy="14" r="8.5" fill="white" opacity="0.95"/>
    <text x="15" y="18" font-size="11" font-weight="700" text-anchor="middle" fill="${color}" font-family="sans-serif">${label}</text>
  </svg>`;
  return L.divIcon({
    className: '', html: svg, iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h],
  });
}

function MapFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map(p => p.join(',')).join('|');
    if (key === prev.current) return;
    prev.current = key;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    } else {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40], animate: true });
    }
  }, [points, map]);
  return null;
}

// ─── Chronological ordering + stop grouping ─────────────────────────────────────

interface Stop {
  key: string;
  position: [number, number];
  locations: EventLocation[];
  order: number;
  time: string | null;
}

/** Every geocoded location in timeline order — one entry per location,
 * duplicates included, so a venue used twice (e.g. pickup AND reception at
 * the same place) produces the real "there and back" path.
 *
 * Order comes from each location's first-referencing activity's display_order
 * (the timeline's own, user-reorderable order) rather than comparing the
 * `time` field as text — `time` is stored in 12h format without AM/PM
 * ("01:30" for 1:30 p.m.), so a plain string compare sorts it before "12:15"
 * p.m. and inverts the route whenever the event crosses noon. */
function buildOrderedWaypoints(locations: EventLocation[], activities: TimelineActivity[]): { loc: EventLocation; time: string | null }[] {
  const withCoords = locations.filter((l): l is EventLocation & { lat: number; lng: number } => l.lat != null && l.lng != null);

  const sortedActivities = [...activities].sort((a, b) => a.display_order - b.display_order);
  const orderByLocation = new Map<number, number>();
  const timeByLocation = new Map<number, string>();
  sortedActivities.forEach(a => {
    if (a.location_id == null || orderByLocation.has(a.location_id)) return;
    orderByLocation.set(a.location_id, orderByLocation.size);
    timeByLocation.set(a.location_id, a.time);
  });

  return [...withCoords]
    .sort((a, b) => {
      const oa = orderByLocation.get(a.id);
      const ob = orderByLocation.get(b.id);
      if (oa != null && ob != null) return oa - ob;
      if (oa != null) return -1;
      if (ob != null) return 1;
      return a.display_order - b.display_order;
    })
    .map(loc => ({ loc, time: timeByLocation.get(loc.id) ?? null }));
}

/** Groups same-coordinate waypoints into one marker each (numbered by first
 * visit) so revisited venues don't stack overlapping pins. */
function buildStops(waypoints: { loc: EventLocation; time: string | null }[]): Stop[] {
  const stops: Stop[] = [];
  const indexByKey = new Map<string, number>();
  waypoints.forEach(({ loc, time }) => {
    const key = `${loc.lat!.toFixed(5)},${loc.lng!.toFixed(5)}`;
    const idx = indexByKey.get(key);
    if (idx == null) {
      indexByKey.set(key, stops.length);
      stops.push({ key, position: [loc.lat!, loc.lng!], locations: [loc], order: stops.length + 1, time });
    } else {
      stops[idx].locations.push(loc);
      if (time && (!stops[idx].time || time < stops[idx].time!)) stops[idx].time = time;
    }
  });
  return stops;
}

// ─── OSRM route fetch (falls back to straight line on failure) ─────────────────

interface OsrmResponse {
  routes?: { geometry?: { coordinates?: [number, number][] } }[];
}

function useRoutePolyline(waypoints: [number, number][]): [number, number][] | null {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const waypointsKey = waypoints.map(p => p.join(',')).join('|');

  useEffect(() => {
    setRoute(null);
    if (waypoints.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const coordsParam = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then(res => (res.ok ? res.json() as Promise<OsrmResponse> : Promise.reject(res)))
      .then(data => {
        const coords = data.routes?.[0]?.geometry?.coordinates;
        if (coords && coords.length > 0) {
          setRoute(coords.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => { /* falls back to the straight dashed line already rendered */ })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointsKey]);

  return route;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventRouteMap({ locations, activities }: { locations: EventLocation[]; activities: TimelineActivity[] }) {
  const waypoints = useMemo(() => buildOrderedWaypoints(locations, activities), [locations, activities]);
  const stops = useMemo(() => buildStops(waypoints), [waypoints]);
  const waypointPositions = useMemo<[number, number][]>(() => waypoints.map(w => [w.loc.lat!, w.loc.lng!]), [waypoints]);
  const routeLine = useRoutePolyline(waypointPositions);
  const unlocated = locations.filter(l => l.lat == null || l.lng == null);
  const points = stops.map(s => s.position);

  if (locations.length === 0) return null;

  if (stops.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
        <p className="text-sm text-gray-400">
          Ninguna ubicación tiene coordenadas todavía. Se completan automáticamente al guardar una dirección o enlace de Google Maps.
        </p>
      </div>
    );
  }

  const defaultCenter: [number, number] = points[0] ?? [6.2442, -75.5812];

  return (
    <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden relative" style={{ minHeight: '340px' }}>
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
          border: 1px solid rgba(0,0,0,0.06) !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content { margin: 0 !important; line-height: 1.5 !important; }
        .leaflet-popup-tip-container { margin-top: -1px; }
        .leaflet-popup-tip { box-shadow: none !important; }
      `}</style>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '340px', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapFitter points={points} />

        {routeLine ? (
          <Polyline positions={routeLine} pathOptions={{ color: ROUTE_COLOR, weight: 4, opacity: 0.85 }} />
        ) : waypointPositions.length >= 2 && (
          <Polyline
            positions={waypointPositions}
            pathOptions={{ color: ROUTE_COLOR, weight: 3, opacity: 0.6, dashArray: '6 8' }}
          />
        )}

        {stops.map(stop => {
          const primaryType = stop.locations[0].location_type;
          return (
            <Marker key={stop.key} position={stop.position} icon={makeIcon(TYPE_HEX[primaryType], String(stop.order))}>
              <Popup minWidth={200} maxWidth={280}>
                <div>
                  <div style={{ background: TYPE_HEX[primaryType], padding: '10px 14px 8px' }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', margin: 0 }}>Parada {stop.order}</p>
                    {stop.time && (
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', margin: '2px 0 0' }}>{stop.time}</p>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stop.locations.map(loc => (
                      <div key={loc.id}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#111827', margin: 0 }}>{loc.location_name}</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '1px 0 0' }}>{TYPE_LABELS[loc.location_type]}</p>
                        {loc.address && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{loc.address}</p>}
                        {loc.google_maps_link && (
                          <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '11px', color: TYPE_HEX[loc.location_type], display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', textDecoration: 'none', fontWeight: 500 }}>
                            <ExternalLink size={10} /> Abrir en Google Maps
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {unlocated.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200 shadow-md px-3 py-2 max-w-[220px]">
          <p className="text-[11px] font-semibold text-amber-700 mb-1.5">Sin ubicar ({unlocated.length})</p>
          <ul className="space-y-0.5">
            {unlocated.map(l => (
              <li key={l.id} className="text-[11px] text-gray-600 truncate" title={l.location_name}>• {l.location_name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
