import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { usersApi } from "../../api/users";
import { Button } from "../../components/ui/Button";
import { Card, CardBody } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

interface FormData {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "operations";
}

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { full_name: "", email: "", password: "", role: "operations" },
  });

  useEffect(() => {
    if (!isEditing || !id) return;
    usersApi.list().then((res) => {
      const user = res.data.find((u) => u.id === Number(id));
      if (user) reset({ full_name: user.full_name, email: user.email, password: "", role: user.role });
    });
  }, [id, isEditing, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (isEditing && id) {
        const payload: Record<string, unknown> = { full_name: data.full_name, role: data.role };
        if (data.password) payload.password = data.password;
        await usersApi.update(Number(id), payload);
      } else {
        await usersApi.create(data);
      }
      navigate("/admin/usuarios");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      alert(msg ?? "Error al guardar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-brand-800">
          {isEditing ? "Editar usuario" : "Nuevo usuario"}
        </h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nombre completo"
              placeholder="Ej: María González"
              required
              {...register("full_name", { required: "El nombre es obligatorio" })}
              error={errors.full_name?.message}
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@ejemplo.com"
              required={!isEditing}
              disabled={isEditing}
              {...register("email", { required: !isEditing ? "El correo es obligatorio" : false })}
              error={errors.email?.message}
            />
            <Input
              label={isEditing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              type="password"
              placeholder="••••••••"
              required={!isEditing}
              {...register("password", { required: !isEditing ? "La contraseña es obligatoria" : false, minLength: { value: 6, message: "Mínimo 6 caracteres" } })}
              error={errors.password?.message}
            />
            <Select
              label="Rol"
              required
              options={[
                { value: "operations", label: "Operaciones" },
                { value: "admin", label: "Administrador" },
              ]}
              {...register("role")}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" loading={isSubmitting || loading}>
                {isEditing ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
