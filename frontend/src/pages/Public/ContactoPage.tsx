import { useRef, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { publicLeadsApi } from "../../api/publicLeads";
import { Input } from "../../components/ui/Input";
import { TextArea } from "../../components/ui/TextArea";
import { Button } from "../../components/ui/Button";

const WA_NUMBER = "573147372030";

const FOUND_VIA_OPTIONS = [
  "Instagram", "Recomendación de amigo/familiar", "Google", "Facebook", "TikTok", "Otro",
];

interface FormState {
  main_contact_name: string;
  phone: string;
  email: string;
  wedding_date: string;
  bride_name: string;
  groom_name: string;
  found_via: string;
  message: string;
  consent_accepted: boolean;
}

const EMPTY_FORM: FormState = {
  main_contact_name: "", phone: "", email: "", wedding_date: "",
  bride_name: "", groom_name: "", found_via: "", message: "", consent_accepted: false,
};

function firstValidationMessage(err: unknown): string | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
    return detail[0].msg.replace(/^Value error, /, "");
  }
  return null;
}

export default function ContactoPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Hola! Soy ${form.main_contact_name || ""}, acabo de llenar el formulario de contacto en la pagina. Mi fecha es ${form.wedding_date || "por confirmar"}.`
  )}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.consent_accepted) {
      setError("Debes aceptar la política de tratamiento de datos para continuar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicLeadsApi.create({
        main_contact_name: form.main_contact_name,
        phone: form.phone,
        email: form.email || undefined,
        wedding_date: form.wedding_date || undefined,
        bride_name: form.bride_name || undefined,
        groom_name: form.groom_name || undefined,
        found_via: form.found_via || undefined,
        message: form.message || undefined,
        consent_accepted: form.consent_accepted,
        elapsed_ms: Date.now() - mountedAt.current,
        hp_website: honeypot || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Demasiados intentos. Espera un minuto e intenta de nuevo.");
      } else if (status === 422) {
        setError(firstValidationMessage(err) ?? "Revisa los datos del formulario e intenta de nuevo.");
      } else {
        setError("Ocurrió un error enviando el formulario. Escríbenos directo por WhatsApp mientras lo resolvemos.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Helmet>
        <title>Contáctanos | Camino a mi Boda</title>
        <meta name="description" content="Cuéntanos de tu boda o evento y te contactamos con disponibilidad y precios de nuestros vehículos clásicos y modernos en Medellín." />
        <meta property="og:title" content="Contáctanos | Camino a mi Boda" />
        <meta property="og:type" content="website" />
      </Helmet>
      {submitted ? (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 text-center space-y-4">
            <Heart className="w-10 h-10 text-brand-400 mx-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">¡Gracias por escribirnos!</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ya recibimos tus datos. Te contactaremos pronto — o si prefieres, escríbenos ya mismo por WhatsApp.
              </p>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <MessageCircle size={18} />
              Chatea con nosotros ahora
            </a>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">Cuéntanos de tu evento</h1>
              <p className="text-sm text-gray-500 mt-1">
                Déjanos tus datos y te contactamos con disponibilidad y precios.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <Input
                label="Nombre de contacto"
                required
                value={form.main_contact_name}
                onChange={e => set("main_contact_name", e.target.value)}
                placeholder="¿Cómo te llamas?"
              />
              <Input
                label="Teléfono / WhatsApp"
                type="tel"
                required
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="300 000 0000"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="tu@correo.com"
              />
              <Input
                label="Fecha del evento"
                type="date"
                value={form.wedding_date}
                onChange={e => set("wedding_date", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Novia"
                  value={form.bride_name}
                  onChange={e => set("bride_name", e.target.value)}
                  placeholder="Opcional"
                />
                <Input
                  label="Novio"
                  value={form.groom_name}
                  onChange={e => set("groom_name", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="found_via" className="text-sm font-medium text-gray-700">¿Cómo nos encontraste?</label>
                <select
                  id="found_via"
                  value={form.found_via}
                  onChange={e => set("found_via", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">Seleccionar...</option>
                  {FOUND_VIA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <TextArea
                label="Mensaje"
                value={form.message}
                onChange={e => set("message", e.target.value)}
                placeholder="Cuéntanos qué tienes en mente (opcional)"
              />

              {/* Honeypot — hidden from real users, off-screen (not display:none) */}
              <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                <label htmlFor="hp_website">Sitio web</label>
                <input
                  id="hp_website"
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
                  checked={form.consent_accepted}
                  onChange={e => set("consent_accepted", e.target.checked)}
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
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 font-medium text-green-600 hover:underline">
                      Escríbenos por WhatsApp →
                    </a>
                  )}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
                Enviar
              </Button>
            </form>
          </>
        )}
    </div>
  );
}
