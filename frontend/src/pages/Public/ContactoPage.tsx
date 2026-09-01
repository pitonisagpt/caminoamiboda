import { useRef, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { publicLeadsApi } from "../../api/publicLeads";
import { Input } from "../../components/ui/Input";
import { TextArea } from "../../components/ui/TextArea";
import { Button } from "../../components/ui/Button";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";
import type { TranslationKey } from "../../i18n/es";

const WA_NUMBER = "573147372030";

const FOUND_VIA_KEYS: TranslationKey[] = [
  "contacto.foundViaInstagram",
  "contacto.foundViaReferral",
  "contacto.foundViaGoogle",
  "contacto.foundViaFacebook",
  "contacto.foundViaTiktok",
  "contacto.foundViaOther",
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
  const { t, lang } = useLang();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    t("contacto.waMessage", {
      name: form.main_contact_name || "",
      date: form.wedding_date || t("contacto.waMessageDateFallback"),
    })
  )}`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.consent_accepted) {
      setError(t("contacto.errorConsent"));
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
        setError(t("contacto.errorRateLimit"));
      } else if (status === 422) {
        setError(firstValidationMessage(err) ?? t("contacto.errorValidationFallback"));
      } else {
        setError(t("contacto.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Helmet>
        <title>{t("contacto.helmetTitle")}</title>
        <meta name="description" content={t("contacto.helmetDescription")} />
        <meta property="og:title" content={t("contacto.helmetTitle")} />
        <meta property="og:type" content="website" />
      </Helmet>
      <HreflangTags path="/contacto" />
      {submitted ? (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 text-center space-y-4">
            <Heart className="w-10 h-10 text-brand-400 mx-auto" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t("contacto.successTitle")}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("contacto.successBody")}
              </p>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <MessageCircle size={18} />
              {t("contacto.successWhatsapp")}
            </a>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">{t("contacto.title")}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("contacto.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-4">
              <Input
                label={t("contacto.labelName")}
                required
                value={form.main_contact_name}
                onChange={e => set("main_contact_name", e.target.value)}
                placeholder={t("contacto.placeholderName")}
              />
              <Input
                label={t("contacto.labelPhone")}
                type="tel"
                required
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder={t("contacto.placeholderPhone")}
              />
              <Input
                label={t("contacto.labelEmail")}
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder={t("contacto.placeholderEmail")}
              />
              <Input
                label={t("contacto.labelDate")}
                type="date"
                value={form.wedding_date}
                onChange={e => set("wedding_date", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("contacto.labelBride")}
                  value={form.bride_name}
                  onChange={e => set("bride_name", e.target.value)}
                  placeholder={t("contacto.placeholderOptional")}
                />
                <Input
                  label={t("contacto.labelGroom")}
                  value={form.groom_name}
                  onChange={e => set("groom_name", e.target.value)}
                  placeholder={t("contacto.placeholderOptional")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="found_via" className="text-sm font-medium text-gray-700">{t("contacto.labelFoundVia")}</label>
                <select
                  id="found_via"
                  value={form.found_via}
                  onChange={e => set("found_via", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option value="">{t("contacto.selectPlaceholder")}</option>
                  {FOUND_VIA_KEYS.map(key => <option key={key} value={t(key)}>{t(key)}</option>)}
                </select>
              </div>
              <TextArea
                label={t("contacto.labelMessage")}
                value={form.message}
                onChange={e => set("message", e.target.value)}
                placeholder={t("contacto.placeholderMessage")}
              />

              {/* Honeypot — hidden from real users, off-screen (not display:none) */}
              <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                <label htmlFor="hp_website">{t("contacto.honeypotLabel")}</label>
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
                  {t("contacto.consentText")}{" "}
                  <Link to={lang === "en" ? "/en/politica-de-datos" : "/politica-de-datos"} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    {t("contacto.consentLinkText")}
                  </Link>.
                </span>
              </label>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                  {error === t("contacto.errorGeneric") && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 font-medium text-green-600 hover:underline">
                      {t("contacto.errorWhatsappLink")}
                    </a>
                  )}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting} loading={submitting}>
                {t("contacto.submit")}
              </Button>
            </form>
          </>
        )}
    </div>
  );
}
