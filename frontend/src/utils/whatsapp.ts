/**
 * Shared WhatsApp link helpers. On a touch-primary device (phone/tablet),
 * opening a wa.me link in a new tab leaves an orphaned tab behind once the
 * user comes back from the native WhatsApp app — so on those devices we
 * navigate in the same tab instead. On desktop, a new tab is still the
 * right call (WhatsApp Web needs its own space, without kicking the user
 * out of whatever admin/catalog page they were on).
 */
import { isTouchPrimaryDevice } from "./device";

/** Spread onto any WhatsApp `<a>` tag: `{...whatsAppLinkProps()}`. */
export function whatsAppLinkProps(): { target?: "_blank"; rel: string } {
  return isTouchPrimaryDevice()
    ? { rel: "noopener noreferrer" }
    : { target: "_blank", rel: "noopener noreferrer" };
}

/** For onClick handlers that build/fetch the URL dynamically instead of
 * rendering a plain `<a>` (e.g. after an async API call) — same
 * same-tab-on-mobile behavior as whatsAppLinkProps(). */
export function openWhatsApp(url: string): void {
  if (isTouchPrimaryDevice()) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Builds a wa.me URL from a phone (any formatting) + optional message. */
export function buildWaUrl(phone: string | null | undefined, message?: string): string {
  const num = phone ? phone.replace(/\D/g, "") : "";
  if (!message) return num ? `https://wa.me/${num}` : "https://wa.me/";
  const encoded = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/** Builds a wa.me link from a phone number OR a WhatsApp username —
 * prefers phone when both exist. WhatsApp's own wa.me/<username> public
 * links (https://faq.whatsapp.com/1561101675623754) support the same
 * ?text= prefill as phone links — confirmed against the real wa.me
 * redirect (`curl -sI "https://wa.me/caminoamiboda?text=hola"` →
 * `location: https://api.whatsapp.com/send/?text=hola&username=caminoamiboda&type=username...`,
 * same shape as the phone case's `type=phone_number`, text carried
 * through identically either way) — not just assumed from the FAQ.
 * Returns null when neither exists, so callers still render their own
 * final "sin contacto" fallback instead of a dead link. Used everywhere
 * a contact might only have a WhatsApp username on file (no raw phone),
 * replacing the old pattern of showing "@username — buscar en WhatsApp"
 * as plain, unclickable text. */
export function buildContactWaUrl(
  phone: string | null | undefined,
  username: string | null | undefined,
  message?: string,
): string | null {
  if (phone) return buildWaUrl(phone, message);
  const handle = username?.replace(/^@/, "").trim();
  if (!handle) return null;
  return message ? `https://wa.me/${handle}?text=${encodeURIComponent(message)}` : `https://wa.me/${handle}`;
}

/** Shared closing signature for substantive outbound WhatsApp messages the
 * company sends (cobro, contrato, minuto a minuto, reseña, etc.) — not for
 * one-line pings like the canned greeting callers build with
 * buildContactWaUrl above. Mirrors the Python copy in
 * backend/app/services/whatsapp_signature.py; keep both in sync. */
export const WHATSAPP_SIGNATURE =
  "Camino a mi Boda\nInstagram: https://www.instagram.com/caminoamiboda\nWeb: https://caminoamiboda.com";

/** Appends WHATSAPP_SIGNATURE to an outbound message, separated by a blank line. */
export function withSignature(message: string): string {
  return `${message}\n\n${WHATSAPP_SIGNATURE}`;
}
