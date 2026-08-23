import { AlertTriangle, ArrowLeft, Download, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { vehicleOwnersApi } from "../../api/vehicleOwners";
import { vehicleOwnerContractsApi } from "../../api/vehicleOwnerContracts";
import { vehicleOwnerAttachmentsApi } from "../../api/vehicleOwnerAttachments";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Dropzone } from "../../components/ui/Dropzone";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import type { VehicleOwnerFormData } from "../../types/vehicleOwner";
import type { VehicleOwnerContract } from "../../types/vehicleOwnerContract";
import type { OwnerAttachmentCategory, VehicleOwnerAttachment } from "../../types/vehicleOwnerAttachment";

const ACCOUNT_TYPES = ["Ahorros", "Corriente", "Nequi", "Daviplata", "Otro"];

const OWNER_CATEGORY_LABEL: Record<OwnerAttachmentCategory, string> = {
  contract: "Contrato",
  cedula: "Cédula",
  rut: "RUT",
  other: "Otro",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OwnerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VehicleOwnerFormData>({
    defaultValues: {
      full_name: "", company_name: "", identification_number: "", phone: "", whatsapp: "", whatsapp_username: "",
      email: "", bank_name: "", account_type: "", account_number: "",
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    vehicleOwnersApi.get(Number(id)).then((r) => {
      const o = r.data;
      reset({
        full_name: o.full_name,
        company_name: o.company_name ?? "",
        identification_number: o.identification_number ?? "",
        phone: o.phone ?? "",
        whatsapp: o.whatsapp ?? "",
        whatsapp_username: o.whatsapp_username ?? "",
        email: o.email ?? "",
        bank_name: o.bank_name ?? "",
        account_type: o.account_type ?? "",
        account_number: o.account_number ?? "",
      });
    }).finally(() => setLoadingDoc(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data: VehicleOwnerFormData) => {
    setSaving(true);
    try {
      const payload = {
        full_name: data.full_name,
        company_name: data.company_name || null,
        identification_number: data.identification_number || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        whatsapp_username: data.whatsapp_username || null,
        email: data.email || null,
        bank_name: data.bank_name || null,
        account_type: data.account_type || null,
        account_number: data.account_number || null,
      };
      if (isEditing && id) {
        await vehicleOwnersApi.update(Number(id), payload);
      } else {
        await vehicleOwnersApi.create(payload);
      }
      navigate("/propietarios");
    } catch {
      alert("Error al guardar el propietario.");
    } finally {
      setSaving(false);
    }
  };

  // Contrato marco
  const [contract, setContract] = useState<VehicleOwnerContract | null>(null);
  const [contractLoading, setContractLoading] = useState(isEditing);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Documentos del propietario
  const [attachments, setAttachments] = useState<VehicleOwnerAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(isEditing);
  const [uploading, setUploading] = useState(false);
  const [deletingAttId, setDeletingAttId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<VehicleOwnerAttachment | null>(null);

  useEffect(() => {
    if (!isEditing || !id) return;
    const ownerId = Number(id);

    setContractLoading(true);
    vehicleOwnerContractsApi.get(ownerId)
      .then(r => setContract(r.data))
      .catch(() => setContract(null))
      .finally(() => setContractLoading(false));

    setAttachmentsLoading(true);
    vehicleOwnerAttachmentsApi.list(ownerId)
      .then(r => setAttachments(r.data))
      .finally(() => setAttachmentsLoading(false));
  }, [id, isEditing]);

  const handleGenerateContract = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const res = await vehicleOwnerContractsApi.generatePdf(Number(id));
      setContract(res.data);
    } catch {
      alert("No se pudo generar el contrato.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!id || !contract) return;
    setDownloading(true);
    try {
      await vehicleOwnerContractsApi.downloadPdf(Number(id), contract.contract_number);
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (!id) return;
    const fileArr = Array.from(files);
    setUploading(true);
    setUploadError('');
    try {
      const res = await vehicleOwnerAttachmentsApi.upload(Number(id), fileArr, 'other');
      setAttachments(prev => [...res.data, ...prev]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail ?? 'No se pudo subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = async (attachmentId: number, category: OwnerAttachmentCategory) => {
    if (!id) return;
    const prev = attachments;
    setAttachments(cur => cur.map(a => a.id === attachmentId ? { ...a, category } : a));
    try {
      await vehicleOwnerAttachmentsApi.updateCategory(Number(id), attachmentId, category);
    } catch {
      setAttachments(prev);
    }
  };

  const handleDeleteAttachment = async (a: VehicleOwnerAttachment) => {
    if (!id) return;
    if (!confirm(`¿Eliminar "${a.original_name}"?`)) return;
    setDeletingAttId(a.id);
    try {
      await vehicleOwnerAttachmentsApi.delete(Number(id), a.id);
      setAttachments(prev => prev.filter(x => x.id !== a.id));
    } finally {
      setDeletingAttId(null);
    }
  };

  if (loadingDoc) {
    return <div className="flex items-center justify-center py-20 text-brand-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/propietarios")}
          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-brand-800">
          {isEditing ? "Editar propietario" : "Nuevo propietario"}
        </h1>
      </div>

      {/* Personal */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Información personal</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre completo *"
            {...register("full_name", { required: "El nombre es obligatorio" })}
            error={errors.full_name?.message}
            placeholder="Jaime Cadavid"
            className="sm:col-span-2"
          />
          <Input label="Empresa (opcional)" {...register("company_name")} placeholder="Carros de Bodas SAS" className="sm:col-span-2" />
          <Input label="Número de identificación" {...register("identification_number")} placeholder="12345678" />
        </CardBody>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Contacto</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono" {...register("phone")} placeholder="312 345 6789" />
          <Input label="WhatsApp" {...register("whatsapp")} placeholder="312 345 6789" />
          <Input label="Usuario de WhatsApp" {...register("whatsapp_username")} placeholder="usuario.whatsapp" />
          <Input label="Email" {...register("email")} type="email" placeholder="jaime@ejemplo.com" />
        </CardBody>
      </Card>

      {/* Banking */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Datos bancarios</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Banco" {...register("bank_name")} placeholder="Bancolombia" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo de cuenta</label>
            <select
              {...register("account_type")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Seleccionar...</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Número de cuenta" {...register("account_number")} placeholder="123456789012" className="sm:col-span-2" />
        </CardBody>
      </Card>

      {/* Contrato marco */}
      {isEditing && id && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Contrato marco</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {contractLoading ? (
              <div className="flex justify-center py-4 text-brand-400"><Loader2 className="animate-spin" size={18} /></div>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${contract ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-400"}`}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    {contract ? (
                      <>
                        <p className="text-sm font-semibold text-gray-800 truncate">{contract.contract_number}</p>
                        <p className="text-xs text-gray-500">
                          Generado el {new Date(contract.updated_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Aún no se ha generado un contrato marco para este propietario.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={handleGenerateContract} loading={generating} disabled={downloading}>
                    {!generating && <FileText size={14} />}
                    {contract ? "Regenerar PDF" : "Generar PDF"}
                  </Button>
                  {contract?.pdf_path && (
                    <Button type="button" variant="secondary" size="sm" onClick={handleDownloadContract} loading={downloading} disabled={generating}>
                      {!downloading && <Download size={14} />}
                      Descargar PDF
                    </Button>
                  )}
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Plantilla inicial de trabajo — revisar con tu abogado antes de usarla formalmente.</p>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Documentos del propietario */}
      {isEditing && id && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Documentos del propietario</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
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
              <p className="text-sm text-gray-400">Sin documentos todavía — contrato firmado, cédula, RUT u otro (PDF, JPG, PNG, WEBP).</p>
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
                            onChange={e => handleCategoryChange(a.id, e.target.value as OwnerAttachmentCategory)}
                            className="bg-transparent border-none p-0 -ml-0.5 text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400 rounded cursor-pointer"
                          >
                            {(Object.entries(OWNER_CATEGORY_LABEL) as [OwnerAttachmentCategory, string][]).map(([v, l]) => (
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
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate("/propietarios")}>Cancelar</Button>
        <Button type="submit" loading={saving}>{isEditing ? "Guardar cambios" : "Crear propietario"}</Button>
      </div>

      {previewAttachment && (
        <FilePreviewModal
          src={previewAttachment.url}
          contentType={previewAttachment.content_type}
          fileName={previewAttachment.original_name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </form>
  );
}
