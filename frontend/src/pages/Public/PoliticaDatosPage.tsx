import { Helmet } from "react-helmet-async";
import { useLang } from "../../i18n/LanguageContext";
import { HreflangTags } from "../../i18n/HreflangTags";

export default function PoliticaDatosPage() {
  const { t } = useLang();
  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t("politicaDatos.helmetTitle")}</title>
        <meta name="description" content={t("politicaDatos.helmetDescription")} />
      </Helmet>
      <HreflangTags path="/politica-de-datos" />
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-5 text-sm text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t("politicaDatos.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("politicaDatos.brand")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("politicaDatos.versionLabel")} {t("politicaDatos.versionDate")}</p>
          </div>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s1Title")}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1Name")}</strong> {t("politicaDatos.s1NameValue")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1Id")}</strong> 1.040.735.268</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1City")}</strong> {t("politicaDatos.s1CityValue")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1Email")}</strong> caminoatuboda@gmail.com</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1Phone")}</strong> +57 314 737 20 30</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s1Instagram")}</strong> @caminoamiboda</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s2Title")}</h2>
            <p>{t("politicaDatos.s2Body")}</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s3Title")}</h2>
            <p>{t("politicaDatos.s3Body")}</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s4Title")}</h2>
            <p>{t("politicaDatos.s4Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s4Item1Label")}</strong> {t("politicaDatos.s4Item1Body")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s4Item2Label")}</strong> {t("politicaDatos.s4Item2Body")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s4Item3Label")}</strong> {t("politicaDatos.s4Item3Body")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s4Item4Label")}</strong> {t("politicaDatos.s4Item4Body")}</li>
              <li><strong className="font-medium text-gray-900">{t("politicaDatos.s4Item5Label")}</strong> {t("politicaDatos.s4Item5Body")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s5Title")}</h2>
            <p>{t("politicaDatos.s5Body")}</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s6Title")}</h2>
            <p>
              <strong className="font-medium text-gray-900">{t("politicaDatos.s6SensitiveLabel")}</strong> {t("politicaDatos.s6SensitiveBody")}
            </p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">{t("politicaDatos.s6MinorsLabel")}</strong> {t("politicaDatos.s6MinorsBody")}
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s7Title")}</h2>
            <p>{t("politicaDatos.s7Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>{t("politicaDatos.s7Item1")}</li>
              <li>{t("politicaDatos.s7Item2")}</li>
              <li>{t("politicaDatos.s7Item3")}</li>
              <li>{t("politicaDatos.s7Item4")}</li>
              <li>{t("politicaDatos.s7Item5")}</li>
              <li>{t("politicaDatos.s7Item6")}</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s8Title")}</h2>
            <p>{t("politicaDatos.s8Body1")}</p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">{t("politicaDatos.s8ConsultasLabel")}</strong> {t("politicaDatos.s8ConsultasBody")}
            </p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">{t("politicaDatos.s8ReclamosLabel")}</strong> {t("politicaDatos.s8ReclamosBody")}
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s9Title")}</h2>
            <p>{t("politicaDatos.s9Body")}</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">{t("politicaDatos.s10Title")}</h2>
            <p>{t("politicaDatos.s10Body")}</p>
          </section>
      </div>
    </div>
  );
}
