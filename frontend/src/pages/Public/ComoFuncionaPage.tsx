import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Search, MessageCircle, CalendarCheck, FileSignature, Sparkles, CheckCircle2, XCircle, Instagram } from "lucide-react";
import { WhatsAppIcon } from "../../components/WhatsAppIcon";
import { useFloristSettings } from "../../hooks/useFloristSettings";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";
import type { TranslationKey } from "../../i18n/es";

const WHATSAPP_NUMBER = "573147372030";

const STEP_ICONS = [Search, MessageCircle, CalendarCheck, FileSignature, Sparkles];

const STEP_KEYS: { titleKey: TranslationKey; bodyKey: TranslationKey; ctaKey?: TranslationKey }[] = [
  { titleKey: "comoFunciona.step1Title", bodyKey: "comoFunciona.step1Body", ctaKey: "comoFunciona.step1Cta" },
  { titleKey: "comoFunciona.step2Title", bodyKey: "comoFunciona.step2Body" },
  { titleKey: "comoFunciona.step3Title", bodyKey: "comoFunciona.step3Body" },
  { titleKey: "comoFunciona.step4Title", bodyKey: "comoFunciona.step4Body" },
  { titleKey: "comoFunciona.step5Title", bodyKey: "comoFunciona.step5Body" },
];

const INCLUDE_KEYS: TranslationKey[] = [
  "comoFunciona.include1",
  "comoFunciona.include2",
  "comoFunciona.include3",
  "comoFunciona.include4",
  "comoFunciona.include5",
];

const FAQ_KEYS: { qKey: TranslationKey; aKey: TranslationKey }[] = [
  { qKey: "comoFunciona.faqQ1", aKey: "comoFunciona.faqA1" },
  { qKey: "comoFunciona.faqQ2", aKey: "comoFunciona.faqA2" },
  { qKey: "comoFunciona.faqQ3", aKey: "comoFunciona.faqA3" },
  { qKey: "comoFunciona.faqQ4", aKey: "comoFunciona.faqA4" },
  { qKey: "comoFunciona.faqQ5", aKey: "comoFunciona.faqA5" },
];

export default function ComoFuncionaPage() {
  const { settings: florist } = useFloristSettings();
  const { t, lang } = useLang();
  const catalogPath = lang === "en" ? "/en/catalogo" : "/catalogo";
  const reservationPolicyPath = lang === "en" ? "/en/politica-de-reservas" : "/politica-de-reservas";

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Helmet>
        <title>{t("comoFunciona.helmetTitle")}</title>
        <meta name="description" content={t("comoFunciona.helmetDescription")} />
      </Helmet>
      <HreflangTags path="/como-funciona" />

      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="text-4xl sm:text-5xl font-brand text-brand-500 mb-3">{t("comoFunciona.title")}</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
          {t("comoFunciona.subtitle")}
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEP_KEYS.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <div
              key={step.titleKey}
              className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 sm:p-6 flex gap-4 sm:gap-5 items-start"
            >
              <div className="shrink-0 w-11 h-11 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-0.5">{t("comoFunciona.step")} {i + 1}</p>
                <h2 className="text-base font-bold text-gray-900 mb-1">{t(step.titleKey)}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{t(step.bodyKey)}</p>
                {step.ctaKey && (
                  <Link to={catalogPath} className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {t(step.ctaKey)} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Includes / not includes */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t("comoFunciona.includesTitle")}</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            {INCLUDE_KEYS.map(key => (
              <div key={key} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <XCircle size={16} className="text-gray-300 shrink-0 mt-0.5" />
              <span className="flex items-center flex-wrap gap-x-1.5">
                {t("comoFunciona.floristIntro")}{florist ? `, ${florist.vendor_name}` : ''} {t("comoFunciona.floristOutro")}
                {florist && (
                  <>
                    :
                    <a
                      href={florist.whatsapp_url}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:underline font-medium"
                    >
                      <WhatsAppIcon className="w-3 h-3" /> WhatsApp
                    </a>
                    ·
                    <a
                      href={florist.instagram_url}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:underline font-medium"
                    >
                      <Instagram size={12} /> Instagram
                    </a>
                  </>
                )}
                )
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-5">
          {t("comoFunciona.policyIntro")}{" "}
          <Link to={reservationPolicyPath} className="text-brand-600 hover:underline font-medium">
            {t("comoFunciona.policyLinkText")}
          </Link>
          .
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t("comoFunciona.faqTitle")}</h2>
        <div className="space-y-5">
          {FAQ_KEYS.map(faq => (
            <div key={faq.qKey}>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{t(faq.qKey)}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t(faq.aKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">{t("comoFunciona.trustExperienceYears")}</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">{t("comoFunciona.trustExperienceLabel")}</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">{t("comoFunciona.trustEventsCount")}</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">{t("comoFunciona.trustEventsLabel")}</p>
          </div>
        </div>
        <Link to={`${catalogPath}#opiniones`} className="text-sm font-medium text-brand-600 hover:underline">
          {t("comoFunciona.trustReviewsLink")}
        </Link>
      </div>

      {/* Final CTA */}
      <div className="bg-brand-50 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-gray-900">{t("comoFunciona.finalCtaTitle")}</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          {t("comoFunciona.finalCtaBody")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            {t("comoFunciona.finalCtaWhatsapp")}
          </a>
          <Link
            to={catalogPath}
            className="w-full sm:w-auto bg-white border border-brand-200 hover:bg-brand-50 text-brand-700 text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {t("comoFunciona.finalCtaCatalog")}
          </Link>
        </div>
      </div>
    </div>
  );
}
