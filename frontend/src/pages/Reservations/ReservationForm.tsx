import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { AlertTriangle, ArrowLeft, Save, X } from 'lucide-react';
import Combobox from '../../components/ui/Combobox';
import { reservationsApi } from '../../api/reservations';
import { customersApi } from '../../api/customers';
import { contactsApi } from '../../api/contacts';
import { vehiclesApi } from '../../api/vehicles';
import { driversApi } from '../../api/drivers';
import { vehicleOwnersApi } from '../../api/vehicleOwners';
import type { VehicleOwnerBasic } from '../../api/vehicleOwners';
import { calendarApi } from '../../api/calendar';
import type { ConflictItem } from '../../api/calendar';
import type { ReservationFormData, ReservationStatus } from '../../types/reservation';
import { EVENT_CATEGORY_LABEL, RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../types/reservation';
import type { Customer } from '../../types/customer';
import type { Driver } from '../../types/driver';
import type { Contact } from '../../types/contact';
import type { VehicleListItem } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';

export default function ReservationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { isAdmin } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [owners, setOwners] = useState<VehicleOwnerBasic[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [customerQuickCreate, setCustomerQuickCreate] = useState<{ open: boolean; name: string; editing: Customer | null }>({ open: false, name: '', editing: null });
  const [vehicleQuickCreate, setVehicleQuickCreate] = useState<{ open: boolean; name: string; editing: VehicleListItem | null }>({ open: false, name: '', editing: null });
  const [driverQuickCreate, setDriverQuickCreate] = useState<{ open: boolean; name: string; editing: Driver | null }>({ open: false, name: '', editing: null });
  const [contactQuickCreate, setContactQuickCreate] = useState<{ open: boolean; name: string; editing: Contact | null }>({ open: false, name: '', editing: null });

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } =
    useForm<ReservationFormData>({
      defaultValues: {
        status: 'lead',
        event_category: 'standard',
        total_amount: '0',
        deposit_paid: '0',
        driver_combined: '',
        event_location: '',
        is_tentative: false,
        event_date_notes: '',
        special_instructions: '',
        notes: '',
      },
    });

  useEffect(() => {
    customersApi.list().then(r => setCustomers(r.data));
    contactsApi.list().then(r => setContacts(r.data));
    vehiclesApi.list({}).then(r => setVehicles(r.data));
    driversApi.list().then(r => setDrivers(r.data));
    vehicleOwnersApi.listBasic().then(r => setOwners(r.data));

    if (isEdit) {
      reservationsApi.get(Number(id)).then(r => {
        const v = r.data;
        const driverCombined = v.owner_driver_id
          ? `owner:${v.owner_driver_id}`
          : v.driver_id
          ? `driver:${v.driver_id}`
          : '';
        reset({
          customer_id: v.customer_id?.toString() ?? '',
          contact_id: v.contact_id?.toString() ?? '',
          quote_id: v.quote_id?.toString() ?? '',
          vehicle_id: v.vehicle_id?.toString() ?? '',
          driver_combined: driverCombined,
          event_date: v.event_date,
          start_time: v.start_time ?? '',
          end_time: v.end_time ?? '',
          total_amount: v.total_amount.toString(),
          deposit_paid: v.deposit_paid.toString(),
          status: v.status,
          event_category: v.event_category ?? 'standard',
          event_location: v.event_location ?? '',
          is_tentative: v.is_tentative ?? false,
          event_date_notes: v.event_date_notes ?? '',
          special_instructions: v.special_instructions ?? '',
          notes: v.notes ?? '',
        });
      });
    }
  }, [id, isEdit, reset]);

  const watchedDate      = useWatch({ control, name: 'event_date' });
  const watchedTentative = useWatch({ control, name: 'is_tentative' });
  const watchedVehicle = useWatch({ control, name: 'vehicle_id' });
  const watchedDriverCombined = useWatch({ control, name: 'driver_combined' });
  const watchedStart   = useWatch({ control, name: 'start_time' });
  const watchedEnd     = useWatch({ control, name: 'end_time' });
  const watchedZone    = useWatch({ control, name: 'event_location' });

  const compatibleVehicles = vehicles.filter(v =>
    !watchedZone || !v.allowed_locations || v.allowed_locations.includes(watchedZone)
  );
  const outOfZoneVehicles = watchedZone ? vehicles.filter((v: any) =>
    v.allowed_locations?.length && !v.allowed_locations.includes(watchedZone)
  ) : [];

  // Extract driver_id for conflict checking (only applies to registered drivers, not owners)
  const watchedDriverId = watchedDriverCombined?.startsWith('driver:')
    ? Number(watchedDriverCombined.split(':')[1])
    : null;

  const checkConflicts = useCallback(async () => {
    if (!watchedDate) { setConflicts([]); return; }
    try {
      const res = await calendarApi.conflicts({
        event_date: watchedDate,
        vehicle_id: watchedVehicle ? Number(watchedVehicle) : null,
        driver_id: watchedDriverId,
        start_time: watchedStart || null,
        end_time: watchedEnd || null,
        exclude_reservation_id: isEdit ? Number(id) : null,
      });
      setConflicts(res.data.conflicts);
    } catch { setConflicts([]); }
  }, [watchedDate, watchedVehicle, watchedDriverId, watchedStart, watchedEnd, id, isEdit]);

  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  const onSubmit = async (data: ReservationFormData) => {
    const val = data.driver_combined || '';
    const driverPayload: { driver_id: number | null; owner_driver_id: number | null } = {
      driver_id: null,
      owner_driver_id: null,
    };
    if (val.startsWith('owner:')) {
      driverPayload.owner_driver_id = parseInt(val.split(':')[1]);
    } else if (val.startsWith('driver:')) {
      driverPayload.driver_id = parseInt(val.split(':')[1]);
    }

    const payload = {
      customer_id: data.customer_id ? Number(data.customer_id) : null,
      contact_id: data.contact_id ? Number(data.contact_id) : null,
      quote_id: data.quote_id ? Number(data.quote_id) : null,
      vehicle_id: data.vehicle_id ? Number(data.vehicle_id) : null,
      ...driverPayload,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      total_amount: data.total_amount,
      deposit_paid: data.deposit_paid,
      status: data.status,
      event_category: data.event_category,
      event_location: data.event_location || null,
      is_tentative: data.is_tentative,
      event_date_notes: data.event_date_notes || null,
      special_instructions: data.special_instructions || null,
      notes: data.notes || null,
    };

    if (isEdit) {
      await reservationsApi.update(Number(id), payload);
      navigate(`/reservas/${id}`);
    } else {
      const res = await reservationsApi.create(payload);
      navigate(`/reservas/${res.data.id}`);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isEdit ? `/reservas/${id}` : '/reservas')}
          aria-label="Volver"
          className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar reserva' : 'Nueva reserva'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Información del evento</h2>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="customer_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Cliente (novios)"
                  options={customers.map(c => ({
                    value: String(c.id),
                    label: c.bride_name && c.groom_name ? `${c.bride_name} & ${c.groom_name}` : c.main_contact_name,
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar cliente..."
                  onCreateNew={(name) => setCustomerQuickCreate({ open: true, name, editing: null })}
                  createLabel="Crear cliente"
                  onEdit={field.value ? () => {
                    const c = customers.find(x => String(x.id) === field.value);
                    if (c) setCustomerQuickCreate({ open: true, name: '', editing: c });
                  } : undefined}
                />
              )}
            />
            <Controller
              name="contact_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Planificadora / Referida por"
                  options={contacts.map(c => ({ value: String(c.id), label: c.full_name }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar contacto..."
                  onCreateNew={(name) => setContactQuickCreate({ open: true, name, editing: null })}
                  createLabel="Crear contacto"
                  onEdit={field.value ? () => {
                    const c = contacts.find(x => String(x.id) === field.value);
                    if (c) setContactQuickCreate({ open: true, name: '', editing: c });
                  } : undefined}
                />
              )}
            />
          </div>

          <div>
            <label className={labelCls}>Fecha del evento *</label>
            <input
              type="date"
              {...register('event_date', { required: 'Requerido' })}
              className={inputCls}
            />
            {errors.event_date && <p className="text-xs text-red-500 mt-1">{errors.event_date.message}</p>}
            <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                {...register('is_tentative')}
                className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
              />
              <span className="text-xs text-gray-600">Fecha tentativa (el cliente aún no confirma el día exacto)</span>
            </label>
            {watchedTentative && (
              <input
                type="text"
                placeholder="Ej: Marzo 2027, primer quincena de junio..."
                {...register('event_date_notes')}
                className={`${inputCls} mt-2`}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Hora inicio</label>
              <input
                type="time"
                {...register('start_time')}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Hora fin</label>
              <input
                type="time"
                {...register('end_time')}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Zona del evento</label>
            <select {...register('event_location')} className={inputCls}>
              <option value="">Sin especificar</option>
              <option value="medellin">Medellín</option>
              <option value="rionegro">Rionegro / Llanogrande</option>
              <option value="carmen_de_viboral">Carmen de Viboral</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="vehicle_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Vehículo"
                  options={[
                    ...compatibleVehicles.map((v: any) => ({
                      value: String(v.id),
                      label: [v.brand, v.model_line, v.color].filter(Boolean).join(' · ') + (v.owner_name ? ` (${v.owner_name})` : ''),
                      group: watchedZone ? 'Compatible con la zona' : undefined,
                    })),
                    ...outOfZoneVehicles.map((v: any) => ({
                      value: String(v.id),
                      label: [v.brand, v.model_line, v.color].filter(Boolean).join(' · ') + (v.owner_name ? ` (${v.owner_name})` : ''),
                      group: 'Fuera de zona',
                    })),
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar vehículo..."
                  onCreateNew={isAdmin ? (name) => setVehicleQuickCreate({ open: true, name, editing: null }) : undefined}
                  createLabel="Crear vehículo"
                  onEdit={isAdmin && field.value ? () => {
                    const v = vehicles.find(x => String(x.id) === field.value);
                    if (v) setVehicleQuickCreate({ open: true, name: '', editing: v });
                  } : undefined}
                />
              )}
            />
            <Controller
              name="driver_combined"
              control={control}
              render={({ field }) => (
                <Combobox
                  label="Conductor"
                  options={[
                    ...drivers.map(d => ({
                      value: `driver:${d.id}`,
                      label: d.full_name,
                      group: 'Conductores',
                    })),
                    ...owners.map(o => ({
                      value: `owner:${o.id}`,
                      label: `${o.full_name} (propietario)`,
                      group: 'Propietarios',
                    })),
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar conductor..."
                  onCreateNew={(name) => setDriverQuickCreate({ open: true, name, editing: null })}
                  createLabel="Crear conductor"
                  onEdit={field.value?.startsWith('driver:') ? () => {
                    const driverId = Number(field.value.split(':')[1]);
                    const d = drivers.find(x => x.id === driverId);
                    if (d) setDriverQuickCreate({ open: true, name: '', editing: d });
                  } : undefined}
                />
              )}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Financiero</h2>
          <div>
            <label className={labelCls}>Valor total (COP)</label>
            <input
              type="number"
              min="0"
              step="1000"
              {...register('total_amount', { required: 'Requerido' })}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Los depósitos se registran en el detalle de la reserva.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Estado y notas</h2>

          <div>
            <label className={labelCls}>Estado</label>
            <select {...register('status')} className={inputCls}>
              {STATUS_FLOW.map(s => (
                <option key={s} value={s}>{RESERVATION_STATUS_LABEL[s as ReservationStatus]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Tipo de evento</label>
            <select {...register('event_category')} className={inputCls}>
              {(Object.entries(EVENT_CATEGORY_LABEL) as [keyof typeof EVENT_CATEGORY_LABEL, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Instrucciones especiales</label>
            <textarea
              rows={3}
              {...register('special_instructions')}
              className={inputCls}
              placeholder="Instrucciones para el conductor, decoración, etc."
            />
          </div>

          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea
              rows={2}
              {...register('notes')}
              className={inputCls}
              placeholder="Notas del equipo de operaciones"
            />
          </div>
        </div>

        {conflicts.length > 0 && (() => {
          const hasBlocking = conflicts.some(c => c.severity === 'blocking');
          return (
            <div className={`border rounded-xl p-4 space-y-1 ${
              hasBlocking
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className={`flex items-center gap-2 font-semibold text-sm ${
                hasBlocking ? 'text-red-700' : 'text-yellow-700'
              }`}>
                <AlertTriangle size={16} />
                {hasBlocking ? 'Conflicto de horario' : 'Posible conflicto de horario'}
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className={`text-sm ml-6 ${
                  c.severity === 'blocking' ? 'text-red-700' : 'text-yellow-700'
                }`}>{c.message}</p>
              ))}
              {!hasBlocking && (
                <p className="text-xs text-yellow-600 ml-6 mt-1">
                  No hay horarios definidos para comparar — verifica manualmente antes de confirmar.
                </p>
              )}
            </div>
          );
        })()}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/reservas/${id}` : '/reservas')}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || conflicts.some(c => c.severity === 'blocking')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save size={16} />
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>

      {customerQuickCreate.open && (
        <CustomerQuickCreateModal
          initialName={customerQuickCreate.name}
          initial={customerQuickCreate.editing}
          onSave={async (form) => {
            const payload = {
              main_contact_name: form.main_contact_name,
              bride_name: form.bride_name || null,
              groom_name: form.groom_name || null,
              phone: form.phone || null,
            };
            if (customerQuickCreate.editing) {
              const res = await customersApi.update(customerQuickCreate.editing.id, payload);
              setCustomers(prev => prev.map(c => c.id === res.data.id ? res.data : c));
              setValue('customer_id', String(res.data.id));
            } else {
              const res = await customersApi.create(payload);
              setCustomers(prev => [...prev, res.data]);
              setValue('customer_id', String(res.data.id));
            }
            setCustomerQuickCreate({ open: false, name: '', editing: null });
          }}
          onClose={() => setCustomerQuickCreate({ open: false, name: '', editing: null })}
        />
      )}

      {vehicleQuickCreate.open && (
        <VehicleQuickCreateModal
          initialName={vehicleQuickCreate.name}
          initial={vehicleQuickCreate.editing}
          onSave={async (form) => {
            const payload = {
              brand: form.brand,
              license_plate: form.license_plate.toUpperCase(),
              model_line: form.model_line || null,
              color: form.color || null,
            };
            if (vehicleQuickCreate.editing) {
              const res = await vehiclesApi.update(vehicleQuickCreate.editing.id, payload);
              setVehicles(prev => prev.map(v => v.id === res.data.id ? res.data : v));
              setValue('vehicle_id', String(res.data.id));
            } else {
              const res = await vehiclesApi.create(payload);
              setVehicles(prev => [...prev, res.data]);
              setValue('vehicle_id', String(res.data.id));
            }
            setVehicleQuickCreate({ open: false, name: '', editing: null });
          }}
          onClose={() => setVehicleQuickCreate({ open: false, name: '', editing: null })}
        />
      )}

      {driverQuickCreate.open && (
        <DriverQuickCreateModal
          initialName={driverQuickCreate.name}
          initial={driverQuickCreate.editing}
          onSave={async (form) => {
            const payload = {
              full_name: form.full_name,
              phone: form.phone || null,
              whatsapp: form.whatsapp || null,
            };
            if (driverQuickCreate.editing) {
              const res = await driversApi.update(driverQuickCreate.editing.id, payload);
              setDrivers(prev => prev.map(d => d.id === res.data.id ? res.data : d));
              setValue('driver_combined', `driver:${res.data.id}`);
            } else {
              const res = await driversApi.create(payload);
              setDrivers(prev => [...prev, res.data]);
              setValue('driver_combined', `driver:${res.data.id}`);
            }
            setDriverQuickCreate({ open: false, name: '', editing: null });
          }}
          onClose={() => setDriverQuickCreate({ open: false, name: '', editing: null })}
        />
      )}

      {contactQuickCreate.open && (
        <ContactQuickCreateModal
          initialName={contactQuickCreate.name}
          initial={contactQuickCreate.editing}
          onSave={async (form) => {
            const payload = {
              full_name: form.full_name,
              contact_type: form.contact_type,
              phone: form.phone || null,
            };
            if (contactQuickCreate.editing) {
              const res = await contactsApi.update(contactQuickCreate.editing.id, payload);
              setContacts(prev => prev.map(c => c.id === res.data.id ? res.data : c));
              setValue('contact_id', String(res.data.id));
            } else {
              const res = await contactsApi.create(payload);
              setContacts(prev => [...prev, res.data]);
              setValue('contact_id', String(res.data.id));
            }
            setContactQuickCreate({ open: false, name: '', editing: null });
          }}
          onClose={() => setContactQuickCreate({ open: false, name: '', editing: null })}
        />
      )}
    </div>
  );
}

// ─── Customer Quick Create Modal ─────────────────────────────────────────────
interface CustomerQuickCreateForm {
  bride_name: string;
  groom_name: string;
  main_contact_name: string;
  phone: string;
}

function CustomerQuickCreateModal({
  initialName,
  initial,
  onSave,
  onClose,
}: {
  initialName: string;
  initial?: Customer | null;
  onSave: (data: CustomerQuickCreateForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CustomerQuickCreateForm>({
    bride_name: initial?.bride_name ?? '',
    groom_name: initial?.groom_name ?? '',
    main_contact_name: initial?.main_contact_name ?? initialName,
    phone: initial?.phone ?? '',
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-400">Podrás completar cédula, email y más datos luego desde Clientes.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? (initial ? 'Guardando…' : 'Creando…') : (initial ? 'Guardar' : 'Crear y usar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Quick Create Modal ──────────────────────────────────────────────
interface VehicleQuickCreateForm {
  brand: string;
  license_plate: string;
  model_line: string;
  color: string;
}

function VehicleQuickCreateModal({
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar vehículo' : 'Nuevo vehículo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
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
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? (initial ? 'Guardando…' : 'Creando…') : (initial ? 'Guardar' : 'Crear y usar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Driver Quick Create Modal ───────────────────────────────────────────────
interface DriverQuickCreateForm {
  full_name: string;
  phone: string;
  whatsapp: string;
}

function DriverQuickCreateModal({
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar conductor' : 'Nuevo conductor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
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
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? (initial ? 'Guardando…' : 'Creando…') : (initial ? 'Guardar' : 'Crear y usar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Quick Create Modal ──────────────────────────────────────────────
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
}

function ContactQuickCreateModal({
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{initial ? 'Editar contacto' : 'Nuevo contacto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-gray-400">Podrás completar email, Instagram y más datos luego desde Contactos.</p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving ? (initial ? 'Guardando…' : 'Creando…') : (initial ? 'Guardar' : 'Crear y usar')}
          </button>
        </div>
      </div>
    </div>
  );
}
