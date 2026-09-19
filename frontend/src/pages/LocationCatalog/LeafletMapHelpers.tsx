import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LocationType } from '../../types/catalogLocation';
import { TYPE_HEX } from './locationTypeConstants';

export function makeIcon(type: LocationType, selected: boolean): L.DivIcon {
  const color = TYPE_HEX[type];
  const w = selected ? 30 : 22;
  const h = selected ? 38 : 28;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <filter id="s" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
    <path d="M15 0C7.27 0 1 6.27 1 14c0 10.5 14 24 14 24S29 24.5 29 14C29 6.27 22.73 0 15 0z"
      fill="${color}" filter="url(#s)"/>
    <circle cx="15" cy="14" r="5.5" fill="white" opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    className: '',
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  });
}

// Leaflet caches its render size at init and doesn't notice the container growing
// (e.g. as async data/geocoding finishes and the grid row gets taller), leaving the
// tile layer cut off with a blank gap below it. Re-measure whenever the container resizes.
export function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function MapFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map(p => p.join(',')).join('|');
    if (key === prev.current) return;
    prev.current = key;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    } else {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [48, 48], animate: true });
    }
  }, [points, map]);
  return null;
}
