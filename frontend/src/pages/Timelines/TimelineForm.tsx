import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { timelinesApi } from '../../api/timelines';
import type { EventTimeline, TimelineFormData, EventType } from '../../types/timeline';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'wedding', label: 'Boda' },
  { value: 'brand_activation', label: 'Activación de marca' },
  { value: 'audiovisual_production', label: 'Producción audiovisual' },
  { value: 'quinceanera', label: 'Quinceañera' },
  { value: 'other', label: 'Otro' },
];

export default function TimelineForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimelineFormData>({
    defaultValues: {
      event_type: 'wedding',
    },
  });

  useEffect(() => {
    if (isEdit) {
      timelinesApi.get(Number(id)).then((r: { data: EventTimeline }) => {
        const t = r.data;
        reset({
          event_name: t.event_name,
          event_type: t.event_type,
          event_date: t.event_date,
          main_contact_name: t.main_contact_name || '',
          main_contact_phone: t.main_contact_phone || '',
          assigned_vehicle: t.assigned_vehicle || '',
          assigned_driver: t.assigned_driver || '',
          assigned_driver_phone: t.assigned_driver_phone || '',
          special_instructions: t.special_instructions || '',
          notes: t.notes || '',
        });
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: TimelineFormData) => {
    const payload = {
      ...data,
      main_contact_name: data.main_contact_name || null,
      main_contact_phone: data.main_contact_phone || null,
      assigned_vehicle: data.assigned_vehicle || null,
      assigned_driver: data.assigned_driver || null,
      assigned_driver_phone: data.assigned_driver_phone || null,
      special_instructions: data.special_instructions || null,
      notes: data.notes || null,
    };

    if (isEdit) {
      await timelinesApi.update(Number(id), payload);
      navigate(`/eventos/${id}`);
    } else {
      const res = await timelinesApi.create(payload);
      navigate(`/eventos/${res.data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}
          className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar evento' : 'Nuevo evento'}
          </h1>
          <p className="text-sm text-gray-500">Información general del evento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Event info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Información del evento</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del evento *</label>
            <input
              {...register('event_name', { required: 'Requerido' })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Boda Juan & María"
            />
            {errors.event_name && <p className="text-xs text-red-500 mt-1">{errors.event_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de evento *</label>
              <select
                {...register('event_type', { required: 'Requerido' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                {EVENT_TYPES.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento *</label>
              <input
                type="date"
                {...register('event_date', { required: 'Requerido' })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              {errors.event_date && <p className="text-xs text-red-500 mt-1">{errors.event_date.message}</p>}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Contacto principal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                {...register('main_contact_name')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="María González"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                {...register('main_contact_phone')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Logistics */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Logística</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo asignado</label>
              <input
                {...register('assigned_vehicle')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="VW negro convertible"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conductor asignado</label>
              <input
                {...register('assigned_driver')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Juan Yepes"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tel. conductor</label>
              <input
                {...register('assigned_driver_phone')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="+57 314 737 2030"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Instrucciones y notas</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones especiales</label>
            <textarea
              {...register('special_instructions')}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Instrucciones para el conductor o el equipo..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Notas del equipo de operaciones..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/eventos/${id}` : '/eventos')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
