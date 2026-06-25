import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { customersApi } from '../../api/customers';
import { api } from '../../api/index';
import type { Customer } from '../../types/customer';
import type { VehicleListItem } from '../../types/vehicle';
import type { Quote, QuoteFormData, LocationZone, QuoteStatus } from '../../types/quote';
import { ZONE_LABEL, QUOTE_STATUS_LABEL } from '../../types/quote';

const ZONES: LocationZone[] = ['medellin', 'rionegro', 'other'];
const STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

export default function QuoteForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [existingStatus, setExistingStatus] = useState<QuoteStatus>('draft');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuoteFormData>({
    defaultValues: {
      use_existing_customer: false,
      customer_id: null,
      customer_name: '',
      customer_phone: '',
      use_existing_vehicle: false,
      vehicle_id: null,
      vehicle_description: '',
      event_date: '',
      service_duration: '4 horas',
      location_zone: 'medellin',
      pickup_location: '',
      ceremony_location: '',
      reception_location: '',
      total_price: '',
      deposit_amount: '',
      payment_instructions: '',
      notes: '',
    },
  });

  const useExistingCustomer = watch('use_existing_customer');
  const useExistingVehicle = watch('use_existing_vehicle');
  const selectedVehicleId = watch('vehicle_id');
  const selectedZone = watch('location_zone');

  // Load customers and vehicles
  useEffect(() => {
    customersApi.list().then(r => setCustomers(r.data));
    api.get<VehicleListItem[]>('/vehicles').then(r => setVehicles(r.data));
  }, []);

  // Auto-fill price when vehicle or zone changes
  useEffect(() => {
    if (!selectedVehicleId) return;
    const v = vehicles.find(x => x.id === Number(selectedVehicleId));
    if (!v) return;
    const price = selectedZone === 'medellin' ? v.price_medellin : selectedZone === 'rionegro' ? v.price_rionegro : null;
    if (price) setValue('total_price', String(price));
    setValue('vehicle_description', `${v.brand}${v.model_line ? ' ' + v.model_line : ''}${v.color ? ' / ' + v.color : ''}`);
  }, [selectedVehicleId, selectedZone, vehicles]);

  // Load existing quote for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    quotesApi.get(Number(id)).then(r => {
      const q: Quote = r.data;
      setExistingStatus(q.status);
      setValue('use_existing_customer', Boolean(q.customer_id));
      setValue('customer_id', q.customer_id);
      setValue('customer_name', q.customer_name ?? '');
      setValue('customer_phone', q.customer_phone ?? '');
      setValue('use_existing_vehicle', Boolean(q.vehicle_id));
      setValue('vehicle_id', q.vehicle_id);
      setValue('vehicle_description', q.vehicle_description ?? '');
      setValue('event_date', q.event_date);
      setValue('service_duration', q.service_duration ?? '4 horas');
      setValue('location_zone', q.location_zone);
      setValue('pickup_location', q.pickup_location ?? '');
      setValue('ceremony_location', q.ceremony_location ?? '');
      setValue('reception_location', q.reception_location ?? '');
      setValue('total_price', String(q.total_price));
      setValue('deposit_amount', q.deposit_amount ? String(q.deposit_amount) : '');
      setValue('payment_instructions', q.payment_instructions ?? '');
      setValue('notes', q.notes ?? '');
    }).finally(() => setLoading(false));
  }, [id, isEdit]);

  const onSubmit = async (data: QuoteFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        event_date: data.event_date,
        service_duration: data.service_duration || null,
        location_zone: data.location_zone,
        pickup_location: data.pickup_location || null,
        ceremony_location: data.ceremony_location || null,
        reception_location: data.reception_location || null,
        total_price: Number(data.total_price),
        deposit_amount: data.deposit_amount ? Number(data.deposit_amount) : null,
        payment_instructions: data.payment_instructions || null,
        notes: data.notes || null,
        customer_id: data.use_existing_customer ? (Number(data.customer_id) || null) : null,
        customer_name: data.use_existing_customer ? null : (data.customer_name || null),
        customer_phone: data.use_existing_customer ? null : (data.customer_phone || null),
        vehicle_id: data.use_existing_vehicle ? (Number(data.vehicle_id) || null) : null,
        vehicle_description: data.use_existing_vehicle ? null : (data.vehicle_description || null),
      };
      if (isEdit && id) {
        await quotesApi.update(Number(id), payload);
      } else {
        await quotesApi.create(payload);
      }
      navigate('/cotizaciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-pink-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar cotización' : 'Nueva cotización'}
        </h1>
        {isEdit && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600`}>
            {QUOTE_STATUS_LABEL[existingStatus]}
          </span>
        )}
      </div>

      {/* ── Cliente ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cliente</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" {...register('use_existing_customer')}
              value="false" checked={!useExistingCustomer}
              onChange={() => setValue('use_existing_customer', false)}
              className="accent-pink-600"
            /> Datos libres
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" {...register('use_existing_customer')}
              value="true" checked={useExistingCustomer}
              onChange={() => setValue('use_existing_customer', true)}
              className="accent-pink-600"
            /> Cliente registrado
          </label>
        </div>

        {useExistingCustomer ? (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Cliente</label>
            <select {...register('customer_id')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="">Seleccionar cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.main_contact_name}{c.bride_name ? ` (${c.bride_name} & ${c.groom_name ?? '…'})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nombre / contacto <span className="text-pink-500">*</span></label>
              <input {...register('customer_name', { required: !useExistingCustomer })}
                placeholder="Ej: Vanessa Correa"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              {errors.customer_name && <p className="text-xs text-red-500 mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Teléfono / WhatsApp</label>
              <input {...register('customer_phone')}
                placeholder="+57 300 000 0000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Evento ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Evento</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fecha de boda <span className="text-pink-500">*</span></label>
            <input type="date" {...register('event_date', { required: true })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            {errors.event_date && <p className="text-xs text-red-500 mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Duración del servicio</label>
            <input {...register('service_duration')}
              placeholder="4 horas"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Zona</label>
            <select {...register('location_zone')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              {ZONES.map(z => <option key={z} value={z}>{ZONE_LABEL[z]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Vehículo ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Vehículo</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={!useExistingVehicle}
              onChange={() => setValue('use_existing_vehicle', false)}
              className="accent-pink-600"
            /> Descripción libre
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={useExistingVehicle}
              onChange={() => setValue('use_existing_vehicle', true)}
              className="accent-pink-600"
            /> Del inventario
          </label>
        </div>

        {useExistingVehicle ? (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Vehículo</label>
            <select {...register('vehicle_id')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.brand}{v.model_line ? ` ${v.model_line}` : ''}{v.color ? ` / ${v.color}` : ''}
                  {v.price_medellin ? ` — $${v.price_medellin.toLocaleString('es-CO')} Medellín` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción del vehículo</label>
            <input {...register('vehicle_description')}
              placeholder="Ej: VW Convertible Negro"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        )}
      </div>

      {/* ── Recorrido ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recorrido</h2>
        {[
          { field: 'pickup_location' as const, label: 'Recogida', placeholder: 'Edificio Caña Brava, Belén Malibú' },
          { field: 'ceremony_location' as const, label: 'Ceremonia', placeholder: 'Parroquia San Anselmo' },
          { field: 'reception_location' as const, label: 'Recepción', placeholder: 'Club Español, Envigado' },
        ].map(({ field, label, placeholder }) => (
          <div key={field}>
            <label className="block text-sm text-gray-600 mb-1">{label}</label>
            <input {...register(field)} placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        ))}
      </div>

      {/* ── Precio ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Precio</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Valor total <span className="text-pink-500">*</span></label>
            <input type="number" {...register('total_price', { required: true, min: 1 })}
              placeholder="1500000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            {errors.total_price && <p className="text-xs text-red-500 mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Anticipo para reservar</label>
            <input type="number" {...register('deposit_amount')}
              placeholder="750000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Instrucciones de pago</label>
          <textarea {...register('payment_instructions')} rows={2}
            placeholder="Bancolombia · Cuenta de Ahorros: 00484248273 · A nombre de: Camino a mi Boda"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
          />
        </div>
      </div>

      {/* ── Estado (solo en edición) ── */}
      {isEdit && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Estado</h2>
          <select
            value={existingStatus}
            onChange={async (e) => {
              const newStatus = e.target.value as QuoteStatus;
              setExistingStatus(newStatus);
              if (id) await quotesApi.update(Number(id), { status: newStatus });
            }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            {STATUSES.map(s => <option key={s} value={s}>{QUOTE_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
      )}

      {/* ── Notas ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notas internas</h2>
        <textarea {...register('notes')} rows={2}
          placeholder="Observaciones para el equipo..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pb-8">
        <button type="button" onClick={() => navigate('/cotizaciones')}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear cotización'}
        </button>
      </div>
    </form>
  );
}
