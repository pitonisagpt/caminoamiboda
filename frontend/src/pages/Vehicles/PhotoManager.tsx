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
import { Download, Eye, EyeOff, GripVertical, Instagram, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { vehiclesApi } from "../../api/vehicles";
import { photoProvidersApi } from "../../api/photoProviders";
import { FilePreviewModal } from "../../components/FilePreviewModal";
import { Dropzone } from "../../components/ui/Dropzone";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import type { PhotoProvider, VehiclePhoto } from "../../types/vehicle";
import { isTouchPrimaryDevice } from "../../utils/device";

// ─── Photo credits picker ──────────────────────────────────────────────────
// Optional, per photo — the vast majority of photos will have none. Loads
// the full directory once and lets ops check 0+ providers, with an inline
// "+ Nuevo proveedor" so they don't have to leave the vehicle editor to add
// one on the fly (same quick-create spirit as Cliente/Conductor/Contacto).
function CreditsModal({ photo, onSave, onClose }: {
  photo: VehiclePhoto;
  onSave: (providerIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const [providers, setProviders] = useState<PhotoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set(photo.providers.map(p => p.id)));
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    photoProvidersApi.list().then(r => setProviders(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleQuickCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await photoProvidersApi.create({ name: newName.trim(), instagram_url: newInstagram.trim() || null });
      setProviders(prev => [...prev, res.data]);
      setSelected(prev => new Set(prev).add(res.data.id));
      setNewName("");
      setNewInstagram("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title="Créditos de la foto"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={async () => { setSaving(true); try { await onSave([...selected]); } finally { setSaving(false); } }}
            disabled={saving}
            loading={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          Opcional — marca a quién acreditar en esta foto (fotógrafo, decoración, etc.). La mayoría de fotos no necesitan ninguno.
        </p>

        {loading ? (
          <div className="flex justify-center py-6 text-brand-400"><Loader2 className="animate-spin" size={20} /></div>
        ) : providers.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Todavía no hay proveedores registrados — crea uno abajo.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {providers.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-400 cursor-pointer"
                />
                <span className="text-gray-800">{p.name}</span>
                {p.category && <span className="text-xs text-gray-400">· {p.category}</span>}
                {p.instagram_url && <Instagram size={12} className="text-gray-300" />}
              </label>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">+ Nuevo proveedor</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              value={newInstagram}
              onChange={(e) => setNewInstagram(e.target.value)}
              placeholder="Instagram (opcional)"
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={handleQuickCreate}
              disabled={!newName.trim() || creating}
              className="p-2 rounded-lg bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors cursor-pointer disabled:opacity-40"
              title="Agregar"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface SortablePhotoProps {
  photo: VehiclePhoto;
  onToggleVisibility: (photo: VehiclePhoto) => void;
  onDelete: (photo: VehiclePhoto) => void;
  onPreview: (photo: VehiclePhoto) => void;
  onEditCredits: (photo: VehiclePhoto) => void;
  deleting: boolean;
}

function SortablePhoto({ photo, onToggleVisibility, onDelete, onPreview, onEditCredits, deleting }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  // Hover-reveal on desktop; on touch (no hover) the drag handle and action
  // buttons need to be visible plainly, or there's no way to reach them.
  const controlsVisibility = isTouchPrimaryDevice() ? "opacity-100" : "opacity-0 group-hover:opacity-100";

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
          className={`absolute top-1.5 left-1.5 p-1 rounded-lg bg-white/80 cursor-grab active:cursor-grabbing touch-none transition-opacity ${controlsVisibility}`}
        >
          <GripVertical size={14} className="text-gray-600" />
        </div>

        {/* Action buttons */}
        <div className={`absolute top-1.5 right-1.5 flex flex-col gap-1 transition-opacity ${controlsVisibility}`}>
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
            onClick={() => onEditCredits(photo)}
            className="p-1 rounded-lg bg-white/90 hover:bg-white transition-colors cursor-pointer"
            title="Créditos (proveedores)"
          >
            <Tag size={13} className={photo.providers.length > 0 ? "text-brand-500" : "text-gray-400"} />
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
  // Store just the id, not a snapshot of the photo object — deriving the
  // current photo from `photos` on every render keeps the preview in sync
  // when it's toggled/reordered from inside the modal, and makes it close
  // itself automatically once the photo is deleted (id no longer found).
  const [previewPhotoId, setPreviewPhotoId] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [creditsPhotoId, setCreditsPhotoId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!vehicleId) return;
    vehiclesApi.get(vehicleId).then((res) => setPhotos(res.data.photos ?? []));
  }, [vehicleId]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!vehicleId) return;
    const isImage = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
    const imageFiles = Array.from(files).filter(isImage);
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

  const handleDownloadZip = async () => {
    if (!vehicleId) return;
    setDownloadingZip(true);
    try {
      await vehiclesApi.downloadPhotosZip(vehicleId);
    } catch {
      alert("Error al descargar las fotos.");
    } finally {
      setDownloadingZip(false);
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

  const handleSaveCredits = async (photo: VehiclePhoto, providerIds: number[]) => {
    if (!vehicleId) return;
    const res = await vehiclesApi.setPhotoProviders(vehicleId, photo.id, providerIds);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? res.data : p)));
    setCreditsPhotoId(null);
  };

  const previewIndex = previewPhotoId != null ? photos.findIndex((p) => p.id === previewPhotoId) : -1;
  const previewPhoto = previewIndex >= 0 ? photos[previewIndex] : null;
  const creditsPhoto = creditsPhotoId != null ? photos.find((p) => p.id === creditsPhotoId) ?? null : null;

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
        accept="image/*,.heic,.heif"
        uploading={uploading}
        label="Arrastra fotos o haz clic para seleccionar"
        dragLabel="Suelta las fotos aquí"
        helpText="JPG, PNG, WebP, HEIC (iPhone) — múltiples archivos permitidos"
        uploadingText="Subiendo fotos..."
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs text-gray-400">
              {photos.filter((p) => p.is_visible).length} de {photos.length} visibles en el catálogo · Arrastra para reordenar
            </p>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 cursor-pointer disabled:opacity-60 shrink-0"
            >
              {downloadingZip ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Descargar visibles (ZIP)
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photos.map((photo) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                    onPreview={(p) => setPreviewPhotoId(p.id)}
                    onEditCredits={(p) => setCreditsPhotoId(p.id)}
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
          onClose={() => setPreviewPhotoId(null)}
          onPrev={() => setPreviewPhotoId(photos[previewIndex - 1].id)}
          onNext={() => setPreviewPhotoId(photos[previewIndex + 1].id)}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < photos.length - 1}
          position={{ current: previewIndex + 1, total: photos.length }}
          actions={
            <>
              <button
                type="button"
                onClick={() => handleToggleVisibility(previewPhoto)}
                className="p-1.5 text-gray-400 hover:text-brand-500 cursor-pointer"
                title={previewPhoto.is_visible ? "Ocultar del catálogo" : "Mostrar en catálogo"}
              >
                {previewPhoto.is_visible ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(previewPhoto)}
                disabled={deletingId === previewPhoto.id}
                className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer disabled:opacity-50"
                title="Eliminar foto"
              >
                {deletingId === previewPhoto.id ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Trash2 size={17} />
                )}
              </button>
            </>
          }
        />
      )}

      {creditsPhoto && (
        <CreditsModal
          photo={creditsPhoto}
          onSave={(ids) => handleSaveCredits(creditsPhoto, ids)}
          onClose={() => setCreditsPhotoId(null)}
        />
      )}
    </div>
  );
}
