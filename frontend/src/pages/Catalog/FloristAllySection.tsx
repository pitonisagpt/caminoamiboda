import { Instagram } from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';

export const FLORIST_WHATSAPP = '573122565079';
export const FLORIST_INSTAGRAM = 'https://www.instagram.com/floristerialluviaderosas';
// Mensaje precargado para que Lluvia de Rosas identifique que el contacto
// viene referido por Camino a mi Boda.
const FLORIST_REFERRAL_MSG = 'Hola! Me recomendó Camino a mi Boda para los ramos de mi boda.';
export const FLORIST_WA_URL = `https://wa.me/${FLORIST_WHATSAPP}?text=${encodeURIComponent(FLORIST_REFERRAL_MSG)}`;

// Vacío hasta que el dueño mande las fotos de los tres niveles de
// paquetes — ver docs/desarrollo/whislist.md fila 33. Para agregarlas:
// soltar los archivos en frontend/src/assets/floristeria/ e importarlos
// acá, uno por entrada.
const PACKAGE_PHOTOS: { src: string; label: string }[] = [];

export function FloristAllySection() {
  return (
    <div id="floristeria" className="scroll-mt-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-brand text-brand-500">Floristería aliada</h2>
          <p className="text-sm text-gray-400 mt-0.5">Lluvia de Rosas</p>
        </div>
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
          <a
            href={FLORIST_WA_URL}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" /> WhatsApp
          </a>
          <a
            href={FLORIST_INSTAGRAM}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 font-medium cursor-pointer"
          >
            <Instagram size={16} /> Ver perfil
          </a>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-2xl">
        ¿Quieres decorar el auto con flores para tu boda? Te recomendamos a Lluvia de
        Rosas, nuestra floristería aliada — manejan tres niveles de paquetes de ramos
        para el auto, según tu presupuesto. Es totalmente opcional: si ya tienes tu
        floristería o decoradores, no hay ningún problema, solo asegúrate de que el
        ramo esté listo en el lugar de recogida. Si trabajas con Lluvia de Rosas,
        nosotros coordinamos directamente con ellos la decoración del auto.
      </p>
      {PACKAGE_PHOTOS.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-5">
          {PACKAGE_PHOTOS.map(p => (
            <div key={p.label} className="space-y-1">
              <img src={p.src} alt={p.label} className="w-full aspect-square object-cover rounded-xl" />
              <p className="text-xs text-gray-400 text-center">{p.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
