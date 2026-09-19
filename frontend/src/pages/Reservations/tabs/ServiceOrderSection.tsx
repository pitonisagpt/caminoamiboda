import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { serviceOrdersApi } from '../../../api/serviceOrders';
import type { ServiceOrder } from '../../../types/serviceOrder';

// Fully self-contained — FinanceTab.tsx only decides whether to render this
// at all (isAdmin && owner_name && !vehicle_is_company_owned); nothing else
// reads its state.
export default function ServiceOrderSection({ reservationId, vehicleId }: { reservationId: number; vehicleId: number | null }) {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null | 'loading'>('loading');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderPdfLoading, setOrderPdfLoading] = useState(false);

  useEffect(() => {
    serviceOrdersApi.list()
      .then(r => setServiceOrder(r.data.find(o => o.reservation_id === reservationId) ?? null))
      .catch(() => setServiceOrder(null));
  }, [reservationId]);

  const handleCreateServiceOrder = async () => {
    setCreatingOrder(true);
    try {
      const res = await serviceOrdersApi.create({
        reservation_id: reservationId,
        vehicle_id: vehicleId ?? undefined,
      });
      setServiceOrder(res.data);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleGenerateOrderPdf = async () => {
    if (!serviceOrder || serviceOrder === 'loading') return;
    setOrderPdfLoading(true);
    try {
      const updated = await serviceOrdersApi.generatePdf(serviceOrder.id);
      setServiceOrder(updated.data);
    } finally {
      setOrderPdfLoading(false);
    }
  };

  const handleDownloadOrderPdf = async () => {
    if (!serviceOrder || serviceOrder === 'loading') return;
    setOrderPdfLoading(true);
    try {
      await serviceOrdersApi.downloadPdf(serviceOrder.id, serviceOrder.order_number);
    } finally {
      setOrderPdfLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Orden de servicio</h2>

      {serviceOrder === 'loading' && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={14} className="animate-spin" /> Cargando...
        </div>
      )}

      {serviceOrder === null && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">No se ha generado una orden de servicio para esta reserva.</p>
          <button
            onClick={handleCreateServiceOrder}
            disabled={creatingOrder}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {creatingOrder ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Generar Orden de Servicio
          </button>
        </div>
      )}

      {serviceOrder && serviceOrder !== 'loading' && (
        <div className="space-y-3">
          <span className="text-sm text-gray-500 font-mono">{serviceOrder.order_number}</span>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleGenerateOrderPdf}
              disabled={orderPdfLoading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
            >
              {orderPdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              {serviceOrder.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
            </button>
            {serviceOrder.pdf_path && (
              <button
                onClick={handleDownloadOrderPdf}
                disabled={orderPdfLoading}
                className="flex items-center gap-2 border border-purple-200 text-purple-700 hover:bg-purple-50 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {orderPdfLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Descargar PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
