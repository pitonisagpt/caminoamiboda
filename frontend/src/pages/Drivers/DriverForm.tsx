import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { driversApi } from "../../api/drivers";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { TextArea } from "../../components/ui/TextArea";
import type { DriverFormData } from "../../types/driver";

export function DriverForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DriverFormData>({
    defaultValues: {
      full_name: "", identification_number: "", phone: "", whatsapp: "",
      email: "", driver_license_number: "", license_expiration_date: "",
      authorized_vehicles: "", notes: "", status: "active",
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    driversApi.get(Number(id)).then((r) => {
      const d = r.data;
      reset({
        full_name: d.full_name,
        identification_number: d.identification_number ?? "",
        phone: d.phone ?? "",
        whatsapp: d.whatsapp ?? "",
        email: d.email ?? "",
        driver_license_number: d.driver_license_number ?? "",
        license_expiration_date: d.license_expiration_date ?? "",
        authorized_vehicles: d.authorized_vehicles ?? "",
        notes: d.notes ?? "",
        status: d.status,
      });
    }).finally(() => setLoadingDoc(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data: DriverFormData) => {
    setSaving(true);
    try {
      const payload = {
        full_name: data.full_name,
        identification_number: data.identification_number || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        driver_license_number: data.driver_license_number || null,
        license_expiration_date: data.license_expiration_date || null,
        authorized_vehicles: data.authorized_vehicles || null,
        notes: data.notes || null,
        status: data.status,
      };
      if (isEditing && id) {
        await driversApi.update(Number(id), payload);
      } else {
        await driversApi.create(payload);
      }
      navigate("/conductores");
    } catch {
      alert("Error al guardar el conductor.");
    } finally {
      setSaving(false);
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
          onClick={() => navigate("/conductores")}
          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-brand-800">
          {isEditing ? "Editar conductor" : "Nuevo conductor"}
        </h1>
      </div>

      {/* Personal info */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Información personal</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre completo *"
            {...register("full_name", { required: "El nombre es obligatorio" })}
            error={errors.full_name?.message}
            placeholder="Juan Pérez"
            className="sm:col-span-2"
          />
          <Input label="Número de identificación" {...register("identification_number")} placeholder="12345678" />
          <Select
            label="Estado"
            {...register("status")}
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </CardBody>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Contacto</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono" {...register("phone")} placeholder="312 345 6789" />
          <Input label="WhatsApp" {...register("whatsapp")} placeholder="312 345 6789" />
          <Input label="Email" {...register("email")} type="email" placeholder="juan@ejemplo.com" />
        </CardBody>
      </Card>

      {/* License */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Licencia de conducción</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Número de licencia" {...register("driver_license_number")} placeholder="12345678" />
          <Input label="Fecha de vencimiento" {...register("license_expiration_date")} type="date" />
          <TextArea
            label="Vehículos autorizados"
            {...register("authorized_vehicles")}
            rows={2}
            placeholder="Carros clásicos, convertibles..."
            className="sm:col-span-2"
          />
        </CardBody>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wider">Notas</h2></CardHeader>
        <CardBody>
          <TextArea label="Notas internas" {...register("notes")} rows={3} placeholder="Observaciones adicionales..." />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate("/conductores")}>Cancelar</Button>
        <Button type="submit" loading={saving}>{isEditing ? "Guardar cambios" : "Crear conductor"}</Button>
      </div>
    </form>
  );
}
