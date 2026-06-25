import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { reservationsApi } from '../../api/reservations';
import type { ReservationListItem, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';

const STATUS_FILTERS: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'lead', label: 'Lead' },
  { value: 'quoted', label: 'Cotizadas' },
  { value: 'deposit_received', label: 'Depósito' },
  { value: 'reserved', label: 'Reservadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

export default function ReservationList() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = (status?: ReservationStatus) =>
    reservationsApi.list(status).then(r => setReservations(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(statusFilter === 'all' ? undefined : statusFilter); }, [statusFilter]);

  const handleDelete = async (r: ReservationListItem) => {
    if (!confirm(`¿Eliminar reserva ${r.reservation_number}?`)) return;
    setDeletingId(r.id);
    try {
      await reservationsApi.delete(r.id);
      setReservations(prev => prev.filter(x => x.id !== r.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reservations.length} reserva{reservations.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/reservas/nueva')}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nueva reserva
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === f.value
                ? 'bg-pink-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-pink-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {!loading && reservations.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay reservas{statusFilter !== 'all' ? ' con ese estado' : ''}.</p>
        </div>
      )}

      {!loading && reservations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Vehículo</th>
                <th className="text-left px-4 py-3">Conductor</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reservations.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/reservas/${r.id}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reservation_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.display_customer}</td>
                  <td className="px-4 py-3 text-gray-600">{r.display_vehicle}</td>
                  <td className="px-4 py-3 text-gray-600">{r.display_driver}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.event_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCOP(r.total_amount)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(r.remaining_balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCOP(r.remaining_balance)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESERVATION_STATUS_COLOR[r.status]}`}>
                      {RESERVATION_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/reservas/${r.id}/editar`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={deletingId === r.id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
