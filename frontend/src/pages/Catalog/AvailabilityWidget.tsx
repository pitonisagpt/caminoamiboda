import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const WA_NUMBER = '573147372030';

function formatLongDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function AvailabilityWidget() {
  const [date, setDate] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const waUrl = date
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Quisiera consultar disponibilidad para el ${formatLongDate(date)}. ¿Qué vehículos tienen disponibles?`)}`
    : undefined;

  return (
    <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border border-brand-100 p-6 text-center space-y-4">
      <div>
        <p className="text-lg font-semibold text-gray-900">¿Cuál es la fecha de tu evento?</p>
        <p className="text-sm text-gray-500 mt-1">Selecciona la fecha y te confirmamos disponibilidad al instante por WhatsApp.</p>
      </div>

      <input
        type="date"
        value={date}
        min={today}
        onChange={e => setDate(e.target.value)}
        className="w-full max-w-xs mx-auto block border border-brand-200 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-gray-800"
      />

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
          date
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
        }`}
      >
        <MessageCircle size={18} />
        Consultar disponibilidad
      </a>

      {date && (
        <p className="text-xs text-gray-400">
          Te escribiremos para el <strong className="text-gray-700">{formatLongDate(date)}</strong>
        </p>
      )}
    </div>
  );
}
