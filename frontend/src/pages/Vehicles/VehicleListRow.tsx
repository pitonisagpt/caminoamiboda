import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart2, Car, CalendarDays, Edit, GripVertical, Loader2, MessageCircle, PowerOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { EntityLink } from "../../components/EntityLink";
import VehiclePhotoTooltip from "../../components/VehiclePhotoTooltip";
import { ScoreTotalBar } from "../../components/ui/ScoreRating";
import type { VehicleListItem, VehicleStatus } from "../../types/vehicle";
import { formatCOP } from "../../utils/format";

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
};
const STATUS_VARIANT: Record<VehicleStatus, "green" | "gray" | "blue"> = {
  active: "green",
  inactive: "gray",
  pending: "blue",
};

const LOCATION_LABEL: Record<string, string> = {
  medellin: "Medellín",
  rionegro: "Rionegro",
  carmen_de_viboral: "Carmen de Viboral",
};

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

function vehiclePhoto(v: VehicleListItem): string | null {
  if (!v.photos?.length) return null;
  const visible = v.photos.find(p => p.is_visible) ?? v.photos[0];
  return visible?.url ?? null;
}

interface SortableRowProps {
  vehicle: VehicleListItem;
  dragEnabled: boolean;
  navigate: (path: string) => void;
  onWhatsApp: (v: VehicleListItem) => void;
  onDeactivate: (v: VehicleListItem) => void;
  deactivating: number | null;
}

export default function SortableVehicleRow({
  vehicle: v,
  dragEnabled,
  navigate,
  onWhatsApp,
  onDeactivate,
  deactivating,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: v.id,
    disabled: !dragEnabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const photo = vehiclePhoto(v);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => navigate(`/vehiculos/${v.id}`)}
      className="hover:bg-brand-50/40 transition-colors duration-150 cursor-pointer"
    >
      {/* Drag handle */}
      <td className="pl-3 pr-1 py-2 w-8" onClick={(e) => e.stopPropagation()}>
        {dragEnabled ? (
          <button
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors touch-none"
            aria-label="Reordenar"
          >
            <GripVertical size={15} />
          </button>
        ) : (
          <span className="p-1 block text-gray-100">
            <GripVertical size={15} />
          </span>
        )}
      </td>
      {/* Photo */}
      <td className="pl-1 pr-2 py-2">
        <div className="w-20 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
          {photo
            ? (
              <VehiclePhotoTooltip
                photoUrl={photo}
                className="w-full h-full object-cover"
                vehicleName={[v.brand, v.model_line, v.color].filter(Boolean).join(' ')}
                licensePlate={v.license_plate}
                ownerName={v.owner_name}
                ownerPhone={v.owner_contact}
                vehicleId={v.id}
                ownerId={v.owner_id}
              />
            )
            : <Car size={22} className="text-gray-300" />
          }
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-brand-600 font-semibold text-xs tracking-wide">{v.license_plate}</span>
        <p className="text-[11px] text-gray-400 font-mono">{v.sku}</p>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{v.brand}</div>
        {v.model_line && <div className="text-xs text-gray-500">{v.model_line}</div>}
      </td>
      <td className="px-4 py-3 text-gray-600">{v.year ?? "—"}</td>
      <td className="px-4 py-3 text-gray-700">{v.color ?? "—"}</td>
      <td className="px-4 py-3 text-gray-700">{LOCATION_LABEL[v.location] ?? v.location}</td>
      <td className="px-4 py-3 text-gray-700">
        {v.is_company_owned ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
            Camino a mi Boda
          </span>
        ) : (
          <EntityLink to={`/propietarios/editar/${v.owner_id}`} id={v.owner_id} requireAdmin>
            {v.owner_name ?? "—"}
          </EntityLink>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {v.upcoming_events_count > 0 ? (
          <Link
            to={`/reservas?vehicle=${v.id}&status=deposit_received,reserved,confirmed`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors cursor-pointer"
            title="Ver reservas agendadas de este vehículo"
          >
            <CalendarDays size={12} />
            {v.upcoming_events_count}
          </Link>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ScoreTotalBar total={v.score_total} size="sm" />
      </td>
      <td className="px-4 py-3">
        {v.pico_y_placa_day ? (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DAY_COLOR[v.pico_y_placa_day] ?? "bg-gray-100 text-gray-700"}`}>
            {v.pico_y_placa_day}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">N/A</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs whitespace-nowrap">
        <div className="text-gray-700">
          <span className="text-gray-400">MED </span>
          {v.price_medellin != null ? formatCOP(v.price_medellin) : <span className="text-gray-400">No aplica</span>}
        </div>
        <div className="text-gray-700">
          <span className="text-gray-400">LLA </span>
          {v.price_rionegro != null ? formatCOP(v.price_rionegro) : <span className="text-gray-400">No aplica</span>}
        </div>
      </td>
      <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {(v.owner_contact || v.owner_whatsapp_username) && (
            <button
              onClick={() => onWhatsApp(v)}
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
              title="Consultar disponibilidad por WhatsApp"
            >
              <MessageCircle size={15} />
            </button>
          )}
          <button
            onClick={() => navigate(`/vehiculos/${v.id}/estadisticas`)}
            className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
            title="Estadísticas"
          >
            <BarChart2 size={15} />
          </button>
          <button
            onClick={() => navigate(`/vehiculos/editar/${v.id}`)}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
            title="Editar"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => onDeactivate(v)}
            disabled={deactivating === v.id || v.status === "inactive"}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Desactivar"
          >
            {deactivating === v.id ? <Loader2 size={15} className="animate-spin" /> : <PowerOff size={15} />}
          </button>
        </div>
      </td>
    </tr>
  );
}
