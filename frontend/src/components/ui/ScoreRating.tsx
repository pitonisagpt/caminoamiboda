import { useState } from "react";
import { Armchair, Camera, Gem, Heart, Sparkles, type LucideIcon } from "lucide-react";

export const SCORE_CATEGORIES: { field: string; label: string; icon: LucideIcon }[] = [
  { field: "score_elegance", label: "Elegancia y Estilo", icon: Sparkles },
  { field: "score_exclusivity", label: "Exclusividad y Rareza", icon: Gem },
  { field: "score_photogeny", label: "Fotogenia", icon: Camera },
  { field: "score_comfort", label: "Comodidad y Espacio", icon: Armchair },
  { field: "score_romance", label: "Romanticismo y Encanto", icon: Heart },
];

export function ScoreTotalBar({ total, size = "lg" }: { total: number | null; size?: "sm" | "lg" }) {
  if (total === null) return <span className="text-gray-400 text-xs">—</span>;
  const pct = (total / 25) * 100;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono text-gray-700">{total}/25</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Puntuación</span>
        <span className="text-sm font-bold text-brand-700">{total}/25</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreDotsRow({
  value,
  label,
  icon: Icon,
  truncateLabel,
}: {
  value: number | null;
  label: string;
  icon?: LucideIcon;
  truncateLabel?: number;
}) {
  const filled = value ?? 0;
  const displayLabel = truncateLabel ? label.slice(0, truncateLabel) : label;
  return (
    <div className="flex flex-col items-center gap-1" title={`${label}: ${value ?? "—"}/5`}>
      {Icon && <Icon size={15} className="text-brand-400" />}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
              i <= filled ? "bg-brand-400" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <span className="text-[9px] text-gray-400 leading-none text-center">{displayLabel}</span>
    </div>
  );
}

export function ScoreInput({
  value,
  onChange,
  label,
  icon: Icon,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  icon?: LucideIcon;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div>
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
        {Icon && <Icon size={15} className="text-brand-500" />}
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-pressed={i <= (value ?? 0)}
            aria-label={`${i} de 5`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(value === i ? null : i)}
            className="p-2 -m-1 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1"
          >
            <span
              className={`block w-4 h-4 rounded-full transition-all duration-150 ${
                i <= display ? "bg-brand-400 scale-100" : "bg-gray-200 scale-90"
              }`}
            />
          </button>
        ))}
        <span className="ml-1 text-xs text-gray-400 tabular-nums w-8">
          {value !== null ? `${value}/5` : "—"}
        </span>
      </div>
    </div>
  );
}
