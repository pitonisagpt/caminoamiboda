import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import type { ReservationListItem, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../types/reservation';

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function KanbanCard({ r, onNavigate }: { r: ReservationListItem; onNavigate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: r.id,
    data: { status: r.status },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onNavigate}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {r.vehicle_photo_url ? (
          <img
            src={r.vehicle_photo_url}
            alt={r.display_vehicle}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{r.display_customer}</p>
          <p className="text-[11px] text-gray-400 font-mono truncate">{r.reservation_number}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {formatDate(r.event_date)}
          {r.is_tentative && (
            <span className="ml-1 px-1 py-0.5 text-[9px] font-semibold rounded bg-yellow-100 text-yellow-700 align-middle">~ tentativa</span>
          )}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-900">{formatCOP(r.total_amount)}</span>
        <span className={Number(r.remaining_balance) > 0 ? 'text-red-500' : 'text-green-600'}>
          saldo {formatCOP(r.remaining_balance)}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  reservations,
  onNavigate,
}: {
  status: ReservationStatus;
  reservations: ReservationListItem[];
  onNavigate: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-2xl border transition-colors ${
        isOver ? 'border-brand-300 bg-brand-50/50' : 'border-gray-100 bg-gray-50/50'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{RESERVATION_STATUS_LABEL[status]}</h3>
        <span className="text-xs font-semibold text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-100">
          {reservations.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ minHeight: '120px', maxHeight: 'calc(100vh - 340px)' }}>
        {reservations.length === 0 ? (
          <p className="text-xs text-gray-300 text-center py-6">Sin reservas</p>
        ) : (
          reservations.map(r => (
            <KanbanCard key={r.id} r={r} onNavigate={() => onNavigate(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

export default function ReservationKanban({
  reservations,
  onStatusChange,
}: {
  reservations: ReservationListItem[];
  onStatusChange: (id: number, status: ReservationStatus) => void;
}) {
  const navigate = useNavigate();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStatus = (status: ReservationStatus) =>
    reservations.filter(r => r.status === status);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as ReservationStatus;
    const reservationId = active.id as number;
    const current = reservations.find(r => r.id === reservationId);
    if (!current || current.status === newStatus) return;
    onStatusChange(reservationId, newStatus);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_FLOW.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            reservations={byStatus(status)}
            onNavigate={(id) => navigate(`/reservas/${id}`)}
          />
        ))}
      </div>
    </DndContext>
  );
}
