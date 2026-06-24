import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { vehicleOwnersApi } from "../../api/vehicleOwners";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { VehicleOwnerFormData } from "../../types/vehicleOwner";

const ACCOUNT_TYPES = ["Ahorros", "Corriente", "Nequi", "Daviplata", "Otro"];

export function OwnerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VehicleOwnerFormData>({
    defaultValues: {
      full_name: "", identification_number: "", phone: "", whatsapp: "",
      email: "", bank_name: "", account_type: "", account_number: "",
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    vehicleOwnersApi.get(Number(id)).then((r) => {
      const o = r.data;
      reset({
        full_name: o.full_name,
        identification_number: o.identification_number ?? "",
        phone: o.phone ?? "",
        whatsapp: o.whatsapp ?? "",
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
        identification_number: data.identification_number || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
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

  if (loadingDoc) {
    return <div className="flex items-center justify-center py-20 text-pink-400"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/propietarios")}
          className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-pink-900">
          {isEditing ? "Editar propietario" : "Nuevo propietario"}
        </h1>
      </div>

      {/* Personal */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Información personal</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre completo *"
            {...register("full_name", { required: "El nombre es obligatorio" })}
            error={errors.full_name?.message}
            placeholder="Jaime Cadavid"
            className="sm:col-span-2"
          />
          <Input label="Número de identificación" {...register("identification_number")} placeholder="12345678" />
        </CardBody>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Contacto</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono" {...register("phone")} placeholder="312 345 6789" />
          <Input label="WhatsApp" {...register("whatsapp")} placeholder="312 345 6789" />
          <Input label="Email" {...register("email")} type="email" placeholder="jaime@ejemplo.com" />
        </CardBody>
      </Card>

      {/* Banking */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Datos bancarios</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Banco" {...register("bank_name")} placeholder="Bancolombia" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo de cuenta</label>
            <select
              {...register("account_type")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="">Seleccionar...</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Número de cuenta" {...register("account_number")} placeholder="123456789012" className="sm:col-span-2" />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate("/propietarios")}>Cancelar</Button>
        <Button type="submit" loading={saving}>{isEditing ? "Guardar cambios" : "Crear propietario"}</Button>
      </div>
    </form>
  );
}
