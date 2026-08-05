import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useScroll } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Clock, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { usePageMeta } from '../../lib/seo';
import { Loader, ErrorMsg, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import BookmarkButton from '../../components/BookmarkButton';
import RichContent from '../../components/RichContent';
import ContentVideo from '../../components/ContentVideo';
import RelatedReels from '../../components/RelatedReels';

export default function ArticlePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn: () => api.get(`/api/articles/${id}`),
  });

  usePageMeta({
    title: article?.title,
    description: article?.excerpt ?? article?.body?.slice(0, 200),
    jsonLd: article
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt ?? undefined,
          inLanguage: ['en', 'ar'],
          publisher: { '@type': 'Organization', name: 'PULSE', url: 'https://pulse.geddo.online' },
        }
      : undefined,
  });

  // Loading/error keep the dark shell + a back affordance — no white flash, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-gray-900 pb-12 text-white">
        <TopBar title={t('wellness.articles')} color="bg-transparent" textColor="text-white" />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-12 text-white">
      {/* Reading progress */}
      <motion.div style={{ scaleX: scrollYProgress }} className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-brand-pink" aria-hidden />
      <TopBar title={article.category?.kind === 'initiative' ? t('wellness.initiatives') : t('wellness.articles')} color="bg-transparent" textColor="text-white" />
      <div className="px-4">
        <div className="relative">
          <MediaImage path={article.coverImage} label={article.title} className="h-48 w-full rounded-2xl" seed={3} />
          <div className="absolute end-3 top-3"><BookmarkButton type="article" id={article.id} /></div>
        </div>

        <h1 className="mt-4 break-words text-xl font-bold leading-tight sm:text-2xl">{article.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          <span>{article.category?.title}</span>
          {article.readTimeMin ? <span className="flex items-center gap-1"><Clock size={12} />{t('wellness.minRead', { n: article.readTimeMin })}</span> : null}
        </div>

        <ContentVideo videoId={article.videoId} videoUrl={article.videoUrl} poster={article.coverImage} label={article.title} className="mt-4" />

        <ReviewedBy article={article} />

        <RichContent body={article.body} />

        <Sources article={article} />

        <RelatedReels
          keyword={article.reelKeyword || (article.category?.title ? `${article.category.title} tips` : null)}
          className="mt-8"
        />

        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((t: string, i: number) => (
              <span key={i} className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Who checked this, and when. Rendered only when an admin has filled it in — a
 *  fake or empty byline is worse than none, because it claims a review that never
 *  happened. */
function ReviewedBy({ article }: { article: any }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const name = (isAr && article.reviewedByAr) || article.reviewedBy;
  if (!name) return null;
  const title = (isAr && article.reviewerTitleAr) || article.reviewerTitle;

  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-400" />
      <div className="min-w-0 text-[12.5px] leading-relaxed">
        <p className="font-semibold text-emerald-300">
          {isAr ? 'مراجَع طبياً' : 'Medically reviewed'}
        </p>
        <p className="text-gray-300">
          {name}
          {title ? ` — ${title}` : ''}
          {article.reviewedOn ? ` · ${article.reviewedOn}` : ''}
        </p>
      </div>
    </div>
  );
}

/** The evidence behind the claims. Stored as a JSON array of {label, url}. */
function Sources({ article }: { article: any }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  let list: { label: string; url: string }[] = [];
  try {
    const raw = typeof article.sources === 'string' ? JSON.parse(article.sources) : article.sources;
    if (Array.isArray(raw)) list = raw.filter((s: any) => s?.label && s?.url);
  } catch {
    return null; // malformed JSON from the admin form: show nothing rather than crash
  }
  if (list.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-white/10 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {isAr ? 'المصادر' : 'Sources'}
      </p>
      <ul className="mt-2 space-y-1.5">
        {list.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-blue-300 underline-offset-2 hover:underline"
            >
              <ExternalLink size={13} className="mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
