import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ReservationAddon } from '../../../types/reservationAddon';
import type { ReservationAddonPayment } from '../../../api/reservationAddons';

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Same shape as SettlementCard's "Abonos al propietario" block, adapted
// smaller (collapsed by default, behind a summary line) since a reservation
// typically has just 1-2 addons — a full always-open card per one, like
// settlements get, would be more chrome than the content warrants. Only
// rendered by the caller when there's actually a provider_amount to pay out.
export default function AddonPaymentLedger({
  addon,
  payments,
  onAddPayment,
  onDeletePayment,
}: {
  addon: ReservationAddon;
  payments: ReservationAddonPayment[];
  onAddPayment: (amount: number, paidAt: string, notes: string) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Decimal fields arrive as strings from the API (same as price/amount
  // elsewhere in this codebase) — Number(...) first, or `+` concatenates
  // instead of adding ("50000.00" + "160000.00" -> an invalid number
  // string, not 210000).
  const amountPaid = Number(addon.amount_paid);
  const remainingToProvider = Number(addon.remaining_to_provider);
  const providerTotal = amountPaid + remainingToProvider;
  const pct = providerTotal > 0 ? Math.round((amountPaid / providerTotal) * 100) : 0;

  const handleAdd = async () => {
    if (!newAmount || Number(newAmount) <= 0) return;
    setSaving(true);
    try {
      await onAddPayment(Number(newAmount), newDate, newNotes);
      setNewAmount('');
      setNewNotes('');
      setAddingPayment(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (paymentId: number) => {
    setDeletingId(paymentId);
    try {
      await onDeletePayment(paymentId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-xs font-medium text-pink-600 hover:text-pink-700 cursor-pointer"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Pagado al proveedor: {formatCOP(amountPaid)} / {formatCOP(providerTotal)}
        {remainingToProvider <= 0 && <span className="text-green-600">· Completo</span>}
      </button>

      {expanded && (
        <div className="mt-2 border border-pink-100 rounded-xl p-3 space-y-2 bg-pink-50/30">
          {payments.length === 0 && !addingPayment ? (
            <p className="text-xs text-gray-400">Sin pagos registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {payments.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-1 border-b border-pink-100/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCOP(p.amount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!addingPayment ? (
            <button
              onClick={() => setAddingPayment(true)}
              className="flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              <Plus size={12} /> Agregar pago
            </button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto (COP) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Ej: transferencia, efectivo…"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setAddingPayment(false); setNewAmount(''); setNewNotes(''); }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !newAmount}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Guardar
                </button>
              </div>
            </div>
          )}

          {providerTotal > 0 && (
            <div className="pt-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-400 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
