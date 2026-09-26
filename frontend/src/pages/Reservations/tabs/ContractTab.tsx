import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import type { ReservationContract, PaymentScheduleItem, ClientType, ClientIdType } from '../../../types/reservationContract';
import { reservationsApi } from '../../../api/reservations';
import { reservationContractsApi } from '../../../api/reservationContracts';
import { buildContactWaUrl, whatsAppLinkProps, withSignature } from '../../../utils/whatsapp';
import LastUpdated from '../../../components/ui/LastUpdated';
import MediaConsentCard from './MediaConsentCard';
import { formatCOP } from '../../../utils/format';

// Same style as FinanceTab.tsx's buildCobroMsg/buildOwnerMsg — no emojis
// (they corrupt to "?" through encodeURIComponent for wa.me links, per
// the confirmed no-emoji rule for WhatsApp messages), only *bold* markup.
function buildContractMsg(reservation: Reservation, contract: ReservationContract): string {
  const greetName = (contract.client_name || reservation.display_customer).split(' ')[0];
  const hasVehicle = !!reservation.display_vehicle && reservation.display_vehicle !== '—';

  const lines: string[] = [
    `Hola ${greetName}, te compartimos el contrato de arrendamiento con Camino a mi Boda${hasVehicle ? ` — ${reservation.display_vehicle}` : ''}:`,
    '',
    `*Contrato:* ${contract.contract_number}`,
  ];

  if (reservation.event_date) {
    const evDate = new Date(reservation.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push(`*Fecha del evento:* ${evDate}`);
  }
  lines.push(`*Valor total:* ${formatCOP(Number(reservation.total_amount))}`, '');
  lines.push('Te adjuntamos el PDF con todas las condiciones — cualquier duda nos escribes.');

  return withSignature(lines.join('\n'));
}

interface ContractTabProps {
  reservation: Reservation;
  onReservationChange: () => void;
}

export default function ContractTab({ reservation, onReservationChange }: ContractTabProps) {
  const [contract, setContract] = useState<ReservationContract | null>(null);
  const [scheduleItems, setScheduleItems] = useState<PaymentScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable copies — kept separate from `contract` so typing doesn't PUT on
  // every keystroke; "Guardar datos del arrendatario" commits them.
  const [clientType, setClientType] = useState<ClientType>('individual');
  const [clientName, setClientName] = useState('');
  const [clientIdType, setClientIdType] = useState<ClientIdType>('CC');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientLegalRepName, setClientLegalRepName] = useState('');
  const [clientLegalRepIdNumber, setClientLegalRepIdNumber] = useState('');
  const [authorizedUse, setAuthorizedUse] = useState('');
  const [specialConditions, setSpecialConditions] = useState('');
  const [scheduleAvailability, setScheduleAvailability] = useState('');
  const [usageLocation, setUsageLocation] = useState('');
  const [authorizedRoutes, setAuthorizedRoutes] = useState('');
  const [savingClientInfo, setSavingClientInfo] = useState(false);

  const [decorationDetails, setDecorationDetails] = useState(reservation.decoration_details ?? '');
  const [decorationRemovalDate, setDecorationRemovalDate] = useState(reservation.decoration_removal_date ?? '');
  const [savingDecoration, setSavingDecoration] = useState(false);

  const [newDescription, setNewDescription] = useState('');
  const [newAmountKind, setNewAmountKind] = useState<'percentage' | 'fixed'>('percentage');
  const [newAmountValue, setNewAmountValue] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const whatsappPhone = reservation.customer_whatsapp || reservation.customer_phone;

  const syncFormFromContract = (c: ReservationContract) => {
    setClientType(c.client_type);
    setClientName(c.client_name);
    setClientIdType(c.client_id_type);
    setClientIdNumber(c.client_id_number);
    setClientLegalRepName(c.client_legal_rep_name ?? '');
    setClientLegalRepIdNumber(c.client_legal_rep_id_number ?? '');
    setAuthorizedUse(c.authorized_use ?? '');
    setSpecialConditions(c.special_conditions ?? '');
    setScheduleAvailability(c.schedule_availability ?? '');
    setUsageLocation(c.usage_location ?? '');
    setAuthorizedRoutes(c.authorized_routes ?? '');
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reservationContractsApi.getOrCreate(reservation.id),
      reservationContractsApi.listPaymentSchedule(reservation.id),
    ]).then(([contractRes, scheduleRes]) => {
      setContract(contractRes.data);
      syncFormFromContract(contractRes.data);
      setScheduleItems(scheduleRes.data);
    }).finally(() => setLoading(false));
  }, [reservation.id]);

  useEffect(() => {
    setDecorationDetails(reservation.decoration_details ?? '');
    setDecorationRemovalDate(reservation.decoration_removal_date ?? '');
  }, [reservation.decoration_details, reservation.decoration_removal_date]);

  const handleSaveClientInfo = async () => {
    if (!contract) return;
    setSavingClientInfo(true);
    try {
      const res = await reservationContractsApi.update(reservation.id, {
        client_type: clientType,
        client_name: clientName,
        client_id_type: clientIdType,
        client_id_number: clientIdNumber,
        client_legal_rep_name: clientType === 'company' ? clientLegalRepName || undefined : null,
        client_legal_rep_id_number: clientType === 'company' ? clientLegalRepIdNumber || undefined : null,
        authorized_use: authorizedUse || undefined,
        special_conditions: specialConditions || undefined,
        schedule_availability: scheduleAvailability || undefined,
        usage_location: usageLocation || undefined,
        authorized_routes: authorizedRoutes || undefined,
      });
      setContract(res.data);
    } finally {
      setSavingClientInfo(false);
    }
  };

  const handleSaveDecoration = async () => {
    setSavingDecoration(true);
    try {
      await reservationsApi.update(reservation.id, {
        decoration_details: decorationDetails || null,
        decoration_removal_date: decorationRemovalDate || null,
      });
      onReservationChange();
    } finally {
      setSavingDecoration(false);
    }
  };

  const handleAddScheduleItem = async () => {
    if (!newDescription || !newAmountValue) return;
    setSavingItem(true);
    try {
      const res = await reservationContractsApi.addPaymentScheduleItem(reservation.id, {
        description: newDescription,
        ...(newAmountKind === 'percentage'
          ? { percentage: Number(newAmountValue) }
          : { fixed_amount: Number(newAmountValue) }),
      });
      setScheduleItems(prev => [...prev, res.data]);
      setNewDescription('');
      setNewAmountValue('');
      setAddingItem(false);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteScheduleItem = async (itemId: number) => {
    setDeletingItemId(itemId);
    try {
      await reservationContractsApi.deletePaymentScheduleItem(reservation.id, itemId);
      setScheduleItems(prev => prev.filter(i => i.id !== itemId));
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await reservationContractsApi.generatePdf(reservation.id);
      setContract(res.data);
    } catch {
      alert('Error al generar el PDF del contrato.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;
    setDownloadingPdf(true);
    try {
      await reservationContractsApi.downloadPdf(reservation.id, contract.contract_number);
    } catch {
      alert('Error al descargar el PDF del contrato.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Fire-and-forget — doesn't block opening WhatsApp, just persists that
  // the contract has been sent (ContractStatus already existed on the
  // model but nothing ever flipped it to "sent" until now).
  const handleContractSent = () => {
    if (contract && contract.status !== 'sent') {
      reservationContractsApi.update(reservation.id, { status: 'sent' })
        .then(res => setContract(res.data));
    }
  };

  if (loading || !contract) {
    return <div className="flex justify-center py-10 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>;
  }

  const isCompany = clientType === 'company';

  // Reconciles the payment PLAN (this schedule) against what's actually
  // been paid (fila 56) — Reservation.remaining_balance already nets out
  // both cash payments and retención en la fuente (see the model), so
  // total_amount - remaining_balance is exactly "how much of the client's
  // obligation is discharged so far", no separate ReservationPayment fetch
  // needed. A schedule line has no date or payment link of its own (it's a
  // free-text plan, not a ledger) — the only thing that can be reconciled
  // is cumulative amount, in display_order sequence: line 1 is "covered"
  // first, then line 2, etc. Deliberately not validated to sum to 100%
  // (fila 56 already decided that) — any shortfall/excess just saturates
  // per line without special-casing.
  const totalAmount = Number(reservation.total_amount);
  const paidSoFar = totalAmount - Number(reservation.remaining_balance);
  let cumulativeTarget = 0;
  const scheduleWithStatus = [...scheduleItems]
    .sort((a, b) => a.display_order - b.display_order)
    .map(item => {
      const targetAmount = item.percentage != null
        ? (Number(item.percentage) / 100) * totalAmount
        : Number(item.fixed_amount ?? 0);
      const coveredOfThisItem = Math.max(0, Math.min(targetAmount, paidSoFar - cumulativeTarget));
      cumulativeTarget += targetAmount;
      const status: 'paid' | 'partial' | 'pending' =
        targetAmount <= 0 || coveredOfThisItem >= targetAmount ? 'paid'
        : coveredOfThisItem > 0 ? 'partial'
        : 'pending';
      return { ...item, targetAmount, coveredOfThisItem, status };
    });
  const planTotal = cumulativeTarget;
  const planCovered = Math.min(paidSoFar, planTotal);
  const planPct = planTotal > 0 ? Math.round((planCovered / planTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <LastUpdated date={contract.updated_at} className="justify-end" />

      {/* Datos del arrendatario */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos del arrendatario</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">{contract.contract_number}</span>
            {contract.status === 'sent' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">Enviado</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {(['individual', 'company'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setClientType(type)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                clientType === type
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              {type === 'individual' ? 'Persona Natural' : 'Empresa'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">{isCompany ? 'Razón social' : 'Nombre'}</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder={isCompany ? 'Ej: Eventos Rosa S.A.S.' : 'Ej: Beatriz Elena Velásquez'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {isCompany && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Representante legal</label>
                <input
                  type="text"
                  value={clientLegalRepName}
                  onChange={e => setClientLegalRepName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">C.C. representante legal</label>
                <input
                  type="text"
                  value={clientLegalRepIdNumber}
                  onChange={e => setClientLegalRepIdNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de identificación</label>
            <select
              value={clientIdType}
              onChange={e => setClientIdType(e.target.value as ClientIdType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="CC">Cédula de Ciudadanía (CC)</option>
              <option value="NIT">NIT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de identificación</label>
            <input
              type="text"
              value={clientIdNumber}
              onChange={e => setClientIdNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Uso autorizado del vehículo (opcional)</label>
            <textarea
              rows={2}
              value={authorizedUse}
              onChange={e => setAuthorizedUse(e.target.value)}
              placeholder={contract.default_authorized_use || 'Describe la finalidad y forma en que se usará el vehículo…'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Vacío = se usa el texto de arriba (según el tipo de evento del timeline) en el PDF.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Otras condiciones especiales (opcional)</label>
            <textarea
              rows={2}
              value={specialConditions}
              onChange={e => setSpecialConditions(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Horario / disponibilidad (opcional)</label>
            <textarea
              rows={2}
              value={scheduleAvailability}
              onChange={e => setScheduleAvailability(e.target.value)}
              placeholder="Se completa automáticamente según el timeline si se deja vacío."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lugar de utilización (opcional)</label>
            <textarea
              rows={2}
              value={usageLocation}
              onChange={e => setUsageLocation(e.target.value)}
              placeholder="Se completa automáticamente según el timeline si se deja vacío."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Recorridos autorizados (opcional)</label>
            <textarea
              rows={2}
              value={authorizedRoutes}
              onChange={e => setAuthorizedRoutes(e.target.value)}
              placeholder="Se completa automáticamente según el timeline si se deja vacío."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveClientInfo}
            disabled={savingClientInfo}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {savingClientInfo && <Loader2 size={14} className="animate-spin" />}
            Guardar datos del arrendatario
          </button>
        </div>
      </div>

      {/* Decoración / vinilo / ploteo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Decoración, vinilo o ploteo</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Condiciones autorizadas (vacío = no autorizado)</label>
          <textarea
            rows={2}
            value={decorationDetails}
            onChange={e => setDecorationDetails(e.target.value)}
            placeholder="Ej: Vinilo con logo de marca en puertas laterales."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha límite de retiro (opcional)</label>
            <input
              type="date"
              value={decorationRemovalDate}
              onChange={e => setDecorationRemovalDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Vacío = "al finalizar el evento" en el contrato.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveDecoration}
            disabled={savingDecoration}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {savingDecoration && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>

      {/* Plan de pagos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan de pagos</h2>
          {!addingItem && (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer"
            >
              <Plus size={12} /> Agregar
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Sin líneas configuradas, el contrato usa el texto por defecto (50% al confirmar la reserva, 50% de saldo).
        </p>

        {scheduleItems.length > 0 && (
          <>
            {/* Reconciliation summary — compares the plan against what's
                actually been paid (reservation.total_amount/remaining_balance),
                the manual comparison fila 56 flagged as still missing. */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Pagado {formatCOP(planCovered)} de {formatCOP(planTotal)} del plan</span>
                <span className="font-semibold text-gray-600">{planPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-400 rounded-full transition-all"
                  style={{ width: `${Math.min(planPct, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {scheduleWithStatus.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-400">
                      {item.percentage != null ? `${item.percentage}% del total` : formatCOP(item.fixed_amount ?? 0)}
                    </p>
                  </div>
                  {item.status === 'paid' && (
                    <span className="text-xs font-medium text-green-600 whitespace-nowrap">✓ Pagado</span>
                  )}
                  {item.status === 'partial' && (
                    <span className="text-xs font-medium text-amber-600 whitespace-nowrap">
                      {formatCOP(item.coveredOfThisItem)} de {formatCOP(item.targetAmount)}
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">Pendiente</span>
                  )}
                  <button
                    onClick={() => handleDeleteScheduleItem(item.id)}
                    disabled={deletingItemId === item.id}
                    className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingItemId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {addingItem && (
          <div className="border border-brand-100 rounded-xl p-3 space-y-2 bg-brand-50/30">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Ej: Al confirmar la reserva"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              {(['percentage', 'fixed'] as const).map(kind => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setNewAmountKind(kind)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    newAmountKind === kind ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {kind === 'percentage' ? '% del total' : 'Monto fijo'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {newAmountKind === 'percentage' ? 'Porcentaje *' : 'Monto (COP) *'}
              </label>
              <input
                type="number"
                min="0"
                step={newAmountKind === 'percentage' ? '0.01' : '1000'}
                value={newAmountValue}
                onChange={e => setNewAmountValue(e.target.value)}
                placeholder={newAmountKind === 'percentage' ? 'Ej: 40' : 'Ej: 500000'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setAddingItem(false); setNewDescription(''); setNewAmountValue(''); }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddScheduleItem}
                disabled={savingItem || !newDescription || !newAmountValue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingItem ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Documento</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {contract.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
          </button>
          {contract.pdf_path && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-2 border border-brand-200 text-brand-700 hover:bg-brand-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Descargar PDF
            </button>
          )}
          {contract.pdf_path && (
            (whatsappPhone || reservation.customer_whatsapp_username) ? (
              <a
                href={buildContactWaUrl(whatsappPhone, reservation.customer_whatsapp_username, buildContractMsg(reservation, contract)) ?? undefined}
                {...whatsAppLinkProps()}
                onClick={handleContractSent}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            ) : (
              <span className="flex items-center text-xs text-gray-400 px-2">Cliente sin teléfono para WhatsApp</span>
            )
          )}
        </div>
        {contract.pdf_path && (whatsappPhone || reservation.customer_whatsapp_username) && (
          <p className="text-xs text-gray-400">Descarga el PDF y adjúntalo manualmente en el chat que se abre.</p>
        )}
      </div>

      {/* Autorización de imagen/video/datos — deliberately a separate
          document/model (MediaConsentCard), not a clause here: the owner
          was explicit this can't be tied to the rental contract above
          (wishlist fila 70). */}
      <MediaConsentCard reservation={reservation} />
    </div>
  );
}
