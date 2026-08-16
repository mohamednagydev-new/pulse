import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { HeartPulse, Salad, BookOpen, ChevronRight, Search, Flame } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, HScroll, Loader, EmptyState } from '../../components/ui';
import MenuDrawer from '../../components/MenuDrawer';
import ScreenHeader from '../../components/ScreenHeader';
import RelatedReels from '../../components/RelatedReels';
import MoreSections from '../../components/MoreSections';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type Category = { id: string; title: string; image?: string | null; kind?: string };

const cards = [
  { to: '/wellness/initiatives', titleKey: 'wellness.initiatives', icon: HeartPulse, hero: 'hero-green' },
  { to: '/wellness/kitchen', titleKey: 'wellness.kitchen', icon: Salad, hero: 'hero-pink' },
  { to: '/wellness/articles', titleKey: 'wellness.articles', icon: BookOpen, hero: 'hero-blue' },
];

export default function WellnessHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  /** Inline bilingual label — new headings only, no locale-file edits. */
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const useCats = (kind: string) =>
    useQuery<Category[]>({
      queryKey: ['categories', kind],
      queryFn: () => api.get(`/api/categories?kind=${kind}`),
      staleTime: 5 * 60 * 1000,
    });

  const recipes = useCats('recipe');
  const articles = useCats('article');
  const initiatives = useCats('initiative');

  const loading = recipes.isLoading && articles.isLoading && initiatives.isLoading;
  const recipeCats = recipes.data ?? [];
  const articleCats = articles.data ?? [];
  const initiativeCats = (initiatives.data ?? []).slice(0, 4);
  const nothing =
    !loading && recipeCats.length === 0 && articleCats.length === 0 && initiativeCats.length === 0;

  // Each tile wears its tone as a gradient with the scene texture blended in —
  // the same photo-glass language as the headers, per the owner's request.
  const tiles = [
    { to: '/wellness/kitchen', label: t('wellness.kitchen'), icon: <Salad size={22} />, grad: 'from-emerald-500/90 to-teal-700/80' },
    { to: '/wellness/articles', label: t('wellness.articles'), icon: <BookOpen size={22} />, grad: 'from-sky-500/90 to-blue-700/80' },
    { to: '/wellness/initiatives', label: t('wellness.initiatives'), icon: <HeartPulse size={22} />, grad: 'from-rose-500/90 to-pink-700/80' },
    { to: '/tracker', label: L('Calories', 'السعرات'), icon: <Flame size={22} />, grad: 'from-orange-500/90 to-amber-600/80' },
  ];

  return (
    <div className="relative overflow-x-hidden pb-6">
      {/* AmbientBg removed: its edge-hugging blur blobs read as dirty grey
          shadows on the screen sides, not as ambience. */}

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

      {/* Hero navigation cards */}
      <p className="mt-6 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('Explore', 'استكشف')}</p>
      <div className="mt-2 space-y-4 px-4">
        {cards.map(({ to, titleKey, icon: Icon, hero }, i) => (
          <MotionLink
            key={to}
            to={to}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ ...spring, delay: 0.05 + i * 0.07 }}
            whileTap={{ scale: 0.96 }}
            className={`${hero} card-hover flex items-center gap-4 rounded-2xl p-6 text-white shadow-lg`}
          >
            <Icon size={40} className="shrink-0" />
            <p className="min-w-0 flex-1 truncate text-lg font-bold">{t(titleKey)}</p>
            <ChevronRight className="shrink-0 rtl:rotate-180" />
          </MotionLink>
        ))}
      </div>

      {loading && <Loader label={t('common.loading')} />}

      {nothing && (
        <EmptyState
          icon={<Salad size={40} />}
          title={L('Nothing here yet', 'لا يوجد محتوى بعد')}
          hint={L('New recipes and articles are on the way.', 'وصفات ومقالات جديدة في الطريق.')}
        />
      )}

      {/* Content previews are opt-in — the hero cards above already reach every
          hub; these rails are for browsing moods. "Track your day" is gone
          entirely: it duplicated the Calories quick tile. */}
      <MoreSections
        storageKey="pulse-wellness-pins"
        sections={[
          ...(recipeCats.length > 0
            ? [{
                key: 'kitchen', emoji: '🍽', label: L('Kitchen', 'مطبخ الصحة'),
                node: (
                  <Section title={L('Wellness Kitchen', 'مطبخ الصحة')} onSeeAll={() => navigate('/wellness/kitchen')}>
                    <HScroll>
                      {recipeCats.map((c, i) => (
                        <RailCard key={c.id} cat={c} index={i} />
                      ))}
                    </HScroll>
                  </Section>
                ),
              }]
            : []),
          ...(articleCats.length > 0
            ? [{
                key: 'topics', emoji: '📖', label: L('Health topics', 'مواضيع صحية'),
                node: (
                  <Section title={L('Health topics', 'مواضيع صحية')} onSeeAll={() => navigate('/wellness/articles')}>
                    <HScroll>
                      {articleCats.map((c, i) => (
                        <RailCard key={c.id} cat={c} index={i} />
                      ))}
                    </HScroll>
                  </Section>
                ),
              }]
            : []),
          ...(initiativeCats.length > 0
            ? [{
                key: 'initiatives', emoji: '🌱', label: L('Initiatives', 'مبادرات'),
                node: (
                  <Section title={L('Wellness initiatives', 'مبادرات صحية')} onSeeAll={() => navigate('/wellness/initiatives')}>
                    <div className="grid grid-cols-2 gap-3 px-4">
                      {initiativeCats.map((c, i) => (
                        <MotionLink
                          key={c.id}
                          to={`/category/${c.id}`}
                          initial={{ opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                          transition={{ ...spring, delay: (i % 2) * 0.06 }}
                          whileTap={{ scale: 0.95 }}
                          className="card-hover min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm"
                        >
                          <MediaImage path={c.image} label={c.title} className="h-24 w-full" />
                          <p className="truncate p-2 text-xs font-semibold text-gray-700">{c.title}</p>
                        </MotionLink>
                      ))}
                    </div>
                  </Section>
                ),
              }]
            : []),
          {
            key: 'reels', emoji: '🎬', label: L('Short videos', 'فيديوهات قصيرة'),
            node: <RelatedReels keyword="healthy recipes" className="mt-4 px-4" />,
          },
        ]}
      />
    </div>
  );
}

/** Rail card: themed cover art (or upload) + title, links to the category listing. */
function RailCard({ cat, index }: { cat: Category; index: number }) {
  return (
    <MotionLink
      to={`/category/${cat.id}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ ...spring, delay: Math.min(index, 4) * 0.05 }}
      whileTap={{ scale: 0.95 }}
      className="w-40 shrink-0 text-start"
      style={{ scrollSnapAlign: 'start' }}
    >
      <MediaImage path={cat.image} label={cat.title} className="h-28 w-40 rounded-2xl" />
      <p className="mt-2 truncate text-sm font-semibold text-gray-700">{cat.title}</p>
    </MotionLink>
  );
}

function Section({ title, children, onSeeAll }: { title: string; children: ReactNode; onSeeAll?: () => void }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} aria-label={title} className="shrink-0 text-gray-400">
            <ChevronRight size={22} className="rtl:rotate-180" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
