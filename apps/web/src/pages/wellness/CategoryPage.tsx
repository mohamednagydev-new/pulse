import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Clock } from 'lucide-react';
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

  if (isLoading || error) {
    return (
      <div className="min-h-screen pb-10">
        <TopBar color="hero-green" textColor="text-white" />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const recipes: any[] = category.recipes ?? [];
  const articles: any[] = category.articles ?? [];
  // Recipe categories get the Kitchen pink, article ones the Articles blue —
  // consistent with the section screens they were opened from.
  const hero = category.kind === 'recipe' ? 'hero-pink' : category.kind === 'initiative' ? 'hero-green' : 'hero-blue';

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={category.title} color={hero} textColor="text-white" curved />

      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        {recipes.map((r, idx) => (
          <Link key={r.id} to={`/recipe/${r.id}`} className="card-hover overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative">
              <MediaImage path={r.coverImage} label={r.title} seed={idx} className="h-32 w-full" />
              {r.calories ? (
                <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white"><Flame size={11} />{r.calories}</span>
              ) : null}
            </div>
            <p className="line-clamp-1 px-2.5 py-2 text-sm font-semibold">{r.title}</p>
          </Link>
        ))}

        {/* Articles are reads — no play button pretending they're videos. */}
        {articles.map((a, idx) => (
          <Link key={a.id} to={`/article/${a.id}`} className="card-hover overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative">
              <MediaImage path={a.coverImage} label={a.title} seed={idx + 3} className="h-32 w-full" />
              {a.readTimeMin ? (
                <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white"><Clock size={11} />{a.readTimeMin}m</span>
              ) : null}
            </div>
            <p className="line-clamp-2 px-2.5 py-2 text-sm font-semibold leading-tight">{a.title}</p>
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
