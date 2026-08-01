import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { publicLeadsApi } from "../../api/publicLeads";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { setUnlock } from "../../utils/priceUnlock";

const WA_NUMBER = "573147372030";

function firstValidationMessage(err: unknown): string | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
    return detail[0].msg.replace(/^Value error, /, "");
  }
  return null;
}

export function RevealPricesModal({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: (weddingDate: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Debes aceptar la política de tratamiento de datos para continuar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicLeadsApi.create({
        main_contact_name: name,
        phone,
        wedding_date: weddingDate,
        found_via: "Catálogo (reveló precios)",
        consent_accepted: consent,
        elapsed_ms: Date.now() - mountedAt.current,
        hp_website: honeypot || undefined,
      });
      setUnlock(weddingDate);
      onUnlocked(weddingDate);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Demasiados intentos. Espera un minuto e intenta de nuevo.");
      } else if (status === 422) {
        setError(firstValidationMessage(err) ?? "Revisa los datos e intenta de nuevo.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo o escríbenos por WhatsApp.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cuéntanos tu fecha</h2>
            <p className="text-sm text-gray-500 mt-1">
              Déjanos tus datos y desbloquea el precio de cada carro de la flota, calculado según tu fecha.
            </p>
          </div>

          <Input
            label="Nombre"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="¿Cómo te llamas?"
          />
          <Input
            label="Teléfono / WhatsApp"
            type="tel"
            required
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="300 000 0000"
          />
          <Input
            label="Fecha de la boda"
            type="date"
            required
            value={weddingDate}
            onChange={e => setWeddingDate(e.target.value)}
          />

          {/* Honeypot — hidden from real users, off-screen (not display:none) */}
          <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
            <label htmlFor="hp_website_reveal">Sitio web</label>
            <input
              id="hp_website_reveal"
              name="hp_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
            />
            <span>
              Acepto la{" "}
              <Link to="/politica-de-datos" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                política de tratamiento de datos personales
              </Link>.
            </span>
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
              {error.startsWith("Ocurrió un error") && (
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 font-medium text-green-600 hover:underline"
                >
                  Escríbenos por WhatsApp →
                </a>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
            Ver precios
          </Button>
        </form>
      </div>
    </div>
  );
}
