// Pushes a custom event onto GTM's dataLayer (see index.html for the GTM
// snippet) so it can be picked up by a GTM trigger and forwarded to GA4 as
// a conversion event, without hardcoding any analytics vendor here.
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayerEvent(event: string, params: Record<string, unknown> = {}): void {
  window.dataLayer ??= [];
  window.dataLayer.push({ event, ...params });
}
