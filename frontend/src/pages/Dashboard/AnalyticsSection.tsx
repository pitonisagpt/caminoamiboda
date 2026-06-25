import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import type { AnalyticsResponse, RevenueTrendPoint } from '../../api/dashboard';
import RevenueTrendChart from './charts/RevenueTrendChart';
import ConversionFunnelChart from './charts/ConversionFunnelChart';
import MonthlyBookingsChart from './charts/MonthlyBookingsChart';
import CategoryBreakdownChart from './charts/CategoryBreakdownChart';
import SeasonalityChart from './charts/SeasonalityChart';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center items-center h-40">
      <Loader2 className="animate-spin text-pink-400" size={28} />
    </div>
  );
}

export default function AnalyticsSection() {
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.revenueTrend(24),
      dashboardApi.analytics(),
    ]).then(([tRes, aRes]) => {
      setTrend(tRes.data.data);
      setAnalytics(aRes.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Analíticas</h2>
        <p className="text-xs text-gray-400 mt-0.5">Basado en historial de reservas</p>
      </div>

      {/* Row 1: Revenue trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card title="Tendencia de ingresos" subtitle="Eventos completados — últimos 24 meses">
            {loading ? <Spinner /> : <RevenueTrendChart data={trend} />}
          </Card>
        </div>
        <div>
          <Card title="Embudo de conversión" subtitle="Categoría estándar — histórico">
            {loading ? <Spinner /> : <ConversionFunnelChart data={analytics?.funnel ?? []} />}
          </Card>
        </div>
      </div>

      {/* Row 2: Monthly bookings + Category + Seasonality */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Reservas vs Completadas" subtitle="Últimos 12 meses">
          {loading ? <Spinner /> : <MonthlyBookingsChart data={analytics?.monthly_bookings ?? []} />}
        </Card>
        <Card title="Distribución por categoría" subtitle="Todos los eventos">
          {loading ? <Spinner /> : <CategoryBreakdownChart data={analytics?.category_breakdown ?? []} />}
        </Card>
        <Card title="Estacionalidad" subtitle="Eventos completados por mes del año">
          {loading ? <Spinner /> : <SeasonalityChart data={analytics?.seasonality ?? []} />}
        </Card>
      </div>
    </div>
  );
}
