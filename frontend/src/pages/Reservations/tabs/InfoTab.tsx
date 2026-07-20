import { useEffect, useState } from 'react';
import { Calendar, Car, Download, FileText, Loader2, MessageCircle, Network, Paperclip, Star, Trash2, User } from 'lucide-react';
import type { Reservation, ReservationStatus } from '../../../types/reservation';
import { RESERVATION_STATUS_COLOR, RESERVATION_STATUS_LABEL, STATUS_FLOW } from '../../../types/reservation';
import VehiclePhotoTooltip from '../../../components/VehiclePhotoTooltip';
import { FilePreviewModal } from '../../../components/FilePreviewModal';
import { Dropzone } from '../../../components/ui/Dropzone';
import { reservationAttachmentsApi } from '../../../api/reservationAttachments';
import type { AttachmentCategory, ReservationAttachment } from '../../../types/reservationAttachment';

const GOOGLE_REVIEW_LINK = 'https://g.page/r/CZk-2HPmACi3EBM/review';

const CATEGORY_LABEL: Record<AttachmentCategory, string> = {
  contract: 'Contrato',
  receipt: 'Comprobante de pago',
  photo: 'Foto de referencia',
  other: 'Otro',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function buildWaUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  const num = phone ? phone.replace(/\D/g, '') : '';
  return num ? `https://wa.me/${num}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function buildReviewMsg(name?: string | null): string {
  const greeting = name ? `Hola ${name.split(' ')[0]}` : 'Hola';
  return `${greeting}, ¿cómo estás?\n\nFue un gusto trabajar contigo en este evento. Si tienes un minuto, ¿nos ayudarías dejando una reseña de 5 estrellas en Google sobre nuestro servicio? Nos ayuda muchísimo a seguir creciendo.\n\nAquí el enlace: ${GOOGLE_REVIEW_LINK}\n\n¡Mil gracias por el apoyo!`;
}

export default function InfoTab({
  reservation,
  onStatusChange,
}: {
  reservation: Reservation;
  onStatusChange?: (s: ReservationStatus) => void;
}) {
  const handleStageClick = (s: ReservationStatus) => {
    if (!onStatusChange || s === reservation.status) return;
    if (STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(reservation.status)) {
      if (!confirm(`¿Devolver la reserva al estado "${RESERVATION_STATUS_LABEL[s]}"?`)) return;
    }
    onStatusChange(s);
  };

  const [attachments, setAttachments] = useState<ReservationAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingAttId, setDeletingAttId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<ReservationAttachment | null>(null);

  useEffect(() => {
    setAttachmentsLoading(true);
    reservationAttachmentsApi.list(reservation.id)
      .then(r => setAttachments(r.data))
      .finally(() => setAttachmentsLoading(false));
  }, [reservation.id]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const defaultCategory: AttachmentCategory = fileArr.every(f => f.type.startsWith('image/')) ? 'photo' : 'other';
    setUploading(true);
    setUploadError('');
    try {
      const res = await reservationAttachmentsApi.upload(reservation.id, fileArr, defaultCategory);
      setAttachments(prev => [...res.data, ...prev]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail ?? 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = async (attachmentId: number, category: AttachmentCategory) => {
    const prev = attachments;
    setAttachments(cur => cur.map(a => a.id === attachmentId ? { ...a, category } : a));
    try {
      await reservationAttachmentsApi.updateCategory(reservation.id, attachmentId, category);
    } catch {
      setAttachments(prev);
    }
  };

  const handleDeleteAttachment = async (a: ReservationAttachment) => {
    if (!confirm(`¿Eliminar "${a.original_name}"?`)) return;
    setDeletingAttId(a.id);
    try {
      await reservationAttachmentsApi.delete(reservation.id, a.id);
      setAttachments(prev => prev.filter(x => x.id !== a.id));
    } finally {
      setDeletingAttId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status pipeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_FLOW.filter(s => s !== 'cancelled').map((s, i, arr) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleStageClick(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer hover:opacity-80 ${
                s === reservation.status
                  ? RESERVATION_STATUS_COLOR[s]
                  : STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(reservation.status)
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {RESERVATION_STATUS_LABEL[s as ReservationStatus]}
              </button>
              {i < arr.length - 1 && <span className="text-gray-300 text-xs">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Event info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Evento</h2>
        <div className="flex items-start gap-2 text-sm">
          <Calendar size={16} className="text-brand-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-700 capitalize">{formatDate(reservation.event_date)}</span>
            {reservation.is_tentative && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-yellow-100 text-yellow-700 align-middle">~ tentativa</span>
            )}
            {reservation.is_tentative && reservation.event_date_notes && (
              <p className="text-xs text-yellow-700 mt-0.5">{reservation.event_date_notes}</p>
            )}
          </div>
        </div>
        {reservation.display_vehicle !== '—' && (
          <div className="flex items-center gap-2 text-sm">
            {reservation.vehicle_photo_url ? (
              <VehiclePhotoTooltip
                photoUrl={reservation.vehicle_photo_url}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                vehicleName={reservation.display_vehicle}
                licensePlate={reservation.vehicle_license_plate}
                driverName={reservation.display_driver !== '—' ? reservation.display_driver : null}
                driverPhone={reservation.display_driver_phone}
                ownerName={reservation.owner_name}
                ownerPhone={reservation.owner_whatsapp}
              />
            ) : (
              <Car size={16} className="text-brand-400 shrink-0" />
            )}
            <span className="text-gray-700">{reservation.display_vehicle}</span>
          </div>
        )}
        {reservation.display_driver !== '—' && (
          <div className="flex items-center gap-2 text-sm">
            <User size={16} className="text-brand-400 shrink-0" />
            <span className="text-gray-700">{reservation.display_driver}</span>
          </div>
        )}
        {reservation.display_contact && (
          <div className="flex items-center gap-2 text-sm">
            <Network size={16} className="text-brand-400 shrink-0" />
            <span className="text-gray-500">Ref: <span className="text-gray-700">{reservation.display_contact}</span></span>
          </div>
        )}
      </div>

      {/* Review request */}
      {reservation.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pedir reseña en Google</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Cliente', name: reservation.display_customer, phone: reservation.customer_whatsapp || reservation.customer_phone },
              ...(reservation.display_contact
                ? [{ label: 'Planeador', name: reservation.display_contact, phone: reservation.contact_phone }]
                : []),
            ].map(({ label, name, phone }) => (
              <div key={label} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm text-gray-500 ml-2">{name}</span>
                  {phone && <span className="text-xs text-gray-400 ml-2">· {phone}</span>}
                </div>
                {phone ? (
                  <a
                    href={buildWaUrl(phone, buildReviewMsg(name))}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Enviar
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">Sin teléfono</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-brand-500" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Adjuntos</h2>
        </div>
        <Dropzone
          onFiles={handleUpload}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          uploading={uploading}
          label="Arrastra archivos o haz clic para seleccionar"
          dragLabel="Suelta los archivos aquí"
          helpText="PDF, JPG, PNG, WEBP — hasta 15 MB cada uno"
          uploadingText="Subiendo archivos..."
        />
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {attachmentsLoading ? (
          <div className="flex justify-center py-4 text-brand-400"><Loader2 className="animate-spin" size={18} /></div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-gray-400">Sin adjuntos todavía — contratos, comprobantes o fotos de referencia (PDF, JPG, PNG, WEBP).</p>
        ) : (
          <div className="space-y-2">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                  onClick={() => setPreviewAttachment(a)}
                >
                  {a.content_type.startsWith('image/')
                    ? <img src={a.url} alt={a.original_name} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200" />
                    : <FileText size={16} className="text-red-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.original_name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400" onClick={e => e.stopPropagation()}>
                      <select
                        value={a.category}
                        onChange={e => handleCategoryChange(a.id, e.target.value as AttachmentCategory)}
                        className="bg-transparent border-none p-0 -ml-0.5 text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400 rounded cursor-pointer"
                      >
                        {(Object.entries(CATEGORY_LABEL) as [AttachmentCategory, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <span>· {formatSize(a.size_bytes)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-brand-500 cursor-pointer"
                    title="Descargar"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(a)}
                    disabled={deletingAttId === a.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer disabled:opacity-40"
                    title="Eliminar"
                  >
                    {deletingAttId === a.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {(reservation.special_instructions || reservation.notes) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {reservation.special_instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Instrucciones especiales</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.special_instructions}</p>
            </div>
          )}
          {reservation.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{reservation.notes}</p>
            </div>
          )}
        </div>
      )}

      {previewAttachment && (
        <FilePreviewModal
          src={previewAttachment.url}
          contentType={previewAttachment.content_type}
          fileName={previewAttachment.original_name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
