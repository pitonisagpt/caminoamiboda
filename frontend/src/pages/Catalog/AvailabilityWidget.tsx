import { whatsAppLinkProps } from '../../utils/whatsapp';
import { useLang } from '../../i18n/LanguageContext';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';

const WA_NUMBER = '573147372030';

interface AvailabilityWidgetProps {
  /** ISO date string ("" = no date picked). Controlled by CatalogPage so
   * the same date drives per-card availability badges and price previews,
   * not just this widget's own WhatsApp message. */
  date: string;
  onDateChange: (date: string) => void;
  loading?: boolean;
  availableCount?: number;
  totalCount?: number;
}

/**
 * Free, no-lead-capture date check (mejoras.md ítem 1) — distinct from
 * RevealPricesModal's gate, which still exists for the detailed
 * per-location quote but is no longer required just to check a date.
 */
export function AvailabilityWidget({ date, onDateChange, loading, availableCount, totalCount }: AvailabilityWidgetProps) {
  const { t, lang } = useLang();

  const today = new Date().toISOString().split('T')[0];

  const formatLongDate = (iso: string): string => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const waUrl = date
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t('availability.waMessage', { date: formatLongDate(date) }))}`
    : undefined;

  return (
    <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border border-brand-100 p-6 text-center space-y-4">
      <div>
        <p className="text-lg font-semibold text-gray-900">{t('availability.question')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('availability.hint')}</p>
      </div>

      <input
        type="date"
        value={date}
        min={today}
        onChange={e => onDateChange(e.target.value)}
        className="w-full max-w-xs mx-auto block border border-brand-200 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-800"
      />

      {date && (
        <p className="text-sm text-gray-600">
          {loading
            ? t('catalog.availabilityLoading')
            : availableCount != null && totalCount != null
              ? t('catalog.availabilityCount', { available: availableCount, total: totalCount })
              : null}
        </p>
      )}

      {/* Compact on purpose (wishlist fila 63) — same treatment as the
          catalog card/modal buttons: lighter weight, less tall, same
          recognizable solid WhatsApp green. */}
      <a
        href={waUrl}
        {...whatsAppLinkProps()}
        className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-medium text-sm transition-all ${
          date
            ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 active:scale-[0.98] cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
        }`}
      >
        <WhatsAppIcon className="w-3.5 h-3.5" />
        {t('availability.cta')}
      </a>

      {date && (
        <div>
          <p className="text-xs text-gray-400">
            {t('availability.confirmingFor')} <strong className="text-gray-700">{formatLongDate(date)}</strong>
          </p>
          <button
            onClick={() => onDateChange('')}
            className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer mt-1"
          >
            {t('catalog.availabilityClear')}
          </button>
        </div>
      )}
    </div>
  );
}
