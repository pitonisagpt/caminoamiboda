import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { whatsAppLinkProps } from "../utils/whatsapp";
import type { VehicleLocation } from "../types/vehicle";

const LOCATION_LABEL: Record<VehicleLocation, string> = {
  medellin: "Medellín",
  rionegro: "Rionegro/Llanogrande",
  carmen_de_viboral: "Carmen de Viboral",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateES(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// Some owner phone numbers came in via an old spreadsheet import that
// coerced them to floats (e.g. "3001234567.0") — strip that artifact and
// enforce the Colombia country code, same normalization VehicleList.tsx
// already relied on before this modal was extracted from it.
function toWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\.0*$/, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  const normalized = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

interface Props {
  vehicleLabel: string;
  licensePlate: string | null;
  color?: string | null;
  location?: VehicleLocation | null;
  ownerContact: string | null;
  ownerWhatsappUsername: string | null;
  initialDate?: string;
  onClose: () => void;
}

// Shared "check availability with the owner" popover — used from the
// vehicle inventory (VehicleList.tsx) and from a reservation's Info tab
// (InfoTab.tsx), so ops can ping the owner from wherever they're already
// looking, not just the inventory list (wishlist fila 2).
export function VehicleAvailabilityWhatsAppModal({
  vehicleLabel,
  licensePlate,
  color,
  location,
  ownerContact,
  ownerWhatsappUsername,
  initialDate,
  onClose,
}: Props) {
  const [date, setDate] = useState(initialDate || todayISO());
  const locationLabel = location ? LOCATION_LABEL[location] : null;

  const message = `Hola! Te escribo de Camino a mi Boda. ¿Está disponible el ${color ? `${color} ` : ""}${vehicleLabel}${licensePlate ? ` (${licensePlate})` : ""}${locationLabel ? ` en ${locationLabel}` : ""} para el ${formatDateES(date)}?`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{vehicleLabel}</p>
            {licensePlate && <p className="text-xs text-gray-400 font-mono">{licensePlate}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-brand-800">Fecha del evento</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer"
          />
          {date && (
            <p className="text-xs text-gray-400 capitalize">{formatDateES(date)}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed">
          <span className="font-medium text-gray-700">Mensaje:</span><br />
          {message}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          {ownerContact ? (
            <a
              href={toWhatsAppUrl(ownerContact, message)}
              {...whatsAppLinkProps()}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Abrir WhatsApp
            </a>
          ) : ownerWhatsappUsername ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
              Sin teléfono — @{ownerWhatsappUsername}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
