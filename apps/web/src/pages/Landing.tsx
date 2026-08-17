import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Mic, ScanLine, Salad, Trophy, Users, Flame, ChevronRight, Check, Dumbbell, UtensilsCrossed, MessagesSquare, Sparkles } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import CountUp from '../components/CountUp';
import { track } from '../lib/track';
import { utmMeta } from '../lib/utm';
import { pixelViewContent } from '../lib/pixels';
import ScreenshotRail from '../components/ScreenshotRail';

/**
 * The pitch page — what a stranger from an ad sees first. Real screenshots,
 * real numbers, the free hook everywhere, and two honest exits: join free or
 * browse as a guest. Replaces the intro slides as the first-visit surface
 * (the slides remain at /onboarding for anyone who wants the quick tour).
 */

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -60px 0px' },
  transition: spring,
} as const;

const FEATURES = [
  {
    img: '/landing/tracker.jpg',
    icon: Mic,
    tint: 'from-orange-500 to-amber-500',
    en: ['Say it, we count it', 'Log koshari, foul, ta3meya by VOICE — Egyptian foods with real calories, water tracking, daily targets.'],
    ar: ['قول أكلت إيه وإحنا نحسب', 'سجّل كشري وفول وطعمية بالصوت 🎤 — أكل مصري بسعراته الحقيقية، عدّاد مياه، وهدف يومي.'],
  },
  {
    img: '/landing/session.jpg',
    icon: ScanLine,
    tint: 'from-sky-500 to-blue-600',
    en: ['Tap a muscle, start training', 'Muscle map sessions with video form guides, set logging and PR celebrations — home or gym, every level.'],
    ar: ['دوس على العضلة وابدأ', 'خريطة عضلات بجلسات جاهزة: فيديو لكل تمرينة، سجّل أوزانك، واحتفال لما تكسر رقمك — بيت أو جيم.'],
  },
  {
    img: '/landing/kitchen.jpg',
    icon: Salad,
    tint: 'from-pink-500 to-rose-500',
    en: ['A kitchen that helps', '90+ healthy recipes, meal plans that explain themselves, and a grocery list built for you.'],
    ar: ['مطبخ بيساعدك', '٩٠+ وصفة صحية، خطط وجبات بتشرح نفسها، وقايمة مشتريات جاهزة.'],
  },
  {
    img: '/landing/challenge.jpg',
    icon: Trophy,
    tint: 'from-violet-500 to-purple-600',
    en: ["You won't train alone", 'Challenges with badges, weekly XP leagues, 1v1 duels with friends, and live group sessions with Coach PULSE.'],
    ar: ['مش هتتمرن لوحدك', 'تحديات ببادجات، دوري أسبوعي بالنقط، تحدي ١ضد١ مع صاحبك، وحصص لايف جماعية مع كوتش PULSE.'],
  },
];

