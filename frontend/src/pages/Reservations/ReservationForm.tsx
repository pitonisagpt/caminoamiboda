import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { reservationsApi } from '../../api/reservations';
import { customersApi } from '../../api/customers';
import { vehiclesApi } from '../../api/vehicles';
import { driversApi } from '../../api/drivers';
import type { ReservationFormData, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../types/reservation';

export default function ReservationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ReservationFormData>({
      defaultValues: {
        status: 'lead',
        total_amount: '0',
        deposit_paid: '0',
        special_instructions: '',
        notes: '',
      },
    });

  useEffect(() => {
    customersApi.list().then(r => setCustomers(r.data));
    vehiclesApi.list({}).then(r => setVehicles(r.data));
    driversApi.list().then(r => setDrivers(r.data));

    if (isEdit) {
      reservationsApi.get(Number(id)).then(r => {
        const v = r.data;
        reset({
          customer_id: v.customer_id?.toString() ?? '',
          quote_id: v.quote_id?.toString() ?? '',
          vehicle_id: v.vehicle_id?.toString() ?? '',
          driver_id: v.driver_id?.toString() ?? '',
          event_date: v.event_date,
          total_amount: v.total_amount.toString(),
          deposit_paid: v.deposit_paid.toString(),
          status: v.status,
          special_instructions: v.special_instructions ?? '',
          notes: v.notes ?? '',
        });
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: ReservationFormData) => {
    const payload = {
      customer_id: data.customer_id ? Number(data.customer_id) : null,
      quote_id: data.quote_id ? Number(data.quote_id) : null,
      vehicle_id: data.vehicle_id ? Number(data.vehicle_id) : null,
      driver_id: data.driver_id ? Number(data.driver_id) : null,
      event_date: data.event_date,
      total_amount: data.total_amount,
      deposit_paid: data.deposit_paid,
      status: data.status,
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

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(isEdit ? `/reservas/${id}` : '/reservas')}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
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
            <div>
              <label className={labelCls}>Cliente</label>
              <select {...register('customer_id')} className={inputCls}>
                <option value="">Sin asignar</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.bride_name && c.groom_name ? `${c.bride_name} & ${c.groom_name}` : c.main_contact_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Fecha del evento *</label>
              <input
                type="date"
                {...register('event_date', { required: 'Requerido' })}
                className={inputCls}
              />
              {errors.event_date && <p className="text-xs text-red-500 mt-1">{errors.event_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Vehículo</label>
              <select {...register('vehicle_id')} className={inputCls}>
                <option value="">Sin asignar</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name || `${v.brand} ${v.color ?? ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Conductor</label>
              <select {...register('driver_id')} className={inputCls}>
                <option value="">Sin asignar</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Financiero</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Valor total (COP)</label>
              <input
                type="number"
                min="0"
                step="1000"
                {...register('total_amount', { required: 'Requerido' })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Depósito pagado (COP)</label>
              <input
                type="number"
                min="0"
                step="1000"
                {...register('deposit_paid')}
                className={inputCls}
              />
            </div>
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
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save size={16} />
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
