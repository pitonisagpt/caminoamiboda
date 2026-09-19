import type { LocationType } from '../../types/catalogLocation';

export const TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  photoshoot: 'Sesión de fotos',
  other: 'Otro',
};

export const TYPE_HEX: Record<LocationType, string> = {
  pickup: '#3b82f6',
  ceremony: '#a855f7',
  reception: '#ec4899',
  photoshoot: '#22c55e',
  other: '#6b7280',
};
