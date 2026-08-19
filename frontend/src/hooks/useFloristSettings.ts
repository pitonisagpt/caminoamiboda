import { useEffect, useState } from 'react';
import { floristApi, type FloristPublic } from '../api/florist';

/** Public "Floristería aliada" content — used by both `/catalogo` and
 * `/como-funciona`, which each render a different subset of the same
 * data, so both fetch independently rather than sharing a global store. */
export function useFloristSettings() {
  const [settings, setSettings] = useState<FloristPublic | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    floristApi.getPublic()
      .then(r => setSettings(r.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { settings, loaded };
}
