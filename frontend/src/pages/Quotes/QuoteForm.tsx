import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import Combobox from '../../components/ui/Combobox';
import { Loader2 } from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { customersApi } from '../../api/customers';
import { api } from '../../api/index';
import { addonPackagesApi, type AddonPackage } from '../../api/addonPackages';
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
  const [addonPackages, setAddonPackages] = useState<AddonPackage[]>([]);
  const [selectedBouquetId, setSelectedBouquetId] = useState<number | null>(null);
  const [extraHours, setExtraHours] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [existingStatus, setExistingStatus] = useState<QuoteStatus>('draft');

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<QuoteFormData>({
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

  const bouquetPackages = addonPackages.filter(p => p.type === 'bouquet');
  const hourPackage = addonPackages.find(p => p.type === 'extra_hour');

  const addonsTotal = useMemo(() => {
    let total = 0;
    if (selectedBouquetId) {
      const pkg = bouquetPackages.find(p => p.id === selectedBouquetId);
      if (pkg) total += pkg.price;
    }
    if (extraHours > 0 && hourPackage) {
      total += hourPackage.price * extraHours;
    }
    return total;
  }, [selectedBouquetId, extraHours, bouquetPackages, hourPackage]);

  // Load customers, vehicles, and addon packages
  useEffect(() => {
    customersApi.list().then(r => setCustomers(r.data));
    api.get<VehicleListItem[]>('/vehicles').then(r => setVehicles(r.data));
    addonPackagesApi.list().then(r => setAddonPackages(r.data));
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
      setExtraHours(q.extra_hours ?? 0);
      setSelectedBouquetId(q.addon_package_ids?.[0] ?? null);
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
        extra_hours: extraHours,
        addon_package_ids: selectedBouquetId ? [selectedBouquetId] : [],
        addons_total: addonsTotal,
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
    return <div className="flex justify-center py-20 text-brand-400"><Loader2 className="animate-spin" size={32} /></div>;
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
          <Controller
            name="customer_id"
            control={control}
            render={({ field }) => (
              <Combobox
                label="Cliente"
                options={customers.map(c => ({
                  value: String(c.id),
                  label: c.main_contact_name + (c.bride_name ? ` (${c.bride_name} & ${c.groom_name ?? '…'})` : ''),
                }))}
                value={field.value ? String(field.value) : ''}
                onChange={val => field.onChange(val ? Number(val) : null)}
                placeholder="Buscar cliente..."
              />
            )}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nombre / contacto <span className="text-brand-700">*</span></label>
              <input {...register('customer_name', { required: !useExistingCustomer })}
                placeholder="Ej: Vanessa Correa"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.customer_name && <p className="text-xs text-red-500 mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Teléfono / WhatsApp</label>
              <input {...register('customer_phone')}
                placeholder="+57 300 000 0000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <label className="block text-sm text-gray-600 mb-1">Fecha de boda <span className="text-brand-700">*</span></label>
            <input type="date" {...register('event_date', { required: true })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.event_date && <p className="text-xs text-red-500 mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Duración del servicio</label>
            <input {...register('service_duration')}
              placeholder="4 horas"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Zona</label>
            <select {...register('location_zone')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          <Controller
            name="vehicle_id"
            control={control}
            render={({ field }) => (
              <Combobox
                label="Vehículo"
                options={vehicles.map(v => ({
                  value: String(v.id),
                  label: [v.brand, v.model_line, v.color].filter(Boolean).join(' · ')
                    + (v.price_medellin ? ` — $${v.price_medellin.toLocaleString('es-CO')} Medellin` : ''),
                }))}
                value={field.value ? String(field.value) : ''}
                onChange={val => field.onChange(val ? Number(val) : null)}
                placeholder="Buscar vehículo..."
              />
            )}
          />
        ) : (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Descripción del vehículo</label>
            <input {...register('vehicle_description')}
              placeholder="Ej: VW Convertible Negro"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}
      </div>

      {/* ── Precio ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Precio</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Valor total <span className="text-brand-700">*</span></label>
            <input type="number" {...register('total_price', { required: true, min: 1 })}
              placeholder="1500000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.total_price && <p className="text-xs text-red-500 mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Anticipo para reservar</label>
            <input type="number" {...register('deposit_amount')}
              placeholder="750000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Instrucciones de pago</label>
          <textarea {...register('payment_instructions')} rows={2}
            placeholder="Bancolombia · Cuenta de Ahorros: 00484248273 · A nombre de: Camino a mi Boda"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>

      {/* ── Add-ons opcionales ── */}
      {addonPackages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Add-ons opcionales</h2>

          {bouquetPackages.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Paquete de ramo</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBouquetId(null)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${selectedBouquetId === null ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-brand-200'}`}
                >
                  Sin ramo
                </button>
                {bouquetPackages.map(pkg => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedBouquetId(pkg.id === selectedBouquetId ? null : pkg.id)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${pkg.id === selectedBouquetId ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-brand-200'}`}
                    title={pkg.description ?? undefined}
                  >
                    {pkg.name} <span className="text-xs opacity-70">+{pkg.price.toLocaleString('es-CO')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hourPackage && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Horas adicionales</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setExtraHours(h => Math.max(0, h - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer text-lg leading-none">−</button>
                <span className="w-8 text-center font-semibold text-gray-900">{extraHours}</span>
                <button type="button" onClick={() => setExtraHours(h => Math.min(8, h + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer text-lg leading-none">+</button>
                <span className="text-xs text-gray-400 ml-1">× {hourPackage.price.toLocaleString('es-CO')} / hora</span>
              </div>
            </div>
          )}

          {addonsTotal > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">Total add-ons</span>
              <span className="text-sm font-semibold text-brand-600">+ ${addonsTotal.toLocaleString('es-CO')}</span>
            </div>
          )}
        </div>
      )}

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
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
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
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear cotización'}
        </button>
      </div>
    </form>
  );
}
