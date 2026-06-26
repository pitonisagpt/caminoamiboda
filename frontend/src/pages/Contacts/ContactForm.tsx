import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { contactsApi } from '../../api/contacts';
import type { ContactFormData, ContactType, ContactStatus } from '../../types/contact';

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'planner', label: 'Organizador / Wedding Planner' },
  { value: 'venue', label: 'Venue / Salón de eventos' },
  { value: 'agency', label: 'Agencia de eventos' },
  { value: 'other', label: 'Otro' },
];

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospecto — aún no hemos trabajado juntos' },
  { value: 'active', label: 'Activo — nos refiere clientes' },
  { value: 'inactive', label: 'Inactivo — dormido o perdido' },
];

export default function ContactForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    defaultValues: {
      full_name: '',
      contact_type: 'planner',
      location: '',
      phone: '',
      instagram: '',
      email: '',
      status: 'prospect',
      notes: '',
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    contactsApi.get(Number(id))
      .then(r => {
        const c = r.data;
        reset({
          full_name: c.full_name ?? '',
          contact_type: c.contact_type ?? 'planner',
          location: c.location ?? '',
          phone: c.phone ?? '',
          instagram: c.instagram ?? '',
          email: c.email ?? '',
          status: c.status ?? 'prospect',
          notes: c.notes ?? '',
        });
      })
      .finally(() => setLoadingDoc(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data: ContactFormData) => {
    setSaving(true);
    try {
      const payload = {
        full_name: data.full_name,
        contact_type: data.contact_type,
        location: data.location || null,
        phone: data.phone || null,
        instagram: data.instagram || null,
        email: data.email || null,
        status: data.status,
        notes: data.notes || null,
      };
      if (isEditing && id) {
        await contactsApi.update(Number(id), payload);
      } else {
        await contactsApi.create(payload);
      }
      navigate('/contactos');
    } catch {
      alert('Error al guardar el contacto.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingDoc) {
    return <div className="flex justify-center py-16 text-pink-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/contactos')}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar contacto' : 'Nuevo contacto'}
        </h1>
      </div>

      {/* Main info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Información</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            {...register('full_name', { required: 'El nombre es obligatorio' })}
            placeholder="Nombre completo o empresa"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              {...register('contact_type')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Zona</label>
          <input
            {...register('location')}
            placeholder="Ej: Medellín, Llanogrande, Envigado"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contacto</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
            <input
              {...register('phone')}
              placeholder="+573001234567"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="contacto@ejemplo.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input
            {...register('instagram')}
            placeholder="@usuario"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notas internas</h2>
        <textarea
          {...register('notes')}
          rows={4}
          placeholder="Información adicional, historial de comunicaciones, oportunidades..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate('/contactos')}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {isEditing ? 'Guardar cambios' : 'Crear contacto'}
        </button>
      </div>
    </form>
  );
}
