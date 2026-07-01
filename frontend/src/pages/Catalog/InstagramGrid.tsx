import { useEffect, useState } from 'react';
import { Play, Instagram } from 'lucide-react';
import { instagramApi, type InstagramPost } from '../../api/instagram';

export function InstagramGrid() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    instagramApi.feed()
      .then((r: { data: InstagramPost[] }) => setPosts(r.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || posts.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-brand text-pink-600">Síguenos en Instagram</h2>
          <p className="text-sm text-gray-400 mt-0.5">@caminoamiboda</p>
        </div>
        <a
          href="https://www.instagram.com/caminoamiboda"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-800 font-medium cursor-pointer"
        >
          <Instagram size={16} />
          Ver perfil
        </a>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {posts.slice(0, 12).map(post => {
          const imgSrc = post.thumbnail_url ?? post.media_url;
          const isVideo = post.media_type === 'VIDEO';
          return (
            <a
              key={post.instagram_id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden rounded-xl group cursor-pointer block"
            >
              <img
                src={imgSrc}
                alt={post.caption?.slice(0, 60) ?? ''}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/40 rounded-full p-2">
                    <Play size={18} className="text-white fill-white" />
                  </div>
                </div>
              )}
              {post.caption && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-white text-[10px] leading-tight line-clamp-3">{post.caption}</p>
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
