import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { vehiclesApi } from "../../api/vehicles";
import { vehicleOwnersApi } from "../../api/vehicleOwners";
import type { VehicleOwner } from "../../types/vehicleOwner";
import { PhotoManager } from "./PhotoManager";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { TextArea } from "../../components/ui/TextArea";
import type { VehicleFormData } from "../../types/vehicle";

const DIGIT_TO_DAY: Record<string, string> = {
  "1": "Lunes", "2": "Lunes",
  "3": "Martes", "4": "Martes",
  "5": "Miércoles", "6": "Miércoles",
  "7": "Jueves", "8": "Jueves",
  "9": "Viernes", "0": "Viernes",
};

function computePicoYPlaca(plate: string, type: string, location: string): string | null {
  if (location !== "medellin" || !plate) return null;
  const p = plate.toUpperCase().trim();
  const digit = type === "car" ? p[p.length - 1] : p[3];
  return DIGIT_TO_DAY[digit] ?? null;
}

const DAY_COLOR: Record<string, string> = {
  Lunes: "bg-blue-100 text-blue-700",
  Martes: "bg-purple-100 text-purple-700",
  Miércoles: "bg-yellow-100 text-yellow-700",
  Jueves: "bg-orange-100 text-orange-700",
  Viernes: "bg-green-100 text-green-700",
};

