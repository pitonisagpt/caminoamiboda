import { useState } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { aiAssistantApi } from "../../api/aiAssistant";

const REASON_LABEL: Record<string, string> = {
  auth_error: "la API key de Anthropic no es válida o falta",
  billing_error: "la cuenta de Anthropic no tiene crédito suficiente",
  repeated_errors: "hubo varios errores seguidos al llamar a la API",
};

interface Props {
  disabledReason: string | null;
  onDismiss: () => void;
  onReenabled: () => void;
}

export function AiAssistantStatusBanner({ disabledReason, onDismiss, onReenabled }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const canRetry = disabledReason !== "daily_budget_exceeded";
  const reasonText = disabledReason ? REASON_LABEL[disabledReason] ?? "hubo un problema" : "hubo un problema";

  const handleRetry = async () => {
    setRetrying(true);
    setResult(null);
    try {
      const res = await aiAssistantApi.reenable();
      if (res.data.success) {
        setResult("¡Listo! El asistente está funcionando de nuevo.");
        onReenabled();
      } else {
        setResult(res.data.detail ?? "Sigue sin funcionar, revisa la configuración.");
      }
    } catch {
      setResult("No se pudo verificar. Intenta de nuevo en un momento.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6">
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p>
          El asistente virtual (IA) no está disponible en este momento — {reasonText}.
          {disabledReason === "daily_budget_exceeded"
            ? " Se reactiva automáticamente a medianoche."
            : " Revisa la configuración y compra créditos si hace falta, luego reintenta."}
        </p>
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:underline cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
            Reintentar
          </button>
        )}
        {result && <p className="mt-1.5 text-xs">{result}</p>}
      </div>
      <button onClick={onDismiss} aria-label="Cerrar aviso" className="p-1 text-amber-600 hover:text-amber-900 cursor-pointer shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
