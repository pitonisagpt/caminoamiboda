import { useEffect, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import type { AnalyticsResponse, RevenueTrendPoint } from '../../api/dashboard';
import type { DateRange } from './DateRangeFilter';
import RevenueTrendChart from './charts/RevenueTrendChart';
import ConversionFunnelChart from './charts/ConversionFunnelChart';
import MonthlyBookingsChart from './charts/MonthlyBookingsChart';
import CategoryBreakdownChart from './charts/CategoryBreakdownChart';
import SeasonalityChart from './charts/SeasonalityChart';

function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group/tip flex-shrink-0">
      <Info size={13} className="text-gray-300 hover:text-gray-400 cursor-default transition-colors" />
      <span className="pointer-events-none absolute right-0 top-5 z-20 w-60 rounded-xl bg-gray-900 px-3 py-2 text-xs text-gray-100 leading-relaxed shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        {text}
      </span>
    </span>
  );
}

function Card({ title, subtitle, tooltip, children }: { title: string; subtitle?: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          {tooltip && <Tooltip text={tooltip} />}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="animate-spin text-brand-400" size={28} />
    </div>
  );
}

interface Props {
  range: DateRange;
}

export default function AnalyticsSection({ range }: Props) {
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { date_from: range.from ?? undefined, date_to: range.to ?? undefined };
    Promise.all([
      dashboardApi.revenueTrend(params),
      dashboardApi.analytics(params),
    ]).then(([tRes, aRes]) => {
      setTrend(tRes.data.data);
      setAnalytics(aRes.data);
    }).finally(() => setLoading(false));
  }, [range.from, range.to]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Analíticas</h2>
        <p className="text-xs text-gray-400 mt-0.5">Basado en historial de reservas</p>
      </div>

      {/* Row 1: Revenue trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card title="Tendencia de ingresos" subtitle={`Eventos completados · ${range.label}`} tooltip="Ingresos totales por mes vs. ganancia neta de la empresa (100% para vehículos propios, 30% para vehículos de socios). Solo incluye reservas completadas.">
            {loading ? <Spinner /> : <RevenueTrendChart data={trend} />}
          </Card>
        </div>
        <div>
          <Card title="Embudo de conversión" subtitle={`Categoría estándar · ${range.label}`} tooltip="Cuántas reservas hay en cada etapa del proceso: desde lead inicial hasta evento completado. Permite ver dónde se pierden oportunidades.">
            {loading ? <Spinner /> : <ConversionFunnelChart data={analytics?.funnel ?? []} />}
          </Card>
        </div>
      </div>

      {/* Row 2: Monthly bookings + Category + Seasonality */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Reservas vs Completadas" subtitle={range.label} tooltip="Barras azules: reservas creadas ese mes. Barras rosas: eventos efectivamente completados. La diferencia muestra reservas en curso o canceladas.">
          {loading ? <Spinner /> : <MonthlyBookingsChart data={analytics?.monthly_bookings ?? []} />}
        </Card>
        <Card title="Distribución por categoría" subtitle={range.label} tooltip="Proporción de eventos por categoría de vehículo (clásico, vintage, moderno). Útil para saber qué portafolio genera más demanda.">
          {loading ? <Spinner /> : <CategoryBreakdownChart data={analytics?.category_breakdown ?? []} />}
        </Card>
        <Card title="Estacionalidad" subtitle={`Eventos completados · ${range.label}`} tooltip="Concentración de eventos por mes, acumulado histórico. Muestra los meses de mayor demanda para planear disponibilidad y precios.">
          {loading ? <Spinner /> : <SeasonalityChart data={analytics?.seasonality ?? []} />}
        </Card>
      </div>
    </div>
  );
}
