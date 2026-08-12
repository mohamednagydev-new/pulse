import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

// Each section keeps its own colour so Kitchen stops looking like Articles:
// the three destinations used to share one dark-teal template and users read
// them all as "the articles screen".
const KIND_MAP: Record<string, { kind: string; titleKey: string; hero: string }> = {
  initiatives: { kind: 'initiative', titleKey: 'wellness.initiatives', hero: 'hero-green' },
  kitchen: { kind: 'recipe', titleKey: 'wellness.kitchen', hero: 'hero-pink' },
  articles: { kind: 'article', titleKey: 'wellness.articles', hero: 'hero-blue' },
};

export default function WellnessSection() {
  const { kind } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const conf = KIND_MAP[kind ?? ''] ?? KIND_MAP.initiatives;

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories', conf.kind],
    queryFn: () => api.get(`/api/categories?kind=${conf.kind}`),
  });

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={t(conf.titleKey)} color={conf.hero} textColor="text-white" curved />
      <div className="px-4 pt-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/search')}
          className="flex min-h-[44px] w-full items-center justify-between rounded-full bg-white px-5 py-3 text-gray-400 shadow-md"
        >
          {t('common.search')} <Search size={18} />
        </motion.button>
      </div>

      {isLoading && <Loader />}
      {error && <ErrorMsg error={error} />}

      {/* Image-forward category cards — food looks like food, topics like topics */}
      <div className="mt-5 grid grid-cols-2 gap-3 px-4">
        {(categories ?? []).map((c: any, idx: number) => (
          <MotionLink
            key={c.id}
            to={`/category/${c.id}`}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ ...spring, delay: (idx % 2) * 0.06 }}
            whileTap={{ scale: 0.95 }}
            className="card-hover min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <MediaImage path={c.image} label={c.title} seed={idx} className="h-28 w-full" />
            <p className="truncate p-2.5 text-sm font-semibold">{c.title}</p>
          </MotionLink>
        ))}
      </div>
    </div>
  );
}
