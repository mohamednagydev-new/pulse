import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock, Play } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import RelatedReels from '../../components/RelatedReels';

export default function CategoryPage() {
  const { id } = useParams();
  const { data: category, isLoading, error } = useQuery({
    queryKey: ['category', id],
    queryFn: () => api.get(`/api/categories/${id}`),
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorMsg error={error} />;

  const recipes: any[] = category.recipes ?? [];
  const articles: any[] = category.articles ?? [];

  return (
    <div className="min-h-screen bg-gray-900 pb-10 text-white">
      <TopBar title={category.title} color="bg-transparent" textColor="text-white" />
      <div className="mb-4 inline-block max-w-[80%] break-words rounded-r-full bg-gradient-to-r from-teal-600 to-teal-500 py-2 pl-6 pr-10 text-lg font-bold">
        {category.title}
      </div>

      {/* Media-forward grid: image dominates, minimal text */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {recipes.map((r, idx) => (
          <Link key={r.id} to={`/recipe/${r.id}`} className="overflow-hidden rounded-2xl bg-white/5">
            <div className="relative">
              <MediaImage path={r.coverImage} label={r.title} seed={idx} className="h-32 w-full" />
              {r.calories ? (
                <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px]"><Flame size={11} />{r.calories}</span>
              ) : null}
            </div>
            <p className="line-clamp-1 px-2 py-2 text-sm font-semibold">{r.title}</p>
          </Link>
        ))}

        {articles.map((a, idx) => (
          <Link key={a.id} to={`/article/${a.id}`} className="overflow-hidden rounded-2xl bg-white/5">
            <div className="relative">
              <MediaImage path={a.coverImage} label={a.title} seed={idx + 3} className="h-32 w-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 backdrop-blur"><Play size={16} fill="white" className="text-white" /></div>
              </div>
              {a.readTimeMin ? (
                <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px]"><Clock size={11} />{a.readTimeMin}m</span>
              ) : null}
            </div>
            <p className="line-clamp-2 px-2 py-2 text-sm font-semibold leading-tight">{a.title}</p>
          </Link>
        ))}
      </div>

      <RelatedReels
        keyword={category.reelKeyword || `${category.title}${category.kind === 'recipe' ? ' recipes' : ''}`}
        className="mt-8 px-4"
      />
    </div>
  );
}
