import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
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

/** `offsetX` shifts the rendered icon sideways by a fixed number of *screen
 * pixels* (via iconAnchor, not the geographic position) — a geo-space nudge
 * would need to survive whatever zoom `fitBounds` lands on, which is set by
 * the full route's span (often kilometers, since venues are far apart), so a
 * meters-scale nudge becomes sub-pixel and invisible. A pixel offset stays
 * visible at any zoom, at the cost of the icon's tip no longer sitting
 * exactly on the true coordinate for offset pins. */
function makeIcon(color: string, label: string, offsetX = 0): L.DivIcon {
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
    className: '', html: svg, iconSize: [w, h],
    iconAnchor: [w / 2 - offsetX, h], popupAnchor: [offsetX, -h],
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
  pixelOffsetX: number;
  locations: EventLocation[];
  order: number;
  time: string | null;
}

/** Every geocoded location in timeline order — one entry per *activity* that
 * references a location, duplicates included, so a venue visited twice (e.g.
 * pickup, then back to the same point at the end) produces the real "there
 * and back" path instead of collapsing to a single one-way leg.
 *
 * Order comes from each activity's display_order (the timeline's own,
 * user-reorderable order) rather than comparing the `time` field as text —
 * `time` is stored in 12h format without AM/PM ("01:30" for 1:30 p.m.), so a
 * plain string compare sorts it before "12:15" p.m. and inverts the route
 * whenever the event crosses noon.
 *
 * Consecutive activities at the same location (e.g. "arrival" then "start
 * activity" both at the venue) collapse into a single waypoint — but a
 * location revisited later in the timeline still gets its own waypoint,
 * which is what makes a round trip show both legs. */
function buildOrderedWaypoints(locations: EventLocation[], activities: TimelineActivity[]): { loc: EventLocation; time: string | null }[] {
  const locById = new Map(
    locations
      .filter((l): l is EventLocation & { lat: number; lng: number } => l.lat != null && l.lng != null)
      .map(l => [l.id, l] as const)
  );

  const sortedActivities = [...activities].sort((a, b) => a.display_order - b.display_order);
  const waypoints: { loc: EventLocation; time: string | null }[] = [];
  const referencedIds = new Set<number>();

  for (const a of sortedActivities) {
    if (a.location_id == null) continue;
    const loc = locById.get(a.location_id);
    if (!loc) continue;
    referencedIds.add(loc.id);
    const last = waypoints[waypoints.length - 1];
    if (last && last.loc.id === loc.id) continue;
    waypoints.push({ loc, time: a.time });
  }

  // Locations never referenced by any activity still need to show up
  // somewhere — append them in their own display_order, after the
  // activity-ordered ones.
  const leftovers = [...locById.values()]
    .filter(l => !referencedIds.has(l.id))
    .sort((a, b) => a.display_order - b.display_order)
    .map(loc => ({ loc, time: null as string | null }));

  return [...waypoints, ...leftovers];
}

// Screen-pixel nudge applied to a revisited coordinate's pin so it doesn't
// render exactly on top of the earlier visit — cycles if a spot is visited
// more than twice. The first visit at any coordinate stays unshifted (0).
const PIXEL_OFFSETS = [0, 16, -16, 32, -32];

/** One marker per real visit — a venue visited twice (e.g. pickup, then
 * reception at the same place) gets two separate numbered pins, nudged apart
 * so neither hides the other, instead of collapsing into a single pin. */
function buildStops(waypoints: { loc: EventLocation; time: string | null }[]): Stop[] {
  const visitCountByKey = new Map<string, number>();
  return waypoints.map(({ loc, time }, i) => {
    const key = `${loc.lat!.toFixed(5)},${loc.lng!.toFixed(5)}`;
    const visitIndex = visitCountByKey.get(key) ?? 0;
    visitCountByKey.set(key, visitIndex + 1);
    return {
      key: `${loc.id}-${i}`,
      position: [loc.lat!, loc.lng!],
      pixelOffsetX: PIXEL_OFFSETS[visitIndex % PIXEL_OFFSETS.length],
      locations: [loc],
      order: i + 1,
      time,
    };
  });
}

// ─── Repeated-leg detection (round trips) ───────────────────────────────────────

const LEG_OFFSET_DEG = 0.00008;

/** Indices (into the leg list, i.e. waypoints[i] -> waypoints[i+1]) of any leg
 * whose two endpoints — regardless of direction — already appeared as an
 * earlier leg. The outbound leg is left alone; only the retrace is flagged,
 * since that's the one that visually overlaps an existing line. */
function findRepeatedLegs(waypointPositions: [number, number][]): number[] {
  const seen = new Set<string>();
  const repeated: number[] = [];
  const keyOf = (p: [number, number]) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  for (let i = 0; i < waypointPositions.length - 1; i++) {
    const pairKey = [keyOf(waypointPositions[i]), keyOf(waypointPositions[i + 1])].sort().join('|');
    if (seen.has(pairKey)) {
      repeated.push(i);
    } else {
      seen.add(pairKey);
    }
  }
  return repeated;
}

