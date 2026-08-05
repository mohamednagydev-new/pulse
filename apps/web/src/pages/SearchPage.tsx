import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import TopBar from '../components/TopBar';

const ROUTE: Record<string, (id: string) => string> = {
  article: (id) => `/article/${id}`,
  recipe: (id) => `/recipe/${id}`,
  program: (id) => `/programs/${id}`,
  exercise: () => `/exercises`,
  lesson: (id) => `/lesson/${id}`,
};

export default function SearchPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const enabled = q.trim().length >= 2;

  const { data } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get(`/api/search?q=${encodeURIComponent(q)}`),
    enabled,
  });

  // Semantic "smart" results — gracefully empty when AI/embeddings aren't configured.
  const { data: smart } = useQuery({
    queryKey: ['search-ai', q],
    queryFn: async () => {
      try { return await api.get(`/api/ai/search?q=${encodeURIComponent(q)}`); }
      catch { return { results: [] }; }
    },
    enabled,
  });

  const groups = [
    { key: 'programs', label: 'Programs', to: (x: any) => `/programs/${x.id}` },
    { key: 'recipes', label: 'Recipes', to: (x: any) => `/recipe/${x.id}` },
    { key: 'articles', label: 'Articles', to: (x: any) => `/article/${x.id}` },
    { key: 'exercises', label: 'Exercises', to: () => `/exercises` },
  ];

  const smartResults: any[] = (smart?.results ?? []).filter((r: any) => ROUTE[r.contentType]);

  return (
    <div className="min-h-screen">
      <TopBar title={t('common.search')} />
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-5 py-3">
          <Search size={18} className="text-gray-400" />
          <input
            autoFocus
            className="w-full bg-transparent outline-none"
            placeholder={t('search.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 px-4">
        {!enabled && <p className="py-10 text-center text-sm text-gray-400">{t('search.minChars')}</p>}

        {!!smartResults.length && (
          <div className="mb-5">
            <h2 className="mb-2 flex items-center gap-1 text-sm font-bold uppercase text-brand-blue">
              <Sparkles size={14} /> Smart matches
            </h2>
            <div className="space-y-2">
              {smartResults.map((r, i) => (
                <Link key={i} to={ROUTE[r.contentType](r.contentId)} className="block rounded-xl bg-brand-blue/5 px-4 py-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{r.text}</p>
                  <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-blue/70">{r.contentType}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {groups.map((g) => {
          const items: any[] = data?.[g.key] ?? [];
          if (!items.length) return null;
          return (
            <div key={g.key} className="mb-5">
              <h2 className="mb-2 text-sm font-bold uppercase text-gray-400">{g.label}</h2>
              <div className="space-y-2">
                {items.map((x) => (
                  <Link key={x.id} to={g.to(x)} className="block rounded-xl bg-gray-50 px-4 py-3 font-medium">
                    {x.title || x.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
