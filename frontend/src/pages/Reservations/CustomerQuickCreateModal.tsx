import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import type { Customer } from '../../types/customer';

interface CustomerQuickCreateForm {
  bride_name: string;
  groom_name: string;
  main_contact_name: string;
  phone: string;
  whatsapp_username: string;
}

export default function CustomerQuickCreateModal({
  initialName,
  initial,
  returnTo,
  isDirty,
  onSave,
  onClose,
}: {
  initialName: string;
  initial?: Customer | null;
  returnTo: string;
  isDirty: boolean;
  onSave: (data: CustomerQuickCreateForm) => Promise<void>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const handleGoToFullEdit = () => {
    if (!initial) return;
    if (isDirty && !confirm('Tienes cambios sin guardar en la reserva. ¿Continuar de todas formas?')) return;
    navigate(`/clientes/editar/${initial.id}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const [form, setForm] = useState<CustomerQuickCreateForm>({
    bride_name: initial?.bride_name ?? '',
    groom_name: initial?.groom_name ?? '',
    main_contact_name: initial?.main_contact_name ?? initialName,
    phone: initial?.phone ?? '',
    whatsapp_username: initial?.whatsapp_username ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (k: keyof CustomerQuickCreateForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.main_contact_name.trim()) {
      setError('El contacto principal es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch {
      setError('No se pudo crear el cliente. Revisa los datos (ej. formato del teléfono).');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm text-gray-600 mb-1';

  return (
    <Modal
      title={initial ? 'Editar cliente' : 'Nuevo cliente'}
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
          <label className={labelCls}>Novia</label>
          <input value={form.bride_name} onChange={f('bride_name')} className={inputCls} placeholder="María" />
        </div>
        <div>
          <label className={labelCls}>Novio</label>
          <input value={form.groom_name} onChange={f('groom_name')} className={inputCls} placeholder="Carlos" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Contacto principal *</label>
        <input value={form.main_contact_name} onChange={f('main_contact_name')} className={inputCls} placeholder="María García" />
      </div>
      <div>
        <label className={labelCls}>Teléfono / WhatsApp</label>
        <input value={form.phone} onChange={f('phone')} className={inputCls} placeholder="312 345 6789" />
      </div>
      <div>
        <label className={labelCls}>Usuario de WhatsApp</label>
        <input value={form.whatsapp_username} onChange={f('whatsapp_username')} className={inputCls} placeholder="usuario.whatsapp" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-gray-400">
        Podrás completar cédula, email y más datos luego desde Clientes.
        {initial && (
          <>
            {' '}·{' '}
            <button type="button" onClick={handleGoToFullEdit} className="text-brand-600 hover:underline cursor-pointer font-medium">
              Editar cliente completo
            </button>
          </>
        )}
      </p>
    </Modal>
  );
}
