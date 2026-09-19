import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { ActivityFormData, EventLocation, TimelineActivity } from '../../../types/timeline';
import { LOCATION_TYPE_LABELS } from './eventoConstants';
import { addDays, daysBetween } from './eventoHelpers';

export default function ActivityModal({ initial, locations, eventDate, onSave, onClose }: {
  initial?: TimelineActivity | null;
  locations: EventLocation[];
  eventDate: string;
  onSave: (data: ActivityFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ActivityFormData>({
    time: initial?.time || '', day_number: initial?.day_number ?? 1, description: initial?.description || '',
    location_id: initial?.location_id ?? null,
    estimated_duration: initial?.estimated_duration || '', notes: initial?.notes || '',
  });
  const activityDate = addDays(eventDate, form.day_number - 1);
  const f = (k: keyof ActivityFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = k === 'location_id' ? (e.target.value ? Number(e.target.value) : null) : e.target.value;
    setForm(prev => ({ ...prev, [k]: val }));
  };
  const onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, day_number: daysBetween(eventDate, e.target.value) + 1 }));
  };

  return (
    <Modal
      title={initial ? 'Editar actividad' : 'Nueva actividad'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (form.time && form.description.trim()) onSave(form); }}>Guardar</Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hora *</label>
          <input type="time" value={form.time} onChange={f('time')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
          <input type="date" value={activityDate} onChange={onDateChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Duración estimada</label>
          <input value={form.estimated_duration} onChange={f('estimated_duration')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="30 min" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
        <input value={form.description} onChange={f('description')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Llegada del novio a la ceremonia" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación relacionada</label>
        <select value={form.location_id ?? ''} onChange={f('location_id')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Sin ubicación</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.location_name} ({LOCATION_TYPE_LABELS[l.location_type]})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Instrucciones adicionales..." />
      </div>
    </Modal>
  );
}
