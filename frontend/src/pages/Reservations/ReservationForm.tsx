import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
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
import { RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../types/reservation';

export default function ReservationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [owners, setOwners] = useState<VehicleOwnerBasic[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<ReservationFormData>({
      defaultValues: {
        status: 'lead',
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
    </div>
  );
}
