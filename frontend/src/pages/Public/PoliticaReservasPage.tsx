import { Helmet } from "react-helmet-async";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";

export default function PoliticaReservasPage() {
  const { t } = useLang();
  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t("politicaReservas.helmetTitle")}</title>
        <meta name="description" content={t("politicaReservas.helmetDescription")} />
      </Helmet>
      <HreflangTags path="/politica-de-reservas" />
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-5 text-sm text-gray-700 leading-relaxed">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("politicaReservas.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("politicaReservas.brand")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("politicaReservas.versionLabel")} {t("politicaReservas.versionDate")}</p>
        </div>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("politicaReservas.s1Title")}</h2>
          <p>{t("politicaReservas.s1Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("politicaReservas.s2Title")}</h2>
          <p>{t("politicaReservas.s2Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("politicaReservas.s3Title")}</h2>
          <p>{t("politicaReservas.s3Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("politicaReservas.s4Title")}</h2>
          <p>{t("politicaReservas.s4Body")}</p>
        </section>
      </div>
    </div>
  );
}
