import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { changeLanguage } from '../i18n';

export default function LanguageToggle({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const next = isAr ? 'en' : 'ar';

  if (variant === 'compact') {
    return (
      <button onClick={() => changeLanguage(next)} className="flex items-center gap-1 text-sm font-semibold">
        <Globe size={16} /> {isAr ? 'EN' : 'ع'}
      </button>
    );
  }

  return (
    <div className="flex overflow-hidden rounded-full border border-gray-200">
      {['en', 'ar'].map((l) => (
        <button
          key={l}
          onClick={() => l !== i18n.language && changeLanguage(l)}
          className={`px-5 py-2 text-sm font-semibold ${i18n.language === l ? 'bg-brand-pink text-white' : 'bg-white text-gray-500'}`}
        >
          {l === 'en' ? 'English' : 'العربية'}
        </button>
      ))}
    </div>
  );
}
