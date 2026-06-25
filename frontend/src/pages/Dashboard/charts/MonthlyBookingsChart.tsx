import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { MonthlyBookingPoint } from '../../../api/dashboard';

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${labels[Number(mo) - 1]} ${y.slice(2)}`;
};

export default function MonthlyBookingsChart({ data }: { data: MonthlyBookingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10 }} interval={2} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip labelFormatter={(m) => formatMonth(String(m))} contentStyle={{ fontSize: 12 }} />
        <Legend formatter={l => l === 'created' ? 'Creadas' : 'Completadas'} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="created" fill="#9ca3af" radius={[2,2,0,0]} />
        <Bar dataKey="completed" fill="#16a34a" radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
