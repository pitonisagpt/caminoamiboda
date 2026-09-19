/** Shared formatting helpers for the admin UI — previously copy-pasted
 * near-identically across ReservationKanban.tsx, ReservationList.tsx,
 * SettlementCard.tsx, AddonPaymentLedger.tsx, ContractTab.tsx, InfoTab.tsx
 * and FinanceTab.tsx. Output is unchanged from each original call site —
 * this only removes the duplication, it doesn't restyle anything. */

export function formatCOP(n: number): string {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

/** "5 sep 2026" — day/settlement/payment lists (SettlementCard,
 * AddonPaymentLedger, FinanceTab). */
export function formatDateShort(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** "05 sep 2026" — event-date columns (ReservationKanban, ReservationList). */
export function formatDateCompact(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** "05 sep - 07 sep 2026" (or a single formatDateCompact date when `to`
 * is empty or equal to `from`) — multi-day reservations in ReservationList. */
export function formatDateOrRange(from: string, to: string): string {
  if (!to || to === from) return formatDateCompact(from);
  const fromShort = new Date(from + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  return `${fromShort} - ${formatDateCompact(to)}`;
}

/** "lunes, 5 de septiembre de 2026" — InfoTab's event-date header. */
export function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
