import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DepositPoint } from '../../../api/finance';

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${labels[Number(mo) - 1]} ${y.slice(2)}`;
};

const formatCOP = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

const formatCOPFull = (v: number) => `$${Number(v).toLocaleString('es-CO')}`;

interface Props {
  data: DepositPoint[];
}

export default function DepositsChart({ data }: Props) {
  if (!data.length) return (
    <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período.</p>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11 }} width={52} />
        <Tooltip
          labelFormatter={(m) => formatMonth(String(m))}
          formatter={(value, name) => [
            formatCOPFull(Number(value)),
            name === 'deposits_received' ? 'Depósitos cobrados' : 'Saldo pendiente',
          ]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend
          formatter={l => l === 'deposits_received' ? 'Depósitos cobrados' : 'Saldo pendiente'}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="deposits_received" fill="#db2777" radius={[2, 2, 0, 0]} />
        <Bar dataKey="remaining_balance" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
