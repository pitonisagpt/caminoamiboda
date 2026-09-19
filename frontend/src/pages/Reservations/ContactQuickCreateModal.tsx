import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Contact } from '../../types/contact';

const CONTACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'planner', label: 'Organizador / Wedding Planner' },
  { value: 'venue', label: 'Venue / Salón de eventos' },
  { value: 'agency', label: 'Agencia de eventos' },
  { value: 'other', label: 'Otro' },
];

interface ContactQuickCreateForm {
  full_name: string;
  contact_type: string;
  phone: string;
  whatsapp_username: string;
}

export default function ContactQuickCreateModal({
  initialName,
  initial,
  onSave,
  onClose,
}: {
  initialName: string;
  initial?: Contact | null;
  onSave: (data: ContactQuickCreateForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContactQuickCreateForm>({
    full_name: initial?.full_name ?? initialName,
    contact_type: initial?.contact_type ?? 'planner',
    phone: initial?.phone ?? '',
    whatsapp_username: initial?.whatsapp_username ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('No se pudo crear el contacto. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm text-gray-600 mb-1';

  return (
    <Modal
      title={initial ? 'Editar contacto' : 'Nuevo contacto'}
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
        <label className={labelCls}>Nombre *</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
          className={inputCls}
          placeholder="Andrea Vélez"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select
            value={form.contact_type}
            onChange={(e) => setForm(prev => ({ ...prev, contact_type: e.target.value }))}
            className={inputCls}
          >
            {CONTACT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Teléfono</label>
          <input
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            className={inputCls}
            placeholder="312 345 6789"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Usuario de WhatsApp</label>
        <input
          value={form.whatsapp_username}
          onChange={(e) => setForm(prev => ({ ...prev, whatsapp_username: e.target.value }))}
          className={inputCls}
          placeholder="usuario.whatsapp"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">Podrás completar email, Instagram y más datos luego desde Contactos.</p>
    </Modal>
  );
}
