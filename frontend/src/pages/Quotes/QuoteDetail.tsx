import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, Loader2, MessageCircle, Pencil,
  Trash2, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import type { Quote, QuoteStatus } from '../../types/quote';
import { QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL, ZONE_LABEL } from '../../types/quote';

const STATUS_NEXT: Partial<Record<QuoteStatus, QuoteStatus>> = {
  draft: 'sent',
  sent: 'accepted',
};

function formatCOP(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string): string {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setLoading(true);
    quotesApi.get(Number(id))
      .then(r => setQuote(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAdvance = async () => {
    if (!quote) return;
    const next = STATUS_NEXT[quote.status];
    if (!next) return;
    setAdvancing(true);
    try {
      const res = await quotesApi.update(quote.id, { status: next });
      setQuote(res.data);
    } finally {
      setAdvancing(false);
    }
  };

  const handlePdf = async () => {
    if (!quote) return;
    setPdfLoading(true);
    try {
      const updated = await quotesApi.generatePdf(quote.id);
      setQuote(updated.data);
      await quotesApi.downloadPdf(quote.id, quote.quote_number);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadExisting = async () => {
    if (!quote) return;
    setPdfLoading(true);
    try {
      await quotesApi.downloadPdf(quote.id, quote.quote_number);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!quote) return;
    setWaLoading(true);
    try {
      const res = await quotesApi.getWhatsappText(quote.id);
      const encoded = encodeURIComponent(res.data.text);
      const phone = quote.resolved_customer_phone?.replace(/\D/g, '') ?? '';
      const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
    } finally {
      setWaLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!quote) return;
    if (!confirm('¿Convertir esta cotización en una reserva?')) return;
    setConverting(true);
    try {
      const res = await quotesApi.convertToReservation(quote.id);
      navigate(`/reservas/${res.data.id}`);
    } catch {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    if (!confirm(`¿Eliminar cotización ${quote.quote_number}?`)) return;
    await quotesApi.delete(quote.id);
    navigate('/cotizaciones');
  };

  if (loading || !quote) {
    return <div className="flex justify-center py-16 text-pink-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  const nextStatus = STATUS_NEXT[quote.status];
  const canConvert = quote.status === 'accepted' || quote.status === 'sent' || quote.status === 'draft';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/cotizaciones')} className="text-gray-400 hover:text-gray-600 mt-1 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{quote.display_customer}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${QUOTE_STATUS_COLOR[quote.status]}`}>
                {QUOTE_STATUS_LABEL[quote.status]}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{quote.quote_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {nextStatus && (
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {advancing ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              {QUOTE_STATUS_LABEL[nextStatus]}
            </button>
          )}
          <button
            onClick={() => navigate(`/cotizaciones/${id}/editar`)}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-2">
        {quote.pdf_path ? (
          <button
            onClick={handleDownloadExisting}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar PDF
          </button>
        ) : (
          <button
            onClick={handlePdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Generar PDF
          </button>
        )}
        <button
          onClick={handleWhatsApp}
          disabled={waLoading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {waLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
          WhatsApp
        </button>
        {canConvert && (
          <button
            onClick={handleConvert}
            disabled={converting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {converting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Convertir a Reserva
          </button>
        )}
      </div>

      {/* Customer & Event */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Cliente</p>
            <p className="text-sm font-semibold text-gray-900">{quote.display_customer}</p>
            {quote.resolved_customer_phone && (
              <p className="text-sm text-gray-500 mt-0.5">{quote.resolved_customer_phone}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Evento</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">{formatDate(quote.event_date)}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {ZONE_LABEL[quote.location_zone]}
              {quote.service_duration ? ` · ${quote.service_duration}` : ''}
            </p>
          </div>
        </div>

        {quote.display_vehicle && quote.display_vehicle !== '—' && (
          <>
            <hr className="border-gray-50" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Vehículo</p>
              <p className="text-sm font-semibold text-gray-900">{quote.display_vehicle}</p>
            </div>
          </>
        )}
      </div>

      {/* Route */}
      {(quote.pickup_location || quote.ceremony_location || quote.reception_location) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Recorrido</p>
          <div className="space-y-3">
            {[
              { label: 'Recogida', value: quote.pickup_location, color: 'bg-green-500' },
              { label: 'Ceremonia', value: quote.ceremony_location, color: 'bg-pink-500' },
              { label: 'Recepción', value: quote.reception_location, color: 'bg-purple-500' },
            ].filter(s => s.value).map(stop => (
              <div key={stop.label} className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${stop.color}`} />
                <div>
                  <p className="text-xs text-gray-400">{stop.label}</p>
                  <p className="text-sm text-gray-700">{stop.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Precio</p>
        <div className="flex gap-4">
          <div className="flex-1 bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-xl font-bold text-gray-900">{formatCOP(quote.total_price)}</p>
          </div>
          {quote.deposit_amount && (
            <div className="flex-1 bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Anticipo</p>
              <p className="text-xl font-bold text-green-700">{formatCOP(quote.deposit_amount)}</p>
            </div>
          )}
        </div>
        {quote.payment_instructions && (
          <p className="text-sm text-gray-500 mt-3">{quote.payment_instructions}</p>
        )}
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Notas internas</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
