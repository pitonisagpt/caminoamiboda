import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { publicLeadsApi } from "../../api/publicLeads";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { setUnlock } from "../../utils/priceUnlock";
import { whatsAppLinkProps } from "../../utils/whatsapp";
import { useLang } from "../../i18n/LanguageContext";

const WA_NUMBER = "573147372030";

function firstValidationMessage(err: unknown): string | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === "string") {
    return detail[0].msg.replace(/^Value error, /, "");
  }
  return null;
}

interface Props {
  onClose: () => void;
  onUnlocked: (weddingDate: string) => void;
  initial?: { name: string; phone: string; weddingDate: string };
}

export function RevealPricesModal({ onClose, onUnlocked, initial }: Props) {
  const { t } = useLang();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [weddingDate, setWeddingDate] = useState(initial?.weddingDate ?? "");
  // Editing (initial set) means they already accepted the policy moments ago
  // in this same browser — re-showing the checkbox pre-checked avoids
  // friction for a simple date correction, but they can still uncheck it.
  const [consent, setConsent] = useState(Boolean(initial));
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsappFallback, setShowWhatsappFallback] = useState(false);
  const mountedAt = useRef(Date.now());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError(t("contacto.errorConsent"));
      setShowWhatsappFallback(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    setShowWhatsappFallback(false);
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
      setUnlock(weddingDate, name, phone);
      onUnlocked(weddingDate);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError(t("contacto.errorRateLimit"));
      } else if (status === 422) {
        setError(firstValidationMessage(err) ?? t("leadCapture.errorValidation"));
      } else {
        setError(t("leadCapture.errorGeneric"));
        setShowWhatsappFallback(true);
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
            <h2 className="text-lg font-bold text-gray-900">{initial ? t("revealPrices.titleEdit") : t("revealPrices.titleNew")}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {initial ? t("revealPrices.subtitleEdit") : t("revealPrices.subtitleNew")}
            </p>
          </div>

          <Input
            label={t("leadCapture.nameLabel")}
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("contacto.placeholderName")}
          />
          <Input
            label={t("leadCapture.whatsappLabel")}
            type="tel"
            required
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t("contacto.placeholderPhone")}
          />
          <Input
            label={t("leadCapture.dateLabel")}
            type="date"
            required
            value={weddingDate}
            onChange={e => setWeddingDate(e.target.value)}
          />

          {/* Honeypot — hidden from real users, off-screen (not display:none) */}
          <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
            <label htmlFor="hp_website_reveal">{t("contacto.honeypotLabel")}</label>
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
              {t("contacto.consentText")}{" "}
              <Link to="/politica-de-datos" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                {t("contacto.consentLinkText")}
              </Link>.
            </span>
          </label>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
              {showWhatsappFallback && (
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  {...whatsAppLinkProps()}
                  className="block mt-1 font-medium text-green-600 hover:underline"
                >
                  {t("contacto.errorWhatsappLink")}
                </a>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
            {initial ? t("revealPrices.submitEdit") : t("revealPrices.submitNew")}
          </Button>
        </form>
      </div>
    </div>
  );
}
