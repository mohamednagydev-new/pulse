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

const KIND_MAP: Record<string, { kind: string; titleKey: string }> = {
  initiatives: { kind: 'initiative', titleKey: 'wellness.initiatives' },
  kitchen: { kind: 'recipe', titleKey: 'wellness.kitchen' },
  articles: { kind: 'article', titleKey: 'wellness.articles' },
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
    <div className="min-h-screen overflow-x-hidden bg-gray-900 pb-10 text-white">
      <TopBar title={t(conf.titleKey)} color="bg-transparent" textColor="text-white" />
      <div className="px-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/search')}
          className="flex min-h-[44px] w-full items-center justify-between rounded-full bg-white px-5 py-3 text-gray-400"
        >
          {t('common.search')} <Search size={18} />
        </motion.button>
      </div>

      {isLoading && <Loader />}
      {error && <ErrorMsg error={error} />}

      <div className="mt-5 grid grid-cols-3 gap-3 px-4">
        {(categories ?? []).map((c: any, idx: number) => (
          <MotionLink
            key={c.id}
            to={`/category/${c.id}`}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ ...spring, delay: (idx % 3) * 0.06 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center"
          >
            <div className="card-hover relative flex h-full w-full flex-col items-center rounded-2xl bg-teal-600 pb-3 pt-8">
              <MediaImage path={c.image} label={c.title} seed={idx} className="absolute -top-5 h-16 w-16 rounded-full ring-2 ring-white" />
              <span className="mt-6 line-clamp-2 px-1 text-center text-xs font-semibold leading-tight">{c.title}</span>
            </div>
          </MotionLink>
        ))}
      </div>
    </div>
  );
}
