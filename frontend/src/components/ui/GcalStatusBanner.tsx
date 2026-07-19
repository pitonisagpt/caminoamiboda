import { AlertTriangle, X } from 'lucide-react';

interface GcalStatusBannerProps {
  onDismiss: () => void;
}

export function GcalStatusBanner({ onDismiss }: GcalStatusBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6">
      <AlertTriangle size={18} className="shrink-0" />
      <p className="flex-1 text-sm">
        Google Calendar no se está sincronizando en este momento — los cambios en reservas y eventos no se están reflejando ahí. Avísale al equipo técnico.
      </p>
      <button
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="p-1 text-amber-600 hover:text-amber-900 cursor-pointer shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
