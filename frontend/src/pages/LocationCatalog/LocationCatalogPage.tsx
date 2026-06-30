import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, Edit, Trash2, Search, X, ExternalLink, LocateFixed, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { catalogLocationsApi } from '../../api/catalogLocations';
import type { CatalogLocation, CatalogLocationFormData, LocationType } from '../../types/catalogLocation';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  photoshoot: 'Sesión de fotos',
  other: 'Otro',
};

const TYPE_COLORS: Record<LocationType, string> = {
  pickup: 'bg-blue-100 text-blue-700',
  ceremony: 'bg-purple-100 text-purple-700',
  reception: 'bg-pink-100 text-pink-700',
  photoshoot: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
};

const TYPE_HEX: Record<LocationType, string> = {
  pickup: '#3b82f6',
  ceremony: '#a855f7',
  reception: '#ec4899',
  photoshoot: '#22c55e',
  other: '#6b7280',
};

const EMPTY_FORM: CatalogLocationFormData = {
  name: '', location_type: 'other', address: '',
  google_maps_link: '', contact_person: '', contact_phone: '', notes: '',
};

// ─── Leaflet custom icon ────────────────────────────────────────────────────────

function makeIcon(type: LocationType, selected: boolean): L.DivIcon {
  const color = TYPE_HEX[type];
  const w = selected ? 30 : 22;
  const h = selected ? 38 : 28;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <filter id="s" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    <path d="M15 0C7.27 0 1 6.27 1 14c0 10.5 14 24 14 24S29 24.5 29 14C29 6.27 22.73 0 15 0z"
      fill="${color}" filter="url(#s)"/>
    <circle cx="15" cy="14" r="5.5" fill="white" opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });
}

// ─── Map fit-bounds controller ──────────────────────────────────────────────────

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
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [48, 48], animate: true });
    }
  }, [points, map]);
  return null;
}

// ─── Location Form Modal ────────────────────────────────────────────────────────

function LocationModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CatalogLocation | null;
  onSave: (data: CatalogLocationFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CatalogLocationFormData>(
    initial
      ? {
          name: initial.name, location_type: initial.location_type,
          address: initial.address || '', google_maps_link: initial.google_maps_link || '',
          contact_person: initial.contact_person || '', contact_phone: initial.contact_phone || '',
          notes: initial.notes || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const f = (k: keyof CatalogLocationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar ubicación' : 'Nueva ubicación'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={f('name')} className={inputCls} placeholder="Catedral de Laureles" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.location_type} onChange={f('location_type')} className={inputCls}>
                {(Object.entries(TYPE_LABELS) as [LocationType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
              <input value={form.contact_person} onChange={f('contact_person')} className={inputCls} placeholder="Padre Martínez" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
            <input value={form.address} onChange={f('address')} className={inputCls} placeholder="Cra 80 # 33-02, Medellín" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
            <input value={form.google_maps_link} onChange={f('google_maps_link')} className={inputCls} placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tel. contacto</label>
              <input value={form.contact_phone} onChange={f('contact_phone')} className={inputCls} placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <input value={form.notes} onChange={f('notes')} className={inputCls} placeholder="Entrar por la puerta sur" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
          <button
            onClick={async () => { if (!form.name.trim()) return; setSaving(true); try { await onSave(form); } finally { setSaving(false); } }}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-lg cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function LocationCatalogPage() {
  const [locations, setLocations] = useState<CatalogLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inputSearch, setInputSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LocationType | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<{ open: boolean; editing?: CatalogLocation | null }>({ open: false });
  const [resolvingCoords, setResolvingCoords] = useState(false);
  const [resolveResult, setResolveResult] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'name' | 'location_type' | 'address'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogLocationsApi.list({ q: search || undefined, type: typeFilter || undefined });
      setLocations(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); setPage(1); }, [search, typeFilter]);

  const handleSearchInput = (val: string) => {
    setInputSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 300);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async (form: CatalogLocationFormData) => {
    if (modal.editing) {
      await catalogLocationsApi.update(modal.editing.id, form);
    } else {
      await catalogLocationsApi.create(form);
    }
    setModal({ open: false });
    load();
  };

  const handleDelete = async (loc: CatalogLocation) => {
    if (!confirm(`¿Eliminar "${loc.name}" del catálogo?`)) return;
    await catalogLocationsApi.delete(loc.id);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(loc.id); return n; });
    load();
  };

  const handleResolveCoords = async () => {
    setResolvingCoords(true);
    setResolveResult(null);
    try {
      const res = await catalogLocationsApi.resolveCoords();
      const { resolved, total } = res.data;
      setResolveResult(total === 0 ? 'Todas las ubicaciones ya tienen coordenadas.' : `${resolved} de ${total} ubicaciones geocodificadas.`);
      load();
    } catch {
      setResolveResult('Error al resolver coordenadas.');
    } finally {
      setResolvingCoords(false);
    }
  };

  const handleSort = (col: 'name' | 'location_type' | 'address') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  // Build coordinate map from DB values
  const coordsMap = new Map<number, [number, number]>();
  for (const l of locations) {
    if (l.lat != null && l.lng != null) {
      coordsMap.set(l.id, [l.lat, l.lng]);
    }
  }

  const withCoords = locations.filter(l => coordsMap.has(l.id)).length;
  const withoutCoords = locations.length - withCoords;

  const sortedLocations = [...locations].sort((a, b) => {
    const av = (a[sortCol] ?? '').toString().toLowerCase();
    const bv = (b[sortCol] ?? '').toString().toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const totalPages = Math.max(1, Math.ceil(sortedLocations.length / PAGE_SIZE));
  const pagedLocations = sortedLocations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Determine which locations to show on map
  const visibleLocs = selectedIds.size > 0
    ? locations.filter(l => selectedIds.has(l.id))
    : locations;

  const visiblePoints: [number, number][] = visibleLocs
    .map(l => coordsMap.get(l.id))
    .filter((c): c is [number, number] => Boolean(c));

  const defaultCenter: [number, number] = [6.2442, -75.5812];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de ubicaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Todas las ubicaciones donde opera Camino a mi Boda
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {withoutCoords > 0 && (
            <button
              onClick={handleResolveCoords}
              disabled={resolvingCoords}
              title={`${withoutCoords} ubicaciones sin coordenadas`}
              className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              <LocateFixed size={15} />
              {resolvingCoords ? 'Geocodificando…' : `Resolver coordenadas (${withoutCoords})`}
            </button>
          )}
          <button
            onClick={() => setModal({ open: true, editing: null })}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva ubicación
          </button>
        </div>
      </div>

      {resolveResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800 flex items-center justify-between">
          <span>{resolveResult}</span>
          <button onClick={() => setResolveResult(null)} className="text-amber-500 hover:text-amber-700 cursor-pointer ml-4"><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={inputSearch}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Buscar por nombre o dirección..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['', 'pickup', 'ceremony', 'reception', 'photoshoot', 'other'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === t ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === '' ? 'Todos' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors cursor-pointer"
          >
            <X size={12} />
            Quitar selección ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(TYPE_LABELS) as [LocationType, string][]).map(([t, label]) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: TYPE_HEX[t] }} />
            {label}
          </div>
        ))}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1" style={{ minHeight: '480px' }}>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
          ) : locations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12 gap-2">
              <MapPin size={32} className="text-gray-200" />
              <p className="text-sm">{search || typeFilter ? 'Sin resultados para este filtro' : 'No hay ubicaciones aún'}</p>
              {!search && !typeFilter && (
                <button onClick={() => setModal({ open: true, editing: null })} className="mt-2 text-sm text-pink-600 hover:underline cursor-pointer">
                  Crear la primera ubicación
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    {(['name', 'location_type', 'address'] as const).map((col, i) => (
                      <th key={col}
                        onClick={() => handleSort(col)}
                        className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none${col === 'address' ? ' hidden md:table-cell' : ''}`}
                      >
                        <span className="flex items-center gap-1">
                          {['Nombre', 'Tipo', 'Dirección'][i]}
                          {sortCol === col
                            ? sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            : <ChevronUp size={12} className="opacity-20" />}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedLocations.map(loc => {
                    const isSelected = selectedIds.has(loc.id);
                    const hasCoords = coordsMap.has(loc.id);
                    return (
                      <tr
                        key={loc.id}
                        onClick={() => toggleSelect(loc.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {hasCoords
                              ? <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_HEX[loc.location_type] }} />
                              : <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-200" title="Sin coordenadas — usa 'Resolver coordenadas'" />
                            }
                            <span className={`font-medium ${isSelected ? 'text-pink-700' : 'text-gray-900'}`}>{loc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[loc.location_type]}`}>
                            {TYPE_LABELS[loc.location_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">
                          {loc.address || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                            {loc.google_maps_link && (
                              <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer" title="Abrir en Google Maps">
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button onClick={() => setModal({ open: true, editing: loc })} className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit size={14} /></button>
                            <button onClick={() => handleDelete(loc)} className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between flex-wrap gap-2">
            <span>{locations.length} {locations.length === 1 ? 'ubicación' : 'ubicaciones'} · {withCoords} en mapa
              {selectedIds.size > 0 && <span className="text-pink-600 ml-2">· {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}</span>}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"><ChevronLeft size={13} /></button>
                <span>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"><ChevronRight size={13} /></button>
              </div>
            )}
          </div>
        </div>

        {/* Leaflet Map */}
        <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ minHeight: '480px' }}>
          <style>{`
            .leaflet-popup-content-wrapper {
              border-radius: 14px !important;
              box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
              border: 1px solid rgba(0,0,0,0.06) !important;
              padding: 0 !important;
              overflow: hidden;
            }
            .leaflet-popup-content {
              margin: 0 !important;
              line-height: 1.5 !important;
            }
            .leaflet-popup-tip-container { margin-top: -1px; }
            .leaflet-popup-tip { box-shadow: none !important; }
            .leaflet-popup-close-button {
              top: 8px !important; right: 10px !important;
              color: #9ca3af !important; font-size: 18px !important;
            }
            .leaflet-popup-close-button:hover { color: #374151 !important; }
            .leaflet-control-attribution {
              background: rgba(255,255,255,0.75) !important;
              backdrop-filter: blur(4px);
              border-radius: 6px 0 0 0 !important;
              font-size: 10px !important;
              padding: 2px 6px !important;
            }
            .leaflet-control-zoom {
              border: none !important;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
            }
            .leaflet-control-zoom a {
              border-radius: 8px !important;
              border: none !important;
              color: #374151 !important;
              font-size: 16px !important;
              width: 32px !important;
              height: 32px !important;
              line-height: 32px !important;
            }
            .leaflet-control-zoom-in { margin-bottom: 2px !important; }
          `}</style>
          <MapContainer
            center={defaultCenter}
            zoom={11}
            style={{ height: '100%', width: '100%', minHeight: '480px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapFitter points={visiblePoints} />
            {locations.map(loc => {
              const c = coordsMap.get(loc.id);
              if (!c) return null;
              const isSelected = selectedIds.has(loc.id);
              const isVisible = selectedIds.size === 0 || isSelected;
              if (!isVisible) return null;
              return (
                <Marker key={loc.id} position={c} icon={makeIcon(loc.location_type, isSelected)}>
                  <Popup minWidth={200} maxWidth={280}>
                    <div>
                      <div style={{ background: TYPE_HEX[loc.location_type], padding: '10px 14px 8px' }}>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', margin: 0, lineHeight: 1.3 }}>{loc.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', margin: '2px 0 0' }}>{TYPE_LABELS[loc.location_type]}</p>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {loc.address && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{loc.address}</p>
                        )}
                        {loc.contact_person && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            {loc.contact_person}{loc.contact_phone ? ` · ${loc.contact_phone}` : ''}
                          </p>
                        )}
                        {loc.google_maps_link && (
                          <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: TYPE_HEX[loc.location_type], display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', textDecoration: 'none', fontWeight: 500 }}>
                            <ExternalLink size={11} /> Abrir en Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {modal.open && (
        <LocationModal
          initial={modal.editing}
          onSave={handleSave}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
