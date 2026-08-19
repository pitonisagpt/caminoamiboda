import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Check, Eye, EyeOff, Loader2, Trash2, Upload } from 'lucide-react';
import { floristApi, type FloristAdmin, type FloristPhoto, type FloristSettingsForm } from '../../api/florist';

export default function FloristPage() {
  const [data, setData] = useState<FloristAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FloristSettingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    floristApi.getAdmin().then(r => {
      setData(r.data);
      setForm({
        vendor_name: r.data.vendor_name,
        description: r.data.description,
        whatsapp_number: r.data.whatsapp_number,
        whatsapp_message: r.data.whatsapp_message,
        instagram_url: r.data.instagram_url,
      });
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await floristApi.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await floristApi.uploadPhotos(Array.from(files));
      load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const patchPhotos = async (photos: FloristPhoto[]) => {
    await floristApi.updatePhotos(
      photos.map(p => ({ id: p.id, display_order: p.display_order, is_visible: p.is_visible, label: p.label }))
    );
    load();
  };

  const movePhoto = (index: number, dir: -1 | 1) => {
    if (!data) return;
    const photos = [...data.photos];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= photos.length) return;
    const a = photos[index], b = photos[swapWith];
    [a.display_order, b.display_order] = [b.display_order, a.display_order];
    photos.sort((x, y) => x.display_order - y.display_order);
    setData({ ...data, photos });
    patchPhotos(photos);
  };

  const toggleVisible = (photo: FloristPhoto) => {
    if (!data) return;
    const photos = data.photos.map(p => p.id === photo.id ? { ...p, is_visible: !p.is_visible } : p);
    setData({ ...data, photos });
    patchPhotos(photos);
  };

  const updateLabel = (photo: FloristPhoto, label: string) => {
    if (!data) return;
    setData({ ...data, photos: data.photos.map(p => p.id === photo.id ? { ...p, label } : p) });
  };

  const saveLabel = () => {
    if (!data) return;
    patchPhotos(data.photos);
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    await floristApi.deletePhoto(photoId);
    load();
  };

  if (loading || !form || !data) {
    return <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Floristería aliada</h1>
      <p className="text-sm text-gray-500 -mt-4">
        Contenido de la sección "Floristería aliada" en /catalogo y los enlaces en /como-funciona.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del aliado</label>
            <input value={form.vendor_name} onChange={e => setForm(f => f && ({ ...f, vendor_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link de Instagram</label>
            <input value={form.instagram_url} onChange={e => setForm(f => f && ({ ...f, instagram_url: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número de WhatsApp (solo dígitos, con indicativo)</label>
            <input value={form.whatsapp_number} onChange={e => setForm(f => f && ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="573001234567"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje precargado de WhatsApp</label>
            <input value={form.whatsapp_message} onChange={e => setForm(f => f && ({ ...f, whatsapp_message: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Texto de la sección</label>
            <textarea value={form.description} onChange={e => setForm(f => f && ({ ...f, description: e.target.value }))} rows={5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-600 uppercase tracking-wide">Fotos de los paquetes</h2>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-medium rounded-lg cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Subir fotos
            <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden"
              onChange={e => handleUpload(e.target.files)} disabled={uploading} />
          </label>
        </div>

        {data.photos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Sin fotos todavía.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.photos.map((p, i) => (
              <div key={p.id} className={`space-y-2 ${!p.is_visible ? 'opacity-50' : ''}`}>
                <img src={p.url} alt={p.label || p.original_name} className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                <input value={p.label} onChange={e => updateLabel(p, e.target.value)} onBlur={saveLabel}
                  placeholder="Nivel 1"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => movePhoto(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"><ArrowUp size={14} /></button>
                    <button onClick={() => movePhoto(i, 1)} disabled={i === data.photos.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"><ArrowDown size={14} /></button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleVisible(p)} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer" title={p.is_visible ? 'Ocultar' : 'Mostrar'}>
                      {p.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
