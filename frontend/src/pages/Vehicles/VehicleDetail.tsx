import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart2, Calendar, Edit, Loader2, MessageCircle, PhoneCall } from 'lucide-react';
import { vehiclesApi } from '../../api/vehicles';
import { reservationsApi } from '../../api/reservations';
import type { Vehicle } from '../../types/vehicle';
import type { ReservationListItem, ReservationStatus } from '../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL } from '../../types/reservation';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { EntityLink } from '../../components/EntityLink';
import { Badge } from '../../components/ui/Badge';
import { CATEGORY_OPTIONS } from '../../components/vehicleFilterKit';
import { SCORE_CATEGORIES, ScoreDotsRow, ScoreTotalBar } from '../../components/ui/ScoreRating';
import { buildWaUrl, whatsAppLinkProps } from '../../utils/whatsapp';

const LOCATION_LABEL: Record<string, string> = {
  medellin: 'Medellín',
  rionegro: 'Rionegro / Llanogrande',
  carmen_de_viboral: 'Carmen de Viboral',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
};

// Events that represent a real, committed booking — leads/quotes aren't
// agendados yet, and cancelled ones no longer are.
const AGENDADO_STATUSES: ReservationStatus[] = ['deposit_received', 'reserved', 'confirmed'];

function formatCOP(n: number): string {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

function formatDateLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Most events are single-day, but a few (mostly ad/production shoots) span
// several — show the full range instead of just the start date for those.
function formatDateRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatDateLong(startISO);
  const start = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO + 'T12:00:00');
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    const monthYear = end.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return `${start.getDate()}–${end.getDate()} de ${monthYear}`;
  }
  return `${formatDateLong(startISO)} – ${formatDateLong(endISO)}`;
}

function buildAvailabilityCheckMsg(vehicle: Vehicle, fechaISO: string): string {
  const name = `${vehicle.color ? `${vehicle.color} ` : ''}${vehicle.brand}${vehicle.model_line ? ` ${vehicle.model_line}` : ''}`;
  return `Hola! Te escribo de Camino a mi Boda. ¿Está disponible el ${name} (${vehicle.license_plate}) para el ${formatDateLong(fechaISO)}?`;
}

