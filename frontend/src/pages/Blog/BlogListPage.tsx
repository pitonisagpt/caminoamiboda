import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogApi, type BlogPost } from '../../api/blog';

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    blogApi.list(true).then(r => setPosts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-semibold text-pink-500 uppercase tracking-widest mb-3">Camino a mi Boda</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Guías & Inspiración</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">Todo lo que necesitas saber para elegir el vehículo perfecto para tu día especial.</p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center text-gray-400 py-16">Cargando artículos...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg">No hay artículos publicados aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map(post => (
              <article
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="group cursor-pointer"
              >
                {post.cover_image_url && (
                  <div className="rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-100">
                    <img src={post.cover_image_url} alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="space-y-2">
                  {post.published_at && (
                    <p className="text-xs text-gray-400">
                      {new Date(post.published_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-pink-600 transition-colors leading-snug">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                  <p className="text-sm font-semibold text-pink-600 group-hover:underline">Leer artículo →</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
