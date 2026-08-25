import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import { followUpMessagesApi } from '../../api/followUpMessages';
import type { FollowUpPanelEntry, WindowStatus } from '../../types/followUpMessage';

function buildWaUrl(phone: string | null | undefined, message?: string): string {
  const num = phone ? phone.replace(/\D/g, '') : '';
  if (!message) return num ? `https://wa.me/${num}` : `https://wa.me/`;
  const encoded = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function urgencyBadge(days: number): { label: string; className: string } {
  if (days < 0) return { label: 'Fecha pasada', className: 'bg-gray-100 text-gray-500' };
  if (days < 15) return { label: `${days} días para el evento`, className: 'bg-red-100 text-red-700' };
  if (days < 45) return { label: `${days} días para el evento`, className: 'bg-yellow-100 text-yellow-700' };
  return { label: `${days} días para el evento`, className: 'bg-green-100 text-green-700' };
}

const WINDOW_STATUS_LABEL: Record<WindowStatus, string> = {
  a_tiempo: 'Momento recomendado',
  temprano: 'Aún es pronto para este mensaje',
  atrasado: 'Ya pasó la ventana recomendada',
};
const WINDOW_STATUS_COLOR: Record<WindowStatus, string> = {
  a_tiempo: 'text-green-600',
  temprano: 'text-gray-400',
  atrasado: 'text-amber-600',
};

export default function FollowUpsPage() {
  const [entries, setEntries] = useState<FollowUpPanelEntry[] | 'loading'>('loading');
  const [viewedKeys, setViewedKeys] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    followUpMessagesApi.panel().then(r => {
      setEntries(r.data);
      const initial: Record<number, string> = {};
      r.data.forEach(e => {
        initial[e.reservation_id] = e.current_key ?? e.templates[e.templates.length - 1].key;
      });
      setViewedKeys(initial);
    });
  }, []);

  const updateEntry = (updated: FollowUpPanelEntry) => {
    setEntries(prev => (prev === 'loading' ? prev : prev.map(e => (e.reservation_id === updated.reservation_id ? updated : e))));
  };

  const moveView = (entry: FollowUpPanelEntry, dir: 1 | -1) => {
    setViewedKeys(prev => {
      const idx = entry.templates.findIndex(t => t.key === prev[entry.reservation_id]);
      const next = Math.min(entry.templates.length - 1, Math.max(0, idx + dir));
      return { ...prev, [entry.reservation_id]: entry.templates[next].key };
    });
  };

  const handleSend = async (entry: FollowUpPanelEntry, templateKey: string, text: string) => {
    window.open(buildWaUrl(entry.phone, text), '_blank');
    setBusyId(entry.reservation_id);
    try {
      const res = await followUpMessagesApi.markSent(entry.reservation_id, templateKey);
      updateEntry(res.data);
      // Advance one step from wherever the user was viewing — not to the
      // backend's global "first unsent" key, which could jump backward if
      // they'd manually skipped ahead to send an out-of-order message.
      const idx = entry.templates.findIndex(t => t.key === templateKey);
      const next = res.data.templates[Math.min(res.data.templates.length - 1, idx + 1)];
      setViewedKeys(prev => ({ ...prev, [entry.reservation_id]: next.key }));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (entry: FollowUpPanelEntry, templateKey: string) => {
    setBusyId(entry.reservation_id);
    try {
      const res = await followUpMessagesApi.unmarkSent(entry.reservation_id, templateKey);
      updateEntry(res.data);
      setViewedKeys(prev => ({ ...prev, [entry.reservation_id]: templateKey }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguimientos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Mensajes de seguimiento para eventos cotizados que aún no han confirmado.
        </p>
      </div>

      {entries === 'loading' ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
          No hay eventos en estado "Cotizado" para hacer seguimiento por ahora.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const viewedKey = viewedKeys[entry.reservation_id] ?? entry.templates[0].key;
            const idx = entry.templates.findIndex(t => t.key === viewedKey);
            const tpl = entry.templates[idx] ?? entry.templates[0];
            const badge = urgencyBadge(entry.days_to_event);
            const busy = busyId === entry.reservation_id;
            const sentCount = entry.templates.filter(t => t.sent_at).length;

            return (
              <div key={entry.reservation_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{entry.display_customer}</p>
                    <p className="text-xs text-gray-400">
                      {entry.display_vehicle} · {formatDate(entry.event_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex gap-1" title={`${sentCount}/${entry.templates.length} enviados`}>
                      {entry.templates.map(t => (
                        <span key={t.key} className={`w-2 h-2 rounded-full ${t.sent_at ? 'bg-brand-500' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
                    <a
                      href={buildWaUrl(entry.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-green-600 cursor-pointer"
                      title="Abrir WhatsApp sin ningún mensaje prellenado"
                    >
                      <MessageCircle size={13} /> Abrir WhatsApp
                    </a>
                    <a
                      href={`/reservas/${entry.reservation_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-brand-600 cursor-pointer"
                      title="Abrir reserva (cambiar estado, cancelar, etc.)"
                    >
                      <ExternalLink size={13} /> Abrir reserva
                    </a>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => moveView(entry, -1)}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {tpl.key}. {tpl.label}
                        </p>
                        <p className={`text-xs ${WINDOW_STATUS_COLOR[tpl.window_status]}`}>
                          {WINDOW_STATUS_LABEL[tpl.window_status]} — {tpl.window_label}
                        </p>
                      </div>
                      <button
                        onClick={() => moveView(entry, 1)}
                        disabled={idx === entry.templates.length - 1}
                        className="p-1 text-gray-400 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 whitespace-pre-line">{tpl.text}</p>

                  <div className="flex items-center gap-3">
                    {tpl.sent_at ? (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Enviado el {new Date(tpl.sent_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <button
                          onClick={() => handleUndo(entry, tpl.key)}
                          disabled={busy}
                          className="text-brand-600 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          deshacer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSend(entry, tpl.key, tpl.text)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                        Enviar por WhatsApp
                      </button>
                    )}
                    {!entry.phone && <span className="text-xs text-gray-400">Sin teléfono registrado</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
