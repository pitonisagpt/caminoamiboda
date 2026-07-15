import { Helmet } from "react-helmet-async";

const POLICY_VERSION = "14 de julio de 2026";

export default function PoliticaDatosPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>Política de Tratamiento de Datos | Camino a mi Boda</title>
        <meta name="description" content="Política de tratamiento de información y protección de datos personales de Camino a mi Boda, conforme a la Ley 1581 de 2012 de Colombia." />
      </Helmet>
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-5 text-sm text-gray-700 leading-relaxed">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Política de Tratamiento de Información y Protección de Datos Personales
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">"Camino a mi Boda"</p>
            <p className="text-xs text-gray-400 mt-1">Versión vigente desde: {POLICY_VERSION}</p>
          </div>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">1. Responsable del Tratamiento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="font-medium text-gray-900">Razón Social / Nombre:</strong> Juan Camilo Yepes Correa (operando bajo la marca comercial "Camino a mi Boda")</li>
              <li><strong className="font-medium text-gray-900">Identificación (C.C.):</strong> 1.040.735.268</li>
              <li><strong className="font-medium text-gray-900">Ciudad:</strong> Medellín, Antioquia, Colombia</li>
              <li><strong className="font-medium text-gray-900">Correo Electrónico:</strong> caminoatuboda@gmail.com</li>
              <li><strong className="font-medium text-gray-900">Teléfono / WhatsApp:</strong> +57 314 737 20 30</li>
              <li><strong className="font-medium text-gray-900">Instagram:</strong> @caminoamiboda</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">2. Marco Legal y Ámbito de Aplicación</h2>
            <p>
              La presente política se rige por los preceptos consagrados en el artículo 15 de la
              Constitución Política de Colombia, la Ley Estatutaria 1581 de 2012, el Decreto Reglamentario
              1377 de 2013 (compilado en el Decreto Único Reglamentario 1074 de 2015) y la Ley 1266 de 2008
              en lo que fuere aplicable. Aplica a todas las bases de datos y archivos que contengan datos
              personales y que sean objeto de tratamiento por parte de Camino a mi Boda.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">3. Principios Rectores</h2>
            <p>
              En el desarrollo, interpretación y aplicación de la presente política, se aplicarán de
              manera armónica e integral los principios de: legalidad, finalidad, libertad, veracidad o
              calidad, transparencia, acceso y circulación restringida, seguridad y confidencialidad.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">4. Finalidades del Tratamiento</h2>
            <p>
              Los datos personales suministrados por los titulares (clientes, prospectos y aliados) serán
              recolectados, almacenados, usados y circulados con las siguientes finalidades:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong className="font-medium text-gray-900">Gestión Comercial y Operativa:</strong> Contactar al titular vía WhatsApp, llamada telefónica o correo electrónico para enviar cotizaciones, brindar información detallada y coordinar la logística de la prestación de servicios de transporte para bodas y eventos.</li>
              <li><strong className="font-medium text-gray-900">Atención al Cliente:</strong> Dar seguimiento comercial a las solicitudes, peticiones, quejas o reclamos (PQRS).</li>
              <li><strong className="font-medium text-gray-900">Fidelización y Publicidad:</strong> Enviar información sobre promociones, nuevos servicios o alianzas comerciales relacionadas con "Camino a mi Boda" (previo consentimiento).</li>
              <li><strong className="font-medium text-gray-900">Gestión Administrativa y Contable:</strong> Facturación, gestión de pagos y mantenimiento del histórico de relaciones comerciales.</li>
              <li><strong className="font-medium text-gray-900">Auditoría y Seguridad:</strong> Registro de la fecha, hora y dirección IP desde la cual se diligencian los formularios digitales, con el fin exclusivo de mantener la prueba de la autorización otorgada (auditoría del consentimiento).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">5. Datos Recolectados</h2>
            <p>
              Para cumplir con las finalidades descritas, se recolectan los siguientes datos públicos,
              semiprivados o privados: nombre de contacto, número de teléfono/WhatsApp, correo electrónico,
              fecha y ubicación del evento, nombres de los novios o contratantes, canal por el cual conoció
              el servicio, y cualquier información adicional que el titular decida suministrar libremente
              en los espacios de texto abierto.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">6. Tratamiento de Datos Sensibles y Menores de Edad</h2>
            <p>
              <strong className="font-medium text-gray-900">Datos Sensibles:</strong> Camino a mi Boda no
              recolecta ni trata datos sensibles (aquellos que afectan la intimidad del titular o cuyo uso
              indebido puede generar discriminación). En caso de llegar a requerirse, se informará al
              titular que no está obligado a otorgar dicha autorización.
            </p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">Menores de Edad:</strong> Nuestros servicios y
              formularios están dirigidos exclusivamente a personas mayores de 18 años. Se prohíbe el
              suministro de datos de menores de edad sin la representación y autorización expresa de sus
              padres o representantes legales, garantizando siempre el respeto al interés superior del
              menor.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">7. Derechos de los Titulares (Derechos ARCO)</h2>
            <p>
              De conformidad con el artículo 8 de la Ley 1581 de 2012, el Titular de los datos personales
              tiene los siguientes derechos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Conocer, actualizar y rectificar sus datos personales frente a Camino a mi Boda. Este derecho se podrá ejercer, entre otros, frente a datos parciales, inexactos, incompletos, fraccionados, que induzcan a error, o aquellos cuyo tratamiento esté expresamente prohibido o no haya sido autorizado.</li>
              <li>Solicitar prueba de la autorización otorgada al Responsable, salvo las excepciones previstas en la ley.</li>
              <li>Ser informado previa solicitud, respecto del uso que se le ha dado a sus datos personales.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normatividad vigente, una vez haya agotado el trámite de consulta o reclamo ante el Responsable.</li>
              <li>Revocar la autorización y/o solicitar la supresión del dato cuando en el Tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.</li>
              <li>Acceder en forma gratuita a sus datos personales que hayan sido objeto de Tratamiento.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">8. Procedimiento para el Ejercicio de Derechos (Consultas y Reclamos)</h2>
            <p>
              El Titular o sus causahabientes podrán ejercer sus derechos enviando una solicitud formal al
              correo electrónico caminoatuboda@gmail.com o vía WhatsApp al +57 314 737 20 30, adjuntando
              copia de su documento de identidad.
            </p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">Consultas:</strong> Serán atendidas en un
              término máximo de diez (10) días hábiles contados a partir de la fecha de recibo. Si no
              fuere posible atenderla en dicho término, se informará al interesado los motivos de la
              demora y la fecha en que se atenderá, la cual no superará los cinco (5) días hábiles
              siguientes al vencimiento del primer término.
            </p>
            <p className="mt-2">
              <strong className="font-medium text-gray-900">Reclamos (Actualización, Corrección, Supresión
              o Revocatoria):</strong> El reclamo deberá contener la descripción de los hechos, la
              dirección y los documentos adjuntos. Si está incompleto, se requerirá al titular dentro de
              los cinco (5) días siguientes para que subsane. Si transcurren dos (2) meses sin respuesta,
              se entenderá desistido. Una vez recibido el reclamo completo, se incluirá en la base de datos
              una leyenda que diga "reclamo en trámite" en un término no mayor a dos (2) días hábiles. El
              término máximo para atender el reclamo será de quince (15) días hábiles. Si no es posible, se
              informará la fecha de respuesta, que no superará ocho (8) días hábiles adicionales.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">9. Medidas de Seguridad</h2>
            <p>
              En estricta aplicación del Principio de Seguridad, Camino a mi Boda adoptará las medidas
              técnicas, humanas y administrativas necesarias para salvaguardar la información en sus bases
              de datos privadas de uso interno, evitando su adulteración, pérdida, consulta, uso o acceso
              no autorizado o fraudulento. Los datos no se venden, alquilan, ni ceden a terceros con fines
              comerciales ajenos a la operación del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-1">10. Vigencia de la Política y las Bases de Datos</h2>
            <p>
              La presente Política de Tratamiento de Datos Personales entra en vigencia a partir del 14 de
              julio de 2026. Las bases de datos tendrán una vigencia igual al tiempo en que se mantenga y
              utilice la información para las finalidades descritas, o hasta que el titular solicite su
              supresión (siempre que no exista un deber legal o contractual de retener la información).
            </p>
          </section>
      </div>
    </div>
  );
}
