import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { TimelineContact, TimelineContactFormData } from '../../../types/timeline';

export default function ContactModal({ initial, onSave, onClose }: {
  initial?: TimelineContact | null;
  onSave: (data: TimelineContactFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TimelineContactFormData>({
    name: initial?.name || '', phone: initial?.phone || '', role: initial?.role || '',
  });
  const f = (k: keyof TimelineContactFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <Modal
      title={initial ? 'Editar contacto' : 'Nuevo contacto'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (form.name.trim()) onSave(form); }}>Guardar</Button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
        <input value={form.role} onChange={f('role')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Novio, Decorador, Wedding planner..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
        <input value={form.name} onChange={f('name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Daniel Gómez" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
        <input value={form.phone} onChange={f('phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+57 300 000 0000" />
      </div>
    </Modal>
  );
}
