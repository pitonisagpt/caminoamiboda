import { useState } from 'react';
import { integrationsApi } from '../api/integrations';

export interface GcalToastState {
  message: string;
  variant: 'success' | 'warning';
}

export function useGcalSyncToast() {
  const [toast, setToast] = useState<GcalToastState | null>(null);

  const notify = (connected: boolean) => {
    setToast(
      connected
        ? { message: 'Sincronizado con Google Calendar', variant: 'success' }
        : { message: 'No se pudo sincronizar con Google Calendar', variant: 'warning' }
    );
  };

  const checkAndNotify = async () => {
    try {
      const res = await integrationsApi.googleCalendarStatus();
      notify(res.data.connected);
    } catch {
      // status check itself failed — stay quiet rather than show a misleading toast
    }
  };

  return { toast, checkAndNotify, notify, dismiss: () => setToast(null) };
}
