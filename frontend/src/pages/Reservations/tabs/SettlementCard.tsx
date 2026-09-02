import { useState } from 'react';
import { Download, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import type { OwnerSettlement, OwnerSettlementPayment } from '../../../api/ownerSettlements';
import { EntityLink } from '../../../components/EntityLink';

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// One settlement's full card — amounts, abonos al propietario, PDF actions.
// A reservation can have several of these (one per vehicle), so this owns
// its own "adding a payment" mini-form state instead of FinanceTab holding
// one shared copy for whichever settlement happens to be open.
export default function SettlementCard({
  settlement,
  vehicleId,
  vehicleLabel,
  payments,
  onAddPayment,
  onDeletePayment,
  onGeneratePdf,
  onDownloadPdf,
}: {
  settlement: OwnerSettlement;
  vehicleId?: number | null;
  vehicleLabel?: string | null;
  payments: OwnerSettlementPayment[];
  onAddPayment: (amount: number, paidAt: string, notes: string) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onGeneratePdf: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
}) {
  const [addingPayment, setAddingPayment] = useState(false);
  const [newSpAmount, setNewSpAmount] = useState('');
  const [newSpDate, setNewSpDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newSpNotes, setNewSpNotes] = useState('');
  const [savingSp, setSavingSp] = useState(false);
  const [deletingSpId, setDeletingSpId] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const spPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const spRemaining = Math.max(0, Number(settlement.owner_amount) - spPaid);
  const spPct = settlement.owner_amount > 0 ? Math.round((spPaid / Number(settlement.owner_amount)) * 100) : 0;

  const handleAdd = async () => {
    if (!newSpAmount || Number(newSpAmount) <= 0) return;
    setSavingSp(true);
    try {
      await onAddPayment(Number(newSpAmount), newSpDate, newSpNotes);
      setNewSpAmount('');
      setNewSpNotes('');
      setAddingPayment(false);
    } finally {
      setSavingSp(false);
    }
  };

  const handleDelete = async (paymentId: number) => {
    setDeletingSpId(paymentId);
    try {
      await onDeletePayment(paymentId);
    } finally {
      setDeletingSpId(null);
    }
  };

  const handleGenerate = async () => {
    setPdfLoading(true);
    try {
      await onGeneratePdf();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
      await onDownloadPdf();
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-3 border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="min-w-0">
          <span className="text-gray-500 font-mono">{settlement.settlement_number}</span>
          {vehicleLabel && (
            <span className="text-gray-400 ml-2 truncate">
              · <EntityLink to={`/vehiculos/${vehicleId}`} id={vehicleId}>{vehicleLabel}</EntityLink>
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
          settlement.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {settlement.status === 'paid' ? 'Pagada' : 'Pendiente'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">
            Propietario ({settlement.owner_percentage}%){settlement.is_manual_amount ? ' · manual' : ''}
          </p>
          <p className="text-base font-bold text-purple-700">{formatCOP(settlement.owner_amount)}</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Empresa ({100 - settlement.owner_percentage}%)</p>
          <p className="text-base font-bold text-brand-600">{formatCOP(settlement.company_amount)}</p>
        </div>
      </div>

      {/* Abonos al propietario */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Abonos al propietario</p>
          {!addingPayment && (
            <button
              onClick={() => setAddingPayment(true)}
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              <Plus size={12} /> Agregar abono
            </button>
          )}
        </div>

        {payments.length === 0 && !addingPayment ? (
          <p className="text-xs text-gray-400">Sin abonos registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCOP(Number(p.amount))}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingSpId === p.id}
                  className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deletingSpId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {addingPayment && (
          <div className="border border-purple-100 rounded-xl p-3 space-y-2 bg-purple-50/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monto (COP) *</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={newSpAmount}
                  onChange={e => setNewSpAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={newSpDate}
                  onChange={e => setNewSpDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={newSpNotes}
                onChange={e => setNewSpNotes(e.target.value)}
                placeholder="Ej: transferencia, efectivo…"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setAddingPayment(false); setNewSpAmount(''); setNewSpNotes(''); }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={savingSp || !newSpAmount}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingSp ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {settlement.owner_amount > 0 && (
          <div className="pt-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{formatCOP(spPaid)} pagado</span>
              <span>{spPct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all"
                style={{ width: `${Math.min(spPct, 100)}%` }}
              />
            </div>
            {spRemaining > 0 && (
              <p className="text-xs text-gray-400 mt-1">Saldo pendiente: <span className="font-semibold text-gray-700">{formatCOP(spRemaining)}</span></p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleGenerate}
          disabled={pdfLoading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          {settlement.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
        </button>
        {settlement.pdf_path && (
          <button
            onClick={handleDownload}
            disabled={pdfLoading}
            className="flex items-center gap-2 border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Descargar PDF
          </button>
        )}
      </div>
    </div>
  );
}
