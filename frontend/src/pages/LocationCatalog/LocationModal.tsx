import { useState } from 'react';
import type { CatalogLocation, CatalogLocationFormData, LocationType } from '../../types/catalogLocation';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TYPE_LABELS } from './locationTypeConstants';

const EMPTY_FORM: CatalogLocationFormData = {
  name: '', location_type: 'other', address: '',
  google_maps_link: '', waze_link: '', contact_person: '', contact_phone: '', notes: '',
};

export default function LocationModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CatalogLocation | null;
  onSave: (data: CatalogLocationFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CatalogLocationFormData>(
    initial
      ? {
          name: initial.name, location_type: initial.location_type,
          address: initial.address || '', google_maps_link: initial.google_maps_link || '',
          waze_link: initial.waze_link || '',
          contact_person: initial.contact_person || '', contact_phone: initial.contact_phone || '',
          notes: initial.notes || '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const f = (k: keyof CatalogLocationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <Modal
      title={initial ? 'Editar ubicación' : 'Nueva ubicación'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={async () => { if (!form.name.trim()) return; setSaving(true); try { await onSave(form); } finally { setSaving(false); } }}
            disabled={saving || !form.name.trim()}
            loading={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
        <input value={form.name} onChange={f('name')} className={inputCls} placeholder="Catedral de Laureles" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <select value={form.location_type} onChange={f('location_type')} className={inputCls}>
            {(Object.entries(TYPE_LABELS) as [LocationType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
          <input value={form.contact_person} onChange={f('contact_person')} className={inputCls} placeholder="Padre Martínez" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
        <input value={form.address} onChange={f('address')} className={inputCls} placeholder="Cra 80 # 33-02, Medellín" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
        <input value={form.google_maps_link} onChange={f('google_maps_link')} className={inputCls} placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Link Waze (opcional)</label>
        <input value={form.waze_link} onChange={f('waze_link')} className={inputCls} placeholder="https://waze.com/ul/..." />
        <p className="text-xs text-gray-400 mt-1">Si lo dejas vacío, se genera automático desde las coordenadas.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tel. contacto</label>
          <input value={form.contact_phone} onChange={f('contact_phone')} className={inputCls} placeholder="+57 300 000 0000" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
          <input value={form.notes} onChange={f('notes')} className={inputCls} placeholder="Entrar por la puerta sur" />
        </div>
      </div>
    </Modal>
  );
}
