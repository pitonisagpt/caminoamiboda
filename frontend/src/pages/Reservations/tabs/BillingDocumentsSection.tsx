import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2, Plus, Receipt } from 'lucide-react';
import type { BillingDocumentListItem } from '../../../types';
import { billingDocumentsApi } from '../../../api/billingDocuments';
import { formatCOP, formatDateShort as formatDate } from '../../../utils/format';
import { DOC_STATUS_LABEL, DOC_STATUS_STYLE } from './financeMessages';

// Fully self-contained — FinanceTab.tsx only decides whether to render this
// at all (isAdmin); nothing else reads its state.
export default function BillingDocumentsSection({ reservationId }: { reservationId: number }) {
  const navigate = useNavigate();

  const [billingDocs, setBillingDocs] = useState<BillingDocumentListItem[]>([]);
  const [billingDocsLoading, setBillingDocsLoading] = useState(true);
  const [showDocLinkSearch, setShowDocLinkSearch] = useState(false);
  const [docLinkQuery, setDocLinkQuery] = useState('');
  const [docLinkResults, setDocLinkResults] = useState<BillingDocumentListItem[]>([]);
  const [linkingDocId, setLinkingDocId] = useState<number | null>(null);
  const docLinkSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    billingDocumentsApi.list({ reservation_id: reservationId })
      .then(r => setBillingDocs(r.data))
      .catch(() => setBillingDocs([]))
      .finally(() => setBillingDocsLoading(false));
  }, [reservationId]);

  const handleDocLinkSearch = (q: string) => {
    setDocLinkQuery(q);
    if (docLinkSearchRef.current) clearTimeout(docLinkSearchRef.current);
    if (!q.trim()) { setDocLinkResults([]); return; }
    docLinkSearchRef.current = setTimeout(async () => {
      try {
        const res = await billingDocumentsApi.list({ search: q, unlinked: true });
        setDocLinkResults(res.data);
      } catch { setDocLinkResults([]); }
    }, 300);
  };

  const handleLinkExistingDoc = async (d: BillingDocumentListItem) => {
    setLinkingDocId(d.id);
    try {
      await billingDocumentsApi.update(d.id, { reservation_id: reservationId });
      setBillingDocs(prev => [{ ...d, reservation_id: reservationId }, ...prev]);
      setShowDocLinkSearch(false);
      setDocLinkQuery('');
      setDocLinkResults([]);
    } catch {
      alert('Error al vincular el documento.');
    } finally {
      setLinkingDocId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-500" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuentas de cobro</h2>
        </div>
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowDocLinkSearch(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
          >
            <Link2 size={13} /> Vincular documento existente
          </button>
          <button
            onClick={() => navigate(`/documentos/nuevo?reservation_id=${reservationId}`)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
          >
            <Plus size={13} /> Generar cuenta de cobro
          </button>
          {showDocLinkSearch && (
            <div className="absolute z-20 top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-2">
              <input
                type="text"
                autoFocus
                value={docLinkQuery}
                onChange={e => handleDocLinkSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowDocLinkSearch(false), 150)}
                placeholder="Número de documento o cliente..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {docLinkResults.length > 0 && (
                <div className="mt-1 max-h-56 overflow-y-auto">
                  {docLinkResults.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={linkingDocId !== null}
                      onMouseDown={() => handleLinkExistingDoc(d)}
                      className="w-full text-left px-3 py-2 hover:bg-brand-50 text-sm rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <p className="font-medium text-gray-900 font-mono">{d.document_number} — {d.client_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(d.service_date)} · {formatCOP(Number(d.total_amount))}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {billingDocsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      ) : billingDocs.length === 0 ? (
        <p className="text-sm text-gray-400">Sin cuentas de cobro generadas para esta reserva.</p>
      ) : (
        <div className="space-y-2">
          {billingDocs.map(d => (
            <button
              key={d.id}
              onClick={() => navigate(`/documentos/${d.id}`)}
              className="w-full flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold text-gray-900">{d.document_number}</p>
                <p className="text-xs text-gray-400">{formatDate(d.service_date)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-700">{formatCOP(Number(d.total_amount))}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DOC_STATUS_STYLE[d.status]}`}>
                  {DOC_STATUS_LABEL[d.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
