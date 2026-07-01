import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2, X, Check } from 'lucide-react';
import { reviewsApi, type Review, type ReviewForm } from '../../api/reviews';

const STARS = [1, 2, 3, 4, 5];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {STARS.map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`cursor-pointer transition-colors ${onChange ? 'hover:text-yellow-400' : 'cursor-default'} ${s <= value ? 'text-yellow-400' : 'text-gray-200'}`}>
          <Star size={16} fill={s <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

const EMPTY: ReviewForm = { author_name: '', rating: 5, body: '', source: 'manual', vehicle_id: null, is_visible: true, event_date: null };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReviewForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    reviewsApi.listAdmin().then((r: { data: Review[] }) => setReviews(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setShowForm(true); };
  const openEdit = (r: Review) => {
    setForm({ author_name: r.author_name, rating: r.rating, body: r.body, source: r.source, vehicle_id: r.vehicle_id ?? null, is_visible: r.is_visible, event_date: r.event_date ?? null });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await reviewsApi.update(editingId, form);
      } else {
        await reviewsApi.create(form);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    await reviewsApi.toggle(id);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta opinión?')) return;
    await reviewsApi.delete(id);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Opiniones</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
          <Plus size={16} /> Agregar opinión
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wide">{editingId ? 'Editar' : 'Nueva'} opinión</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente</label>
              <input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="María García" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as 'google' | 'manual' }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                <option value="manual">Directa / WhatsApp</option>
                <option value="google">Google Maps</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Calificación</label>
              <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha del evento (opcional)</label>
              <input type="date" value={form.event_date ?? ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value || null }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Testimonio</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                placeholder="Excelente servicio, el carro llegó puntual y fue el complemento perfecto para nuestra boda..." />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.is_visible} onChange={e => setForm(f => ({ ...f, is_visible: e.target.checked }))}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                <span className="text-gray-700">Visible en el catálogo público</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer flex items-center gap-1">
              <X size={14} /> Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !form.author_name || !form.body}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 cursor-pointer flex items-center gap-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-pink-400"><Loader2 className="animate-spin" size={28} /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Opinión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fuente</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visible</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_visible ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.author_name}</p>
                    <StarRating value={r.rating} />
                    {r.event_date && <p className="text-xs text-gray-400 mt-0.5">{new Date(r.event_date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs hidden md:table-cell">
                    <p className="line-clamp-2">{r.body}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.source === 'google' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.source === 'google' ? 'Google' : 'Directa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(r.id)} className="text-gray-400 hover:text-gray-700 cursor-pointer" title={r.is_visible ? 'Ocultar' : 'Mostrar'}>
                      {r.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Sin opiniones todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
