import { useEffect, useState } from 'react';
import { DollarSign, FileText, Gift, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import type { ReservationAddon, ReservationAddonForm } from '../../../types/reservationAddon';
import { reservationsApi } from '../../../api/reservations';
import type { ReservationPayment } from '../../../api/reservations';
import { ownerSettlementsApi, type OwnerSettlement, type OwnerSettlementPayment } from '../../../api/ownerSettlements';
import { EntityLink } from '../../../components/EntityLink';
import ServiceOrderSection from './ServiceOrderSection';
import BillingDocumentsSection from './BillingDocumentsSection';
import PaymentsSection from './PaymentsSection';
import { reservationAddonsApi, type ReservationAddonPayment } from '../../../api/reservationAddons';
import AddonPaymentLedger from './AddonPaymentLedger';
import { addonPackagesApi, type AddonPackage } from '../../../api/addonPackages';
import { useAuth } from '../../../context/AuthContext';
import SettlementCard from './SettlementCard';
import { buildContactWaUrl, whatsAppLinkProps } from '../../../utils/whatsapp';
import LastUpdated from '../../../components/ui/LastUpdated';
import { formatCOP } from '../../../utils/format';
import { buildCobroMsg, buildDetalleMsg, buildOwnerMsg } from './financeMessages';

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

  // A reservation can have several vehicles, each settled separately.
  const [settlements, setSettlements] = useState<OwnerSettlement[] | 'loading'>('loading');
  const [settlementPaymentsMap, setSettlementPaymentsMap] = useState<Record<number, OwnerSettlementPayment[]>>({});
  const [creating, setCreating] = useState(false);
  const [ownerAmountOverride, setOwnerAmountOverride] = useState('');
  const [newSettlementVehicleId, setNewSettlementVehicleId] = useState('');

  const [addons, setAddons] = useState<ReservationAddon[] | 'loading'>('loading');
  const [addonPaymentsMap, setAddonPaymentsMap] = useState<Record<number, ReservationAddonPayment[]>>({});
  const [addonPackages, setAddonPackages] = useState<AddonPackage[]>([]);
  const [addingAddon, setAddingAddon] = useState(false);
  const [savingAddon, setSavingAddon] = useState(false);
  const [deletingAddonId, setDeletingAddonId] = useState<number | null>(null);
  const emptyAddonForm: ReservationAddonForm = {
    name: '', description: '', provider_name: '', price: 0,
    company_percentage: 0, company_collects_payment: true,
  };
  const [addonForm, setAddonForm] = useState<ReservationAddonForm>(emptyAddonForm);

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

  // The addon list itself (name/price/provider/description) is plain
  // reservation-itemization info, not owner/company revenue split — so
  // unlike settlements it's loaded for every authenticated role, not just
  // admin, so operations can also see and quote it to clients. Only the
  // split-specific bits (% and the CRUD form) stay behind isAdmin below.
  useEffect(() => {
    reservationAddonsApi.list(reservation.id)
      .then(r => {
        setAddons(r.data);
        r.data.forEach(a => {
          reservationAddonsApi.listPayments(reservation.id, a.id)
            .then(pr => setAddonPaymentsMap(prev => ({ ...prev, [a.id]: pr.data })))
            .catch(() => {});
        });
      })
      .catch(() => setAddons([]));
  }, [reservation.id]);

  useEffect(() => {
    if (!isAdmin) { setAddonPackages([]); return; }
    addonPackagesApi.list()
      .then(r => setAddonPackages(r.data.filter(p => p.is_active)))
      .catch(() => setAddonPackages([]));
  }, [isAdmin]);

  const handlePickAddonPackage = (packageId: string) => {
    const pkg = addonPackages.find(p => p.id === Number(packageId));
    if (!pkg) { setAddonForm(f => ({ ...f, addon_package_id: null })); return; }
    setAddonForm(f => ({
      ...f,
      addon_package_id: pkg.id,
      name: pkg.name,
      description: pkg.description ?? '',
      price: Number(pkg.price),
    }));
  };

  const handleAddAddon = async () => {
    if (!addonForm.name.trim() || addonForm.price <= 0) return;
    setSavingAddon(true);
    try {
      const res = await reservationAddonsApi.create(reservation.id, addonForm);
      setAddons(prev => prev === 'loading' ? [res.data] : [...prev, res.data]);
      setAddonForm(emptyAddonForm);
      setAddingAddon(false);
    } finally {
      setSavingAddon(false);
    }
  };

  const handleDeleteAddon = async (id: number) => {
    setDeletingAddonId(id);
    try {
      await reservationAddonsApi.delete(reservation.id, id);
      setAddons(prev => prev === 'loading' ? prev : prev.filter(a => a.id !== id));
    } finally {
      setDeletingAddonId(null);
    }
  };

  // No single-addon GET exists (unlike ownerSettlementsApi.get), so
  // refreshing amount_paid/remaining_to_provider after a payment change
  // means re-fetching the whole addon list, same as it's loaded initially.
  const handleAddAddonPayment = async (addonId: number, amount: number, paidAt: string, notes: string) => {
    await reservationAddonsApi.addPayment(reservation.id, addonId, { amount, paid_at: paidAt, notes: notes || undefined });
    const [paymentsRes, addonsRes] = await Promise.all([
      reservationAddonsApi.listPayments(reservation.id, addonId),
      reservationAddonsApi.list(reservation.id),
    ]);
    setAddonPaymentsMap(prev => ({ ...prev, [addonId]: paymentsRes.data }));
    setAddons(addonsRes.data);
  };

  const handleDeleteAddonPayment = async (addonId: number, paymentId: number) => {
    await reservationAddonsApi.deletePayment(reservation.id, addonId, paymentId);
    const [paymentsRes, addonsRes] = await Promise.all([
      reservationAddonsApi.listPayments(reservation.id, addonId),
      reservationAddonsApi.list(reservation.id),
    ]);
    setAddonPaymentsMap(prev => ({ ...prev, [addonId]: paymentsRes.data }));
    setAddons(addonsRes.data);
  };

  const addonsTotal = addons === 'loading' ? 0 : addons.reduce((s, a) => s + Number(a.price), 0);
  const addonsCompanyTotal = addons === 'loading' ? 0 : addons.reduce((s, a) => s + Number(a.company_amount), 0);
  const addonsProviderTotal = addons === 'loading' ? 0 : addons.reduce((s, a) => s + Number(a.provider_amount), 0);
  // What the vehicle-owner settlement is actually based on — total minus
  // third-party addon services (ramo, letrero, etc.), matching the backend's
  // owner_settlements.py calculation exactly. Shown wherever the settlement
  // amount is previewed so it's never a silent server-side-only number.
  const settlementBaseValue = Math.max(0, Number(reservation.total_amount) - addonsTotal);

  const handleAddPayment = async (payload: {
    amount: number;
    paid_at: string;
    notes?: string;
    payment_type: 'cash' | 'withholding';
    withholding_percentage: number | null;
  }) => {
    const res = await reservationsApi.addPayment(reservation.id, payload);
    setPayments(prev => [...prev, res.data].sort((a, b) => a.paid_at.localeCompare(b.paid_at)));
    onReservationChange?.();
  };

  const handleDeletePayment = async (id: number) => {
    await reservationsApi.deletePayment(reservation.id, id);
    setPayments(prev => prev.filter(p => p.id !== id));
    onReservationChange?.();
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
  // Vehicle-only split, applied to settlementBaseValue (total minus addons)
  // rather than the full total — same base owner_settlements.py uses.
  const vehicleOwnerAmount = settlementBaseValue * ownerPct;
  const vehicleCompanyAmount = settlementBaseValue * companyPct;
  // What the company actually keeps across the WHOLE reservation: its cut of
  // the vehicle plus its cut of every addon (each addon has its own %,
  // usually 0 for a pass-through service like the florist).
  const totalCompanyAmount = vehicleCompanyAmount + addonsCompanyTotal;
  // Blended percentage so the "empresa" hints on Depósitos/Saldo below stay
  // roughly accurate now that addons can carry a different split than the
  // vehicle's 70/30 — falls back to the vehicle-only companyPct when there's
  // no total yet to avoid a 0/0.
  const blendedCompanyPct = Number(reservation.total_amount) > 0
    ? totalCompanyAmount / Number(reservation.total_amount)
    : companyPct;

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
      {/* Reflects payments (they touch Reservation.deposit_paid via
          _sync_deposit) but NOT an addon-payment or settlement-payment on
          its own — those live in their own tables and don't bump
          Reservation.updated_at. Good enough as a general staleness signal,
          not a substitute for the per-addon/per-settlement ledgers below. */}
      <LastUpdated date={reservation.updated_at} className="justify-end" />

      {/* Valor del vehículo — the number to actually communicate to the
          vehicle owner, distinct from the client-facing total once there are
          third-party addon services (florist, etc.) mixed into it. Only
          shown when it actually differs from the total, admin-only (same
          privacy boundary as the split below). */}
      {isAdmin && addonsTotal > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-1">Valor del vehículo — para comunicarle al propietario</p>
            <p className="text-2xl font-bold text-purple-900">{formatCOP(settlementBaseValue)}</p>
            <p className="text-xs text-purple-600 mt-1">
              Total {formatCOP(Number(reservation.total_amount))} − Servicios adicionales {formatCOP(addonsTotal)}
            </p>
          </div>
          <DollarSign size={32} className="text-purple-300 shrink-0" />
        </div>
      )}

      {/* Financial summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen financiero</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatCOP(reservation.total_amount)}</p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(totalCompanyAmount)}</p>}
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Depósitos</p>
            <p className="text-lg font-bold text-green-700">{formatCOP(totalDeposit)}</p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(totalDeposit * blendedCompanyPct)}</p>}
          </div>
          <div className={`rounded-xl p-4 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCOP(remaining)}
            </p>
            {isAdmin && <p className="text-xs text-brand-700 mt-0.5">empresa {formatCOP(remaining * blendedCompanyPct)}</p>}
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
              {reservation.vehicle_is_company_owned ? 'Distribución del vehículo (100% empresa)' : 'Distribución del vehículo (70/30)'}
              {addonsTotal > 0 && <span className="normal-case font-normal text-gray-400"> — sobre {formatCOP(settlementBaseValue)}, sin servicios adicionales</span>}
            </p>
            {!reservation.vehicle_is_company_owned && (
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-purple-400" />
                  <span className="text-gray-600">Propietario ({Math.round(ownerPct * 100)}%)</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCOP(vehicleOwnerAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-brand-400" />
                <span className="text-gray-600">Empresa ({Math.round(companyPct * 100)}%)</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCOP(vehicleCompanyAmount)}</span>
            </div>
            {addonsTotal > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-pink-400" />
                    <span className="text-gray-600">Empresa (servicios adicionales)</span>
                  </div>
                  <span className="font-semibold text-gray-900">{formatCOP(addonsCompanyTotal)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                  <span className="text-gray-700 font-medium">Total empresa (vehículo + servicios)</span>
                  <span className="font-bold text-gray-900">{formatCOP(totalCompanyAmount)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detalle de la reserva — plain itemized breakdown (vehicle + each
          addon service, with its provider/description), for quoting the
          client. No split/percentage info here — visible to every role,
          same boundary as the plain Total above, not just admin. */}
      {addons !== 'loading' && addons.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalle de la reserva</h2>
          <div className="space-y-0">
            {reservation.display_vehicle && reservation.display_vehicle !== '—' && (
              <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-900">{reservation.display_vehicle}</p>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCOP(settlementBaseValue)}</span>
              </div>
            )}
            {addons.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {a.name}{a.provider_name ? ` (${a.provider_name})` : ''}
                  </p>
                  {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCOP(Number(a.price))}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatCOP(Number(reservation.total_amount))}</span>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2">
            {[
              { label: 'Cliente', phone: reservation.customer_whatsapp || reservation.customer_phone, username: reservation.customer_whatsapp_username, recipientFirstName: undefined as string | undefined },
              ...(reservation.display_contact
                ? [{ label: 'Planeador', phone: reservation.contact_phone, username: reservation.contact_whatsapp_username, recipientFirstName: reservation.display_contact.split(' ')[0] }]
                : []),
            ].map(({ label, phone, username, recipientFirstName }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">{label}</span>
                {(phone || username) ? (
                  <a
                    href={buildContactWaUrl(phone, username, buildDetalleMsg(reservation, addons, recipientFirstName)) ?? undefined}
                    {...whatsAppLinkProps()}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentsSection
        reservation={reservation}
        payments={payments}
        paymentsLoading={paymentsLoading}
        onAdd={handleAddPayment}
        onDelete={handleDeletePayment}
      />

      {/* WhatsApp cobro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Enviar cobro por WhatsApp</h2>
        </div>
        {[
          { label: 'Cliente', name: reservation.display_customer, phone: reservation.customer_whatsapp || reservation.customer_phone, username: reservation.customer_whatsapp_username, recipientFirstName: undefined as string | undefined, to: `/clientes/editar/${reservation.customer_id}`, id: reservation.customer_id },
          ...(reservation.display_contact
            ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone, username: reservation.contact_whatsapp_username, recipientFirstName: reservation.display_contact.split(' ')[0], to: `/contactos/editar/${reservation.contact_id}`, id: reservation.contact_id }]
            : []),
        ].map(({ label, name, phone, username, recipientFirstName, to, id }) => (
          <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-sm text-gray-500 ml-2"><EntityLink to={to} id={id}>{name}</EntityLink></span>
              {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
            </div>
            {(phone || username) ? (
              <a
                href={buildContactWaUrl(phone, username, buildCobroMsg(reservation, payments, addons === 'loading' ? [] : addons, recipientFirstName)) ?? undefined}
                {...whatsAppLinkProps()}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Enviar
              </a>
            ) : (
              <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
            )}
          </div>
        ))}
      </div>

      {/* Billing documents (cuentas de cobro) — admin only */}
      {isAdmin && <BillingDocumentsSection reservationId={reservation.id} />}

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
              <span className="text-sm text-gray-500 ml-2">
                <EntityLink to={`/propietarios/editar/${reservation.owner_id}`} id={reservation.owner_id} requireAdmin>{reservation.owner_name}</EntityLink>
              </span>
              {reservation.owner_whatsapp && <span className="text-xs text-gray-400 ml-2">· {reservation.owner_whatsapp}</span>}
            </div>
            {(reservation.owner_whatsapp || reservation.owner_whatsapp_username) ? (
              <a
                href={buildContactWaUrl(
                  reservation.owner_whatsapp,
                  reservation.owner_whatsapp_username,
                  buildOwnerMsg(reservation, primarySettlement, primarySettlementPayments, reservation.owner_name.split(' ')[0], retentionTotal, settlementBaseValue)
                ) ?? undefined}
                {...whatsAppLinkProps()}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Enviar
              </a>
            ) : (
              <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
            )}
          </div>
        </div>
      )}

      {/* Service Order — admin only, same boundary as the settlement below */}
      {isAdmin && reservation.owner_name && !reservation.vehicle_is_company_owned && (
        <ServiceOrderSection reservationId={reservation.id} vehicleId={reservation.vehicle_id} />
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
                {addonsTotal > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
                    Esta reserva tiene {formatCOP(addonsTotal)} en servicios adicionales (ver abajo) — la liquidación
                    se calcula sobre <strong>{formatCOP(settlementBaseValue)}</strong> ({formatCOP(Number(reservation.total_amount))} − {formatCOP(addonsTotal)}), no sobre el total completo.
                  </div>
                )}
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
                    Déjalo vacío para usar el 70% por defecto ({formatCOP(settlementBaseValue * 0.7)}).
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
                  vehicleId={s.vehicle_id}
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

      {/* Servicios adicionales — third-party services (florist, decoración,
          etc.) sold alongside this reservation, with their own % split and
          "¿lo cobra Camino a mi Boda?" flag, independent of the vehicle's
          70/30 split above. Admin-only, same privacy boundary as the split
          and the owner settlement. */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-pink-500" />
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Servicios adicionales</h2>
            </div>
            {!addingAddon && (
              <button
                onClick={() => setAddingAddon(true)}
                className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 cursor-pointer"
              >
                <Plus size={13} /> Agregar servicio
              </button>
            )}
          </div>

          {addons === 'loading' ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader2 size={14} className="animate-spin" /> Cargando…
            </div>
          ) : addons.length === 0 && !addingAddon ? (
            <p className="text-sm text-gray-400">Sin servicios adicionales registrados.</p>
          ) : (
            <div className="space-y-2">
              {addons.map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                      <span className="text-sm text-gray-500">{formatCOP(Number(a.price))}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                        a.company_collects_payment ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.company_collects_payment ? 'Camino a mi Boda recibe el pago' : 'El proveedor cobra directo'}
                      </span>
                    </div>
                    {(a.provider_name || a.description) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.provider_name}{a.provider_name && a.description ? ' · ' : ''}{a.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Empresa ({a.company_percentage}%): {formatCOP(Number(a.company_amount))} · Proveedor ({100 - a.company_percentage}%): {formatCOP(Number(a.provider_amount))}
                    </p>
                    {Number(a.provider_amount) > 0 && (
                      <AddonPaymentLedger
                        addon={a}
                        payments={addonPaymentsMap[a.id] ?? []}
                        onAddPayment={(amount, paidAt, notes) => handleAddAddonPayment(a.id, amount, paidAt, notes)}
                        onDeletePayment={(paymentId) => handleDeleteAddonPayment(a.id, paymentId)}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAddon(a.id)}
                    disabled={deletingAddonId === a.id}
                    className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {deletingAddonId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
              {addons.length > 0 && (
                <div className="pt-2 mt-1 border-t border-gray-50 space-y-1">
                  {addons.length > 1 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Total servicios: {formatCOP(addonsTotal)}</span>
                      <span>Empresa: {formatCOP(addonsCompanyTotal)} · Proveedores: {formatCOP(addonsProviderTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-medium text-gray-700">
                    <span>Valor del vehículo (total − servicios)</span>
                    <span>{formatCOP(settlementBaseValue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {addingAddon && (
            <div className="border border-brand-100 rounded-xl p-4 space-y-3 bg-brand-50/30">
              {addonPackages.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cargar desde catálogo (opcional)</label>
                  <select
                    value={addonForm.addon_package_id ?? ''}
                    onChange={e => handlePickAddonPackage(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">— Servicio libre —</option>
                    {addonPackages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {formatCOP(Number(p.price))}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={addonForm.name}
                  onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Ramo, Letrero Just Married…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor (opcional)</label>
                <input
                  type="text"
                  value={addonForm.provider_name}
                  onChange={e => setAddonForm(f => ({ ...f, provider_name: e.target.value }))}
                  placeholder="Ej: Lluvia de Rosas"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={addonForm.description}
                  onChange={e => setAddonForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Rosas, lirios, complementos blancos…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Precio (COP) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={addonForm.price || ''}
                    onChange={e => setAddonForm(f => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">% Camino a mi Boda</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={addonForm.company_percentage}
                    onChange={e => setAddonForm(f => ({ ...f, company_percentage: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Proveedor recibe: {formatCOP(Number(addonForm.price || 0) * (100 - addonForm.company_percentage) / 100)}
                {' · '}Empresa recibe: {formatCOP(Number(addonForm.price || 0) * addonForm.company_percentage / 100)}
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addonForm.company_collects_payment}
                  onChange={e => setAddonForm(f => ({ ...f, company_collects_payment: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Camino a mi Boda recibe el pago del cliente por este servicio</span>
              </label>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setAddingAddon(false); setAddonForm(emptyAddonForm); }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddAddon}
                  disabled={savingAddon || !addonForm.name.trim() || addonForm.price <= 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {savingAddon ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
