/**
 * True on a touch-primary device (phone/tablet) — the device's main
 * pointer has no fine hover, so `:hover`-gated UI (controls, tooltips)
 * would otherwise be unreachable. Shared by anything that needs to branch
 * behavior between touch and mouse/trackpad input.
 */
export function isTouchPrimaryDevice(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}
