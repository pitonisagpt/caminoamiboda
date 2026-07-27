import { useState } from 'react';

export interface GcalToastState {
  message: string;
  variant: 'success' | 'warning';
}

export function useGcalSyncToast() {
  const [toast, setToast] = useState<GcalToastState | null>(null);

  /** Pass the real per-action sync result. `null` means nothing needed
   * syncing (e.g. GCal not configured, or an unaffected field changed) —
   * stay quiet rather than show a toast for an action that never happened. */
  const notify = (synced: boolean | null) => {
    if (synced === null) return;
    setToast(
      synced
        ? { message: 'Sincronizado con Google Calendar', variant: 'success' }
        : { message: 'No se pudo sincronizar con Google Calendar', variant: 'warning' }
    );
  };

  return { toast, notify, dismiss: () => setToast(null) };
}
