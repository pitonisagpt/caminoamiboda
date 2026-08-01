const STORAGE_KEY = "camino_price_unlock";

export interface PriceUnlock {
  weddingDate: string;
}

export function getUnlock(): PriceUnlock | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.weddingDate === "string" ? { weddingDate: parsed.weddingDate } : null;
  } catch {
    return null;
  }
}

export function setUnlock(weddingDate: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ weddingDate }));
}

/**
 * Applies the +10%-per-year (compounded) rescheduling rule from the
 * reservation policy to a base (current-year) price, based on the wedding's
 * year relative to today.
 */
export function priceForYear(basePrice: number, weddingDate: string): number {
  const currentYear = new Date().getFullYear();
  const weddingYear = new Date(weddingDate).getFullYear();
  const yearsAhead = Math.max(0, weddingYear - currentYear);
  return Math.round(basePrice * Math.pow(1.1, yearsAhead));
}
