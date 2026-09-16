import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, MessageCircle } from 'lucide-react';
import type { Reservation } from '../../../types/reservation';
import type { MediaConsent } from '../../../types/mediaConsent';
import { mediaConsentsApi } from '../../../api/mediaConsents';
import { buildContactWaUrl, whatsAppLinkProps, withSignature } from '../../../utils/whatsapp';

// Same style as ContractTab.tsx's buildContractMsg — no emojis, only
// *bold* markup (wa.me strips emojis via encodeURIComponent).
function buildConsentMsg(reservation: Reservation, consent: MediaConsent): string {
  const greetName = (consent.bride_name || reservation.display_customer).split(' ')[0];
  const lines: string[] = [
    `Hola ${greetName}, te compartimos la autorización de uso de imagen, video, audio y datos personales de Camino a mi Boda:`,
    '',
    `*Documento:* ${consent.consent_number}`,
    '',
    'Este documento es independiente del contrato de arrendamiento del vehículo — es completamente voluntario y no afecta en nada la reserva si deciden no firmarlo.',
    '',
    'Cualquier duda nos escribes.',
  ];
  return withSignature(lines.join('\n'));
}

// Standalone "Autorización de Uso de Imagen, Video, Audio y Tratamiento de
// Datos Personales" (wishlist fila 70) — kept as its own model/PDF/send
// flow, never merged into ReservationContract: the owner was explicit that
// this authorization cannot be tied to the vehicle rental contract, so a
// couple must be able to rent the car without being forced to sign this.
// Self-contained (fetches its own MediaConsent on mount) rather than
// threading more state through the already-large ContractTab.tsx, same
// reasoning as AddonPaymentLedger.tsx being its own file.
export default function MediaConsentCard({ reservation }: { reservation: Reservation }) {
  const [consent, setConsent] = useState<MediaConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [brideName, setBrideName] = useState('');
  const [brideId, setBrideId] = useState('');
  const [groomName, setGroomName] = useState('');
  const [groomId, setGroomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const whatsappPhone = reservation.customer_whatsapp || reservation.customer_phone;

  useEffect(() => {
    setLoading(true);
    mediaConsentsApi.getOrCreate(reservation.id).then(res => {
      setConsent(res.data);
      setBrideName(res.data.bride_name);
      setBrideId(res.data.bride_id_number ?? '');
      setGroomName(res.data.groom_name);
      setGroomId(res.data.groom_id_number ?? '');
    }).finally(() => setLoading(false));
  }, [reservation.id]);

  const handleSave = async () => {
    if (!consent) return;
    setSaving(true);
    try {
      const res = await mediaConsentsApi.update(reservation.id, {
        bride_name: brideName,
        bride_id_number: brideId || undefined,
        groom_name: groomName,
        groom_id_number: groomId || undefined,
      });
      setConsent(res.data);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await mediaConsentsApi.generatePdf(reservation.id);
      setConsent(res.data);
    } catch {
      alert('Error al generar el PDF de la autorización.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!consent) return;
    setDownloadingPdf(true);
    try {
      await mediaConsentsApi.downloadPdf(reservation.id, consent.consent_number);
    } catch {
      alert('Error al descargar el PDF de la autorización.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleConsentSent = () => {
    if (consent && consent.status !== 'sent') {
      mediaConsentsApi.update(reservation.id, { status: 'sent' }).then(res => setConsent(res.data));
    }
  };

  if (loading || !consent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-center py-6 text-brand-400"><Loader2 className="animate-spin" size={24} /></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Autorización de imagen, video y datos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Documento independiente y voluntario — no afecta el contrato de arrendamiento ni la reserva.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 font-mono">{consent.consent_number}</span>
          {consent.status === 'sent' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">Enviado</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Novia</label>
          <input
            type="text"
            value={brideName}
            onChange={e => setBrideName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">C.C. novia (opcional)</label>
          <input
            type="text"
            value={brideId}
            onChange={e => setBrideId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Novio</label>
          <input
            type="text"
            value={groomName}
            onChange={e => setGroomName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">C.C. novio (opcional)</label>
          <input
            type="text"
            value={groomId}
            onChange={e => setGroomId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Guardar
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
        <button
          type="button"
          onClick={handleGeneratePdf}
          disabled={generatingPdf}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60 mt-3"
        >
          {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {consent.pdf_path ? 'Regenerar PDF' : 'Generar PDF'}
        </button>
        {consent.pdf_path && (
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 border border-brand-200 text-brand-700 hover:bg-brand-50 text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-60 mt-3"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar PDF
          </button>
        )}
        {consent.pdf_path && (
          (whatsappPhone || reservation.customer_whatsapp_username) ? (
            <a
              href={buildContactWaUrl(whatsappPhone, reservation.customer_whatsapp_username, buildConsentMsg(reservation, consent)) ?? undefined}
              {...whatsAppLinkProps()}
              onClick={handleConsentSent}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer mt-3"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          ) : (
            <span className="flex items-center text-xs text-gray-400 px-2 mt-3">Cliente sin teléfono para WhatsApp</span>
          )
        )}
      </div>
      {consent.pdf_path && (whatsappPhone || reservation.customer_whatsapp_username) && (
        <p className="text-xs text-gray-400">Descarga el PDF y adjúntalo manualmente en el chat que se abre. Cuando llegue firmado, súbelo en Información → Adjuntos con la categoría "Autorización de imagen".</p>
      )}
    </div>
  );
}
