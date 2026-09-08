import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";
import { shareOrCopy } from "../utils/share";

/** Icon-only share button reused on the catalog card and the vehicle modal.
 * Deliberately carries no color/shape of its own — each call site passes a
 * full className, since the two contexts need visually different button
 * styles (light overlay on the card's white body vs. dark overlay matching
 * the modal's photo background) and baking in default colors here would
 * fight the caller's own classes on override order. */
export function ShareVehicleButton({
  vehicleId,
  vehicleName,
  className,
}: {
  vehicleId: number;
  vehicleName: string;
  className: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set("vehiculo", String(vehicleId));
    const result = await shareOrCopy({ title: `${vehicleName} — Camino a mi Boda`, url: url.toString() });
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
