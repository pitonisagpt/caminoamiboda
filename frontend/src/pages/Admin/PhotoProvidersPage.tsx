import { useEffect, useState } from 'react';
import { Camera, Instagram, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { photoProvidersApi } from '../../api/photoProviders';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { PhotoProvider } from '../../types/vehicle';

interface FormState {
  name: string;
  category: string;
  instagram_url: string;
  website_url: string;
  notes: string;
}

const EMPTY_FORM: FormState = { name: '', category: '', instagram_url: '', website_url: '', notes: '' };

function toForm(p: PhotoProvider): FormState {
  return {
    name: p.name,
    category: p.category ?? '',
    instagram_url: p.instagram_url ?? '',
    website_url: p.website_url ?? '',
    notes: p.notes ?? '',
  };
}

// Only non-empty fields are sent — matches the backend's Optional[str] = None
// fields, so clearing a field in the form actually clears it server-side.
function toPayload(f: FormState): Record<string, string | null> {
  return {
    name: f.name.trim(),
    category: f.category.trim() || null,
    instagram_url: f.instagram_url.trim() || null,
    website_url: f.website_url.trim() || null,
    notes: f.notes.trim() || null,
  };
}

function ProviderModal({ initial, onSave, onClose }: {
  initial?: PhotoProvider | null;
  onSave: (data: FormState) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ? toForm(initial) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const f = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(s => ({ ...s, [key]: e.target.value })),
  });

  return (
    <Modal
      title={initial ? 'Editar proveedor' : 'Nuevo proveedor'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={async () => { if (!form.name.trim()) return; setSaving(true); try { await onSave(form); } finally { setSaving(false); } }}
            disabled={saving || !form.name.trim()}
            loading={saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Nombre *</label>
          <input {...f('name')} placeholder="Estudio Fotográfico X" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <input {...f('category')} placeholder="Fotógrafo, Decoración, Planner..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Instagram</label>
          <input {...f('instagram_url')} placeholder="https://instagram.com/..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Sitio web</label>
          <input {...f('website_url')} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Notas</label>
          <textarea {...f('notes')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>
    </Modal>
  );
}

export default function PhotoProvidersPage() {
  const [providers, setProviders] = useState<PhotoProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: PhotoProvider | null }>({ open: false, editing: null });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    photoProvidersApi.list().then(r => setProviders(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = providers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (form: FormState) => {
    if (modal.editing) {
      await photoProvidersApi.update(modal.editing.id, toPayload(form));
    } else {
      await photoProvidersApi.create(toPayload(form));
    }
    setModal({ open: false, editing: null });
    load();
  };

  const handleDelete = async (p: PhotoProvider) => {
    if (!confirm(`¿Eliminar a "${p.name}"? Se quitará de cualquier foto donde esté acreditado.`)) return;
    setDeletingId(p.id);
    try {
      await photoProvidersApi.delete(p.id);
      setProviders(prev => prev.filter(x => x.id !== p.id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {modal.open && (
        <ProviderModal
          initial={modal.editing}
          onSave={handleSave}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-800">Proveedores de fotos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fotógrafos y otros colaboradores que se pueden acreditar en las fotos del catálogo — opcional, foto por foto.
          </p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })} className="flex items-center gap-2 w-fit">
          <Plus size={16} /> Nuevo proveedor
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o categoría..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-brand-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Camera size={40} className="mx-auto mb-3 text-brand-200" />
          <p>No hay proveedores todavía.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={40} className="mx-auto mb-3 text-brand-200" />
          <p>Ningún proveedor coincide con la búsqueda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 bg-brand-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Categoría</th>
                  <th className="text-left px-4 py-3 font-semibold text-brand-600">Instagram</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.instagram_url ? (
                        <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                          <Instagram size={14} /> Ver
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal({ open: true, editing: p })}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {deletingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
