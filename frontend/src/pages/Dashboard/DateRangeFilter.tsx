import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

export interface DateRange {
  preset: string;
  label: string;
  from: string | null;
  to: string | null;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPresets(): { preset: string; label: string; from: string | null; to: string | null }[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  const iso = toISO;

  // Quarter helpers
  const qStart = new Date(y, Math.floor(m / 3) * 3, 1);
  const prevQStart = new Date(qStart);
  prevQStart.setMonth(prevQStart.getMonth() - 3);
  const prevQEnd = new Date(qStart);
  prevQEnd.setDate(prevQEnd.getDate() - 1);

  // Prev month
  const prevMonthStart = new Date(y, m - 1, 1);
  const prevMonthEnd = new Date(y, m, 0);

  // Last 12 months
  const last12 = new Date(today);
  last12.setFullYear(last12.getFullYear() - 1);
  last12.setDate(last12.getDate() + 1);

  return [
    { preset: 'today',    label: 'Hoy',                from: iso(today),              to: iso(today) },
    { preset: 'mtd',      label: 'Este mes',            from: iso(new Date(y, m, 1)),  to: iso(today) },
    { preset: 'prev_m',   label: 'Mes anterior',        from: iso(prevMonthStart),     to: iso(prevMonthEnd) },
    { preset: 'qtd',      label: 'Este trimestre',      from: iso(qStart),             to: iso(today) },
    { preset: 'prev_q',   label: 'Trimestre anterior',  from: iso(prevQStart),         to: iso(prevQEnd) },
    { preset: 'ytd',      label: 'Este año',            from: `${y}-01-01`,            to: iso(today) },
    { preset: 'last_12',  label: 'Últimos 12 meses',    from: iso(last12),             to: iso(today) },
    { preset: 'all',      label: 'Todo el tiempo',      from: null,                    to: null },
  ];
}

export { buildPresets };
const PRESETS = buildPresets();
export const DEFAULT_RANGE: DateRange = PRESETS.find(p => p.preset === 'mtd')!;

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

export default function DateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const select = (preset: typeof PRESETS[0]) => {
    onChange(preset);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom && !customTo) return;
    onChange({
      preset: 'custom',
      label: `${customFrom || '…'} → ${customTo || '…'}`,
      from: customFrom || null,
      to: customTo || null,
    });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:border-brand-300 hover:text-brand-600 transition-colors cursor-pointer"
      >
        <CalendarDays size={14} className="text-brand-400" />
        {value.label}
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-56 bg-white border border-gray-100 rounded-2xl shadow-lg p-2 space-y-0.5">
          {PRESETS.map(p => (
            <button
              key={p.preset}
              onClick={() => select(p)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                value.preset === p.preset
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Custom date range */}
          <div className="border-t border-gray-100 pt-2 mt-1 px-1 space-y-1.5">
            <p className="text-xs text-gray-400 font-medium px-2">Personalizado</p>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Desde"
            />
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Hasta"
            />
            <button
              onClick={applyCustom}
              disabled={!customFrom && !customTo}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
