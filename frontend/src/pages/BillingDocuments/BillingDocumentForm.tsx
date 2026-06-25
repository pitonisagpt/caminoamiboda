import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { billingDocumentsApi } from "../../api/billingDocuments";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { TextArea } from "../../components/ui/TextArea";
import type { BillingDocumentFormData } from "../../types";

const DEFAULT_PAYMENT = `Transferencia bancaria a la cuenta de ahorros Bancolombia 00484248273 a nombre de JUAN CAMILO YEPES CORREA, C.C. 1040735268`;

const DEFAULT_VALUES: BillingDocumentFormData = {
  document_type: "formal",
  service_date: "",
  client_name: "",
  client_id_type: "CC",
  client_id_number: "",
  client_address: "",
  client_email: "",
  client_phone: "",
  concept: "",
  vehicle_description: "",
  time_start: "",
  time_end: "",
  route: "",
  special_conditions: "",
  total_amount: "",
  payment_instructions: DEFAULT_PAYMENT,
  include_cancellation_policy: true,
  include_breakdown_policy: true,
  notes: "",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider mb-4 pb-2 border-b border-pink-100">
      {children}
    </h2>
  );
}

export function BillingDocumentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [routeStops, setRouteStops] = useState<string[]>([""]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BillingDocumentFormData>({ defaultValues: DEFAULT_VALUES });

  const documentType = watch("document_type");
  const isLetter = documentType === "letter";

  useEffect(() => {
    if (!isEditing || !id) return;
    billingDocumentsApi.get(Number(id)).then((res) => {
      const doc = res.data;
      reset({
        document_type: doc.document_type,
        service_date: doc.service_date,
        client_name: doc.client_name,
        client_id_type: doc.client_id_type,
        client_id_number: doc.client_id_number,
        client_address: doc.client_address ?? "",
        client_email: doc.client_email ?? "",
        client_phone: doc.client_phone ?? "",
        concept: doc.concept,
        vehicle_description: doc.vehicle_description ?? "",
        time_start: doc.time_start ?? "",
        time_end: doc.time_end ?? "",
        route: doc.route ?? "",
        special_conditions: doc.special_conditions ?? "",
        total_amount: doc.total_amount,
        payment_instructions: doc.payment_instructions,
        include_cancellation_policy: doc.include_cancellation_policy,
        include_breakdown_policy: doc.include_breakdown_policy,
        notes: doc.notes ?? "",
      });
      if (doc.route) {
        const stops = doc.route.split("\n").filter(Boolean);
        setRouteStops(stops.length > 0 ? stops : [""]);
      }
      setLoadingDoc(false);
    });
  }, [id, isEditing, reset]);

  const syncRoute = (stops: string[]) => {
    setValue("route", stops.filter(Boolean).join("\n"));
  };

  const addStop = () => {
    const updated = [...routeStops, ""];
    setRouteStops(updated);
  };

  const updateStop = (index: number, value: string) => {
    const updated = routeStops.map((s, i) => (i === index ? value : s));
    setRouteStops(updated);
    syncRoute(updated);
  };

  const removeStop = (index: number) => {
    const updated = routeStops.filter((_, i) => i !== index);
    setRouteStops(updated.length > 0 ? updated : [""]);
    syncRoute(updated);
  };

  const onSubmit = async (data: BillingDocumentFormData, generatePdf = false) => {
    setLoading(true);
    try {
      const createPayload: BillingDocumentFormData = {
        ...data,
        client_address: data.client_address || "",
        client_email: data.client_email || "",
        client_phone: data.client_phone || "",
        vehicle_description: isLetter ? data.vehicle_description || "" : "",
        time_start: isLetter ? data.time_start || "" : "",
        time_end: isLetter ? data.time_end || "" : "",
        route: isLetter ? routeStops.filter(Boolean).join("\n") : "",
        special_conditions: isLetter ? data.special_conditions || "" : "",
        include_cancellation_policy: isLetter ? data.include_cancellation_policy : true,
        include_breakdown_policy: isLetter ? data.include_breakdown_policy : true,
        notes: data.notes || "",
      };

      let docId: number;
      if (isEditing && id) {
        const res = await billingDocumentsApi.update(Number(id), createPayload);
        docId = res.data.id;
      } else {
        const res = await billingDocumentsApi.create(createPayload);
        docId = res.data.id;
      }

      if (generatePdf) {
        await billingDocumentsApi.generatePdf(docId);
      }

      navigate(`/documentos/${docId}`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      alert(msg ?? "Error al guardar el documento. Verifica los datos e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center py-20 text-pink-400">
        Cargando documento...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-pink-900">
            {isEditing ? "Editar Cuenta de Cobro" : "Nueva Cuenta de Cobro"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Todos los campos marcados con <span className="text-pink-600">*</span> son obligatorios
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">

        {/* ── 1. Tipo de documento ── */}
        <Card>
          <CardBody>
            <SectionTitle>Tipo de documento</SectionTitle>
            <div className="flex gap-4">
              {(["formal", "letter"] as const).map((type) => (
                <label
                  key={type}
                  className={`flex items-start gap-3 flex-1 border rounded-xl p-4 cursor-pointer transition-colors duration-150
                    ${documentType === type
                      ? "border-pink-500 bg-pink-50"
                      : "border-pink-200 bg-white hover:border-pink-300"
                    }`}
                >
                  <input
                    type="radio"
                    value={type}
                    {...register("document_type")}
                    className="mt-0.5 accent-pink-600"
                  />
                  <div>
                    <div className="font-semibold text-sm text-pink-900">
                      {type === "formal" ? "Cuenta de Cobro Formal" : "Carta de Servicio"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {type === "formal"
                        ? "Documento estructurado con encabezado, concepto y total"
                        : "Carta narrativa con recorrido, horarios y políticas"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* ── 2. Información del cliente ── */}
        <Card>
          <CardBody>
            <SectionTitle>Información del cliente</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Nombre del cliente o empresa"
                  placeholder="Ej: Beatriz Elena Velásquez Hernández"
                  required
                  {...register("client_name", { required: "El nombre es obligatorio" })}
                  error={errors.client_name?.message}
                />
              </div>
              <Select
                label="Tipo de identificación"
                required
                options={[
                  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
                  { value: "NIT", label: "NIT" },
                ]}
                {...register("client_id_type")}
              />
              <Input
                label="Número de identificación"
                placeholder="Ej: 43.272.473"
                required
                {...register("client_id_number", { required: "El número de identificación es obligatorio" })}
                error={errors.client_id_number?.message}
              />
              <Input
                label="Dirección"
                placeholder="Ej: Carrera 37 # 2 Sur 65"
                {...register("client_address")}
              />
              <Input
                label="Teléfono"
                placeholder="Ej: 3148904681"
                type="tel"
                {...register("client_phone")}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Correo electrónico"
                  placeholder="cliente@ejemplo.com"
                  type="email"
                  {...register("client_email")}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── 3. Servicio ── */}
        <Card>
          <CardBody>
            <SectionTitle>Servicio</SectionTitle>
            <div className="space-y-4">
              <Input
                label="Fecha del servicio"
                type="date"
                required
                {...register("service_date", { required: "La fecha del servicio es obligatoria" })}
                error={errors.service_date?.message}
              />
              <TextArea
                label="Concepto / Descripción del servicio"
                placeholder="Ej: Alquiler de vehículo clásico Karmann Ghia Blanco para producción audiovisual"
                required
                rows={3}
                {...register("concept", { required: "El concepto es obligatorio" })}
                error={errors.concept?.message}
              />
            </div>
          </CardBody>
        </Card>

        {/* ── 4-6. Letter-only sections ── */}
        {isLetter && (
          <>
            {/* Vehicle & schedule */}
            <Card>
              <CardBody>
                <SectionTitle>Vehículo y horario</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <Input
                      label="Descripción del vehículo"
                      placeholder="Ej: tres Volkswagen Combi con conductor"
                      {...register("vehicle_description")}
                    />
                  </div>
                  <Input
                    label="Hora de inicio"
                    type="time"
                    {...register("time_start")}
                  />
                  <Input
                    label="Hora de fin"
                    type="time"
                    {...register("time_end")}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Route */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">
                    Recorrido
                  </h2>
                  <Button type="button" variant="secondary" size="sm" onClick={addStop}>
                    <Plus size={14} />
                    Añadir parada
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {routeStops.map((stop, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex items-center justify-center w-7 h-9 text-xs font-bold text-pink-400 flex-shrink-0">
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={stop}
                      onChange={(e) => updateStop(index, e.target.value)}
                      placeholder={`Parada ${index + 1}: dirección o lugar`}
                      className="flex-1 rounded-lg border border-pink-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent hover:border-pink-400 transition-colors duration-150"
                    />
                    {routeStops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Special conditions */}
            <Card>
              <CardBody>
                <SectionTitle>Condiciones especiales</SectionTitle>
                <TextArea
                  label="Condiciones especiales (opcional)"
                  placeholder="Ej: El precio no incluye decoración. En caso de requerir poner plotter sobre el auto, los gastos corren por cuenta del cliente."
                  rows={3}
                  {...register("special_conditions")}
                />
              </CardBody>
            </Card>
          </>
        )}

        {/* ── 7. Valor ── */}
        <Card>
          <CardBody>
            <SectionTitle>Valor</SectionTitle>
            <Input
              label="Total a pagar (COP)"
              type="number"
              placeholder="Ej: 2400000"
              required
              min={1}
              {...register("total_amount", {
                required: "El valor total es obligatorio",
                min: { value: 1, message: "El valor debe ser mayor a 0" },
              })}
              error={errors.total_amount?.message}
              hint="Ingresa el valor en pesos colombianos sin puntos ni comas"
            />
          </CardBody>
        </Card>

        {/* ── 8. Instrucciones de pago ── */}
        <Card>
          <CardBody>
            <SectionTitle>Instrucciones de pago</SectionTitle>
            <TextArea
              label="Datos bancarios / instrucciones"
              required
              rows={3}
              {...register("payment_instructions", {
                required: "Las instrucciones de pago son obligatorias",
              })}
              error={errors.payment_instructions?.message}
            />
          </CardBody>
        </Card>

        {/* ── 9. Políticas (letter only) ── */}
        {isLetter && (
          <Card>
            <CardBody>
              <SectionTitle>Políticas a incluir</SectionTitle>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("include_cancellation_policy")}
                    className="mt-0.5 accent-pink-600 w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Política de cancelaciones</div>
                    <div className="text-xs text-gray-500">
                      Incluir la política estándar de cambios y cancelaciones
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("include_breakdown_policy")}
                    className="mt-0.5 accent-pink-600 w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Política en caso de avería</div>
                    <div className="text-xs text-gray-500">
                      Incluir la política de sustitución o reembolso por falla del vehículo
                    </div>
                  </div>
                </label>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── 10. Notas internas ── */}
        <Card>
          <CardBody>
            <SectionTitle>Notas internas</SectionTitle>
            <TextArea
              label="Notas (solo visibles internamente, no aparecen en el PDF)"
              placeholder="Observaciones internas sobre este documento..."
              rows={2}
              {...register("notes")}
            />
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="secondary"
              loading={isSubmitting || loading}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              loading={isSubmitting || loading}
              onClick={handleSubmit((data) => onSubmit(data, true))}
            >
              Guardar y generar PDF
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
