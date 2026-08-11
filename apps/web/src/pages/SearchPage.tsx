import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Clock, Dumbbell, Salad, ScanLine, Search, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { Loader, ErrorMsg, MediaImage } from '../components/ui';
import TopBar from '../components/TopBar';

/**
 * Global search.
 *
 * Debounced (350ms) so typing doesn't fire two API calls per keystroke, with
 * recent searches for the blank state, visual result rows (MediaImage falls
 * back to generated art), and bilingual group labels. The API side searches
 * Arabic columns too, so عربي queries actually match.
 */

const ROUTE: Record<string, (id: string) => string> = {
  article: (id) => `/article/${id}`,
  recipe: (id) => `/recipe/${id}`,
  program: (id) => `/programs/${id}`,
  exercise: () => `/exercises`,
  lesson: (id) => `/lesson/${id}`,
};

const RECENT_KEY = 'pulse_recent_searches';

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.slice(0, 8).map(String) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  const cleaned = q.trim();
  if (cleaned.length < 2) return;
  const next = [cleaned, ...readRecent().filter((r) => r.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
}

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const enabled = debounced.length >= 2;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api.get(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled,
  });

  // Semantic "smart" results — gracefully empty when AI/embeddings aren't configured.
  // Guests skip it entirely: the endpoint is auth-only, and each guest keystroke
  // was burning a doomed 401 + refresh round-trip.
  const authed = useAuth((s) => s.status === 'authed');
  const { data: smart } = useQuery({
    queryKey: ['search-ai', debounced],
    queryFn: async () => {
      try { return await api.get(`/api/ai/search?q=${encodeURIComponent(debounced)}`); }
      catch { return { results: [] }; }
    },
    enabled: enabled && authed,
  });

  // A search that produced something is worth remembering.
  useEffect(() => {
    if (enabled && data && Object.values(data).some((v) => Array.isArray(v) && v.length > 0)) {
      pushRecent(debounced);
      setRecent(readRecent());
    }
  }, [data, debounced, enabled]);

  const groups = [
    { key: 'programs', label: L('Programs', 'البرامج'), icon: <Dumbbell size={16} />, tint: 'bg-blue-50 text-brand-blue', to: (x: any) => `/programs/${x.id}` },
    { key: 'recipes', label: L('Recipes', 'الوصفات'), icon: <Salad size={16} />, tint: 'bg-emerald-100 text-emerald-600', to: (x: any) => `/recipe/${x.id}` },
    { key: 'articles', label: L('Articles', 'المقالات'), icon: <BookOpen size={16} />, tint: 'bg-sky-100 text-sky-600', to: (x: any) => `/article/${x.id}` },
    { key: 'exercises', label: L('Exercises', 'التمارين'), icon: <ScanLine size={16} />, tint: 'bg-orange-100 text-orange-600', to: (x: any) => (x.muscleGroupId ? `/exercises/${x.muscleGroupId}` : '/exercises') },
    // The three types users searched for and got an empty screen:
    { key: 'lessons', label: L('Workout days', 'أيام التمرين'), icon: <Dumbbell size={16} />, tint: 'bg-violet-100 text-violet-600', to: (x: any) => `/lesson/${x.id}` },
    { key: 'coaches', label: L('Coaches', 'المدربين'), icon: <Dumbbell size={16} />, tint: 'bg-pink-100 text-brand-pink', to: (x: any) => `/u/${x.id}` },
    { key: 'venues', label: L('Gyms & clinics', 'جيمات وعيادات'), icon: <Dumbbell size={16} />, tint: 'bg-teal-100 text-teal-600', to: () => '/gyms' },
  ];

  const smartResults: any[] = (smart?.results ?? []).filter((r: any) => ROUTE[r.contentType]);
  const hasResults = smartResults.length > 0 || groups.some((g) => (data?.[g.key] ?? []).length > 0);
  const searching = enabled && (isLoading || debounced !== q.trim());

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={t('common.search')} />
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-gray-100">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            autoFocus
            type="search"
            enterKeyHint="search"
            className="w-full bg-transparent outline-none"
            placeholder={t('search.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label={t('common.close')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 px-4">
        {/* Blank state: recent searches beat an empty screen. */}
        {!enabled && (
          recent.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <Clock size={12} /> {L('Recent', 'بحثت عنها قبل كده')}
                </h2>
                <button
                  onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                  className="text-[11px] font-bold text-gray-400"
                >
                  {L('Clear', 'امسح')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQ(r)}
                    className="min-h-9 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition active:scale-95"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">{t('search.minChars')}</p>
          )
        )}

        {searching && <Loader />}
        {enabled && isError && !searching && <ErrorMsg onRetry={() => refetch()} />}
        {enabled && !searching && !isError && !!data && !hasResults && (
          <div className="py-12 text-center">
            <Search size={26} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-500">
              {isAr ? `مفيش نتايج لـ «${debounced}»` : `No results for "${debounced}"`}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {L('Try a shorter word, or browse the library instead.', 'جرّب كلمة أقصر، أو اتفرج على المكتبة.')}
            </p>
          </div>
        )}

        {!searching && !!smartResults.length && (
          <div className="mb-5">
            <h2 className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-blue">
              <Sparkles size={13} /> {L('Smart matches', 'نتايج ذكية')}
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

        {!searching && groups.map((g) => {
          const items: any[] = data?.[g.key] ?? [];
          if (!items.length) return null;
          return (
            <div key={g.key} className="mb-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${g.tint}`}>{g.icon}</span>
                {g.label}
                <span className="text-gray-300" dir="ltr">({items.length})</span>
              </h2>
              <div className="space-y-2">
                {items.map((x) => (
                  <Link
                    key={x.id}
                    to={g.to(x)}
                    className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm transition active:scale-[0.99]"
                  >
                    <MediaImage
                      path={x.coverImage ?? x.svgAsset ?? x.avatarUrl ?? null}
                      label={x.title || x.name || x.firstName}
                      className="h-12 w-12 shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-bold">{x.title || x.name || `${x.firstName ?? ""} ${x.lastName ?? ""}`.trim()}</span>
                      {(x.coach?.name || x.level) && (
                        <span className="mt-0.5 line-clamp-1 block text-[11px] text-gray-400">
                          {[x.coach?.name, x.level].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-gray-300 rtl:rotate-180" />
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
