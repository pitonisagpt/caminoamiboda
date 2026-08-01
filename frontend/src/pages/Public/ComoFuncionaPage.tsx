import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Search, MessageCircle, CalendarCheck, FileSignature, Sparkles, CheckCircle2, XCircle } from "lucide-react";

const WHATSAPP_NUMBER = "573147372030";

const STEPS = [
  {
    icon: Search,
    title: "Explora el catálogo",
    body: "Mira la flota completa — clásicos, vintage y modernos — y encuentra el carro que se sienta como ustedes.",
    cta: { label: "Ver catálogo", to: "/catalogo" },
  },
  {
    icon: MessageCircle,
    title: "Cuéntanos tu fecha y cotiza",
    body: "Escríbenos por WhatsApp con la fecha de tu boda y el carro que te gustó. Te confirmamos disponibilidad y el valor exacto para tu evento.",
  },
  {
    icon: CalendarCheck,
    title: "Aparta tu fecha con un anticipo",
    body: "Con un anticipo, tu fecha queda bloqueada en nuestra agenda — nadie más puede reservar ese carro ese día.",
  },
  {
    icon: FileSignature,
    title: "Firmamos y coordinamos todo",
    body: "Firmamos el contrato y armamos el minuto a minuto: horarios, lugares, y cualquier detalle especial que quieras.",
  },
  {
    icon: Sparkles,
    title: "El gran día",
    body: "El carro llega listo y puntual, con el conductor asignado — ustedes solo se encargan de disfrutar.",
  },
];

const INCLUDES = [
  "4 horas de servicio con conductor",
  "El vehículo listo y en perfecto estado el día del evento",
  "Coordinación por minuto a minuto de recogida, ceremonia y recepción",
];

const NOT_INCLUDES = [
  "Arreglo floral para el vehículo (te ponemos en contacto con nuestros aliados floristas)",
];

const FAQS = [
  {
    q: "¿Con cuánta anticipación debo reservar?",
    a: "Entre más pronto mejor — los carros más pedidos (y las fechas de temporada alta) se apartan con meses de anticipación. Pero escríbenos igual si tu boda es pronto: si el carro que quieres está libre, lo apartamos.",
  },
  {
    q: "¿Qué pasa si llueve el día del evento?",
    a: "Nuestros carros están preparados para eso — no dejamos que el clima arruine las fotos ni el recorrido.",
  },
  {
    q: "¿Qué pasa si el carro se avería?",
    a: "Es muy improbable, pero si pasara te ofrecemos dos opciones: lo sustituimos por otro vehículo de características similares, o te devolvemos el valor completo del alquiler.",
  },
  {
    q: "¿Puedo cambiar la fecha de mi boda después de reservar?",
    a: "Sí. Si el cambio es dentro del mismo año, no tiene costo adicional. Si implica mover el evento a otro año, se aplica un incremento del 10% del valor por cada año — el anticipo nunca se pierde, queda como crédito hasta por tres años.",
  },
  {
    q: "¿Qué zonas cubren?",
    a: "Medellín, Llanogrande (Rionegro) y El Carmen de Viboral. Si tu evento es en otra zona del oriente antioqueño, escríbenos y lo revisamos.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Helmet>
        <title>¿Cómo funciona? | Camino a mi Boda</title>
        <meta
          name="description"
          content="Cómo funciona alquilar un carro clásico con conductor para tu boda: desde elegir el vehículo hasta el día del evento."
        />
      </Helmet>

      {/* Hero */}
      <div className="text-center py-4">
        <h1 className="text-4xl sm:text-5xl font-brand text-brand-500 mb-3">¿Cómo funciona?</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
          Alquilar el carro de tus sueños para tu boda es más sencillo de lo que crees. Así es el proceso, de principio a fin.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 sm:p-6 flex gap-4 sm:gap-5 items-start"
            >
              <div className="shrink-0 w-11 h-11 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-0.5">Paso {i + 1}</p>
                <h2 className="text-base font-bold text-gray-900 mb-1">{step.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
                {step.cta && (
                  <Link to={step.cta.to} className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {step.cta.label} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Includes / not includes */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Qué incluye tu reserva</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2.5">
            {INCLUDES.map(item => (
              <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            {NOT_INCLUDES.map(item => (
              <div key={item} className="flex items-start gap-2 text-sm text-gray-500">
                <XCircle size={16} className="text-gray-300 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-5">
          Detalle completo de nuestras políticas en{" "}
          <Link to="/politica-de-reservas" className="text-brand-600 hover:underline font-medium">
            Política de Reservas, Cancelaciones y Cambios
          </Link>
          .
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Preguntas frecuentes</h2>
        <div className="space-y-5">
          {FAQS.map(faq => (
            <div key={faq.q}>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{faq.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">Desde 2017</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">Experiencia</p>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">+380</p>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wide">Bodas y eventos</p>
          </div>
        </div>
        <Link to="/catalogo#opiniones" className="text-sm font-medium text-brand-600 hover:underline">
          Lee lo que dicen nuestras parejas →
        </Link>
      </div>

      {/* Final CTA */}
      <div className="bg-brand-50 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-gray-900">¿Lista para dar el siguiente paso?</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Escríbenos con tu fecha y el carro que te gustó — te respondemos con disponibilidad y precio.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer"
          >
            Escríbenos por WhatsApp
          </a>
          <Link
            to="/catalogo"
            className="w-full sm:w-auto bg-white border border-brand-200 hover:bg-brand-50 text-brand-700 text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
