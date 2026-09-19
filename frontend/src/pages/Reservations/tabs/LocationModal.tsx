import { useEffect, useState } from 'react';
import { catalogLocationsApi } from '../../../api/catalogLocations';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import Combobox from '../../../components/ui/Combobox';
import type { ComboboxOption } from '../../../components/ui/Combobox';
import type { EventLocation, LocationFormData, LocationType } from '../../../types/timeline';
import type { CatalogLocation } from '../../../types/catalogLocation';
import { LOCATION_TYPE_LABELS } from './eventoConstants';

export default function LocationModal({ initial, saving, onSave, onClose }: {
  initial?: EventLocation | null;
  saving?: boolean;
  onSave: (data: LocationFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<LocationFormData>({
    location_name: initial?.location_name || '', location_type: initial?.location_type || 'other',
    address: initial?.address || '', google_maps_link: initial?.google_maps_link || '',
    waze_link: initial?.waze_link || '',
    contact_person: initial?.contact_person || '', contact_phone: initial?.contact_phone || '',
    notes: initial?.notes || '', road_access_notes: initial?.road_access_notes || '',
  });
  const [catalog, setCatalog] = useState<CatalogLocation[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<ComboboxOption[]>([]);
  const f = (k: keyof LocationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    catalogLocationsApi.list({}).then(r => {
      setCatalog(r.data);
      setCatalogOptions(r.data.map(c => ({
        value: String(c.id),
        label: c.address ? `${c.name} — ${c.address}` : c.name,
      })));
    }).catch(() => {});
  }, []);

  const handleCatalogSelect = (val: string) => {
    if (!val) return;
    const found = catalog.find(c => c.id === Number(val));
    if (found) {
      setForm({
        location_name: found.name,
        location_type: (found.location_type as LocationType),
        address: found.address || '',
        google_maps_link: found.google_maps_link || '',
        waze_link: found.waze_link || '',
        contact_person: found.contact_person || '',
        contact_phone: found.contact_phone || '',
        notes: found.notes || '',
        road_access_notes: '',
      });
    }
  };

  return (
    <Modal
      title={initial ? 'Editar ubicación' : 'Nueva ubicación'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => { if (form.location_name.trim()) onSave(form); }} loading={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      {catalogOptions.length > 0 && (
        <div>
          <Combobox
            label="Buscar en catálogo (opcional)"
            options={catalogOptions}
            value=""
            onChange={handleCatalogSelect}
            placeholder="Buscar ubicación guardada..."
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
        <input value={form.location_name} onChange={f('location_name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Catedral de Laureles" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <select value={form.location_type} onChange={f('location_type')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.entries(LOCATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
          <input value={form.contact_person} onChange={f('contact_person')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Padre Martínez" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
        <input value={form.address} onChange={f('address')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Cra 80 # 33-02, Medellín" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
        <input value={form.google_maps_link} onChange={f('google_maps_link')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://maps.google.com/..." />
        <p className="text-xs text-gray-400 mt-1">
          Para ubicar esto en el mapa se usa este link si existe, si no la dirección. Sitios pequeños o
          privados a veces no aparecen buscando solo la dirección — si queda "Sin ubicar", pega aquí el
          link de Google Maps del lugar.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Link Waze (opcional)</label>
        <input value={form.waze_link} onChange={f('waze_link')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://waze.com/ul/..." />
        <p className="text-xs text-gray-400 mt-1">Si lo dejas vacío, se genera automático desde las coordenadas.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tel. contacto</label>
          <input value={form.contact_phone} onChange={f('contact_phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+57 300 000 0000" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
          <input value={form.notes} onChange={f('notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Entrar por la puerta sur" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Acceso vial</label>
        <input value={form.road_access_notes} onChange={f('road_access_notes')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="¿Portería, carretera estrecha, cobro de ingreso, acceso restringido?" />
      </div>
    </Modal>
  );
}
