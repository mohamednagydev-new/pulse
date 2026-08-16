import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { markSpot, spotSeen } from '../lib/spotlight';
import ScreenshotRail from '../components/ScreenshotRail';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/**
 * The feature map — «كنوز PULSE». Every magic feature on one screen, each tile
 * deep-linking straight into the thing itself. Tiles the user hasn't opened
 * from here yet carry a "new to you" dot; tapping retires it. This is also the
 * single place to announce whatever ships next.
 */

type Tile = { key: string; emoji: string; ar: string; en: string; hookAr: string; hookEn: string; to: string };

const TILES: Tile[] = [
  { key: 'ai', emoji: '🤖', ar: 'كوتش الـAI', en: 'AI coach', hookAr: 'اسأل أي حاجة في التمرين والأكل', hookEn: 'Ask anything about training and food', to: '/coach-chat' },
  { key: 'voice', emoji: '🎤', ar: 'تسجيل بالصوت', en: 'Voice logging', hookAr: 'قول أكلت إيه وإحنا نحسب', hookEn: 'Say what you ate — we do the math', to: '/tracker' },
  { key: 'scan', emoji: '📷', ar: 'ماسح الباركود', en: 'Barcode scanner', hookAr: 'أي منتج بتقييم من ١٠ لهدفك', hookEn: 'Any product, scored 1-10 for your goal', to: '/tracker' },
  { key: 'photo', emoji: '✨', ar: 'صورة الطبق', en: 'Meal photo', hookAr: 'صوّر أكلك والسعرات تتحسب', hookEn: 'Snap your plate — calories estimated', to: '/tracker' },
  { key: 'journey', emoji: '🎯', ar: 'رحلة الدايت', en: 'Diet journey', hookAr: 'هدف وزن وشريط تقدم وتفكيرات', hookEn: 'Weight target, progress bar, nudges', to: '/progress' },
  { key: 'recipes', emoji: '👨‍🍳', ar: 'وصفاتي', en: 'My recipes', hookAr: 'اعمل وصفتك محسوبة بالماكروز', hookEn: 'Build your recipe, macros included', to: '/tracker' },
  { key: 'mealplan', emoji: '🥗', ar: 'خطة الوجبات', en: 'Meal plan', hookAr: 'بتشرح نفسها وبتزود يوم التمرين', hookEn: 'Explains itself, boosts training days', to: '/meals' },
  { key: 'muscle', emoji: '💪', ar: 'خريطة العضلات', en: 'Muscle map', hookAr: 'دوس على العضلة وخد جلسة كاملة', hookEn: 'Tap a muscle, get a full session', to: '/exercises' },
  { key: 'live', emoji: '🔴', ar: 'حصص لايف', en: 'Live classes', hookAr: 'فيديو متزامن وتايمر مشترك مع الكل', hookEn: 'Synced video + shared timer together', to: '/group' },
  { key: 'duels', emoji: '⚔️', ar: 'تحدي ١ ضد ١', en: '1v1 duels', hookAr: 'اتحدى صاحبك على الأيام والنقط', hookEn: 'Challenge a friend on days and XP', to: '/buddies' },
  { key: 'leagues', emoji: '🏅', ar: 'الدوري الأسبوعي', en: 'Weekly league', hookAr: 'اجمع نقط واصعد الدرجات', hookEn: 'Earn XP, climb the divisions', to: '/leagues' },
  { key: 'reels', emoji: '🎬', ar: 'ريلز', en: 'Reels', hookAr: 'مقاطع تمارين سريعة تتحمس بيها', hookEn: 'Quick workout clips to get you going', to: '/reels' },
  { key: 'wellness', emoji: '🧘', ar: 'صحتك', en: 'Wellness', hookAr: 'نوم وضغط وسكر — مقالات تثق فيها', hookEn: 'Sleep, stress, sugar — articles you can trust', to: '/wellness' },
  { key: 'events', emoji: '📅', ar: 'الأحداث', en: 'Events', hookAr: 'تحديات ومناسبات المجتمع', hookEn: 'Community challenges and moments', to: '/events' },
];

export default function Features() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="cool" />
      <TopBar title={t('feat.title')} color="bg-gradient-to-b from-violet-600 to-purple-700" textColor="text-white" />

      <p className="px-5 pt-3 text-sm text-gray-500">{t('feat.sub')}</p>

      {/* Show, then tell: swipe the real screens before the tile list. */}
      <ScreenshotRail className="mt-3" />

      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        {TILES.map((f, i) => {
          const fresh = !spotSeen(`feat:${f.key}`);
          return (
            <motion.button
              key={f.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: (i % 6) * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { markSpot(`feat:${f.key}`); navigate(f.to); }}
              className="relative flex min-w-0 flex-col items-start gap-1.5 rounded-2xl bg-white p-4 text-start shadow-sm"
            >
              {fresh && (
                <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-extrabold text-violet-600">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-violet-500" /> {t('feat.new')}
                </span>
              )}
              <span className="text-2xl" aria-hidden>{f.emoji}</span>
              <span className="text-sm font-extrabold">{isAr ? f.ar : f.en}</span>
              <span className="text-[11px] leading-snug text-gray-400">{isAr ? f.hookAr : f.hookEn}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
