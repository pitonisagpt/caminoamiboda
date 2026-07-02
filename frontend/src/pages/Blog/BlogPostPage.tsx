import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { blogApi, type BlogPost } from '../../api/blog';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    blogApi.getBySlug(slug)
      .then(r => setPost(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">Cargando...</div>
  );

  if (notFound || !post) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-gray-400">
      <p className="text-2xl font-bold text-gray-900">Artículo no encontrado</p>
      <button onClick={() => navigate('/blog')} className="text-sm text-brand-700 hover:underline cursor-pointer">← Volver al blog</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      {post.cover_image_url && (
        <div className="w-full aspect-[3/1] max-h-80 overflow-hidden bg-gray-100">
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => navigate('/blog')} className="text-sm text-brand-700 hover:text-brand-800 mb-8 flex items-center gap-1 cursor-pointer">
          ← Volver al blog
        </button>

        <header className="mb-8">
          {post.published_at && (
            <p className="text-xs text-gray-400 mb-2">
              {new Date(post.published_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">{post.title}</h1>
          {post.excerpt && <p className="text-gray-500 text-lg leading-relaxed">{post.excerpt}</p>}
        </header>

        {post.content_md && (
          <div data-color-mode="light" className="prose max-w-none">
            <MDEditor.Markdown source={post.content_md} style={{ background: 'transparent', color: '#1f2937' }} />
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">¿Listo para reservar?</h3>
          <p className="text-gray-500 text-sm mb-4">Consulta disponibilidad y precios sin compromiso.</p>
          <a
            href="https://wa.me/573147372030"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Consultar disponibilidad
          </a>
        </div>
      </div>
    </div>
  );
}
