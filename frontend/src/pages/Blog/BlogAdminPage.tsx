import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Plus, Edit, Trash2, Eye, EyeOff, X, BookOpen, ExternalLink } from 'lucide-react';
import { blogApi, type BlogPost, type BlogPostForm } from '../../api/blog';

const EMPTY_FORM: BlogPostForm = {
  title: '', slug: '', excerpt: '', content_md: '', cover_image_url: '', published: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: BlogPost | null }>({ open: false });
  const [form, setForm] = useState<BlogPostForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPosts((await blogApi.list()).data); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY_FORM); setModal({ open: true, editing: null }); };
  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title, slug: post.slug,
      excerpt: post.excerpt ?? '', content_md: post.content_md ?? '',
      cover_image_url: post.cover_image_url ?? '', published: post.published,
    });
    setModal({ open: true, editing: post });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal.editing) await blogApi.update(modal.editing.id, form);
      else await blogApi.create(form);
      setModal({ open: false });
      load();
    } finally { setSaving(false); }
  };

  const handleToggle = async (post: BlogPost) => {
    await blogApi.togglePublish(post.id);
    load();
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`¿Eliminar "${post.title}"?`)) return;
    await blogApi.delete(post.id);
    load();
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-sm text-gray-500 mt-0.5">Artículos y recomendaciones para clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/blog" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
            <ExternalLink size={16} /> Ver blog público
          </a>
          <button onClick={openNew} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
            <Plus size={16} /> Nuevo artículo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2 text-gray-400">
            <BookOpen size={32} className="text-gray-200" />
            <p className="text-sm">No hay artículos aún</p>
            <button onClick={openNew} className="mt-2 text-sm text-brand-700 hover:underline cursor-pointer">Crear el primero</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Publicado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{post.title}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{post.excerpt}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {post.published ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer" title="Ver en blog"><Eye size={14} /></a>
                      <button onClick={() => handleToggle(post)} className="p-1.5 text-gray-400 hover:text-green-600 cursor-pointer" title={post.published ? 'Despublicar' : 'Publicar'}>
                        {post.published ? <EyeOff size={14} /> : <Eye size={14} className="opacity-40" />}
                      </button>
                      <button onClick={() => openEdit(post)} className="p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(post)} className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{modal.editing ? 'Editar artículo' : 'Nuevo artículo'}</h3>
              <button onClick={() => setModal({ open: false })} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))}
                  className={inputCls} placeholder="Cómo elegir el carro para tu boda en Medellín" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className={inputCls} placeholder="como-elegir-carro-boda-medellin" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Extracto</label>
                <input value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  className={inputCls} placeholder="Descripción corta que aparece en la lista del blog..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL portada</label>
                <input value={form.cover_image_url} onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
                  className={inputCls} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contenido (Markdown)</label>
                <div data-color-mode="light">
                  <MDEditor
                    value={form.content_md}
                    onChange={v => setForm(f => ({ ...f, content_md: v ?? '' }))}
                    height={320}
                    preview="edit"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-700">Publicar inmediatamente</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setModal({ open: false })} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg cursor-pointer disabled:opacity-60">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
