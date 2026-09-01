import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { blogApi, type BlogPost } from '../../api/blog';
import { AdminEditLink } from '../../components/AdminEditLink';
import { useLang } from '../../i18n/LanguageContext';
import { HreflangTags } from '../../i18n/HreflangTags';

export default function BlogListPage() {
  const { t, lang, pickLocalized } = useLang();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    blogApi.list(lang === "en" ? "en" : undefined).then(r => setPosts(r.data)).finally(() => setLoading(false));
  }, [lang]);

  const blogPath = lang === "en" ? "/en/blog" : "/blog";

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{t("blog.helmetTitle")}</title>
        <meta name="description" content={t("blog.helmetDescription")} />
        <meta property="og:title" content={t("blog.helmetTitle")} />
        <meta property="og:description" content={t("blog.helmetDescription")} />
        <meta property="og:type" content="website" />
      </Helmet>
      <HreflangTags path="/blog" />
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-50 to-brand-100 border-b border-brand-100">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-widest mb-3">Camino a mi Boda</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("blog.heroTitle")}</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">{t("blog.heroSubtitle")}</p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center text-gray-400 py-16">{t("blog.loading")}</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg">{t("blog.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map(post => {
              const title = pickLocalized(post.title, post.title_en);
              const excerpt = pickLocalized(post.excerpt ?? "", post.excerpt_en) || null;
              const slugForLang = lang === "en" ? (post.slug_en ?? post.slug) : post.slug;
              return (
                <article
                  key={post.id}
                  onClick={() => navigate(`${blogPath}/${slugForLang}`)}
                  className="group cursor-pointer"
                >
                  {post.cover_image_url && (
                    <div className="rounded-2xl overflow-hidden mb-4 aspect-video bg-gray-100">
                      <img src={post.cover_image_url} alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {post.published_at && (
                        <p className="text-xs text-gray-400">
                          {new Date(post.published_at).toLocaleDateString(lang === "en" ? 'en-US' : 'es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                      <AdminEditLink to={`/blog-admin?edit=${post.id}`} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-500 transition-colors leading-snug">
                      {title}
                    </h2>
                    {excerpt && (
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{excerpt}</p>
                    )}
                    <p className="text-sm font-semibold text-brand-700 group-hover:underline">{t("blog.readArticle")}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
