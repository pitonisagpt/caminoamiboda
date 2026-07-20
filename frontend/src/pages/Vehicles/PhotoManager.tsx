import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { vehiclesApi } from "../../api/vehicles";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import { Dropzone } from "../../components/ui/Dropzone";
import type { VehiclePhoto } from "../../types/vehicle";

interface SortablePhotoProps {
  photo: VehiclePhoto;
  onToggleVisibility: (photo: VehiclePhoto) => void;
  onDelete: (photo: VehiclePhoto) => void;
  onPreview: (photo: VehiclePhoto) => void;
  deleting: boolean;
}

function SortablePhoto({ photo, onToggleVisibility, onDelete, onPreview, deleting }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 aspect-square"
    >
      <img
        src={photo.url}
        alt={photo.original_name}
        onClick={() => onPreview(photo)}
        className={`w-full h-full object-cover transition-opacity cursor-pointer ${photo.is_visible ? "" : "opacity-40 grayscale"}`}
      />

      {/* Hidden badge */}
      {!photo.is_visible && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">Oculta</span>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1.5 p-1 rounded-lg bg-white/80 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={14} className="text-gray-600" />
        </div>

        {/* Action buttons */}
        <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onToggleVisibility(photo)}
            className="p-1 rounded-lg bg-white/90 hover:bg-white transition-colors cursor-pointer"
            title={photo.is_visible ? "Ocultar del catálogo" : "Mostrar en catálogo"}
          >
            {photo.is_visible ? (
              <Eye size={13} className="text-brand-500" />
            ) : (
              <EyeOff size={13} className="text-gray-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(photo)}
            disabled={deleting}
            className="p-1 rounded-lg bg-white/90 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
            title="Eliminar foto"
          >
            {deleting ? (
              <Loader2 size={13} className="text-red-400 animate-spin" />
            ) : (
              <Trash2 size={13} className="text-red-500" />
            )}
          </button>
        </div>
      </div>

      {/* File name tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-[10px] truncate">{photo.original_name}</p>
      </div>
    </div>
  );
}

interface PhotoManagerProps {
  vehicleId: number | undefined;
  isEditing: boolean;
}

export function PhotoManager({ vehicleId, isEditing }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<VehiclePhoto | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!vehicleId) return;
    vehiclesApi.get(vehicleId).then((res) => setPhotos(res.data.photos ?? []));
  }, [vehicleId]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!vehicleId) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setUploading(true);
    try {
      const res = await vehiclesApi.uploadPhotos(vehicleId, imageFiles);
      setPhotos((prev) => [...prev, ...res.data]);
    } catch {
      alert("Error al subir las fotos.");
    } finally {
      setUploading(false);
    }
  }, [vehicleId]);

  const handleToggleVisibility = async (photo: VehiclePhoto) => {
    if (!vehicleId) return;
    const updated = photos.map((p) =>
      p.id === photo.id ? { ...p, is_visible: !p.is_visible } : p
    );
    setPhotos(updated);
    try {
      await vehiclesApi.updatePhotos(
        vehicleId,
        updated.map((p, i) => ({ id: p.id, display_order: i, is_visible: p.is_visible }))
      );
    } catch {
      setPhotos(photos); // revert
    }
  };

  const handleDelete = async (photo: VehiclePhoto) => {
    if (!vehicleId || !confirm(`¿Eliminar "${photo.original_name}"?`)) return;
    setDeletingId(photo.id);
    try {
      await vehiclesApi.deletePhoto(vehicleId, photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      alert("Error al eliminar la foto.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!vehicleId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);
    try {
      await vehiclesApi.updatePhotos(
        vehicleId,
        reordered.map((p, i) => ({ id: p.id, display_order: i, is_visible: p.is_visible }))
      );
    } catch {
      setPhotos(photos); // revert
    }
  };

  if (!isEditing) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
        Guarda el vehículo primero para poder subir fotos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <Dropzone
        onFiles={handleFiles}
        accept="image/*"
        uploading={uploading}
        label="Arrastra fotos o haz clic para seleccionar"
        dragLabel="Suelta las fotos aquí"
        helpText="JPG, PNG, WebP — múltiples archivos permitidos"
        uploadingText="Subiendo fotos..."
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">
            {photos.filter((p) => p.is_visible).length} de {photos.length} visibles en el catálogo · Arrastra para reordenar
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photos.map((photo) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                    onPreview={setPreviewPhoto}
                    deleting={deletingId === photo.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {previewPhoto && (
        <FilePreviewModal
          src={previewPhoto.url}
          contentType="image/*"
          fileName={previewPhoto.original_name}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </div>
  );
}
