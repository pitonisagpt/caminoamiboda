import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { VehiclePhoto } from "../../types/vehicle";

interface PhotoSliderProps {
  photos: VehiclePhoto[];
  brandInitial: string;
  brandName: string;
}

export function PhotoSlider({ photos, brandInitial, brandName }: PhotoSliderProps) {
  const [current, setCurrent] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pink-50 to-yellow-50">
        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
          <span className="text-2xl font-brand text-pink-400">{brandInitial}</span>
        </div>
        <span className="text-xs text-gray-400">{brandName}</span>
      </div>
    );
  }

  if (photos.length === 1) {
    return (
      <img
        src={photos[0].url}
        alt={photos[0].original_name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  const prev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));

  return (
    <div className="relative w-full h-full group">
      <img
        src={photos[current].url}
        alt={photos[current].original_name}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Arrow buttons */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Foto anterior"
      >
        <ChevronLeft size={14} className="text-gray-700" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Foto siguiente"
      >
        <ChevronRight size={14} className="text-gray-700" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
              i === current ? "bg-white scale-125" : "bg-white/50"
            }`}
            aria-label={`Foto ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-full">
        {current + 1}/{photos.length}
      </div>
    </div>
  );
}
