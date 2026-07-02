import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Plus, Search, Copy, Check, Car, User, Trash2 } from 'lucide-react';
import { timelinesApi } from '../../api/timelines';
import type { TimelineListItem, EventType } from '../../types/timeline';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Boda',
  brand_activation: 'Activación de marca',
  audiovisual_production: 'Producción audiovisual',
  quinceanera: 'Quinceañera',
  other: 'Otro',
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  wedding: 'bg-brand-100 text-brand-600',
  brand_activation: 'bg-purple-100 text-purple-700',
  audiovisual_production: 'bg-blue-100 text-blue-700',
  quinceanera: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function TimelineList() {
  const [timelines, setTimelines] = useState<TimelineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    timelinesApi.list().then((r: { data: TimelineListItem[] }) => {
      setTimelines(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = timelines.filter(t =>
    t.event_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.main_contact_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el evento "${name}"? Esta acción no se puede deshacer.`)) return;
    await timelinesApi.delete(id);
    setTimelines(prev => prev.filter(t => t.id !== id));
  };

  const copyDriverLink = async (token: string, id: number) => {
    const url = `${window.location.origin}/evento/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Timelines y logística de operaciones</p>
        </div>
        <Link
          to="/eventos/nuevo"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo evento
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar eventos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay eventos registrados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/eventos/${t.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-brand-500 transition-colors"
                    >
                      {t.event_name}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_COLORS[t.event_type]}`}>
                      {EVENT_TYPE_LABELS[t.event_type]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(t.event_date)}
                    </span>
                    {t.main_contact_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {t.main_contact_name}
                      </span>
                    )}
                    {t.assigned_vehicle && (
                      <span className="flex items-center gap-1">
                        <Car className="w-3.5 h-3.5" />
                        {t.assigned_vehicle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyDriverLink(t.share_token_driver, t.id)}
                    title="Copiar enlace para conductor"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-500 border border-gray-200 hover:border-brand-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied === t.id ? (
                      <><Check className="w-3.5 h-3.5 text-green-600" /> Copiado</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Enlace conductor</>
                    )}
                  </button>
                  <Link
                    to={`/eventos/${t.id}`}
                    className="text-xs text-brand-700 hover:text-brand-800 border border-brand-200 hover:border-brand-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Ver timeline
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id, t.event_name)}
                    title="Eliminar evento"
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
