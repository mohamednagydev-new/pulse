import { useTranslation } from 'react-i18next';
import { Sparkles, TrendingUp, Trophy } from 'lucide-react';
import Sheet from './Sheet';

/**
 * The XP economy explained in one breath — opened from the Lv pill on Home.
 * Three lines, deliberately no more: what XP is, what levels are, and that
 * weekly XP is the league currency.
 */
export default function XpInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const rows = [
    {
      icon: <Sparkles size={16} />,
      tone: 'bg-amber-100 text-amber-600',
      en: 'XP is points for showing up — workouts, logging food, daily quests.',
      ar: 'الـXP نقط بتاخدها لما تظهر — تمرين، تسجيل أكل، مهام يومية.',
    },
    {
      icon: <TrendingUp size={16} />,
      tone: 'bg-sky-100 text-sky-600',
      en: 'Every 500 XP is a new level — your rank and avatar ring grow with it.',
      ar: 'كل ٥٠٠ XP مستوى جديد — رتبتك وإطار صورتك بيكبروا معاه.',
    },
    {
      icon: <Trophy size={16} />,
      tone: 'bg-violet-100 text-violet-600',
      en: 'This week’s XP sets your place in the weekly league — it resets every week.',
      ar: 'XP الأسبوع ده هو اللي بيحدد مكانك في الدوري — وبيتصفر كل أسبوع.',
    },
  ];
  return (
    <Sheet open={open} onClose={onClose} label={isAr ? 'إيه حكاية الـXP؟' : 'What is XP?'}>
      <div className="px-6 pb-8 pt-3 text-ink">
        <h2 className="text-lg font-bold">{isAr ? 'إيه حكاية الـXP؟' : 'What is XP?'}</h2>
        <ul className="mt-4 space-y-3 text-sm text-gray-600">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-start">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${r.tone}`}>{r.icon}</span>
              <span className="leading-relaxed">{isAr ? r.ar : r.en}</span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
