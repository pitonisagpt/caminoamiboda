import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Driver } from '../../types/driver';

interface DriverQuickCreateForm {
  full_name: string;
  phone: string;
  whatsapp: string;
}

export default function DriverQuickCreateModal({
  initialName,
  initial,
  onSave,
  onClose,
}: {
  initialName: string;
  initial?: Driver | null;
  onSave: (data: DriverQuickCreateForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DriverQuickCreateForm>({
    full_name: initial?.full_name ?? initialName,
    phone: initial?.phone ?? '',
    whatsapp: initial?.whatsapp ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof DriverQuickCreateForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('No se pudo crear el conductor. Revisa los datos (ej. formato del teléfono).');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm text-gray-600 mb-1';

  return (
    <Modal
      title={initial ? 'Editar conductor' : 'Nuevo conductor'}
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
      <div>
        <label className={labelCls}>Nombre completo *</label>
        <input value={form.full_name} onChange={f('full_name')} className={inputCls} placeholder="Carlos Ramírez" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Teléfono</label>
          <input value={form.phone} onChange={f('phone')} className={inputCls} placeholder="312 345 6789" />
        </div>
        <div>
          <label className={labelCls}>WhatsApp</label>
          <input value={form.whatsapp} onChange={f('whatsapp')} className={inputCls} placeholder="312 345 6789" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">Podrás completar licencia y más datos luego desde Conductores.</p>
    </Modal>
  );
}
