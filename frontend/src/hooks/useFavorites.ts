import { useEffect, useState } from "react";

const STORAGE_KEY = "camino_catalog_favorites";

function readStored(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Client-side-only "favoritos" for the public catalog (mejoras.md ítem 9)
 * — no login, no backend, just localStorage, same as the availability
 * check-date already does in CatalogPage.tsx. Purely a convenience for
 * "which cars did I like" across a browsing session; never synced or read
 * by anyone but this browser. */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set(readStored()));

  useEffect(() => {
    try {
      if (favorites.size > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage can throw in a private-browsing edge case — favorites
      // still work for this page load via state, just don't persist.
    }
  }, [favorites]);

  function toggleFavorite(vehicleId: number) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(vehicleId)) next.delete(vehicleId); else next.add(vehicleId);
      return next;
    });
  }

  return { favorites, toggleFavorite };
}
