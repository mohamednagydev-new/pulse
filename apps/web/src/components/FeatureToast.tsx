import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../store/auth';

/**
 * Feature discovery on a drip: every ~3 days, one floating tip about a feature
 * the user may never have found (rotating through the pool, remembering where
 * it stopped). Tappable straight into the feature; dismiss just advances the
 * rotation. Deliberately rare — a daily nag would train people to ignore it.
 */

const TIPS: { to: string; emoji: string; en: string; ar: string }[] = [
  { to: '/coach-chat', emoji: '🤖', en: 'Did you try the AI Coach? Ask anything about training & food', ar: 'جربت كوتش الـAI؟ اسأله أي حاجة في التمرين والأكل' },
  { to: '/tracker', emoji: '📷', en: 'Scan any supermarket barcode — get a 1-10 score for your goal', ar: 'امسح باركود أي منتج — ياخد تقييم من ١٠ على حسب هدفك' },
  { to: '/tracker', emoji: '🍳', en: 'Build your own recipe once, log it forever with one tap', ar: 'اعمل وصفتك مرة واحدة وسجّلها بضغطة كل مرة' },
  { to: '/tracker', emoji: '✨', en: 'Snap a photo of your plate — the app estimates the calories', ar: 'صوّر طبقك — والتطبيق يقدّر السعرات لوحده' },
  { to: '/exercises', emoji: '💪', en: 'Tap any muscle on the body map to get its exercises', ar: 'دوس على أي عضلة في الخريطة تجيبلك تمارينها' },
  { to: '/achievements', emoji: '🏆', en: "A new challenge starts every Saturday — this week's is live now", ar: 'كل سبت في تحدي جديد — تحدي الأسبوع شغال دلوقتي' },
  { to: '/community', emoji: '👏', en: 'Cheer a buddy who just worked out — it makes their day', ar: 'شجّع صاحبك اللي لسه متمرن — هتعمله يومه' },
  { to: '/meals', emoji: '🥗', en: 'Your daily meal plan explains every plate — and you can swap any meal', ar: 'خطة أكلك اليومية بتشرح كل طبق — وتقدر تبدّل أي وجبة' },
  { to: '/buddies', emoji: '🎁', en: 'Invite a friend — you both earn streak freezes', ar: 'اعزم صاحبك — وانتوا الاتنين تكسبوا فريز للسلسلة' },
  { to: '/profile', emoji: '🎽', en: 'New 3D avatars! Pick your character from your profile', ar: 'أفاتارات 3D جديدة! اختار شخصيتك من البروفايل' },
  { to: '/group', emoji: '🎥', en: 'Join a live group session with Coach PULSE — free, weekly', ar: 'ادخل تمرين جماعي لايف مع كوتش PULSE — ببلاش وكل أسبوع' },
  { to: '/reels', emoji: '🎬', en: 'Short workout reels — learn one new move on your break', ar: 'ريلز تمارين قصيرة — اتعلم حركة جديدة في البريك' },
];

const KEY = 'pulse_feature_tip';
const EVERY_DAYS = 3;

export default function FeatureToast() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const status = useAuth((s) => s.status);
  const [tip, setTip] = useState<(typeof TIPS)[number] | null>(null);

  useEffect(() => {
    if (status !== 'authed') return;
    const state = JSON.parse(localStorage.getItem(KEY) || '{"last":0,"idx":0}');
    if (Date.now() - state.last < EVERY_DAYS * 86400000) return;
    const idx = state.idx % TIPS.length;
    // Late + brief: let the user land first, don't greet them with marketing.
    const show = setTimeout(() => setTip(TIPS[idx]), 5000);
    const hide = setTimeout(() => setTip(null), 17000);
    localStorage.setItem(KEY, JSON.stringify({ last: Date.now(), idx: idx + 1 }));
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [status]);

  const ar = i18n.language.startsWith('ar');

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[calc(100%-2rem)] max-w-[440px]"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-ink/95 p-3 pe-2 text-white shadow-xl backdrop-blur">
            <button
              onClick={() => { setTip(null); navigate(tip.to); }}
              className="flex min-w-0 flex-1 items-center gap-3 text-start"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-lg">
                {tip.emoji}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug">{ar ? tip.ar : tip.en}</span>
            </button>
            <button onClick={() => setTip(null)} aria-label="Close" className="shrink-0 p-1.5 text-white/50">
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
