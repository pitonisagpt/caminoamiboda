import { DollarSign } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

export default function FinanceTab({ reservation }: { reservation: Reservation }) {
  const pct = reservation.total_amount > 0
    ? Math.round((reservation.deposit_paid / reservation.total_amount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen financiero</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatCOP(reservation.total_amount)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Depósito</p>
            <p className="text-lg font-bold text-green-700">{formatCOP(reservation.deposit_paid)}</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${Number(reservation.remaining_balance) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-lg font-bold ${Number(reservation.remaining_balance) > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCOP(reservation.remaining_balance)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Pagado</span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Split info */}
        {reservation.total_amount > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Distribución (70/30)</p>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-purple-400" />
                <span className="text-gray-600">Propietario (70%)</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCOP(reservation.total_amount * 0.7)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-pink-400" />
                <span className="text-gray-600">Empresa (30%)</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCOP(reservation.total_amount * 0.3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