/** Nudges a straight line between two points sideways by a small amount, so
 * an overlay drawn for a repeated leg doesn't sit exactly on top of the
 * original route line. */
function offsetLegLine(a: [number, number], b: [number, number]): [number, number][] {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
  const offLat = (-dLng / len) * LEG_OFFSET_DEG;
  const offLng = (dLat / len) * LEG_OFFSET_DEG;
  return [[a[0] + offLat, a[1] + offLng], [b[0] + offLat, b[1] + offLng]];
}

// ─── OSRM route fetch (falls back to straight line on failure) ─────────────────

interface OsrmResponse {
  routes?: {
    distance?: number;
    geometry?: { coordinates?: [number, number][] };
    legs?: { distance?: number }[];
  }[];
}

interface RouteResult {
  line: [number, number][] | null;
  totalKm: number | null;
  legKm: number[] | null;
  isApprox: boolean;
}

/** Great-circle distance in km — used only as a fallback when OSRM can't be reached. */
function haversineKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function straightLineLegs(waypoints: [number, number][]): number[] {
  const legs: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) legs.push(haversineKm(waypoints[i], waypoints[i + 1]));
  return legs;
}

function useRoute(waypoints: [number, number][]): RouteResult {
  const [result, setResult] = useState<RouteResult>({ line: null, totalKm: null, legKm: null, isApprox: false });
  const waypointsKey = waypoints.map(p => p.join(',')).join('|');

  useEffect(() => {
    setResult({ line: null, totalKm: null, legKm: null, isApprox: false });
    if (waypoints.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const coordsParam = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then(res => (res.ok ? res.json() as Promise<OsrmResponse> : Promise.reject(res)))
      .then(data => {
        const route = data.routes?.[0];
        const coords = route?.geometry?.coordinates;
        if (coords && coords.length > 0) {
          setResult({
            line: coords.map(([lng, lat]) => [lat, lng]),
            totalKm: route!.distance != null ? route!.distance / 1000 : null,
            legKm: route!.legs?.map(l => (l.distance ?? 0) / 1000) ?? null,
            isApprox: false,
          });
        } else {
          throw new Error('empty OSRM route');
        }
      })
      .catch(() => {
        // OSRM unavailable — fall back to straight-line distance (and the
        // dashed straight polyline already rendered elsewhere) rather than
        // showing nothing.
        const legKm = straightLineLegs(waypoints);
        setResult({ line: null, totalKm: legKm.reduce((a, b) => a + b, 0), legKm, isApprox: true });
      })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointsKey]);

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventRouteMap({ locations, activities }: { locations: EventLocation[]; activities: TimelineActivity[] }) {
  const waypoints = useMemo(() => buildOrderedWaypoints(locations, activities), [locations, activities]);
  const stops = useMemo(() => buildStops(waypoints), [waypoints]);
  const waypointPositions = useMemo<[number, number][]>(() => waypoints.map(w => [w.loc.lat!, w.loc.lng!]), [waypoints]);
  const { line: routeLine, totalKm, legKm, isApprox } = useRoute(waypointPositions);
  const repeatedLegs = useMemo(() => findRepeatedLegs(waypointPositions), [waypointPositions]);
  const fmtKm = (km: number) => km.toLocaleString('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
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
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden relative z-0" style={{ minHeight: '340px' }}>
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
            <Polyline key="route-real" positions={routeLine} pathOptions={{ color: ROUTE_COLOR, weight: 4, opacity: 0.85 }} />
          ) : waypointPositions.length >= 2 && (
            <Polyline
              key="route-approx"
              positions={waypointPositions}
              pathOptions={{ color: ROUTE_COLOR, weight: 3, opacity: 0.6, dashArray: '6 8' }}
            />
          )}

          {repeatedLegs.map(i => (
            <Polyline
              key={`repeat-${i}`}
              positions={offsetLegLine(waypointPositions[i], waypointPositions[i + 1])}
              pathOptions={{ color: '#f59e0b', weight: 3, opacity: 0.9, dashArray: '2 8' }}
            >
              <Tooltip sticky>Tramo repetido (ida y vuelta)</Tooltip>
            </Polyline>
          ))}

          {stops.map(stop => {
            const primaryType = stop.locations[0].location_type;
            return (
              <Marker key={stop.key} position={stop.position} icon={makeIcon(TYPE_HEX[primaryType], String(stop.order), stop.pixelOffsetX)}>
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

      {waypoints.length >= 2 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Distancia total del recorrido</span>
            <span className="text-sm font-semibold text-teal-700">
              {totalKm != null ? `${fmtKm(totalKm)} km` : '—'}
            </span>
          </div>
          {isApprox && (
            <p className="text-xs text-amber-600 mt-1">
              Estimado en línea recta — no se pudo calcular la ruta real por carretera.
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {waypoints.slice(0, -1).map((w, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate pr-3">{w.loc.location_name} → {waypoints[i + 1].loc.location_name}</span>
                <span className="shrink-0">{legKm?.[i] != null ? `${fmtKm(legKm[i])} km` : '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
