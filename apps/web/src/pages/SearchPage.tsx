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

/** Static screens index — search finds DESTINATIONS, not just content. Matched
 *  against name + keywords in both languages, rendered above content results. */
type ScreenDest = { to: string; en: string; ar: string; k: string; emoji: string };
const SCREENS: ScreenDest[] = [
  { to: '/programs', en: 'Train', ar: 'التمرين', k: 'workout programs plans gym تمرين تدريب برامج', emoji: '🏋️' },
  { to: '/exercises', en: 'Muscle map', ar: 'خريطة العضلات', k: 'exercises muscles anatomy عضلات تمارين', emoji: '💪' },
  { to: '/routines', en: 'Routines', ar: 'روتيناتي', k: 'my routines custom روتين', emoji: '📋' },
  { to: '/schedule', en: 'Schedule', ar: 'جدولي', k: 'calendar week days جدول مواعيد', emoji: '🗓️' },
  { to: '/my-plan', en: 'My plan', ar: 'خطتي', k: 'plan assessment goals خطة أهداف', emoji: '🎯' },
  { to: '/tracker', en: 'Food & calories', ar: 'الأكل والسعرات', k: 'food calories tracker macros protein أكل سعرات بروتين', emoji: '🔥' },
  { to: '/meals', en: 'Meal plan', ar: 'خطة الأكل', k: 'meals food plan وجبات أكل', emoji: '🍽️' },
  { to: '/diet-programs', en: 'Diet programs', ar: 'برامج الدايت', k: 'diet nutrition keto دايت رجيم تغذية', emoji: '🥗' },
  { to: '/progress', en: 'Weight journey', ar: 'رحلة الوزن', k: 'weight scale body وزن ميزان جسم', emoji: '⚖️' },
  { to: '/achievements', en: 'Challenges', ar: 'التحديات', k: 'achievements badges streak تحديات إنجازات', emoji: '🏅' },
  { to: '/leagues', en: 'League', ar: 'الدوري', k: 'league ranking دوري ترتيب', emoji: '🏆' },
  { to: '/champions', en: 'Champions', ar: 'الأبطال', k: 'champions leaderboard winners أبطال', emoji: '🥇' },
  { to: '/progress', en: 'Progress', ar: 'تقدمي', k: 'progress stats charts تقدم إحصائيات', emoji: '📈' },
  { to: '/buddies', en: 'Buddies', ar: 'أصحابي', k: 'buddies friends workout partner أصحاب صحاب', emoji: '🤝' },
  { to: '/my-invite', en: 'Invite friends', ar: 'اعزم أصحابك', k: 'invite referral share دعوة اعزم', emoji: '💌' },
  { to: '/community', en: 'Community', ar: 'المجتمع', k: 'feed posts social مجتمع منشورات', emoji: '🫂' },
  { to: '/group', en: 'Group sessions', ar: 'تمرين جماعي', k: 'group live sessions together جماعي لايف', emoji: '👥' },
  { to: '/coaches-community', en: 'Find a coach', ar: 'دوّر على مدرب', k: 'coaches trainer مدرب كوتش', emoji: '🎓' },
  { to: '/coach-chat', en: 'AI Coach', ar: 'كوتش AI', k: 'ai coach chat assistant ذكاء كوتش', emoji: '🤖' },
  { to: '/nutritionist', en: 'Nutritionist', ar: 'أخصائي التغذية', k: 'nutritionist diet questions تغذية دايت', emoji: '🥦' },
  { to: '/reels', en: 'Reels', ar: 'ريلز', k: 'reels videos shorts ريلز فيديو', emoji: '🎬' },
  { to: '/music', en: 'Music', ar: 'مزيكتي', k: 'music playlist مزيكا أغاني', emoji: '🎵' },
  { to: '/wellness', en: 'Wellness library', ar: 'مكتبة العافية', k: 'wellness recovery yoga sleep عافية استشفاء يوجا نوم', emoji: '🧘' },
  { to: '/gyms', en: 'Gyms', ar: 'دوّر على جيم', k: 'gyms venues clinics near me جيم عيادات', emoji: '🏢' },
  { to: '/store', en: 'Store', ar: 'المتجر', k: 'store shop supplements متجر تسوق مكملات', emoji: '🛒' },
  { to: '/deals', en: 'Deals', ar: 'العروض', k: 'deals offers discounts عروض خصومات', emoji: '🎟️' },
  { to: '/events', en: 'Events', ar: 'الفعاليات', k: 'events فعاليات إيفنتات', emoji: '📅' },
  { to: '/info', en: 'Settings', ar: 'الإعدادات', k: 'settings account preferences إعدادات حساب', emoji: '⚙️' },
  { to: '/help', en: 'Help', ar: 'المساعدة', k: 'help how it works support مساعدة شرح', emoji: '❓' },
];

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

  // Screens match instantly on the raw query (static list, no debounce needed);
  // empty query shows nothing extra.
  const screenQ = q.trim().toLowerCase();
  const screenMatches = screenQ
    ? SCREENS.filter((s) => `${s.en} ${s.ar} ${s.k}`.toLowerCase().includes(screenQ))
    : [];

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
        {/* Screens index: jump straight to a destination by name, above content results. */}
        {screenMatches.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('Screens', 'شاشات')}</h2>
            <div className="flex flex-wrap gap-2">
              {screenMatches.map((s) => (
                <Link
                  key={`${s.to}-${s.en}`}
                  to={s.to}
                  className="flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition active:scale-95"
                >
                  <span aria-hidden>{s.emoji}</span>
                  <span>{L(s.en, s.ar)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
