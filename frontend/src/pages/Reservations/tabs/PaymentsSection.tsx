import { useState } from 'react';
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import type { ReservationPayment } from '../../../api/reservations';
import { formatCOP, formatDateShort as formatDate } from '../../../utils/format';

interface NewPaymentPayload {
  amount: number;
  paid_at: string;
  notes?: string;
  payment_type: 'cash' | 'withholding';
  withholding_percentage: number | null;
}

// `payments`/`paymentsLoading` stay lifted in FinanceTab.tsx (siblings —
// the financial summary, the WhatsApp cobro message, the owner settlement
// retention banner — all read totals derived from them). This component
// owns only the add-payment form's own ephemeral UI state, and calls back
// up through onAdd/onDelete for the actual API + shared-state mutation.
export default function PaymentsSection({
  reservation,
  payments,
  paymentsLoading,
  onAdd,
  onDelete,
}: {
  reservation: Reservation;
  payments: ReservationPayment[];
  paymentsLoading: boolean;
  onAdd: (payload: NewPaymentPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newNotes, setNewNotes] = useState('');
  const [newPaymentType, setNewPaymentType] = useState<'cash' | 'withholding'>('cash');
  const [newWithholdingPct, setNewWithholdingPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAddPayment = async () => {
    if (!newAmount || Number(newAmount) <= 0) return;
    setSaving(true);
    try {
      await onAdd({
        amount: Number(newAmount),
        paid_at: newDate,
        notes: newNotes || undefined,
        payment_type: newPaymentType,
        withholding_percentage: newPaymentType === 'withholding' && newWithholdingPct ? Number(newWithholdingPct) : null,
      });
      setNewAmount('');
      setNewNotes('');
      setNewPaymentType('cash');
      setNewWithholdingPct('');
      setAddingPayment(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pagos recibidos</h2>
        {!addingPayment && (
          <button
            onClick={() => setAddingPayment(true)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
          >
            <Plus size={13} /> Agregar pago
          </button>
        )}
      </div>

      {paymentsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      ) : payments.length === 0 && !addingPayment ? (
        <p className="text-sm text-gray-400">Sin pagos registrados.</p>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900">{formatCOP(Number(p.amount))}</p>
                  {p.payment_type === 'withholding' && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 shrink-0">
                      Retención{p.withholding_percentage ? ` ${p.withholding_percentage}%` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
              </div>
              <button
                onClick={() => handleDeletePayment(p.id)}
                disabled={deletingId === p.id}
                className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add payment form */}
      {addingPayment && (
        <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
          {Number(reservation.total_amount) === 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Esta reserva todavía no tiene "Valor total" cargado — el saldo pendiente se calculará mal hasta que lo agregues en la pestaña Información.
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setNewPaymentType('cash'); setNewWithholdingPct(''); }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                  newPaymentType === 'cash' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Abono
              </button>
              <button
                type="button"
                onClick={() => setNewPaymentType('withholding')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                  newPaymentType === 'withholding' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Retención en la fuente
              </button>
            </div>
          </div>
          {newPaymentType === 'withholding' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">% retenido (opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newWithholdingPct}
                onChange={e => {
                  const pct = e.target.value;
                  setNewWithholdingPct(pct);
                  if (pct) setNewAmount(String(Math.round(Number(reservation.total_amount) * (Number(pct) / 100))));
                }}
                placeholder="Ej: 4"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">Calcula el monto sobre el valor total — ajústalo abajo si la base es distinta.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto (COP) *</label>
              <input
                type="number"
                min="1"
                step="1000"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Ej: transferencia, efectivo, cuota…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAddingPayment(false); setNewAmount(''); setNewNotes(''); setNewPaymentType('cash'); setNewWithholdingPct(''); }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddPayment}
              disabled={saving || !newAmount}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
