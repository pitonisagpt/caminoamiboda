import type { EventType, LocationType } from '../../../types/timeline';

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida', ceremony: 'Ceremonia', reception: 'Recepción',
  photoshoot: 'Sesión de fotos', other: 'Otro',
};
export const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  pickup: 'bg-blue-100 text-blue-700', ceremony: 'bg-brand-100 text-brand-600',
  reception: 'bg-purple-100 text-purple-700', photoshoot: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};
export const OPS_PHONE = '+573147372030';
export const LOCATION_TYPE_WA_LABELS: Record<LocationType, string> = {
  pickup: 'Recogida', ceremony: 'Ceremonia', reception: 'Recepción',
  photoshoot: 'Sesión de fotos', other: 'Ubicación',
};
export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'wedding', label: 'Boda' },
  { value: 'brand_activation', label: 'Activación de marca' },
  { value: 'audiovisual_production', label: 'Producción audiovisual' },
  { value: 'quinceanera', label: 'Quinceañera' },
  { value: 'other', label: 'Otro' },
];
export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(o => [o.value, o.label])
);