export function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const [loadingDoc, setLoadingDoc] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [ownerContact, setOwnerContact] = useState("");

  useEffect(() => {
    vehicleOwnersApi.list().then(r => setOwners(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<VehicleFormData>({
    defaultValues: {
      vehicle_type: "car",
      location: "medellin",
      status: "active",
    },
  });

  const plate = watch("license_plate") ?? "";
  const vehicleType = watch("vehicle_type") ?? "car";
  const location = watch("location") ?? "medellin";
  const scores = [
    watch("score_elegance"),
    watch("score_exclusivity"),
    watch("score_photogeny"),
    watch("score_comfort"),
    watch("score_romance"),
  ];

  const picoYPlaca = useMemo(
    () => computePicoYPlaca(plate, vehicleType, location),
    [plate, vehicleType, location]
  );

  const scoreTotal = useMemo(() => {
    const nums = scores.map(Number).filter((n) => n >= 1 && n <= 5);
    return nums.length === 5 ? nums.reduce((a, b) => a + b, 0) : null;
  }, [scores.join(",")]);

  useEffect(() => {
    if (!isEditing || !id) return;
    vehiclesApi.get(Number(id)).then((res) => {
      const v = res.data;
      setOwnerContact(v.owner_contact ?? "");
      reset({
        license_plate: v.license_plate,
        brand: v.brand,
        model_line: v.model_line ?? "",
        color: v.color ?? "",
        year: v.year?.toString() ?? "",
        vehicle_type: v.vehicle_type,
        body_type: v.body_type ?? "",
        capacity: v.capacity?.toString() ?? "",
        location: v.location,
        status: v.status,
        owner_name: v.owner_name ?? "",
        owner_contact: v.owner_contact ?? "",
        price_medellin: v.price_medellin?.toString() ?? "",
        price_rionegro: v.price_rionegro?.toString() ?? "",
        score_elegance: v.score_elegance?.toString() ?? "",
        score_exclusivity: v.score_exclusivity?.toString() ?? "",
        score_photogeny: v.score_photogeny?.toString() ?? "",
        score_comfort: v.score_comfort?.toString() ?? "",
        score_romance: v.score_romance?.toString() ?? "",
        description: v.description ?? "",
        photo_urls: "",
      });
    }).finally(() => setLoadingDoc(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data: VehicleFormData) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        license_plate: data.license_plate.toUpperCase(),
        brand: data.brand,
        model_line: data.model_line || null,
        color: data.color || null,
        year: data.year ? parseInt(data.year) : null,
        vehicle_type: data.vehicle_type,
        body_type: data.body_type || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        location: data.location,
        status: data.status,
        owner_name: data.owner_name || null,
        owner_contact: data.owner_contact || null,
        price_medellin: data.price_medellin ? parseFloat(data.price_medellin) : null,
        price_rionegro: data.price_rionegro ? parseFloat(data.price_rionegro) : null,
        score_elegance: data.score_elegance ? parseInt(data.score_elegance) : null,
        score_exclusivity: data.score_exclusivity ? parseInt(data.score_exclusivity) : null,
        score_photogeny: data.score_photogeny ? parseInt(data.score_photogeny) : null,
        score_comfort: data.score_comfort ? parseInt(data.score_comfort) : null,
        score_romance: data.score_romance ? parseInt(data.score_romance) : null,
        description: data.description || null,
      };

      if (isEditing && id) {
        await vehiclesApi.update(Number(id), payload);
      } else {
        await vehiclesApi.create(payload);
      }
      navigate("/vehiculos");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      alert(msg ?? "Error al guardar el vehículo.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center py-20 text-pink-400">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/vehiculos")}
          className="p-2 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-pink-900">
          {isEditing ? "Editar vehículo" : "Nuevo vehículo"}
        </h1>
        {picoYPlaca && (
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${DAY_COLOR[picoYPlaca]}`}>
            Pico y Placa: {picoYPlaca}
          </span>
        )}
        {!picoYPlaca && location === "medellin" && plate && (
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Pico y Placa: calculando...
          </span>
        )}
        {location !== "medellin" && (
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Sin Pico y Placa
          </span>
        )}
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Información básica</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Placa *"
            {...register("license_plate", { required: "La placa es obligatoria" })}
            error={errors.license_plate?.message}
            placeholder="ABC123"
            className="uppercase"
          />
          <Input label="Marca *" {...register("brand", { required: "La marca es obligatoria" })} error={errors.brand?.message} placeholder="Chevrolet" />
          <Input label="Línea / Modelo" {...register("model_line")} placeholder="Bel Air" />
          <Input label="Color" {...register("color")} placeholder="Rosa coral" />
          <Input label="Año" {...register("year")} type="number" placeholder="1957" />
          <Select
            label="Tipo de vehículo"
            {...register("vehicle_type")}
            options={[
              { value: "car", label: "Carro" },
              { value: "motorcycle", label: "Moto" },
            ]}
          />
          <Input label="Tipo de carrocería" {...register("body_type")} placeholder="Convertible" />
          <Input label="Capacidad de pasajeros" {...register("capacity")} type="number" placeholder="4" />
        </CardBody>
      </Card>

      {/* Location & status */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Ubicación y estado</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Ubicación"
            {...register("location")}
            options={[
              { value: "medellin", label: "Medellín" },
              { value: "rionegro", label: "Rionegro" },
              { value: "carmen_de_viboral", label: "Carmen de Viboral" },
            ]}
          />
          <Select
            label="Estado"
            {...register("status")}
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
              { value: "pending", label: "Pendiente" },
            ]}
          />
        </CardBody>
      </Card>

      {/* Prices */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Precios (COP)</h2></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Precio Medellín" {...register("price_medellin")} type="number" placeholder="1200000" />
          <Input label="Precio Rionegro / Llanogrande" {...register("price_rionegro")} type="number" placeholder="1400000" />
        </CardBody>
      </Card>

      {/* Owner (admin only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Propietario</h2>
            <a
              href="/propietarios/nuevo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-700 transition-colors"
            >
              <ExternalLink size={12} />
              Agregar nuevo propietario
            </a>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
            <select
              {...register("owner_name")}
              onChange={e => {
                const name = e.target.value;
                setValue("owner_name", name);
                const selected = owners.find(o => o.full_name === name);
                if (selected) {
                  const contact = selected.whatsapp || selected.phone || "";
                  setValue("owner_contact", contact);
                  setOwnerContact(contact);
                } else {
                  setOwnerContact("");
                  setValue("owner_contact", "");
                }
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
            >
              <option value="">Sin asignar</option>
              {owners.map(o => (
                <option key={o.id} value={o.full_name}>{o.full_name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Contacto del dueño"
            value={ownerContact}
            onChange={() => {}}
            readOnly
            disabled
            placeholder="Se llena automáticamente al seleccionar propietario"
          />
        </CardBody>
      </Card>

      {/* Scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Puntuaciones (1–5)</h2>
            {scoreTotal !== null && (
              <span className="text-sm font-bold text-pink-600">{scoreTotal}/25</span>
            )}
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            ["score_elegance", "Elegancia y Estilo"],
            ["score_exclusivity", "Exclusividad y Rareza"],
            ["score_photogeny", "Fotogenia"],
            ["score_comfort", "Comodidad y Espacio"],
            ["score_romance", "Romanticismo y Encanto"],
          ] as const).map(([field, label]) => (
            <Input
              key={field}
              label={label}
              {...register(field)}
              type="number"
              min={1}
              max={5}
              placeholder="5"
            />
          ))}
        </CardBody>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Fotos</h2></CardHeader>
        <CardBody>
          <PhotoManager vehicleId={isEditing && id ? Number(id) : undefined} isEditing={isEditing} />
        </CardBody>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wider">Notas internas</h2></CardHeader>
        <CardBody>
          <TextArea label="Descripción / notas" {...register("description")} rows={3} placeholder="Detalles adicionales del vehículo..." />
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={() => navigate("/vehiculos")}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {isEditing ? "Guardar cambios" : "Crear vehículo"}
        </Button>
      </div>
    </form>
  );
}
