import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";
import { shareOrCopy } from "../utils/share";
import { vehicleSlugPath } from "../utils/slug";

/** Icon-only share button reused on the catalog card, the vehicle modal,
 * and the per-vehicle landing page. Deliberately carries no color/shape of
 * its own — each call site passes a full className, since the contexts
 * need visually different button styles (light overlay on the card's
 * white body vs. dark overlay matching the modal/page photo background)
 * and baking in default colors here would fight the caller's own classes
 * on override order. */
export function ShareVehicleButton({
  vehicleId,
  vehicleName,
  brand,
  modelLine,
  color,
  className,
}: {
  vehicleId: number;
  vehicleName: string;
  /** brand/modelLine/color: only needed to build the descriptive part of
   * the new /carros/<id>-<slug> URL — omit to fall back to a bare id (the
   * link still works, just without the descriptive suffix). */
  brand?: string;
  modelLine?: string | null;
  color?: string | null;
  className: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Canonical per-vehicle page (wishlist SEO checklist) instead of
    // ?vehiculo= on whatever page this button happens to be rendered on
    // — a real indexable URL for the OG preview and for Google, not a
    // query-param variant of /catalogo.
    const path = brand
      ? `/carros/${vehicleSlugPath({ id: vehicleId, brand, model_line: modelLine, color })}`
      : `/carros/${vehicleId}`;
    const url = `${window.location.origin}${path}`;
    const result = await shareOrCopy({ title: `${vehicleName} — Camino a mi Boda`, url });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleShare} aria-label={t("catalog.share")} className={className}>
      {copied ? <Check size={14} /> : <Share2 size={14} />}
    </button>
  );
}
