import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HeartPulse, Salad, BookOpen, Search, Flame, Footprints, Users, CalendarDays, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage } from '../../components/ui';
import MenuDrawer from '../../components/MenuDrawer';
import ScreenHeader from '../../components/ScreenHeader';
import RelatedReels from '../../components/RelatedReels';
import MoreSections from '../../components/MoreSections';
import WaterCard from '../../components/WaterCard';
import DailyReset from '../../components/DailyReset';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type DailyPick = {
  article?: { id: string; title: string; excerpt?: string | null; coverImage?: string | null } | null;
  recipe?: { id: string; title: string; coverImage?: string | null; calories?: number | null; prepTimeMin?: number | null } | null;
};

/* The old category rails (Kitchen / Health topics / Initiatives) are gone:
 * they reached the exact same three hubs as the quick tiles above them —
 * pure redundancy. In their place: wellness ACTIONS. Reading about health is
 * step one; this screen now also offers the doing — water, a 2-minute reset,
 * and the social moves (walk with a buddy, group session, events) that make
 * healthy habits stick. */
export default function WellnessHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  /** Inline bilingual label — new headings only, no locale-file edits. */
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data: pick } = useQuery<DailyPick>({
    queryKey: ['daily-pick'],
    queryFn: () => api.get('/api/daily-pick'),
    staleTime: 30 * 60 * 1000,
  });

  // Each tile wears its tone as a gradient with the scene texture blended in —
  // the same photo-glass language as the headers, per the owner's request.
  const tiles = [
    { to: '/wellness/kitchen', label: t('wellness.kitchen'), icon: <Salad size={22} />, grad: 'from-emerald-500/90 to-teal-700/80' },
    { to: '/wellness/articles', label: t('wellness.articles'), icon: <BookOpen size={22} />, grad: 'from-sky-500/90 to-blue-700/80' },
    { to: '/wellness/initiatives', label: t('wellness.initiatives'), icon: <HeartPulse size={22} />, grad: 'from-rose-500/90 to-pink-700/80' },
    { to: '/tracker', label: L('Calories', 'السعرات'), icon: <Flame size={22} />, grad: 'from-orange-500/90 to-amber-600/80' },
  ];

  // Social wellness actions — connection makes habits stick, so the library
  // links straight to the doing: walk with a buddy, train together, show up.
  const actions = [
    {
      to: '/buddies',
      icon: <Footprints size={20} />,
      title: L('Walk & talk', 'امشي واتكلم'),
      sub: L('Invite a buddy for an easy walk', 'اعزم صاحبك على مشوار مشي خفيف'),
      grad: 'from-emerald-500/90 to-teal-700/80',
    },
    {
      to: '/group',
      icon: <Users size={20} />,
      title: L('Group session', 'تمرين جماعي'),
      sub: L('Training together keeps you consistent', 'التمرين مع ناس بيخليك مستمر'),
      grad: 'from-violet-500/90 to-purple-700/80',
    },
    {
      to: '/events',
      icon: <CalendarDays size={20} />,
      title: L('Wellness events', 'فعاليات صحية'),
      sub: L('Classes, walks & meetups near you', 'كلاسات ومشاوير ولقاءات قريبة منك'),
      grad: 'from-rose-500/90 to-pink-700/80',
    },
  ];

  return (
    <div className="relative overflow-x-hidden pb-6">
      {/* Section tone: Wellness owns green. */}
      <ScreenHeader tone="green" padBottom="pb-8">
        {/* Burger INLINE with the title — the stacked version wasted a full row. */}
        <div className="flex items-center gap-3">
          <MenuDrawer />
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 truncate text-2xl font-extrabold"
          >
            {t('wellness.title')}
          </motion.h1>
        </div>
      </ScreenHeader>

      {/* Search pill — breathing room from the header instead of hugging it. */}
      <div className="px-4 pt-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/search')}
          className="flex min-h-[46px] w-full items-center gap-3 rounded-full bg-white px-5 py-3 text-start shadow-md"
        >
          <Search size={18} className="shrink-0 text-gray-400" />
          <span className="min-w-0 flex-1 truncate text-sm text-gray-400">
            {L('Search recipes, articles…', 'دور على وصفات ومقالات…')}
          </span>
        </motion.button>
      </div>

      {/* Quick tiles */}
      <div className="mt-4 grid grid-cols-4 gap-2 px-4">
        {tiles.map((tile, i) => (
          <MotionLink
            key={tile.to}
            to={tile.to}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: i * 0.05 }}
            whileTap={{ scale: 0.92 }}
            className={`scene-tex flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br ${tile.grad} py-3 text-white shadow-md`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">{tile.icon}</span>
            <span className="w-full truncate px-1 text-center text-[11px] font-bold">{tile.label}</span>
          </MotionLink>
        ))}
      </div>

      {/* The daily pick — WHY this tab is worth opening today. One article, one
          recipe, rotating every day. */}
      {(pick?.article || pick?.recipe) && (
        <>
          <p className="mt-6 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">✨ {L("Today's pick", 'اختيار النهارده')}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 px-4">
            {pick.article && (
              <MotionLink
                to={`/article/${pick.article.id}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={spring}
                whileTap={{ scale: 0.96 }}
                className="card-hover min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <MediaImage path={pick.article.coverImage} label={pick.article.title} className="h-28 w-full" />
                <div className="p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-blue">📖 {L('Read today', 'اقرا النهارده')}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{pick.article.title}</p>
                </div>
              </MotionLink>
            )}
            {pick.recipe && (
              <MotionLink
                to={`/recipe/${pick.recipe.id}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: 0.06 }}
                whileTap={{ scale: 0.96 }}
                className="card-hover min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <MediaImage path={pick.recipe.coverImage} label={pick.recipe.title} className="h-28 w-full" />
                <div className="p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-green">🍳 {L('Cook today', 'اطبخ النهارده')}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">{pick.recipe.title}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {pick.recipe.calories ? `${pick.recipe.calories} kcal` : ''}
                    {pick.recipe.prepTimeMin ? ` · ${pick.recipe.prepTimeMin} ${L('min', 'دقيقة')}` : ''}
                  </p>
                </div>
              </MotionLink>
            )}
          </div>
        </>
      )}

      {/* From reading to doing — wellness together beats wellness alone. */}
      <p className="mt-6 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">🤝 {L('Turn it into action', 'حوّل الكلام لفعل')}</p>
      <div className="mt-2 space-y-2 px-4">
        {actions.map((a, i) => (
          <MotionLink
            key={a.to}
            to={a.to}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            className={`scene-tex flex items-center gap-3 rounded-2xl bg-gradient-to-br ${a.grad} px-4 py-3 text-white shadow-md`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">{a.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{a.title}</span>
              <span className="block truncate text-[11px] text-white/85">{a.sub}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-white/70 rtl:rotate-180" />
          </MotionLink>
        ))}
      </div>

      {/* Opt-in extras: the daily habits that belong to wellness (water, a
          2-minute reset) plus short videos — interactive, not more links to
          the same hubs the tiles already reach. */}
      <MoreSections
        storageKey="pulse-wellness-pins"
        sections={[
          { key: 'water', emoji: '💧', label: L('Water', 'المياه'), node: <WaterCard /> },
          { key: 'reset', emoji: '🧘', label: L('Daily reset', 'استرخاء يومي'), node: <DailyReset /> },
          {
            key: 'reels', emoji: '🎬', label: L('Short videos', 'فيديوهات قصيرة'),
            node: <RelatedReels keyword="healthy recipes" className="mt-4 px-4" />,
          },
        ]}
      />
    </div>
  );
}
