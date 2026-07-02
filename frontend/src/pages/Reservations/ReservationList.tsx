import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Loader2, Pencil, Plus, Trash2,
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, CalendarClock,
} from 'lucide-react';
import { reservationsApi } from '../../api/reservations';
import type { ReservationListItem, ReservationPage, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import { vehiclesApi } from '../../api/vehicles';
import type { VehicleListItem } from '../../types/vehicle';
import Combobox from '../../components/ui/Combobox';
import type { ComboboxOption } from '../../components/ui/Combobox';

const STATUS_FILTERS: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all',              label: 'Todas' },
  { value: 'lead',             label: 'Lead' },
  { value: 'quoted',           label: 'Cotizadas' },
  { value: 'deposit_received', label: 'Depósito' },
  { value: 'reserved',         label: 'Reservadas' },
  { value: 'confirmed',        label: 'Confirmadas' },
  { value: 'completed',        label: 'Completadas' },
  { value: 'cancelled',        label: 'Canceladas' },
];

const CATEGORY_FILTERS = [
  { value: 'all',        label: 'Todas' },
  { value: 'standard',   label: 'Estándar' },
  { value: 'obsequio',   label: 'Obsequio' },
  { value: 'publicidad', label: 'Publicidad' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type SortKey = 'event_date' | 'reservation_number' | 'total_amount' | 'deposit_paid' | 'status' | 'customer';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== current) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-brand-500 inline ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 text-brand-500 inline ml-1" />;
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReservationList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<ReservationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [vehicleOptions, setVehicleOptions] = useState<ComboboxOption[]>([]);
  const [pageSize, setPageSize] = useState(50);

  // All filter/sort/page state from URL
  const statusFilter = (searchParams.get('status') ?? 'all') as ReservationStatus | 'all';
  const categoryFilter = searchParams.get('category') ?? 'all';
  const vehicleFilter = searchParams.get('vehicle') ?? '';
  const sortBy = (searchParams.get('sort') ?? 'event_date') as SortKey;
  const sortDir = (searchParams.get('dir') ?? 'asc') as 'asc' | 'desc';
  const page = Number(searchParams.get('page') ?? '1');
  const dateFrom = searchParams.get('from') ?? localToday();
  const dateTo = searchParams.get('to') ?? '';
  const q = searchParams.get('q') ?? '';

  // Local input state for debounced search
  const [inputSearch, setInputSearch] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setFilter(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all' && value !== '') next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }

  function goToPage(p: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (p === 1) next.delete('page'); else next.set('page', String(p));
      return next;
    }, { replace: true });
  }

  // Debounce search → write to URL
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (inputSearch) next.set('q', inputSearch); else next.delete('q');
        next.delete('page');
        return next;
      }, { replace: true });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputSearch]);

  // Load vehicles for filter combobox
  useEffect(() => {
    vehiclesApi.list().then(r => {
      const opts: ComboboxOption[] = (r.data as VehicleListItem[]).map(v => ({
        value: String(v.id),
        label: [v.brand, v.model_line, v.color].filter(Boolean).join(' '),
      }));
      setVehicleOptions(opts);
    });
  }, []);

  // Fetch
  useEffect(() => {
    setLoading(true);
    reservationsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      event_category: categoryFilter === 'all' ? undefined : categoryFilter,
      vehicle_id: vehicleFilter ? Number(vehicleFilter) : undefined,
      search: q || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: pageSize,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, vehicleFilter, q, sortBy, sortDir, page, pageSize, dateFrom, dateTo]);

  const toggleSort = (col: SortKey) => {
    const newDir = sortBy === col ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc';
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (col !== 'event_date') next.set('sort', col); else next.delete('sort');
      if (newDir !== 'asc') next.set('dir', newDir); else next.delete('dir');
      next.delete('page');
      return next;
    }, { replace: true });
  };

  const handleDelete = async (r: ReservationListItem) => {
    if (!confirm(`¿Eliminar reserva ${r.reservation_number}?`)) return;
    setDeletingId(r.id);
    try {
      await reservationsApi.delete(r.id);
      setData(prev => prev ? {
        ...prev,
        items: prev.items.filter(x => x.id !== r.id),
        total: prev.total - 1,
      } : prev);
    } finally {
      setDeletingId(null);
    }
  };

  const reservations = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const thClass = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap';
  const thRClass = thClass + ' text-right';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '…' : `${total.toLocaleString('es-CO')} reserva${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => navigate('/reservas/nueva')}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nueva reserva
        </button>
      </div>

      {/* Search + date range + vehicle filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono, número..."
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setFilter('from', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Desde"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setFilter('to', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Hasta"
        />
        <div className="w-52">
          <Combobox
            options={vehicleOptions}
            value={vehicleFilter}
            onChange={v => setFilter('vehicle', v)}
            placeholder="Todos los carros"
          />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter('status', f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === f.value
                ? 'bg-brand-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="w-px h-6 self-center bg-gray-200" />
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter('category', f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              categoryFilter === f.value
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16 text-brand-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {/* Empty */}
      {!loading && reservations.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay reservas con esos filtros.</p>
        </div>
      )}

      {/* Table */}
      {!loading && reservations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className={thClass} onClick={() => toggleSort('reservation_number')}>
                  # <SortIcon col="reservation_number" current={sortBy} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => toggleSort('customer')}>
                  Cliente <SortIcon col="customer" current={sortBy} dir={sortDir} />
                </th>
                <th className={`${thClass} cursor-default hover:text-gray-500`}>Vehículo</th>
                <th className={thClass} onClick={() => toggleSort('event_date')}>
                  Fecha <SortIcon col="event_date" current={sortBy} dir={sortDir} />
                </th>
                <th className={thRClass} onClick={() => toggleSort('total_amount')}>
                  Total <SortIcon col="total_amount" current={sortBy} dir={sortDir} />
                </th>
                <th className={thRClass}>Saldo</th>
                <th className={thClass} onClick={() => toggleSort('status')}>
                  Estado <SortIcon col="status" current={sortBy} dir={sortDir} />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/reservas/${r.id}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.reservation_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{r.display_customer}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.vehicle_photo_url ? (
                        <img
                          src={r.vehicle_photo_url}
                          alt={r.display_vehicle}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="text-gray-500 text-sm truncate max-w-[120px]">{r.display_vehicle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(r.event_date)}
                    {r.is_tentative && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-yellow-100 text-yellow-700 align-middle">~ tentativa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <p className="font-semibold text-gray-900">{formatCOP(r.total_amount)}</p>
                    <p className="text-xs text-brand-700">empresa {formatCOP(r.total_amount * (r.vehicle_is_company_owned ? 1 : 0.3))}</p>
                  </td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap ${Number(r.remaining_balance) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    <p className="font-semibold">{formatCOP(r.remaining_balance)}</p>
                    <p className="text-xs text-brand-700">empresa {formatCOP(Number(r.remaining_balance) * (r.vehicle_is_company_owned ? 1 : 0.3))}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESERVATION_STATUS_COLOR[r.status]}`}>
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => r.timeline_id
                          ? navigate(`/eventos/${r.timeline_id}`)
                          : navigate(`/reservas/${r.id}`)}
                        aria-label={r.timeline_id ? 'Ver evento' : 'Sin evento'}
                        className={`p-2.5 rounded-lg transition-colors cursor-pointer ${
                          r.timeline_id
                            ? 'text-brand-600 hover:bg-brand-50'
                            : 'text-gray-200 hover:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <CalendarClock size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/reservas/${r.id}/editar`)}
                        aria-label="Editar reserva"
                        className="p-2.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        aria-label="Eliminar reserva"
                        className="p-2.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Filas por página:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); goToPage(1); }}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-gray-400 ml-2">
                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, pages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded text-sm font-medium cursor-pointer ${
                      p === page ? 'bg-brand-700 text-white' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(pages)}
                disabled={page === pages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
