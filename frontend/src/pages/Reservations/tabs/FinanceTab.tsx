import { useEffect, useState } from 'react';
import { DollarSign, Download, FileText, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import { reservationsApi } from '../../../api/reservations';
import type { ReservationPayment } from '../../../api/reservations';
import { ownerSettlementsApi, type OwnerSettlement, type OwnerSettlementPayment } from '../../../api/ownerSettlements';
import { useAuth } from '../../../context/AuthContext';

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function buildCobroMsg(reservation: Reservation, payments: ReservationPayment[]): string {
  const firstName = reservation.display_customer.split(' ')[0];
  const totalDeposit = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(reservation.total_amount) - totalDeposit);

  const lines: string[] = [
    `Hola ${firstName}, aquí está el resumen de pagos de tu reserva con Camino a mi Boda:`,
    '',
    `*Valor total:* ${formatCOP(reservation.total_amount)}`,
    '',
  ];

  if (payments.length > 0) {
    lines.push('*Abonos realizados:*');
    payments.forEach(p => {
      const date = new Date(p.paid_at + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      const note = p.notes ? ` (${p.notes})` : '';
      lines.push(`  - ${date}: ${formatCOP(Number(p.amount))}${note}`);
    });
    lines.push('');
  }

  lines.push(`*Total abonado:* ${formatCOP(totalDeposit)}`);
  lines.push(`*Saldo pendiente:* ${formatCOP(remaining)}`);

  if (reservation.event_date) {
    const evDate = new Date(reservation.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push('');
    lines.push(`*Fecha del evento:* ${evDate}`);
  }

  lines.push('');
  lines.push(`La cuenta de ahorros Bancolombia es 00484248273`);
  lines.push('');
  lines.push('Camino a mi Boda');
  lines.push('https://www.instagram.com/caminoamiboda');

  return lines.join('\n');
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function FinanceTab({
  reservation,
  onReservationChange,
}: {
  reservation: Reservation;
  onReservationChange?: () => void;
}) {
  const { isAdmin } = useAuth();

  const [payments, setPayments] = useState<ReservationPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [settlement, setSettlement] = useState<OwnerSettlement | null | 'loading'>('loading');
  const [creating, setCreating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [settlementPayments, setSettlementPayments] = useState<OwnerSettlementPayment[]>([]);
  const [addingSettlementPayment, setAddingSettlementPayment] = useState(false);
  const [newSpAmount, setNewSpAmount] = useState('');
  const [newSpDate, setNewSpDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newSpNotes, setNewSpNotes] = useState('');
  const [savingSp, setSavingSp] = useState(false);
  const [deletingSpId, setDeletingSpId] = useState<number | null>(null);

  const totalDeposit = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(reservation.total_amount) - totalDeposit);
  const pct = reservation.total_amount > 0
    ? Math.round((totalDeposit / Number(reservation.total_amount)) * 100)
    : 0;

  useEffect(() => {
    reservationsApi.listPayments(reservation.id)
      .then(r => setPayments(r.data))
      .finally(() => setPaymentsLoading(false));
  }, [reservation.id]);

  useEffect(() => {
    if (!isAdmin) { setSettlement(null); return; }
    ownerSettlementsApi.list()
      .then(r => {
        const found = r.data.find(s => s.reservation_id === reservation.id) ?? null;
        setSettlement(found);
        if (found) {
          ownerSettlementsApi.listPayments(found.id)
            .then(pr => setSettlementPayments(pr.data))
            .catch(() => {});
        }
      })
      .catch(() => setSettlement(null));
  }, [reservation.id, isAdmin]);

  const handleAddPayment = async () => {
    if (!newAmount || Number(newAmount) <= 0) return;
    setSaving(true);
    try {
      const res = await reservationsApi.addPayment(reservation.id, {
        amount: Number(newAmount),
        paid_at: newDate,
        notes: newNotes || undefined,
      });
      setPayments(prev => [...prev, res.data].sort((a, b) => a.paid_at.localeCompare(b.paid_at)));
      setNewAmount('');
      setNewNotes('');
      setAddingPayment(false);
      onReservationChange?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    setDeletingId(id);
    try {
      await reservationsApi.deletePayment(reservation.id, id);
      setPayments(prev => prev.filter(p => p.id !== id));
      onReservationChange?.();
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSettlement = async () => {
    setCreating(true);
    try {
      const res = await ownerSettlementsApi.create({
        reservation_id: reservation.id,
        vehicle_id: reservation.vehicle_id ?? undefined,
        owner_percentage: 70,
      });
      setSettlement(res.data);
      setSettlementPayments([]);
    } finally {
      setCreating(false);
    }
  };

  const handleAddSettlementPayment = async () => {
    if (!settlement || settlement === 'loading' || !newSpAmount || Number(newSpAmount) <= 0) return;
    setSavingSp(true);
    try {
      await ownerSettlementsApi.addPayment(settlement.id, {
        amount: Number(newSpAmount),
        paid_at: newSpDate,
        notes: newSpNotes || undefined,
      });
      const [paymentsRes, settlementRes] = await Promise.all([
        ownerSettlementsApi.listPayments(settlement.id),
        ownerSettlementsApi.get(settlement.id),
      ]);
      setSettlementPayments(paymentsRes.data);
      setSettlement(settlementRes.data);
      setNewSpAmount('');
      setNewSpNotes('');
      setAddingSettlementPayment(false);
    } finally {
      setSavingSp(false);
    }
  };

  const handleDeleteSettlementPayment = async (paymentId: number) => {
    if (!settlement || settlement === 'loading') return;
    setDeletingSpId(paymentId);
    try {
      await ownerSettlementsApi.deletePayment(settlement.id, paymentId);
      const [paymentsRes, settlementRes] = await Promise.all([
        ownerSettlementsApi.listPayments(settlement.id),
        ownerSettlementsApi.get(settlement.id),
      ]);
      setSettlementPayments(paymentsRes.data);
      setSettlement(settlementRes.data);
    } finally {
      setDeletingSpId(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (!settlement || settlement === 'loading') return;
    setPdfLoading(true);
    try {
      const updated = await ownerSettlementsApi.generatePdf(settlement.id);
      setSettlement(updated.data);
      await ownerSettlementsApi.downloadPdf(settlement.id, settlement.settlement_number);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!settlement || settlement === 'loading') return;
    setPdfLoading(true);
    try {
      await ownerSettlementsApi.downloadPdf(settlement.id, settlement.settlement_number);
    } finally {
      setPdfLoading(false);
    }
  };

  const companyPct = reservation.vehicle_is_company_owned ? 1 : 0.3;
  const ownerPct   = reservation.vehicle_is_company_owned ? 0 : 0.7;

  return (
    <div className="space-y-4">
      {/* Financial summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen financiero</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatCOP(reservation.total_amount)}</p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(reservation.total_amount * companyPct)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Depósitos</p>
            <p className="text-lg font-bold text-green-700">{formatCOP(totalDeposit)}</p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(totalDeposit * companyPct)}</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCOP(remaining)}
            </p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(remaining * companyPct)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Pagado</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Split */}
        {reservation.total_amount > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {reservation.vehicle_is_company_owned ? 'Distribución (100% empresa)' : 'Distribución (70/30)'}
            </p>
            {!reservation.vehicle_is_company_owned && (
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-purple-400" />
                  <span className="text-gray-600">Propietario ({Math.round(ownerPct * 100)}%)</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCOP(reservation.total_amount * ownerPct)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-pink-400" />
                <span className="text-gray-600">Empresa ({Math.round(companyPct * 100)}%)</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCOP(reservation.total_amount * companyPct)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payments list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pagos recibidos</h2>
          {!addingPayment && (
            <button
              onClick={() => setAddingPayment(true)}
              className="flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-700 cursor-pointer"
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
                  <p className="text-sm font-semibold text-gray-900">{formatCOP(Number(p.amount))}</p>
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
          <div className="border border-pink-100 rounded-xl p-4 space-y-3 bg-pink-50/30">
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
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
                onClick={handleAddPayment}
                disabled={saving || !newAmount}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp cobro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enviar cobro por WhatsApp</h2>
        </div>
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700">{reservation.display_customer}</span>
            {(reservation.customer_whatsapp || reservation.customer_phone) && (
              <span className="text-xs text-gray-400 ml-2">
                · {reservation.customer_whatsapp || reservation.customer_phone}
              </span>
            )}
          </div>
          {(reservation.customer_whatsapp || reservation.customer_phone) ? (
            <a
              href={buildWaUrl(
                reservation.customer_whatsapp || reservation.customer_phone,
                buildCobroMsg(reservation, payments)
              )}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Enviar
            </a>
          ) : (
            <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
          )}
        </div>
      </div>

      {/* Owner Settlement — admin only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liquidación de propietario</h2>

          {reservation.vehicle_is_company_owned ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-800">Vehículo propiedad de Camino a mi Boda</p>
              <p className="text-sm text-green-700 mt-0.5">
                El 100% del ingreso ({formatCOP(reservation.total_amount)}) queda en la empresa. No se genera liquidación de propietario.
              </p>
            </div>
          ) : (
            <>
          {settlement === 'loading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Cargando...
            </div>
          )}

          {settlement === null && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No se ha generado una liquidación para esta reserva.</p>
              <button
                onClick={handleCreateSettlement}
                disabled={creating}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Generar Liquidación
              </button>
            </div>
          )}

          {settlement && settlement !== 'loading' && (() => {
            const spPaid = settlementPayments.reduce((s, p) => s + Number(p.amount), 0);
            const spRemaining = Math.max(0, Number(settlement.owner_amount) - spPaid);
            const spPct = settlement.owner_amount > 0
              ? Math.round((spPaid / Number(settlement.owner_amount)) * 100)
              : 0;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-mono">{settlement.settlement_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    settlement.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {settlement.status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Propietario ({settlement.owner_percentage}%)</p>
                    <p className="text-base font-bold text-purple-700">{formatCOP(settlement.owner_amount)}</p>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Empresa ({100 - settlement.owner_percentage}%)</p>
                    <p className="text-base font-bold text-pink-700">{formatCOP(settlement.company_amount)}</p>
                  </div>
                </div>

                {/* Abonos al propietario */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Abonos al propietario</p>
                    {!addingSettlementPayment && (
                      <button
                        onClick={() => setAddingSettlementPayment(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 cursor-pointer"
                      >
                        <Plus size={12} /> Agregar abono
                      </button>
                    )}
                  </div>

                  {settlementPayments.length === 0 && !addingSettlementPayment ? (
                    <p className="text-xs text-gray-400">Sin abonos registrados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {settlementPayments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{formatCOP(Number(p.amount))}</p>
                            <p className="text-xs text-gray-400">{formatDate(p.paid_at)}{p.notes ? ` · ${p.notes}` : ''}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteSettlementPayment(p.id)}
                            disabled={deletingSpId === p.id}
                            className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deletingSpId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {addingSettlementPayment && (
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
                          onClick={() => { setAddingSettlementPayment(false); setNewSpAmount(''); setNewSpNotes(''); }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSettlementPayment}
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
                    onClick={handleGeneratePdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                    {settlement.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
                  </button>
                  {settlement.pdf_path && (
                    <button
                      onClick={handleDownloadPdf}
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
          })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
