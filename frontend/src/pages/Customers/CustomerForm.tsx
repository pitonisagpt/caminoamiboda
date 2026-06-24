import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { customersApi } from "../../api/customers";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { TextArea } from "../../components/ui/TextArea";
import type { CustomerFormData } from "../../types/customer";

const REFERRAL_OPTIONS = [
  "Instagram", "Recomendación de amigo/familiar", "Google",
  "Facebook", "TikTok", "Feria de bodas", "Otro",
];

export function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      bride_name: "", groom_name: "", main_contact_name: "",
      phone: "", whatsapp: "", email: "",
      wedding_date: "", instagram: "", referral_source: "", notes: "",
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    customersApi.get(Number(id)).then((r) => {
      const c = r.data;
      reset({
        bride_name: c.bride_name ?? "",
        groom_name: c.groom_name ?? "",
        main_contact_name: c.main_contact_name,
        phone: c.phone ?? "",
        whatsapp: c.whatsapp ?? "",
        email: c.email ?? "",
        wedding_date: c.wedding_date ?? "",
        instagram: c.instagram ?? "",
        referral_source: c.referral_source ?? "",
        notes: c.notes ?? "",
      });
    }).finally(() => setLoadingDoc(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    setSaving(true);
    try {
      const payload = {
        bride_name: data.bride_name || null,
        groom_name: data.groom_name || null,
        main_contact_name: data.main_contact_name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        wedding_date: data.wedding_date || null,
        instagram: data.instagram || null,
        referral_source: data.referral_source || null,
        notes: data.notes || null,
      };
      if (isEditing && id) {
        await customersApi.update(Number(id), payload);
      } else {
        await customersApi.create(payload);
      }
      navigate("/clientes");
    } catch {
      alert("Error al guardar el cliente.");
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
          onClick={() => navigate("/clientes")}
          className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-pink-900">
          {isEditing ? "Editar cliente" : "Nuevo cliente"}
        </h1>
      </div>

      {/* Couple */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">La pareja</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre de la novia" {...register("bride_name")} placeholder="María" />
          <Input label="Nombre del novio" {...register("groom_name")} placeholder="Carlos" />
          <Input
            label="Contacto principal *"
            {...register("main_contact_name", { required: "El contacto es obligatorio" })}
            error={errors.main_contact_name?.message}
            placeholder="María García"
            className="sm:col-span-2"
          />
        </CardBody>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Datos de contacto</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Teléfono" {...register("phone")} placeholder="312 345 6789" />
          <Input label="WhatsApp" {...register("whatsapp")} placeholder="312 345 6789" />
          <Input label="Email" {...register("email")} type="email" placeholder="maria@ejemplo.com" />
          <Input label="Instagram" {...register("instagram")} placeholder="@mariaycarlos" />
        </CardBody>
      </Card>

      {/* Event */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Evento</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Fecha de boda" {...register("wedding_date")} type="date" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">¿Cómo nos encontró?</label>
            <select
              {...register("referral_source")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="">Seleccionar...</option>
              {REFERRAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Notas</h2></CardHeader>
        <CardBody>
          <TextArea label="Notas internas" {...register("notes")} rows={3} placeholder="Preferencias, detalles especiales..." />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate("/clientes")}>Cancelar</Button>
        <Button type="submit" loading={saving}>{isEditing ? "Guardar cambios" : "Crear cliente"}</Button>
      </div>
    </form>
  );
}
