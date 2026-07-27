import { Helmet } from "react-helmet-async";

const POLICY_VERSION = "26 de julio de 2026";

export default function PoliticaReservasPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>Política de Reservas, Cancelaciones y Cambios | Camino a mi Boda</title>
        <meta name="description" content="Duración del servicio, política de cancelación y reprogramación, y qué pasa en caso de avería del vehículo en Camino a mi Boda." />
      </Helmet>
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8 space-y-5 text-sm text-gray-700 leading-relaxed">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Política de Reservas, Cancelaciones y Cambios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">"Camino a mi Boda"</p>
          <p className="text-xs text-gray-400 mt-1">Versión vigente desde: {POLICY_VERSION}</p>
        </div>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">1. Duración del servicio</h2>
          <p>
            Nuestro paquete estándar incluye 4 horas de alquiler del vehículo con conductor. Si tu
            evento necesita más tiempo, con gusto cotizamos las horas adicionales según el vehículo
            y la fecha.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">2. Cancelación y reprogramación</h2>
          <p>
            En caso de realizar cambios o cancelaciones, el anticipo se guarda como crédito hasta un
            máximo de tres años después de la fecha pactada, para hacer efectiva la reserva en otra
            fecha — en ningún caso se devuelve el dinero. Los movimientos de fecha dentro del mismo
            año calendario no tienen costo adicional; si el cambio implica mover el evento a otro
            año, se aplica un incremento del 10% del valor total del servicio por cada año.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">3. Avería o falla mecánica del vehículo</h2>
          <p>
            En el improbable caso de que el vehículo reservado experimente una avería o falla
            mecánica que impida su uso el día del evento, te ofrecemos dos opciones: sustituirlo por
            otro vehículo de características similares, o devolver el monto total del alquiler de
            manera íntegra.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-1">4. Qué no incluye</h2>
          <p>
            El arreglo floral para el vehículo no está incluido — si lo necesitas, con gusto te
            ponemos en contacto con nuestros aliados floristas.
          </p>
        </section>
      </div>
    </div>
  );
}
