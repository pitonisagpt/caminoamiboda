import { Instagram } from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import { useFloristSettings } from '../../hooks/useFloristSettings';
import { useLang } from '../../i18n/LanguageContext';
import { whatsAppLinkProps } from '../../utils/whatsapp';

export function FloristAllySection() {
  const { settings, loaded } = useFloristSettings();
  const { pickLocalized, lang } = useLang();

  if (!loaded || !settings) return null;

  return (
    <div id="floristeria" className="scroll-mt-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-brand text-brand-500">{lang === "en" ? "Allied florist" : "Floristería aliada"}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{settings.vendor_name}</p>
        </div>
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
          <a
            href={settings.whatsapp_url}
            {...whatsAppLinkProps()}
            className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" /> WhatsApp
          </a>
          <a
            href={settings.instagram_url}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 font-medium cursor-pointer"
          >
            <Instagram size={16} /> {lang === "en" ? "View profile" : "Ver perfil"}
          </a>
        </div>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mt-4 max-w-2xl whitespace-pre-line">
        {pickLocalized(settings.description, settings.description_en)}
      </p>
      {settings.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-5">
          {settings.photos.map(p => (
            <div key={p.id} className="space-y-1">
              <img src={p.url} alt={p.label || settings.vendor_name} className="w-full aspect-square object-cover rounded-xl" />
              {p.label && <p className="text-xs text-gray-400 text-center">{p.label}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
