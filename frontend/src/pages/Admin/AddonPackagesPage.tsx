import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { addonPackagesApi, type AddonPackage } from '../../api/addonPackages';

const TYPE_LABEL: Record<string, string> = {
  bouquet: 'Ramo',
  extra_hour: 'Hora extra',
};

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

interface FormState {
  name: string;
  type: 'bouquet' | 'extra_hour';
  description: string;
  price: string;
  display_order: string;
}

const EMPTY: FormState = { name: '', type: 'bouquet', description: '', price: '', display_order: '0' };

export default function AddonPackagesPage() {
  const [packages, setPackages] = useState<AddonPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    addonPackagesApi.list().then((r: { data: AddonPackage[] }) => setPackages(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditingId(null); setShowForm(true); };
  const openEdit = (p: AddonPackage) => {
    setForm({ name: p.name, type: p.type as 'bouquet' | 'extra_hour', description: p.description ?? '', price: String(p.price), display_order: String(p.display_order) });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, type: form.type, description: form.description || undefined, price: parseFloat(form.price), display_order: parseInt(form.display_order) || 0 };
      if (editingId) {
        await addonPackagesApi.update(editingId, payload);
      } else {
        await addonPackagesApi.create(payload);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar este add-on?')) return;
    await addonPackagesApi.delete(id);
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Add-ons y Paquetes</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
          <Plus size={16} /> Nuevo add-on
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wide">{editingId ? 'Editar' : 'Nuevo'} add-on</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Ramo Premium" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'bouquet' | 'extra_hour' }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                <option value="bouquet">Ramo</option>
                <option value="extra_hour">Hora extra</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio (COP)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="250000" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                placeholder="Ramo mediano con flores de temporada" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 cursor-pointer flex items-center gap-1">
              <X size={14} /> Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !form.name || !form.price}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {packages.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'bouquet' ? 'bg-pink-50 text-pink-700' : 'bg-amber-50 text-amber-700'}`}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCOP(p.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Sin add-ons configurados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
