import { Download, Eye, FilePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { billingDocumentsApi } from "../../api/billingDocuments";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { BillingDocumentListItem, DocumentStatus, DocumentType } from "../../types";

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

const TYPE_LABEL: Record<DocumentType, string> = {
  formal: "Formal",
  letter: "Carta",
};

function formatCOP(amount: string) {
  return `COP $${parseInt(amount).toLocaleString("es-CO")}`;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function BillingDocumentList() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<BillingDocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await billingDocumentsApi.list();
      setDocs(res.data);
    } catch {
      setError("Error al cargar los documentos. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleGeneratePdf = async (doc: BillingDocumentListItem) => {
    setGeneratingPdf(doc.id);
    try {
      if (!doc.pdf_path) await billingDocumentsApi.generatePdf(doc.id);
      await billingDocumentsApi.downloadPdf(doc.id, `${doc.document_number}.pdf`);
      await fetchDocs();
    } catch {
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDelete = async (doc: BillingDocumentListItem) => {
    if (!confirm(`¿Eliminar el documento ${doc.document_number}? Esta acción no se puede deshacer.`)) return;
    setDeleting(doc.id);
    try {
      await billingDocumentsApi.delete(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      alert("Error al eliminar el documento.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pink-900">Cuentas de Cobro</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona y genera documentos de cobro para tus clientes
          </p>
        </div>
        <Button onClick={() => navigate("/documentos/nuevo")} size="lg">
          <FilePlus size={18} />
          Nueva Cuenta de Cobro
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-pink-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && docs.length === 0 && (
        <Card>
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FilePlus size={28} className="text-pink-500" />
            </div>
            <h3 className="text-lg font-semibold text-pink-900 mb-2">
              Aún no hay cuentas de cobro
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Crea tu primera cuenta de cobro para empezar a gestionar tus documentos
            </p>
            <Button onClick={() => navigate("/documentos/nuevo")}>
              <FilePlus size={16} />
              Crear primera cuenta
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {!loading && docs.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pink-100 bg-pink-50/60">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-pink-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-pink-50/40 transition-colors duration-150 group"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-pink-700 font-semibold text-xs tracking-wide">
                        {doc.document_number}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">{doc.client_name}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {formatDate(doc.service_date)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCOP(doc.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="pink">{TYPE_LABEL[doc.document_type]}</Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant={STATUS_VARIANT[doc.status]}>
                        {STATUS_LABEL[doc.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/documentos/${doc.id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors duration-150 cursor-pointer"
                          title="Ver documento"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleGeneratePdf(doc)}
                          disabled={generatingPdf === doc.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-yellow-50 transition-colors duration-150 cursor-pointer disabled:opacity-50"
                          title={doc.pdf_path ? "Descargar PDF" : "Generar PDF"}
                        >
                          {generatingPdf === doc.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Download size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deleting === doc.id || doc.status !== "draft"}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={doc.status !== "draft" ? "Solo se pueden eliminar borradores" : "Eliminar"}
                        >
                          {deleting === doc.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
