import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { publicLeadsApi } from "../../api/publicLeads";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const WA_NUMBER = "573147372030";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function AiLeadCaptureCard({ onClose, onSaved }: Props) {
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
        wedding_date: weddingDate || undefined,
        found_via: "Asistente virtual (chat)",
        consent_accepted: consent,
        elapsed_ms: Date.now() - mountedAt.current,
        hp_website: honeypot || undefined,
      });
      onSaved();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Demasiados intentos. Espera un minuto e intenta de nuevo.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo o escríbenos por WhatsApp.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-brand-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm">Déjanos tus datos</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Así un asesor te escribe por WhatsApp para confirmar disponibilidad y coordinar los detalles.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Nombre" required value={name} onChange={e => setName(e.target.value)} placeholder="¿Cómo te llamas?" />
        <Input label="WhatsApp" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="300 000 0000" />
        <Input label="Fecha de la boda (opcional)" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />

        {/* Honeypot — hidden from real users, off-screen (not display:none) */}
        <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
          <label htmlFor="hp_website_chat">Sitio web</label>
          <input
            id="hp_website_chat"
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
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
            {error.startsWith("Ocurrió un error") && (
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="block mt-1 font-medium text-green-600 hover:underline">
                Escríbenos por WhatsApp →
              </a>
            )}
          </div>
        )}

        <Button type="submit" size="sm" className="w-full" disabled={submitting} loading={submitting}>
          Enviar mis datos
        </Button>
      </form>
    </div>
  );
}
