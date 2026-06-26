import { useEffect, useState } from 'react';
import { DollarSign, Download, FileText, Loader2 } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import { ownerSettlementsApi, type OwnerSettlement } from '../../../api/ownerSettlements';
import { useAuth } from '../../../context/AuthContext';

function formatCOP(n: number) {
  return `$${Number(n).toLocaleString('es-CO')}`;
}

export default function FinanceTab({ reservation }: { reservation: Reservation }) {
  const { isAdmin } = useAuth();
  const pct = reservation.total_amount > 0
    ? Math.round((reservation.deposit_paid / reservation.total_amount) * 100)
    : 0;

  const [settlement, setSettlement] = useState<OwnerSettlement | null | 'loading'>('loading');
  const [creating, setCreating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) { setSettlement(null); return; }
    ownerSettlementsApi.list()
      .then(r => {
        const found = r.data.find(s => s.reservation_id === reservation.id) ?? null;
        setSettlement(found);
      })
      .catch(() => setSettlement(null));
  }, [reservation.id, isAdmin]);

  const handleCreateSettlement = async () => {
    setCreating(true);
    try {
      const res = await ownerSettlementsApi.create({
        reservation_id: reservation.id,
        vehicle_id: reservation.vehicle_id ?? undefined,
        owner_percentage: 70,
      });
      setSettlement(res.data);
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!settlement || settlement === 'loading') return;
    setPdfLoading(true);
    try {
      const updated = await ownerSettlementsApi.generatePdf(settlement.id);
      setSettlement(updated.data);
      await ownerSettlementsApi.downloadPdf(settlement.id, settlement.settlement_number);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!settlement || settlement === 'loading') return;
    setPdfLoading(true);
    try {
      await ownerSettlementsApi.downloadPdf(settlement.id, settlement.settlement_number);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resumen financiero</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatCOP(reservation.total_amount)}</p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(reservation.total_amount * 0.3)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Depósito</p>
            <p className="text-lg font-bold text-green-700">{formatCOP(reservation.deposit_paid)}</p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(reservation.deposit_paid * 0.3)}</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${Number(reservation.remaining_balance) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-xs text-gray-400 mb-1">Saldo</p>
            <p className={`text-lg font-bold ${Number(reservation.remaining_balance) > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCOP(reservation.remaining_balance)}
            </p>
            <p className="text-xs text-pink-500 mt-0.5">empresa {formatCOP(Number(reservation.remaining_balance) * 0.3)}</p>
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

      {/* Owner Settlement — admin only, completed reservations */}
      {isAdmin && reservation.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liquidación de propietario</h2>

          {settlement === 'loading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Cargando...
            </div>
          )}

          {settlement === null && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No se ha generado una liquidación para esta reserva.</p>
              <button
                onClick={handleCreateSettlement}
                disabled={creating}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Generar Liquidación
              </button>
            </div>
          )}

          {settlement && settlement !== 'loading' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono">{settlement.settlement_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  settlement.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {settlement.status === 'paid' ? 'Pagada' : 'Pendiente'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Propietario ({settlement.owner_percentage}%)</p>
                  <p className="text-base font-bold text-purple-700">{formatCOP(settlement.owner_amount)}</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Empresa ({100 - settlement.owner_percentage}%)</p>
                  <p className="text-base font-bold text-pink-700">{formatCOP(settlement.company_amount)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {settlement.pdf_path ? (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Descargar PDF
                  </button>
                ) : (
                  <button
                    onClick={handleGeneratePdf}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                    Generar PDF
                  </button>
                )}
                {settlement.status === 'pending' && (
                  <button
                    onClick={() => ownerSettlementsApi.markPaid(settlement.id).then(r => setSettlement(r.data))}
                    className="flex items-center gap-2 border border-green-200 text-green-700 hover:bg-green-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Marcar pagada
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