function buildBookingsMsg(vehicle: Vehicle, bookings: ReservationListItem[]): string {
  const vehicleName = [vehicle.brand, vehicle.model_line, vehicle.color].filter(Boolean).join(' ');
  const lines: string[] = [
    `Hola! Aquí está el listado de eventos agendados para el ${vehicleName} (${vehicle.license_plate}):`,
    '',
  ];
  bookings.forEach(b => {
    lines.push(`*${formatDateRange(b.event_date, b.event_end_date)}* – ${b.display_customer}`);
  });
  lines.push('');
  lines.push('Camino a mi Boda');
  lines.push('https://www.instagram.com/caminoamiboda');
  return lines.join('\n');
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value ?? <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fecha = searchParams.get('fecha');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [bookings, setBookings] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const vehicleId = Number(id);
    Promise.all([
      vehiclesApi.get(vehicleId),
      reservationsApi.list({ vehicle_id: vehicleId, sort_by: 'event_date', sort_dir: 'asc', page_size: 200 }),
    ]).then(([vRes, rRes]) => {
      setVehicle(vRes.data);
      const todayISO = new Date().toISOString().slice(0, 10);
      setBookings(
        rRes.data.items.filter(r => r.event_end_date >= todayISO && AGENDADO_STATUSES.includes(r.status))
      );
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!vehicle) return null;

  const displayName = [vehicle.brand, vehicle.model_line, vehicle.color].filter(Boolean).join(' ');
  const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === vehicle.category)?.label;
  const visiblePhotos = vehicle.photos.filter(p => p.is_visible);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/vehiculos')}
          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-brand-800 truncate">{displayName}</h1>
          <p className="text-sm text-gray-400">{vehicle.license_plate} · {vehicle.year ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/vehiculos/${vehicle.id}/estadisticas`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
          >
            <BarChart2 size={15} />
            Ver estadísticas
          </button>
          <button
            onClick={() => navigate(`/vehiculos/editar/${vehicle.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors cursor-pointer"
          >
            <Edit size={15} />
            Editar
          </button>
        </div>
      </div>

      {/* Un cliente preguntó por este vehículo con fecha */}
      {fecha && (
        <div className="flex items-center justify-between flex-wrap gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
          <p className="text-sm text-brand-800">
            Un cliente preguntó por este vehículo para el <span className="font-semibold capitalize">{formatDateLong(fecha)}</span>.
          </p>
          {vehicle.owner_contact ? (
            <a
              href={buildWaUrl(vehicle.owner_contact, buildAvailabilityCheckMsg(vehicle, fecha))}
              {...whatsAppLinkProps()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <PhoneCall size={13} />
              Consultar disponibilidad con el propietario
            </a>
          ) : vehicle.owner_whatsapp_username ? (
            <span className="text-xs text-brand-700 shrink-0" title="Sin teléfono — buscar este usuario en WhatsApp">@{vehicle.owner_whatsapp_username} · buscar en WhatsApp</span>
          ) : null}
        </div>
      )}

      {/* Basic info */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Información básica</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Placa" value={vehicle.license_plate} />
          <Field label="Código interno" value={vehicle.sku} />
          <Field label="Marca" value={vehicle.brand} />
          <Field label="Línea / Modelo" value={vehicle.model_line} />
          <Field label="Color" value={vehicle.color} />
          <Field label="Año" value={vehicle.year} />
          <Field label="Tipo de vehículo" value={vehicle.vehicle_type === 'car' ? 'Carro' : 'Moto'} />
          <Field label="Tipo de carrocería" value={vehicle.body_type} />
          <Field label="Categoría" value={categoryLabel} />
          <Field label="Capacidad de pasajeros" value={vehicle.capacity} />
        </CardBody>
      </Card>

      {/* Location & status */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Ubicación y estado</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ubicación" value={LOCATION_LABEL[vehicle.location] ?? vehicle.location} />
          <Field label="Estado" value={<Badge variant={vehicle.status === 'active' ? 'green' : vehicle.status === 'pending' ? 'blue' : 'gray'}>{STATUS_LABEL[vehicle.status]}</Badge>} />
          <div className="sm:col-span-2">
            <Field
              label="Zonas de operación"
              value={vehicle.allowed_locations?.length
                ? vehicle.allowed_locations.map(z => LOCATION_LABEL[z] ?? z).join(', ')
                : 'Opera en todas'}
            />
          </div>
          {vehicle.is_featured && (
            <div className="sm:col-span-2">
              <Badge variant="pink">Destacado en el catálogo público</Badge>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Prices */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Precios (COP)</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Precio Medellín" value={vehicle.price_medellin != null ? formatCOP(vehicle.price_medellin) : null} />
          <Field label="Precio Rionegro / Llanogrande" value={vehicle.price_rionegro != null ? formatCOP(vehicle.price_rionegro) : null} />
        </CardBody>
      </Card>

      {/* Owner */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Propietario</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicle.is_company_owned ? (
            <div className="sm:col-span-2">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Vehículo de Camino a mi Boda. El 100% del ingreso queda en la empresa.
              </p>
            </div>
          ) : (
            <>
              <Field label="Propietario" value={vehicle.owner_name && (
                <EntityLink to={`/propietarios/editar/${vehicle.owner_id}`} id={vehicle.owner_id} requireAdmin>
                  {vehicle.owner_name}
                </EntityLink>
              )} />
              <Field label="Contacto" value={vehicle.owner_contact} />
            </>
          )}
        </CardBody>
      </Card>

      {/* Scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Puntuaciones (1–5)</h2>
            <ScoreTotalBar total={vehicle.score_total} size="sm" />
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {SCORE_CATEGORIES.map(({ field, label, icon }) => (
            <ScoreDotsRow
              key={field}
              label={label}
              icon={icon}
              value={vehicle[field as keyof Vehicle] as number | null}
            />
          ))}
        </CardBody>
      </Card>

      {/* Pico y Placa */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Pico y Placa</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Día de restricción" value={vehicle.pico_y_placa_day} />
          <Field label="Horario" value={vehicle.pico_y_placa_hours} />
          <Field label="Override manual" value={vehicle.pyp_day_override} />
        </CardBody>
      </Card>

      {/* Photos */}
      {visiblePhotos.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Fotos</h2></CardHeader>
          <CardBody className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {visiblePhotos.map(p => (
              <img key={p.id} src={p.url} alt={displayName} className="w-full aspect-square object-cover rounded-lg" />
            ))}
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {vehicle.description && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Notas internas</h2></CardHeader>
          <CardBody>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.description}</p>
          </CardBody>
        </Card>
      )}

      {/* Bride-facing description */}
      {vehicle.bride_description && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Descripción para novias</h2></CardHeader>
          <CardBody>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.bride_description}</p>
          </CardBody>
        </Card>
      )}

      {/* Eventos agendados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Eventos agendados</h2>
            {bookings.length > 0 && (vehicle.owner_contact ? (
              <a
                href={buildWaUrl(vehicle.owner_contact, buildBookingsMsg(vehicle, bookings))}
                {...whatsAppLinkProps()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors cursor-pointer"
              >
                <MessageCircle size={13} />
                Enviar por WhatsApp al propietario
              </a>
            ) : vehicle.owner_whatsapp_username ? (
              <span className="text-xs text-gray-400" title="Sin teléfono — buscar este usuario en WhatsApp">@{vehicle.owner_whatsapp_username} · buscar en WhatsApp</span>
            ) : null)}
          </div>
        </CardHeader>
        <CardBody>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={24} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Sin eventos agendados próximamente.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {bookings.map(b => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/reservas/${b.id}`)}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50/50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.display_customer}</p>
                    <p className="text-xs text-gray-400 capitalize">{formatDateRange(b.event_date, b.event_end_date)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RESERVATION_STATUS_COLOR[b.status]}`}>
                    {RESERVATION_STATUS_LABEL[b.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
