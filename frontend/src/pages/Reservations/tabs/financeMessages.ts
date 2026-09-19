import type { Reservation } from '../../../types/reservation';
import type { ReservationPayment } from '../../../api/reservations';
import type { OwnerSettlement, OwnerSettlementPayment } from '../../../api/ownerSettlements';
import type { ReservationAddon } from '../../../types/reservationAddon';
import type { DocumentStatus } from '../../../types';
import { withSignature } from '../../../utils/whatsapp';
import { formatCOP, formatDateShort as formatDate } from '../../../utils/format';

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  paid: 'Pagado',
};
export const DOC_STATUS_STYLE: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

export function buildCobroMsg(reservation: Reservation, payments: ReservationPayment[], addons: ReservationAddon[], recipientFirstName?: string): string {
  const greetName = recipientFirstName ?? reservation.display_customer.split(' ')[0];
  const reservaRef = recipientFirstName ? `la reserva de ${reservation.display_customer}` : 'tu reserva';
  const totalDeposit = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(0, Number(reservation.total_amount) - totalDeposit);
  const hasVehicle = !!reservation.display_vehicle && reservation.display_vehicle !== '—';
  const vehicleValue = Number(reservation.total_amount) - addons.reduce((s, a) => s + Number(a.price), 0);

  const lines: string[] = [
    // When there are addons, the vehicle+services breakdown below already
    // names the vehicle, so it isn't repeated in the greeting too.
    `Hola ${greetName}, aquí está el resumen de pagos de ${reservaRef} con Camino a mi Boda${addons.length === 0 && hasVehicle ? ` — ${reservation.display_vehicle}` : ''}:`,
    '',
  ];

  if (addons.length > 0) {
    lines.push('*Detalle:*');
    if (hasVehicle) lines.push(`  - ${reservation.display_vehicle}: ${formatCOP(vehicleValue)}`);
    addons.forEach(a => {
      const provider = a.provider_name ? ` (${a.provider_name})` : '';
      lines.push(`  - ${a.name}${provider}: ${formatCOP(Number(a.price))}`);
    });
    lines.push('');
  }

  lines.push(`*Valor total:* ${formatCOP(reservation.total_amount)}`, '');

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

  return withSignature(lines.join('\n'));
}

// Just the itemized breakdown + total — no payment/deposit history, unlike
// buildCobroMsg above. For quoting a client or wedding planner what's
// included and what it costs, independent of where payments stand.
export function buildDetalleMsg(reservation: Reservation, addons: ReservationAddon[], recipientFirstName?: string): string {
  const greetName = recipientFirstName ?? reservation.display_customer.split(' ')[0];
  const reservaRef = recipientFirstName ? `la reserva de ${reservation.display_customer}` : 'tu reserva';
  const hasVehicle = !!reservation.display_vehicle && reservation.display_vehicle !== '—';
  const vehicleValue = Number(reservation.total_amount) - addons.reduce((s, a) => s + Number(a.price), 0);

  const lines: string[] = [
    `Hola ${greetName}, aquí está el detalle de ${reservaRef} con Camino a mi Boda:`,
    '',
  ];

  if (hasVehicle) lines.push(`- ${reservation.display_vehicle}: ${formatCOP(vehicleValue)}`);
  addons.forEach(a => {
    const provider = a.provider_name ? ` (${a.provider_name})` : '';
    lines.push(`- ${a.name}${provider}: ${formatCOP(Number(a.price))}`);
  });
  lines.push('');
  lines.push(`*Valor total:* ${formatCOP(reservation.total_amount)}`);

  if (reservation.event_date) {
    const evDate = new Date(reservation.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push('');
    lines.push(`*Fecha del evento:* ${evDate}`);
  }

  return withSignature(lines.join('\n'));
}

export function buildOwnerMsg(
  reservation: Reservation,
  settlement: OwnerSettlement | null,
  settlementPayments: OwnerSettlementPayment[],
  ownerFirstName: string,
  retentionTotal: number,
  vehicleValue: number,
): string {
  const ownerPct = settlement ? settlement.owner_percentage : (reservation.vehicle_is_company_owned ? 0 : 70);
  // vehicleValue is total_amount minus any third-party addon services (ramo,
  // letrero, etc.) — the owner's % must only ever apply to their vehicle's
  // share, never to a service that isn't theirs. Once a settlement exists,
  // its owner_amount is already computed server-side against that same base.
  const ownerAmount = settlement ? settlement.owner_amount : vehicleValue * (ownerPct / 100);
  const remainingToOwner = settlement ? settlement.remaining_to_owner : ownerAmount;
  // Full share had there been no retention — only used to detect whether
  // ownerAmount was actually reduced for it, so the note below only appears
  // when a discount really happened (not every time there's a retention).
  const fullShareWithoutRetention = vehicleValue * (ownerPct / 100);
  const wasDiscountedForRetention = retentionTotal > 0 && ownerAmount < fullShareWithoutRetention - 1;

  const lines: string[] = [
    `Hola ${ownerFirstName}, aquí está el resumen de la reserva con Camino a mi Boda${reservation.display_vehicle && reservation.display_vehicle !== '—' ? ` — ${reservation.display_vehicle}` : ''}:`,
    '',
    `*Valor del vehículo:* ${formatCOP(vehicleValue)}`,
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

  return withSignature(lines.join('\n').trim());
}
