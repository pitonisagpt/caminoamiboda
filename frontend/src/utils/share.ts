/**
 * Shares a link via the native share sheet (WhatsApp, Messages, etc. — on
 * mobile) when available, otherwise falls back to copying it to the
 * clipboard. Same fallback idiom already used for the event share links
 * (EventoTab.tsx's copyLink).
 */
export async function shareOrCopy({ title, url }: { title: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      // User dismissed the share sheet — not an error, nothing to fall back to.
      return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
