import {
  ArrowLeft,
  Download,
  Edit,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { billingDocumentsApi } from "../../api/billingDocuments";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import type { BillingDocument, DocumentStatus } from "../../types";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  paid: "Pagado",
};
const STATUS_VARIANT: Record<DocumentStatus, "gray" | "blue" | "green"> = {
  draft: "gray",
  sent: "blue",
  paid: "green",
};

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function formatDateES(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${day} de ${MONTHS_ES[month - 1]} de ${year}`;
}

function formatCOP(amount: string) {
  return `COP $${parseInt(amount).toLocaleString("es-CO")}`;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-brand-700 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function BillingDocumentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<BillingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    billingDocumentsApi
      .get(Number(id))
      .then((res) => {
        setDoc(res.data);
        if (res.data.pdf_path) {
          billingDocumentsApi.fetchPdfBlob(Number(id)).then(setPdfBlobUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGeneratePdf = async () => {
    if (!doc) return;
    setGeneratingPdf(true);
    try {
      await billingDocumentsApi.generatePdf(doc.id);
      const res = await billingDocumentsApi.get(doc.id);
      setDoc(res.data);
      const blobUrl = await billingDocumentsApi.fetchPdfBlob(doc.id);
      setPdfBlobUrl(blobUrl);
    } catch {
      alert("Error al generar el PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (status: DocumentStatus) => {
    if (!doc) return;
    setUpdatingStatus(true);
    try {
      const res = await billingDocumentsApi.update(doc.id, { status });
      setDoc(res.data);
    } catch {
      alert("Error al actualizar el estado.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20 text-gray-500">
        Documento no encontrado.{" "}
        <button onClick={() => navigate("/documentos")} className="text-brand-500 underline cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const routeStops = doc.route
    ? doc.route.split("\n").filter(Boolean)
    : [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-brand-800 font-mono">
                {doc.document_number}
              </h1>
              <Badge variant={STATUS_VARIANT[doc.status]}>
                {STATUS_LABEL[doc.status]}
              </Badge>
              <Badge variant="pink">
                {doc.document_type === "formal" ? "Formal" : "Carta"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Creado el {formatDateES(doc.created_at.slice(0, 10))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/documentos/editar/${doc.id}`)}
          >
            <Edit size={15} />
            Editar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={generatingPdf}
            onClick={handleGeneratePdf}
          >
            <FileText size={15} />
            {doc.pdf_path ? "Regenerar PDF" : "Generar PDF"}
          </Button>
          {pdfBlobUrl && (
            <Button size="sm" onClick={() => billingDocumentsApi.downloadPdf(doc.id, `${doc.document_number}.pdf`)}>
              <Download size={15} />
              Descargar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Status changer */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Estado del documento:</span>
          <div className="flex gap-2">
            {(["draft", "sent", "paid"] as DocumentStatus[]).map((s) => (
              <button
                key={s}
                disabled={doc.status === s || updatingStatus}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer disabled:cursor-default
                  ${doc.status === s
                    ? s === "draft" ? "bg-gray-200 text-gray-700" : s === "sent" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"
                  }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {updatingStatus && <Loader2 size={14} className="animate-spin text-brand-500" />}
        </CardBody>
      </Card>

      {/* Client */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
            Información del cliente
          </h2>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre" value={doc.client_name} />
            <Field
              label="Identificación"
              value={`${doc.client_id_type} ${doc.client_id_number}`}
            />
            <Field label="Dirección" value={doc.client_address} />
            <Field label="Teléfono" value={doc.client_phone} />
            <Field label="Correo electrónico" value={doc.client_email} />
          </dl>
        </CardBody>
      </Card>

      {/* Service */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
            Servicio
          </h2>
        </CardHeader>
        <CardBody>
          <dl className="space-y-4">
            <Field label="Fecha del servicio" value={formatDateES(doc.service_date)} />
            <Field label="Concepto" value={doc.concept} />
            {doc.vehicle_description && (
              <Field label="Vehículo" value={doc.vehicle_description} />
            )}
            {(doc.time_start || doc.time_end) && (
              <Field
                label="Horario"
                value={`${doc.time_start ?? "—"} a ${doc.time_end ?? "—"}`}
              />
            )}
          </dl>
        </CardBody>
      </Card>

      {/* Route */}
      {routeStops.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
              Recorrido
            </h2>
          </CardHeader>
          <CardBody>
            <ol className="space-y-2">
              {routeStops.map((stop, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-800">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-600 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{stop}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {/* Financial */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
            Valor y pago
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-brand-700">Total a pagar</span>
            <span className="text-2xl font-bold text-brand-600">
              {formatCOP(doc.total_amount)}
            </span>
          </div>
          <Field label="Instrucciones de pago" value={doc.payment_instructions} />
        </CardBody>
      </Card>

      {/* PDF */}
      {pdfBlobUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
                Documento PDF
              </h2>
              <button
                onClick={() => billingDocumentsApi.downloadPdf(doc.id, `${doc.document_number}.pdf`)}
                className="flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-800 transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                Descargar
              </button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <iframe
              src={pdfBlobUrl}
              className="w-full h-[600px] rounded-b-xl"
              title={`PDF ${doc.document_number}`}
            />
          </CardBody>
        </Card>
      )}

      {/* Notes */}
      {doc.notes && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">
              Notas internas
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-700 whitespace-pre-line">{doc.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
