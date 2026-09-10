import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";
import { toLangPath } from "../../i18n/langPath";

export default function CondicionesServicioPage() {
  const { t, lang } = useLang();
  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t("condicionesServicio.helmetTitle")}</title>
        <meta name="description" content={t("condicionesServicio.helmetDescription")} />
      </Helmet>
      <HreflangTags path="/condiciones-de-servicio" />
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-5 text-sm text-gray-700 leading-relaxed">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("condicionesServicio.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("condicionesServicio.brand")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("condicionesServicio.versionLabel")} {t("condicionesServicio.versionDate")}</p>
        </div>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s1Title")}</h2>
          <p>{t("condicionesServicio.s1Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s2Title")}</h2>
          <p>{t("condicionesServicio.s2Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s3Title")}</h2>
          <p>{t("condicionesServicio.s3Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s4Title")}</h2>
          <p>
            {t("condicionesServicio.s4Body")}{" "}
            <Link to={toLangPath("/politica-de-reservas", lang)} className="text-brand-600 hover:underline">
              {t("condicionesServicio.s4Link")}
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s5Title")}</h2>
          <p>{t("condicionesServicio.s5Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s6Title")}</h2>
          <p>{t("condicionesServicio.s6Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s7Title")}</h2>
          <p>{t("condicionesServicio.s7Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s8Title")}</h2>
          <p>{t("condicionesServicio.s8Body")}</p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">{t("condicionesServicio.s9Title")}</h2>
          <p>
            {t("condicionesServicio.s9Body")}{" "}
            <a href="mailto:caminoatuboda@gmail.com" className="text-brand-600 hover:underline">caminoatuboda@gmail.com</a>
            {" "}{t("condicionesServicio.s9Or")} +57 314 737 20 30.
          </p>
        </section>
      </div>
    </div>
  );
}
