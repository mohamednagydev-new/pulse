import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, Flame, Users, ChefHat, ShoppingBag, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { usePageMeta } from '../../lib/seo';
import { Loader, ErrorMsg, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { WaIcon, waOpen } from '../../components/WaShare';
import BookmarkButton from '../../components/BookmarkButton';
import ContentVideo from '../../components/ContentVideo';
import RelatedReels from '../../components/RelatedReels';

const reveal = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function RecipePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: recipe, isLoading, error } = useQuery({ queryKey: ['recipe', id], queryFn: () => api.get(`/api/recipes/${id}`) });

  usePageMeta({
    title: recipe?.title,
    description: recipe?.about?.slice(0, 200),
    jsonLd: recipe
      ? {
          '@context': 'https://schema.org',
          '@type': 'Recipe',
          name: recipe.title,
          description: recipe.about ?? undefined,
          recipeCuisine: recipe.cuisine ?? undefined,
          nutrition: recipe.calories
            ? { '@type': 'NutritionInformation', calories: `${recipe.calories} calories`, proteinContent: recipe.protein ? `${recipe.protein} g` : undefined }
            : undefined,
          publisher: { '@type': 'Organization', name: 'PULSE', url: 'https://pulse.geddo.online' },
        }
      : undefined,
  });

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (set: Set<number>, i: number, fn: (s: Set<number>) => void) => {
    const n = new Set(set);
    n.has(i) ? n.delete(i) : n.add(i);
    fn(n);
  };

  // Loading/error keep the dark shell + a back affordance — no white flash, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen bg-gray-900 pb-12 text-white">
        <TopBar title={t('wellness.kitchen')} color="bg-transparent" textColor="text-white" />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const stats = [
    recipe.calories && { icon: Flame, value: recipe.calories, label: 'kcal' },
    recipe.prepTimeMin && { icon: Clock, value: recipe.prepTimeMin + (recipe.cookTimeMin ?? 0), label: 'min' },
    recipe.servings && { icon: Users, value: recipe.servings, label: 'serves' },
    recipe.difficulty && { icon: ChefHat, value: recipe.difficulty, label: 'level' },
  ].filter(Boolean) as { icon: any; value: string | number; label: string }[];

  const ingredients: string[] = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps: string[] = Array.isArray(recipe.steps) ? recipe.steps : [];

  return (
    <div className="min-h-screen bg-gray-900 pb-12 text-white">
      <TopBar title={t('wellness.kitchen')} color="bg-transparent" textColor="text-white" />
      <div className="px-4">
        <div className="relative">
          <MediaImage path={recipe.coverImage} label={recipe.title} className="h-52 w-full rounded-2xl" seed={2} />
          <div className="absolute end-3 top-3 flex items-center gap-2">
            {/* Guests can open this link — every share is a mini landing page. */}
            <button
              onClick={() => waOpen(`جرب الوصفة دي 😋 «${recipe.title}»${recipe.calories ? ` — ${recipe.calories} سعرة` : ''}\nمن مطبخ PULSE، ٩٠+ وصفة صحية ببلاش:\n${window.location.origin}/recipe/${recipe.id}`)}
              aria-label="WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow transition active:scale-90"
            >
              <WaIcon size={18} />
            </button>
            <BookmarkButton type="recipe" id={recipe.id} />
          </div>
        </div>

        <h1 className="mt-4 break-words text-xl font-bold leading-tight text-brand-green sm:text-2xl">{recipe.title}</h1>

        {/* Macro stat tiles */}
        {stats.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={reveal} transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center rounded-2xl bg-white/5 py-3">
                <s.icon size={16} className="text-brand-green" />
                <span className="mt-1 text-base font-extrabold leading-none">{s.value}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">{s.label}</span>
              </motion.div>
            ))}
          </div>
        )}

        <ContentVideo videoId={recipe.videoId} videoUrl={recipe.videoUrl} poster={recipe.coverImage} label={recipe.title} className="mt-4" />

        {recipe.about && (
          <div className="mt-5 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4 text-[15px] leading-relaxed text-white/90">
            {recipe.about}
          </div>
        )}

        {/* Ingredients — tap to check off */}
        {ingredients.length > 0 && (
          <>
            <h2 className="mt-6 font-bold">{t('wellness.ingredients')}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {ingredients.map((ing, i) => {
                const on = checked.has(i);
                return (
                  <button key={i} onClick={() => toggle(checked, i, setChecked)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? 'bg-brand-green/25 text-white line-through opacity-60' : 'bg-white/10 text-gray-200'}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${on ? 'border-brand-green bg-brand-green' : 'border-white/40'}`}>
                      {on && <Check size={11} className="text-white" />}
                    </span>
                    {ing}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {recipe.affiliateUrl && (
          <a href={recipe.affiliateUrl} target="_blank" rel="noreferrer sponsored" className="btn-pill btn-green mt-4 w-full">
            <ShoppingBag size={16} /> {recipe.affiliateLabel || 'Shop ingredients'}
          </a>
        )}

        {/* Method — cook-along numbered cards with progress */}
        {steps.length > 0 && (
          <>
            <div className="mt-6 mb-2 flex items-center justify-between">
              <h2 className="font-bold">{t('wellness.method')}</h2>
              <span className="text-xs text-gray-400">{done.size}/{steps.length}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-brand-green" animate={{ width: `${(done.size / steps.length) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
            </div>
            <div className="mt-3 space-y-2.5">
              {steps.map((s, i) => {
                const on = done.has(i);
                return (
                  <motion.button key={i} onClick={() => toggle(done, i, setDone)}
                    initial="hidden" whileInView="show" viewport={{ once: true, margin: '-30px' }} variants={reveal} transition={{ duration: 0.35 }}
                    className={`flex w-full gap-3 rounded-2xl p-3.5 text-start transition ${on ? 'bg-brand-green/15' : 'bg-white/5'}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${on ? 'bg-brand-green text-white' : 'bg-white/10 text-brand-green'}`}>
                      {on ? <Check size={15} /> : i + 1}
                    </span>
                    <span className={`text-[15px] leading-relaxed ${on ? 'text-white/60 line-through' : 'text-gray-200'}`}>{s}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        <RelatedReels keyword={recipe.reelKeyword || `${recipe.title} recipe`} className="mt-8" />
      </div>
    </div>
  );
}
