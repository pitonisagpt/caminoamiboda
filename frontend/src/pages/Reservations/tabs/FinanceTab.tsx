import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Download, FileText, Link2, Loader2, MessageCircle, Plus, Receipt, Trash2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import type { BillingDocumentListItem, DocumentStatus } from '../../../types';
import { reservationsApi } from '../../../api/reservations';
import type { ReservationPayment } from '../../../api/reservations';
import { billingDocumentsApi } from '../../../api/billingDocuments';
import { ownerSettlementsApi, type OwnerSettlement, type OwnerSettlementPayment } from '../../../api/ownerSettlements';
import { serviceOrdersApi } from '../../../api/serviceOrders';
import type { ServiceOrder } from '../../../types/serviceOrder';
import { useAuth } from '../../../context/AuthContext';
import SettlementCard from './SettlementCard';

const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  paid: 'Pagado',
};
const DOC_STATUS_STYLE: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function buildCobroMsg(reservation: Reservation, payments: ReservationPayment[], recipientFirstName?: string): string {
  const greetName = recipientFirstName ?? reservation.display_customer.split(' ')[0];
  const reservaRef = recipientFirstName ? `la reserva de ${reservation.display_customer}` : 'tu reserva';
  const totalDeposit = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(reservation.total_amount) - totalDeposit);

  const lines: string[] = [
    `Hola ${greetName}, aquí está el resumen de pagos de ${reservaRef} con Camino a mi Boda${reservation.display_vehicle && reservation.display_vehicle !== '—' ? ` — ${reservation.display_vehicle}` : ''}:`,
    '',
    `*Valor total:* ${formatCOP(reservation.total_amount)}`,
    '',
  ];

  if (payments.length > 0) {
    lines.push('*Abonos realizados:*');
    payments.forEach(p => {
      const date = new Date(p.paid_at + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      const note = p.notes ? ` (${p.notes})` : '';
      const withholding = p.payment_type === 'withholding'
        ? ` [Retención en la fuente${p.withholding_percentage ? ` ${p.withholding_percentage}%` : ''}]`
        : '';
      lines.push(`  - ${date}: ${formatCOP(Number(p.amount))}${note}${withholding}`);
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

function buildOwnerMsg(
  reservation: Reservation,
  settlement: OwnerSettlement | null,
  settlementPayments: OwnerSettlementPayment[],
  ownerFirstName: string,
  retentionTotal: number,
): string {
  const ownerPct = settlement ? settlement.owner_percentage : (reservation.vehicle_is_company_owned ? 0 : 70);
  const ownerAmount = settlement ? settlement.owner_amount : Number(reservation.total_amount) * (ownerPct / 100);
  const remainingToOwner = settlement ? settlement.remaining_to_owner : ownerAmount;
  // Full share had there been no retention — only used to detect whether
  // ownerAmount was actually reduced for it, so the note below only appears
  // when a discount really happened (not every time there's a retention).
  const fullShareWithoutRetention = Number(reservation.total_amount) * (ownerPct / 100);
  const wasDiscountedForRetention = retentionTotal > 0 && ownerAmount < fullShareWithoutRetention - 1;

  const lines: string[] = [
    `Hola ${ownerFirstName}, aquí está el resumen de la reserva con Camino a mi Boda${reservation.display_vehicle && reservation.display_vehicle !== '—' ? ` — ${reservation.display_vehicle}` : ''}:`,
    '',
    `*Valor total (cliente):* ${formatCOP(reservation.total_amount)}`,
    `*Tu parte (${ownerPct}%):* ${formatCOP(ownerAmount)}`,
  ];

  if (retentionTotal > 0) {
    lines.push(`_El cliente retuvo ${formatCOP(retentionTotal)} en la fuente en esta reserva${wasDiscountedForRetention ? ' — tu parte de arriba ya descuenta lo que te correspondería de eso' : ''}._`);
  }
  lines.push('');

  if (settlementPayments.length > 0) {
    lines.push('*Abonos recibidos:*');
    settlementPayments.forEach(p => {
      const note = p.notes ? ` (${p.notes})` : '';
      lines.push(`  - ${formatDate(p.paid_at)}: ${formatCOP(Number(p.amount))}${note}`);
    });
    lines.push('');
  }

  if (remainingToOwner > 0) {
    lines.push(`*Saldo pendiente para ti:* ${formatCOP(remainingToOwner)}`);
    lines.push('');
  }

  if (reservation.event_date) {
    lines.push(`*Fecha del evento:* ${new Date(reservation.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    lines.push('');
  }

  lines.push('Camino a mi Boda');
  lines.push('https://www.instagram.com/caminoamiboda');

  return lines.join('\n');
}

export default function FinanceTab({
  reservation,
  onReservationChange,
}: {
  reservation: Reservation;
  onReservationChange?: () => void;
}) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [billingDocs, setBillingDocs] = useState<BillingDocumentListItem[]>([]);
  const [billingDocsLoading, setBillingDocsLoading] = useState(true);
  const [showDocLinkSearch, setShowDocLinkSearch] = useState(false);
  const [docLinkQuery, setDocLinkQuery] = useState('');
  const [docLinkResults, setDocLinkResults] = useState<BillingDocumentListItem[]>([]);
  const [linkingDocId, setLinkingDocId] = useState<number | null>(null);
  const docLinkSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [payments, setPayments] = useState<ReservationPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const [newNotes, setNewNotes] = useState('');
  const [newPaymentType, setNewPaymentType] = useState<'cash' | 'withholding'>('cash');
  const [newWithholdingPct, setNewWithholdingPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // A reservation can have several vehicles, each settled separately.
  const [settlements, setSettlements] = useState<OwnerSettlement[] | 'loading'>('loading');
  const [settlementPaymentsMap, setSettlementPaymentsMap] = useState<Record<number, OwnerSettlementPayment[]>>({});
  const [creating, setCreating] = useState(false);
  const [ownerAmountOverride, setOwnerAmountOverride] = useState('');
  const [newSettlementVehicleId, setNewSettlementVehicleId] = useState('');

  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null | 'loading'>('loading');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderPdfLoading, setOrderPdfLoading] = useState(false);

  // "Depósitos" is cash-only — a retención en la fuente is never money that
  // reached the company, so it must never be counted as if it were a cash
  // deposit (mirrors the backend's deposit_paid, which excludes it too).
  const totalDeposit = payments.filter(p => p.payment_type === 'cash').reduce((s, p) => s + Number(p.amount), 0);
  const retentionTotal = payments.filter(p => p.payment_type === 'withholding').reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(reservation.total_amount) - totalDeposit - retentionTotal);
  const pct = reservation.total_amount > 0
    ? Math.round(((totalDeposit + retentionTotal) / Number(reservation.total_amount)) * 100)
    : 0;

  useEffect(() => {
    reservationsApi.listPayments(reservation.id)
      .then(r => setPayments(r.data))
      .finally(() => setPaymentsLoading(false));
  }, [reservation.id]);

  useEffect(() => {
    if (!isAdmin) { setBillingDocsLoading(false); return; }
    billingDocumentsApi.list({ reservation_id: reservation.id })
      .then(r => setBillingDocs(r.data))
      .catch(() => setBillingDocs([]))
      .finally(() => setBillingDocsLoading(false));
  }, [reservation.id, isAdmin]);

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
      await billingDocumentsApi.update(d.id, { reservation_id: reservation.id });
      setBillingDocs(prev => [{ ...d, reservation_id: reservation.id }, ...prev]);
      setShowDocLinkSearch(false);
      setDocLinkQuery('');
      setDocLinkResults([]);
    } catch {
      alert('Error al vincular el documento.');
    } finally {
      setLinkingDocId(null);
    }
  };

  useEffect(() => {
    if (!isAdmin) { setSettlements([]); return; }
    ownerSettlementsApi.list()
      .then(r => {
        const found = r.data.filter(s => s.reservation_id === reservation.id);
        setSettlements(found);
        found.forEach(s => {
          ownerSettlementsApi.listPayments(s.id)
            .then(pr => setSettlementPaymentsMap(prev => ({ ...prev, [s.id]: pr.data })))
            .catch(() => {});
        });
      })
      .catch(() => setSettlements([]));
  }, [reservation.id, isAdmin]);

  useEffect(() => {
    if (!isAdmin) { setServiceOrder(null); return; }
    serviceOrdersApi.list()
      .then(r => setServiceOrder(r.data.find(o => o.reservation_id === reservation.id) ?? null))
      .catch(() => setServiceOrder(null));
  }, [reservation.id, isAdmin]);

  const handleCreateServiceOrder = async () => {
    setCreatingOrder(true);
    try {
      const res = await serviceOrdersApi.create({
        reservation_id: reservation.id,
        vehicle_id: reservation.vehicle_id ?? undefined,
      });
      setServiceOrder(res.data);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleGenerateOrderPdf = async () => {
    if (!serviceOrder || serviceOrder === 'loading') return;
    setOrderPdfLoading(true);
    try {
      const updated = await serviceOrdersApi.generatePdf(serviceOrder.id);
      setServiceOrder(updated.data);
    } finally {
      setOrderPdfLoading(false);
    }
  };

  const handleDownloadOrderPdf = async () => {
    if (!serviceOrder || serviceOrder === 'loading') return;
    setOrderPdfLoading(true);
    try {
      await serviceOrdersApi.downloadPdf(serviceOrder.id, serviceOrder.order_number);
    } finally {
      setOrderPdfLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!newAmount || Number(newAmount) <= 0) return;
    setSaving(true);
    try {
      const res = await reservationsApi.addPayment(reservation.id, {
        amount: Number(newAmount),
        paid_at: newDate,
        notes: newNotes || undefined,
        payment_type: newPaymentType,
        withholding_percentage: newPaymentType === 'withholding' && newWithholdingPct ? Number(newWithholdingPct) : null,
      });
      setPayments(prev => [...prev, res.data].sort((a, b) => a.paid_at.localeCompare(b.paid_at)));
      setNewAmount('');
      setNewNotes('');
      setNewPaymentType('cash');
      setNewWithholdingPct('');
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

  const handleCreateSettlement = async (vehicleId?: number) => {
    setCreating(true);
    try {
      const res = await ownerSettlementsApi.create({
        reservation_id: reservation.id,
        vehicle_id: vehicleId ?? reservation.vehicle_id ?? undefined,
        owner_percentage: 70,
        ...(ownerAmountOverride ? { owner_amount_override: Number(ownerAmountOverride) } : {}),
      });
      setSettlements(prev => prev === 'loading' ? [res.data] : [...prev, res.data]);
      setSettlementPaymentsMap(prev => ({ ...prev, [res.data.id]: [] }));
      setOwnerAmountOverride('');
      setNewSettlementVehicleId('');
    } finally {
      setCreating(false);
    }
  };

  const handleAddSettlementPayment = async (settlementId: number, amount: number, paidAt: string, notes: string) => {
    await ownerSettlementsApi.addPayment(settlementId, { amount, paid_at: paidAt, notes: notes || undefined });
    const [paymentsRes, settlementRes] = await Promise.all([
      ownerSettlementsApi.listPayments(settlementId),
      ownerSettlementsApi.get(settlementId),
    ]);
    setSettlementPaymentsMap(prev => ({ ...prev, [settlementId]: paymentsRes.data }));
    setSettlements(prev => prev === 'loading' ? prev : prev.map(s => s.id === settlementId ? settlementRes.data : s));
  };

  const handleDeleteSettlementPayment = async (settlementId: number, paymentId: number) => {
    await ownerSettlementsApi.deletePayment(settlementId, paymentId);
    const [paymentsRes, settlementRes] = await Promise.all([
      ownerSettlementsApi.listPayments(settlementId),
      ownerSettlementsApi.get(settlementId),
    ]);
    setSettlementPaymentsMap(prev => ({ ...prev, [settlementId]: paymentsRes.data }));
    setSettlements(prev => prev === 'loading' ? prev : prev.map(s => s.id === settlementId ? settlementRes.data : s));
  };

  const handleGeneratePdf = async (settlementId: number) => {
    const updated = await ownerSettlementsApi.generatePdf(settlementId);
    setSettlements(prev => prev === 'loading' ? prev : prev.map(s => s.id === settlementId ? updated.data : s));
    await ownerSettlementsApi.downloadPdf(settlementId, updated.data.settlement_number);
  };

  const handleDownloadPdf = async (settlementId: number, settlementNumber: string) => {
    await ownerSettlementsApi.downloadPdf(settlementId, settlementNumber);
  };

  const companyPct = reservation.vehicle_is_company_owned ? 1 : 0.3;
  const ownerPct   = reservation.vehicle_is_company_owned ? 0 : 0.7;

  // The WhatsApp message below and the "reservation-level" vehicle_is_company_owned
  // check above are scoped to the primary vehicle/owner (reservation.owner_name) —
  // matches this section's out-of-scope status for multi-vehicle (see the settlement
  // cards below for the per-vehicle breakdown instead).
  const hasVehicles = reservation.vehicles.length > 0;
  const unsettledVehicles = hasVehicles
    ? reservation.vehicles.filter(v => settlements === 'loading' || !settlements.some(s => s.vehicle_id === v.id))
    : [];
  const unsettledCompanyOwned = unsettledVehicles.filter(v => v.is_company_owned);
  const unsettledPayable = unsettledVehicles.filter(v => !v.is_company_owned);
  const selectedNewVehicleId = newSettlementVehicleId || String(unsettledPayable[0]?.id ?? '');

  const primarySettlement = settlements === 'loading' ? null : (settlements.find(s => s.vehicle_id === reservation.vehicle_id) ?? settlements[0] ?? null);
  const primarySettlementPayments = primarySettlement ? (settlementPaymentsMap[primarySettlement.id] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Financial summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen financiero</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatCOP(reservation.total_amount)}</p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(reservation.total_amount * companyPct)}</p>}
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Depósitos</p>
            <p className="text-lg font-bold text-green-700">{formatCOP(totalDeposit)}</p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(totalDeposit * companyPct)}</p>}
          </div>
          <div className={`rounded-xl p-4 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCOP(remaining)}
            </p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(remaining * companyPct)}</p>}
          </div>
        </div>

        {retentionTotal > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-amber-800">Retenido en la fuente (no es efectivo recibido)</span>
            <span className="font-semibold text-amber-800">{formatCOP(retentionTotal)}</span>
          </div>
        )}

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

        {/* Split — admin only, same boundary as the owner settlement below */}
        {isAdmin && reservation.total_amount > 0 && (
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
                <DollarSign size={14} className="text-brand-400" />
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

      {/* WhatsApp cobro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enviar cobro por WhatsApp</h2>
        </div>
        {[
          { label: 'Cliente', name: reservation.display_customer, phone: reservation.customer_whatsapp || reservation.customer_phone, username: reservation.customer_whatsapp_username, recipientFirstName: undefined as string | undefined },
          ...(reservation.display_contact
            ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone, username: reservation.contact_whatsapp_username, recipientFirstName: reservation.display_contact.split(' ')[0] }]
            : []),
        ].map(({ label, name, phone, username, recipientFirstName }) => (
          <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-sm text-gray-500 ml-2">{name}</span>
              {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
            </div>
            {phone ? (
              <a
                href={buildWaUrl(phone, buildCobroMsg(reservation, payments, recipientFirstName))}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Enviar
              </a>
            ) : username ? (
              <span className="text-xs text-gray-400 shrink-0" title="Sin teléfono — buscar este usuario en WhatsApp">@{username} · buscar en WhatsApp</span>
            ) : (
              <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
            )}
          </div>
        ))}
      </div>

      {/* Billing documents (cuentas de cobro) — admin only */}
      {isAdmin && (
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
                onClick={() => navigate(`/documentos/nuevo?reservation_id=${reservation.id}`)}
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
      )}

      {/* WhatsApp liquidación al propietario — admin only, same privacy boundary as the settlement section below */}
      {isAdmin && reservation.owner_name && !reservation.vehicle_is_company_owned && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enviar liquidación al propietario por WhatsApp</h2>
          </div>
          <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">Propietario</span>
              <span className="text-sm text-gray-500 ml-2">{reservation.owner_name}</span>
              {reservation.owner_whatsapp && <span className="text-xs text-gray-400 ml-2">· {reservation.owner_whatsapp}</span>}
            </div>
            {reservation.owner_whatsapp ? (
              <a
                href={buildWaUrl(
                  reservation.owner_whatsapp,
                  buildOwnerMsg(reservation, primarySettlement, primarySettlementPayments, reservation.owner_name.split(' ')[0], retentionTotal)
                )}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Enviar
              </a>
            ) : reservation.owner_whatsapp_username ? (
              <span className="text-xs text-gray-400 shrink-0" title="Sin teléfono — buscar este usuario en WhatsApp">@{reservation.owner_whatsapp_username} · buscar en WhatsApp</span>
            ) : (
              <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
            )}
          </div>
        </div>
      )}

      {/* Service Order — admin only, same boundary as the settlement below */}
      {isAdmin && reservation.owner_name && !reservation.vehicle_is_company_owned && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Orden de servicio</h2>

          {serviceOrder === 'loading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Cargando...
            </div>
          )}

          {serviceOrder === null && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No se ha generado una orden de servicio para esta reserva.</p>
              <button
                onClick={handleCreateServiceOrder}
                disabled={creatingOrder}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {creatingOrder ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Generar Orden de Servicio
              </button>
            </div>
          )}

          {serviceOrder && serviceOrder !== 'loading' && (
            <div className="space-y-3">
              <span className="text-sm text-gray-500 font-mono">{serviceOrder.order_number}</span>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleGenerateOrderPdf}
                  disabled={orderPdfLoading}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                >
                  {orderPdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {serviceOrder.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
                </button>
                {serviceOrder.pdf_path && (
                  <button
                    onClick={handleDownloadOrderPdf}
                    disabled={orderPdfLoading}
                    className="flex items-center gap-2 border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {orderPdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Descargar PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Owner Settlement — admin only. A reservation can have several
          vehicles, so this can render several settlement cards — one per
          vehicle that isn't company-owned. */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liquidación de propietario</h2>

          {!hasVehicles && reservation.vehicle_is_company_owned ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-800">Vehículo propiedad de Camino a mi Boda</p>
              <p className="text-sm text-green-700 mt-0.5">
                El 100% del ingreso ({formatCOP(reservation.total_amount)}) queda en la empresa. No se genera liquidación de propietario.
              </p>
            </div>
          ) : (
            <>
          {settlements === 'loading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Cargando...
            </div>
          )}

          {settlements !== 'loading' && unsettledCompanyOwned.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-800">
                {unsettledCompanyOwned.length > 1 ? 'Vehículos propiedad de Camino a mi Boda' : 'Vehículo propiedad de Camino a mi Boda'}
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                {unsettledCompanyOwned.map(v => v.display_name).join(', ')} — el 100% de su ingreso queda en la empresa. No se genera liquidación de propietario.
              </p>
            </div>
          )}

          {settlements !== 'loading' && unsettledPayable.length > 0 && (
            <div className="space-y-2">
              {settlements.length === 0 && unsettledCompanyOwned.length === 0 && (
                <p className="text-sm text-gray-500">No se ha generado una liquidación para esta reserva.</p>
              )}
              {retentionTotal > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  Esta reserva tiene <strong>{formatCOP(retentionTotal)}</strong> retenido en la fuente — esa
                  plata nunca llegó como efectivo. Decide si el propietario recibe su parte sobre ese monto o no
                  usando el monto manual de abajo.
                </div>
              )}
              <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                {unsettledPayable.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vehículo</label>
                    <select
                      value={selectedNewVehicleId}
                      onChange={e => setNewSettlementVehicleId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {unsettledPayable.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {v.display_name}{v.license_plate ? ` (${v.license_plate})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto manual para el propietario (COP, opcional)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={ownerAmountOverride}
                    onChange={e => setOwnerAmountOverride(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {/* Persistent, not just a placeholder — stays visible once
                      the user starts typing a different amount. */}
                  <p className="text-xs text-gray-400 mt-1">
                    Déjalo vacío para usar el 70% por defecto ({formatCOP(Number(reservation.total_amount) * 0.7)}).
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCreateSettlement(selectedNewVehicleId ? Number(selectedNewVehicleId) : undefined)}
                    disabled={creating}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {creating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Generar Liquidación
                  </button>
                </div>
              </div>
            </div>
          )}

          {settlements !== 'loading' && settlements.length > 0 && (
            <div className="space-y-3">
              {settlements.map(s => (
                <SettlementCard
                  key={s.id}
                  settlement={s}
                  vehicleLabel={reservation.vehicles.length > 1 ? reservation.vehicles.find(v => v.id === s.vehicle_id)?.display_name : null}
                  payments={settlementPaymentsMap[s.id] ?? []}
                  onAddPayment={(amount, paidAt, notes) => handleAddSettlementPayment(s.id, amount, paidAt, notes)}
                  onDeletePayment={(paymentId) => handleDeleteSettlementPayment(s.id, paymentId)}
                  onGeneratePdf={() => handleGeneratePdf(s.id)}
                  onDownloadPdf={() => handleDownloadPdf(s.id, s.settlement_number)}
                />
              ))}
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
