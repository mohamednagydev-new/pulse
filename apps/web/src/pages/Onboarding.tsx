import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Flame, Dumbbell, Activity, Salad, type LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import LanguageToggle from '../components/LanguageToggle';

const slides: { titleKey: string; textKey: string; g: string; Icon: LucideIcon }[] = [
  { titleKey: 'onboarding.slide1Title', textKey: 'onboarding.slide1Body', g: 'from-orange-600 via-orange-700 to-slate-900', Icon: Flame },
  { titleKey: 'onboarding.slide2Title', textKey: 'onboarding.slide2Body', g: 'from-blue-700 via-blue-800 to-slate-900', Icon: Dumbbell },
  { titleKey: 'onboarding.slide3Title', textKey: 'onboarding.slide3Body', g: 'from-teal-700 via-teal-800 to-slate-900', Icon: Activity },
  { titleKey: 'onboarding.slide4Title', textKey: 'onboarding.slide4Body', g: 'from-emerald-700 via-emerald-800 to-slate-900', Icon: Salad },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Admin-managed slide media: Banners with section "onboarding" (image per slide, by order).
  const { data: media } = useQuery({
    queryKey: ['onboarding-media'],
    queryFn: () => api.get('/api/banners?section=onboarding'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const finish = () => {
    localStorage.setItem('fitit_onboarded', '1');
    navigate('/login');
  };
  const next = () => (i < slides.length - 1 ? setI(i + 1) : finish());
  const slide = slides[i];
  const bg = media?.[i]?.image ? `/media/image/${String(media[i].image).replace(/^images\//, '')}` : null;

  return (
    <div className={`relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b ${slide.g} text-white`}>
      {/* Uploaded slide background (admin → Banners → section "onboarding"), dimmed for readability */}
      {bg && (
        <>
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        </>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-6 pt-12" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <div className="text-2xl font-extrabold italic">PULSE</div>
        <div className="flex items-center gap-3">
          <LanguageToggle variant="compact" />
          <button onClick={finish} className="flex items-center gap-1 text-sm font-medium">
            {t('common.skip')} <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={next}
          className="animate-float flex h-32 w-32 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/10 backdrop-blur transition active:scale-95"
          aria-label={t('common.next')}
        >
          <slide.Icon size={56} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mx-5 mb-4 rounded-3xl bg-white p-7 text-center text-ink shadow-xl">
        <h2 className="text-xl font-bold uppercase">{t(slide.titleKey)}</h2>
        <p className="mt-3 text-gray-600">{t(slide.textKey)}</p>
      </div>

      <div className="mb-10 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-2.5 rounded-full transition-all ${idx === i ? 'w-6 bg-white' : 'w-2.5 bg-white/40'}`}
            aria-label={t('onboarding.goToSlide', { n: idx + 1 })}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