export default function Landing() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  useEffect(() => {
    track('funnel-welcome-view', utmMeta());
    pixelViewContent('landing');
  }, []);

  const go = (to: string, event: string) => {
    localStorage.setItem('fitit_onboarded', '1');
    track(event, utmMeta());
    navigate(to);
  };

  const CTAs = ({ big = false }: { big?: boolean }) => (
    <div className={`flex flex-col gap-2.5 ${big ? '' : 'sm:flex-row sm:justify-center'}`}>
      <button
        onClick={() => go('/register', 'funnel-register-intent')}
        className={`flex items-center justify-center gap-1.5 rounded-full bg-white font-extrabold text-ink shadow-lg transition active:scale-[0.98] ${big ? 'min-h-[52px] text-base' : 'min-h-12 px-8 text-sm'}`}
      >
        {L('Create free account', 'اعمل حساب مجاني')}
        <ChevronRight size={18} className="rtl:rotate-180" />
      </button>
      <button
        onClick={() => go('/programs', 'funnel-guest-browse')}
        className={`flex items-center justify-center rounded-full bg-white/15 font-bold text-white backdrop-blur transition active:scale-[0.98] ${big ? 'min-h-[46px] text-sm' : 'min-h-12 px-8 text-sm'}`}
      >
        {L('Look around first — no account', 'اتفرج الأول من غير حساب')}
      </button>
    </div>
  );

  return (
    <div className="fitness-hero relative min-h-screen overflow-x-hidden text-white">
      {/* Real coaching photo as hero atmosphere — dimmed under the gradient so
          the page opens on people training, not an abstract color wash. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden"
        aria-hidden
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
      >
        <img src="/landing/scene-coach.jpg" alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        <div className="flex items-center gap-2">
          <img src="/pwa-192.png" alt="PULSE" className="h-9 w-9 rounded-xl shadow-lg" />
          <span className="text-2xl font-extrabold italic">PULSE</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold tracking-wide backdrop-blur">
            {L('100% FREE', 'مجاني ١٠٠٪')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle variant="compact" />
          <Link to="/login" onClick={() => localStorage.setItem('fitit_onboarded', '1')} className="text-sm font-semibold underline">
            {L('Sign in', 'دخول')}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-8 text-center">
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="text-3xl font-extrabold leading-tight">
          {L('Your Egyptian coach, right in your home', 'كوتشك المصري في بيتك')} 🇪🇬
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }} className="mx-auto mt-3 max-w-sm text-sm text-white/80">
          {L(
            'Workouts, Egyptian food tracking, challenges and a community that keeps you going — free, no card, no subscription.',
            'تمارين، حساب سعرات بالأكل المصري، تحديات، وناس بتشد بعضها — ببلاش، من غير فيزا ولا اشتراك.',
          )}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.16 }} className="mx-auto mt-6 max-w-xs">
          <CTAs big />
          <button
            onClick={() => { track('funnel-tour', utmMeta()); navigate('/onboarding'); }}
            className="mx-auto mt-3 block text-xs font-semibold text-white/70 underline"
          >
            {L('Take the 30-second tour', 'خد جولة في نص دقيقة')} →
          </button>
        </motion.div>

        {/* Hero screenshot — the CURRENT home, not a stale art shot. */}
        <motion.img
          src="/landing/shots/s-home.jpg"
          alt=""
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="mx-auto mt-8 w-56 rounded-[2rem] shadow-2xl ring-4 ring-white/15"
          loading="eager"
        />
      </div>

      {/* Stats band */}
      <motion.div {...reveal} className="mx-5 mt-10 grid grid-cols-3 gap-2 rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
        {[
          { n: 154, label: L('Egyptian foods', 'أكلة مصرية') },
          { n: 90, label: L('Healthy recipes', 'وصفة صحية'), plus: true },
          { n: 120, label: L('Arabic articles', 'مقال بالعربي'), plus: true },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-display text-2xl font-extrabold">
              <CountUp value={s.n} />
              {s.plus ? '+' : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-white/70">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Live prize challenge — real money on the landing page is the strongest
          conversion hook this app has. Public endpoint; renders nothing off-season. */}
      <PrizeSection L={L} go={go} />

      {/* Real, current screenshots — swipe through the app before signing up. */}
      <motion.div {...reveal} className="mt-10">
        <h2 className="px-5 text-center text-xl font-extrabold">{L('See it from inside', 'شوف التطبيق من جوه')}</h2>
        <p className="mt-1 px-5 text-center text-xs text-white/60">{L('Swipe — tap any screen to enlarge', 'اسحب — ودوس على أي شاشة تكبر')}</p>
        <ScreenshotRail className="mt-4" />
      </motion.div>

      {/* The magic grid: the features no other Arabic fitness app has, as
          colorful cards — bullets don't sell magic. */}
      <motion.div {...reveal} className="mt-12 px-5">
        <h2 className="text-center text-xl font-extrabold">{L('Things no other app does', 'حاجات مفيش تطبيق تاني بيعملها')}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {([
            { e: '🎤', g: 'from-orange-500 to-amber-600', ar: ['قول أكلت إيه', 'وإحنا نحسب السعرات'], en: ['Say what you ate', 'we count the calories'] },
            { e: '🥗', g: 'from-emerald-500 to-teal-600', ar: ['أخصائي تغذية AI', 'بيرد بأرقامك انت'], en: ['AI nutritionist', 'answers with YOUR numbers'] },
            { e: '📷', g: 'from-sky-500 to-blue-600', ar: ['امسح أي باركود', 'تقييم من ١٠ لهدفك'], en: ['Scan any barcode', 'scored 1-10 for your goal'] },
            { e: '🎯', g: 'from-pink-500 to-rose-600', ar: ['رحلة الدايت', 'هدف وشريط تقدم وتفكيرات'], en: ['Diet journey', 'target, progress, nudges'] },
            { e: '🤸', g: 'from-violet-500 to-purple-700', ar: ['شخصية بتتحرك', 'بتوريك التمرينة والعضلة'], en: ['Moving figure', 'shows the move & muscle'] },
            { e: '🔴', g: 'from-red-500 to-orange-600', ar: ['حصص لايف', 'فيديو متزامن مع الناس'], en: ['Live classes', 'synced video together'] },
            { e: '🏆', g: 'from-amber-500 to-yellow-600', ar: ['تحديات بجوايز', 'حقيقية بتتسلم فعلاً'], en: ['Prize challenges', 'real, actually delivered'] },
            { e: '⚔️', g: 'from-slate-600 to-slate-800', ar: ['تحدي ١ ضد ١', 'مع صاحبك على النقط'], en: ['1v1 duels', 'you vs your friend'] },
            { e: '📈', g: 'from-emerald-600 to-green-700', ar: ['رسم لكل تمرينة', 'وأقصى رقم متوقع e1RM'], en: ['A chart per exercise', 'plus your e1RM trend'] },
            { e: '📋', g: 'from-cyan-500 to-sky-700', ar: ['روتينات جاهزة', 'انسخ روتين صاحبك بضغطة'], en: ['Routines', "copy a friend's in one tap"] },
            { e: '🚶', g: 'from-lime-500 to-emerald-600', ar: ['«تعالى نمشي؟»', 'اعزم صاحبك على مشوار'], en: ['"Walk today?"', 'invite a buddy out'] },
            { e: '📺', g: 'from-indigo-500 to-blue-700', ar: ['شاشة الجيم', 'لوحة أبطال جيمك لايف'], en: ['Gym TV board', "your gym's champions live"] },
          ]).map((c, i) => (
            <motion.div
              key={c.e}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: (i % 4) * 0.05 }}
              className={`rounded-2xl bg-gradient-to-br ${c.g} p-3.5 shadow-lg`}
            >
              <span className="text-2xl" aria-hidden>{c.e}</span>
              <p className="mt-1.5 text-sm font-extrabold leading-snug">{isAr ? c.ar[0] : c.en[0]}</p>
              <p className="text-[11px] text-white/80">{isAr ? c.ar[1] : c.en[1]}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Feature sections — screenshot + copy, alternating sides */}
      <div className="mt-12 space-y-12 px-5">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          const [title, body] = isAr ? f.ar : f.en;
          return (
            <motion.section key={f.img} {...reveal} className={`flex items-center gap-4 ${i % 2 ? 'flex-row-reverse' : ''}`}>
              <img src={f.img} alt="" loading="lazy" className="w-36 shrink-0 rounded-2xl shadow-xl ring-2 ring-white/15" />
              <div className="min-w-0 flex-1">
                <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.tint} shadow-lg`}>
                  <Icon size={20} />
                </span>
                <h2 className="text-lg font-extrabold leading-snug">{title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{body}</p>
              </div>
            </motion.section>
          );
        })}
      </div>

      {/* The FULL inventory — every feature, grouped and bordered, so nobody
          leaves wondering "but does it have…?" */}
      <motion.h2 {...reveal} className="mt-14 px-5 text-center text-xl font-extrabold">
        {L('Everything inside — all of it free', 'كل اللي جوه — وكله ببلاش')}
      </motion.h2>
      <div className="mt-5 space-y-3 px-5">
        {[
          {
            icon: Dumbbell,
            tint: 'from-sky-500 to-blue-600',
            title: L('Training', 'التمرين'),
            items: [
              L('Muscle map — tap a muscle, get a session', 'خريطة عضلات — دوس على العضلة وخد جلسة'),
              L('Coach programs for every level, home & gym', 'برامج مدربين لكل مستوى — بيت وجيم'),
              L('Log every set — warmup, dropset, failure — and edit any set 🎉', 'سجّل كل مجموعة — تسخين ودروب سِت وفشل — وعدّل اللي غلطت فيه 🎉'),
              L('Rest timer set to YOUR seconds', 'تايمر راحة على مزاجك — انت اللي بتحدد ثواني الراحة'),
              L('A progress chart per exercise + e1RM & 1RM calculator', 'رسم لكل تمرينة + e1RM وحاسبة أقصى رقم'),
              L("Save any session as a routine — or copy someone else's", 'احفظ تمرينتك روتين — أو انسخ روتين حد تاني بضغطة'),
              L('Week Zero: a gentle 7-day start for beginners', 'الأسبوع صفر: بداية هادية ٧ أيام للمبتدئين'),
              L('Yoga & meditation classes', 'حصص يوجا وتأمل'),
            ],
          },
          {
            icon: UtensilsCrossed,
            tint: 'from-orange-500 to-amber-500',
            title: L('Food & calories', 'الأكل والسعرات'),
            items: [
              L('Say what you ate — voice logging in Arabic 🎤', 'قول أكلت إيه — تسجيل بالصوت بالعربي 🎤'),
              L('154 Egyptian foods with real calories', '١٥٤ أكلة مصرية بسعراتها الحقيقية'),
              L('Meal plans that explain every choice', 'خطط وجبات بتشرح كل اختيار'),
              L('Auto grocery list from your plan', 'قايمة مشتريات جاهزة من خطتك'),
              L('90+ healthy recipes with videos', '٩٠+ وصفة صحية بالفيديو'),
              L('Water tracking', 'عدّاد مياه'),
            ],
          },
          {
            icon: MessagesSquare,
            tint: 'from-emerald-500 to-teal-600',
            title: L('Community', 'المجتمع'),
            items: [
              L('Feed — post your progress, react, comment', 'منشورات — شارك تقدمك وتفاعل مع الناس'),
              L('Chat with buddies — text & voice notes 🎙', 'شات مع أصحابك — كتابة ورسائل صوتية 🎙'),
              L("Walk invites: 'walk today?' — accept and go 🚶", 'عزومة مشي: «تعالى نمشي النهارده؟» — يقبل وتنزلوا 🚶'),
              L('Share your goal with your buddies', 'شارك هدفك مع صحابك — اللي بيتقال بيتعمل'),
              L('1v1 duels: challenge a friend, winner takes XP', 'تحدي ١ ضد ١: اتحدى صاحبك والكسبان ياخد نقط'),
              L('Live group sessions with a shared timer', 'جروبات لايف بتايمر مشترك — تتمرنوا مع بعض'),
              L('Real coaches you can follow and rate', 'مدربين حقيقيين تتابعهم وتقيّمهم'),
              L('Reels — quick workout clips', 'ريلز — مقاطع تمارين سريعة'),
            ],
          },
          {
            icon: Sparkles,
            tint: 'from-violet-500 to-purple-600',
            title: L('Motivation', 'التحفيز'),
            items: [
              L('Challenges with badges (join with a code!)', 'تحديات ببادجات — ادخل بكود زي PULSE14'),
              L('Weekly XP league: promotion & relegation', 'دوري أسبوعي بالنقط — صعود وهبوط'),
              L('Walking challenges — log walks, climb the board', 'تحديات مشي — سجّل مشاويرك واطلع في الترتيب'),
              L('Streaks, daily quests & a spin wheel', 'سلسلة أيام، مهام يومية، وعجلة حظ'),
              L('Smart reminders at YOUR training hour', 'تذكيرات على معادك انت'),
              L('Hall of Fame for the week’s top movers', 'لوحة أبطال الأسبوع'),
              L('Progress charts & personal records', 'رسوم تقدمك وأرقامك القياسية'),
            ],
          },
        ].map((g) => {
          const GIcon = g.icon;
          return (
            <motion.div key={g.title} {...reveal} className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${g.tint} shadow-lg`}>
                  <GIcon size={18} />
                </span>
                <h3 className="text-base font-extrabold">{g.title}</h3>
              </div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-white/85">
                {g.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" /> <span>{it}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Coaches & gyms — the compact pitch. Full story lives at /why-partner. */}
      <motion.div {...reveal} className="mt-12 px-5">
        <h2 className="text-center text-xl font-extrabold">{L('For coaches & gyms', 'للمدربين والجيمات')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => go('/why-partner', 'funnel-partner-coach')}
            className="scene-tex rounded-2xl bg-gradient-to-br from-blue-500/90 to-indigo-700/80 p-4 text-start shadow-lg transition active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Dumbbell size={18} />
            </span>
            <p className="mt-2 text-sm font-extrabold leading-snug">{L('Coaches: bring your trainees', 'للمدربين: هات متدربينك')}</p>
            <p className="mt-0.5 text-[11px] text-white/80">{L('One link — they land already connected to you', 'لينك واحد يوصلهم بيك على طول')}</p>
          </button>
          <button
            onClick={() => go('/why-partner', 'funnel-partner-gym')}
            className="scene-tex rounded-2xl bg-gradient-to-br from-emerald-500/90 to-teal-700/80 p-4 text-start shadow-lg transition active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Trophy size={18} />
            </span>
            <p className="mt-2 text-sm font-extrabold leading-snug">{L("Gyms: your champions on screen", 'للجيمات: لوحة أبطال جيمك على الشاشة')}</p>
            <p className="mt-0.5 text-[11px] text-white/80">{L('Member code, leaderboard & a live TV board', 'كود أعضاء وترتيب وشاشة لايف')}</p>
          </button>
        </div>
      </motion.div>

      {/* Community + free promise — over the calm yoga scene */}
      <motion.div {...reveal} className="relative mx-5 mt-12 overflow-hidden rounded-3xl">
        <img src="/landing/scene-yoga.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative p-5 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 text-base font-extrabold">
          <Users size={18} /> {L('A community, not just an app', 'مجتمع، مش مجرد تطبيق')}
        </div>
        <ul className="mt-3 space-y-2 text-[13px] text-white/85">
          {[
            L('Live group sessions: Sat 7PM full-body · Tue 8PM HIIT · Thu 8PM yoga', 'حصص لايف: السبت ٧م جسم كامل · الثلاثاء ٨م حرق · الخميس ٨م يوجا'),
            L('Streaks, daily quests and a spin wheel that keep you coming back', 'سلسلة أيام، مهام يومية، وعجلة حظ بتخليك تحب ترجع'),
            L('Everything is free. No trial. No card. Really.', 'كل حاجة ببلاش. مفيش تجربة مجانية وخلاص — مفيش فلوس أصلاً.'),
          ].map((li) => (
            <li key={li} className="flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> <span>{li}</span>
            </li>
          ))}
        </ul>
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div {...reveal} className="mx-auto mt-12 max-w-xs px-5 pb-16 text-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}>
        <p className="mb-4 flex items-center justify-center gap-1.5 text-sm font-bold text-orange-300">
          <Flame size={16} /> {L('Day 1 starts when you decide.', 'اليوم الأول بيبدأ لما تقرر.')}
        </p>
        <CTAs big />
      </motion.div>
    </div>
  );
}

/** Live prize challenge on the landing page — renders nothing when no prize
 *  challenge is in its window. Public /api/home, so guests see it too. */
function PrizeSection({ L, go }: { L: (en: string, ar: string) => string; go: (to: string, event: string) => void }) {
  const { data } = useQuery({ queryKey: ['landing-home'], queryFn: () => api.get('/api/home'), staleTime: 5 * 60_000 });
  const prize = (data?.challenges ?? []).find((c: any) => c.prizeText);
  if (!prize) return null;
  return (
    <motion.div {...reveal} className="mx-5 mt-10 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-5 text-center shadow-xl">
      <p className="text-3xl" aria-hidden>🏆</p>
      <h2 className="mt-1 text-xl font-extrabold">{prize.title}</h2>
      <p className="mt-1 text-sm font-bold text-white/90">🎁 {prize.prizeText}</p>
      <p className="mt-1 text-xs text-white/80">{L('Running right now — join free and compete', 'شغال دلوقتي — اشترك ببلاش ونافس')}</p>
      <button
        onClick={() => go('/register', 'funnel-register-intent')}
        className="mx-auto mt-3 block rounded-full bg-white px-8 py-3 text-sm font-extrabold text-orange-600 shadow-lg"
      >
        {L('Join the challenge', 'ادخل التحدي')}
      </button>
    </motion.div>
  );
}
