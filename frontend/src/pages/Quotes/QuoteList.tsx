import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Loader2, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import type { QuoteListItem, QuoteStatus } from '../../types/quote';
import { QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL } from '../../types/quote';

const STATUS_FILTERS: { value: QuoteStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'expired', label: 'Vencidas' },
];

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCOP(n: number) {
  return `$${n.toLocaleString('es-CO')}`;
}

export default function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [waLoading, setWaLoading] = useState<number | null>(null);

  const load = (status?: QuoteStatus) =>
    quotesApi.list(status).then(r => setQuotes(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(statusFilter === 'all' ? undefined : statusFilter); }, [statusFilter]);

  const handleGeneratePdf = async (q: QuoteListItem) => {
    setGeneratingPdf(q.id);
    try {
      await quotesApi.generatePdf(q.id);
      await quotesApi.downloadPdf(q.id, q.quote_number);
      load(statusFilter === 'all' ? undefined : statusFilter);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownloadPdf = async (q: QuoteListItem) => {
    if (!q.pdf_path) return handleGeneratePdf(q);
    setGeneratingPdf(q.id);
    try { await quotesApi.downloadPdf(q.id, q.quote_number); }
    finally { setGeneratingPdf(null); }
  };

  const handleWhatsapp = async (q: QuoteListItem) => {
    setWaLoading(q.id);
    try {
      const res = await quotesApi.getWhatsappText(q.id);
      const encoded = encodeURIComponent(res.data.text);
      const phone = q.resolved_customer_phone?.replace(/\D/g, '') ?? '';
      const url = phone
        ? `https://wa.me/${phone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
    } finally {
      setWaLoading(null);
    }
  };

  const handleDelete = async (q: QuoteListItem) => {
    if (!confirm(`¿Eliminar cotización ${q.quote_number}?`)) return;
    setDeletingId(q.id);
    try {
      await quotesApi.delete(q.id);
      setQuotes(prev => prev.filter(x => x.id !== q.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotes.length} cotización{quotes.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nuevo')}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} /> Nueva cotización
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              statusFilter === f.value
                ? 'bg-pink-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-pink-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {!loading && quotes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay cotizaciones{statusFilter !== 'all' ? ' con ese estado' : ''}.</p>
        </div>
      )}

      {!loading && quotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Vehículo</th>
                <th className="text-left px-4 py-3">Fecha evento</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-pink-50/40 transition-colors cursor-pointer" onClick={() => navigate(`/cotizaciones/${q.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.quote_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{q.display_customer}</td>
                  <td className="px-4 py-3 text-gray-600">{q.display_vehicle}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(q.event_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCOP(q.total_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${QUOTE_STATUS_COLOR[q.status]}`}>
                      {QUOTE_STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* WhatsApp */}
                      <button
                        onClick={() => handleWhatsapp(q)}
                        disabled={waLoading === q.id}
                        title="Enviar por WhatsApp"
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {waLoading === q.id ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                      </button>
                      {/* PDF */}
                      <button
                        onClick={() => handleDownloadPdf(q)}
                        disabled={generatingPdf === q.id}
                        title={q.pdf_path ? 'Descargar PDF' : 'Generar y descargar PDF'}
                        className="p-1.5 rounded-lg text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {generatingPdf === q.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => navigate(`/cotizaciones/${q.id}/editar`)}
                        title="Editar"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deletingId === q.id}
                        title="Eliminar"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === q.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
