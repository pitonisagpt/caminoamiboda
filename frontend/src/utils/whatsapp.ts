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

/** Builds a wa.me URL with a canned Spanish introduction message, forcing
 * the Colombia country code (57) prefix if missing — used by the
 * customer/driver/owner "greeting" WhatsApp buttons in list pages. */
export function toWhatsAppUrl(phone: string | null, name: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("57") ? digits : `57${digits}`;
  const msg = encodeURIComponent(`Hola ${name}, soy de Camino a mi Boda.`);
  return `https://wa.me/${num}?text=${msg}`;
}
