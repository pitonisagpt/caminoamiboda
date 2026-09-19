import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { VehicleListItem } from '../../types/vehicle';

interface VehicleQuickCreateForm {
  brand: string;
  license_plate: string;
  model_line: string;
  color: string;
}

export default function VehicleQuickCreateModal({
  initialName,
  initial,
  onSave,
  onClose,
}: {
  initialName: string;
  initial?: VehicleListItem | null;
  onSave: (data: VehicleQuickCreateForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<VehicleQuickCreateForm>({
    brand: initial?.brand ?? initialName,
    license_plate: initial?.license_plate ?? '',
    model_line: initial?.model_line ?? '',
    color: initial?.color ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof VehicleQuickCreateForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.brand.trim() || !form.license_plate.trim()) {
      setError('Marca y placa son obligatorias');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('No se pudo crear el vehículo. Revisa que la placa no esté repetida.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm text-gray-600 mb-1';

  return (
    <Modal
      title={initial ? 'Editar vehículo' : 'Nuevo vehículo'}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} loading={saving}>
            {saving ? (initial ? 'Guardando…' : 'Creando…') : (initial ? 'Guardar' : 'Crear y usar')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Marca *</label>
          <input value={form.brand} onChange={f('brand')} className={inputCls} placeholder="Mercedes Benz" />
        </div>
        <div>
          <label className={labelCls}>Placa *</label>
          <input value={form.license_plate} onChange={f('license_plate')} className={inputCls} placeholder="ABC123" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Línea / Modelo</label>
          <input value={form.model_line} onChange={f('model_line')} className={inputCls} placeholder="Clase S" />
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <input value={form.color} onChange={f('color')} className={inputCls} placeholder="Blanco" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">Podrás completar zonas, precios y fotos luego desde Vehículos.</p>
    </Modal>
  );
}
