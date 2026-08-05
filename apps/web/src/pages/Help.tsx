import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Clapperboard,
  ClipboardList,
  Download,
  Dumbbell,
  Flame,
  Gift,
  HeartHandshake,
  Mail,
  Megaphone,
  MessageSquare,
  Music,
  PhoneCall,
  Radio,
  Salad,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Target,
  TrendingUp,
  UsersRound,
  Globe2,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { openInstall } from '../lib/install';

/* ------------------------------------------------------------------ *
 * Partner contact details — CHANGE THESE IN ONE PLACE.
 * ------------------------------------------------------------------ */
const PARTNER_WHATSAPP = '201070799007'; // 010 7079 9007, in wa.me form (20 = Egypt)
const PARTNER_EMAIL = 'partners@geddo.online'; // TODO: replace with the real address

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

/* ------------------------------------------------------------------ *
 * Bilingual copy lives here on purpose: these benefit bullets are not in
 * the locale files (and the locale files are owned elsewhere), so each
 * item carries both languages and we pick by the active i18n language.
 * ------------------------------------------------------------------ */
type Benefit = { en: string; ar: string; icon: LucideIcon };

const USER_BENEFITS: Benefit[] = [
  { icon: Dumbbell, en: '85 exercises with animated form guides', ar: '٨٥ تمرين بالحركة والشرح خطوة بخطوة' },
  { icon: ScanLine, en: 'Interactive muscle map — tap a muscle, get its exercises', ar: 'خريطة عضلات تفاعلية — دوس على العضلة تجيبلك تمارينها' },
  { icon: CalendarDays, en: 'Your weekly schedule + one-tap start', ar: 'جدولك الأسبوعي + زرار واحد يبدأ تمرين النهارده' },
  { icon: Salad, en: 'A daily meal plan that explains itself — every plate says why, and you can swap any meal', ar: 'خطة أكل يومية بتشرح نفسها — كل طبق معاه السبب، وتقدر تبدّل أي وجبة' },
  { icon: Salad, en: 'Egyptian food database — log فول وطعمية by name, in Arabic', ar: 'قاعدة أكل مصري — سجّل فول وطعمية بالاسم وبالعربي' },
  { icon: Sparkles, en: 'Snap your plate and the app estimates the calories', ar: 'صوّر طبقك والتطبيق يقدّر السعرات' },
  { icon: Flame, en: 'Calorie & weight tracking with your own goals', ar: 'متابعة السعرات والوزن بأهدافك الشخصية' },
  { icon: Flame, en: 'Water tracking with a daily goal', ar: 'متابعة المية بهدف يومي' },
  { icon: TrendingUp, en: 'Body measurements + private progress photos only you can see', ar: 'قياسات جسمك + صور تقدم خاصة محدش يشوفها غيرك' },
  { icon: Trophy, en: 'Weekly leagues — top five promote every Saturday', ar: 'دوري أسبوعي — أول ٥ بيصعدوا كل سبت' },
  { icon: Mail, en: 'A weekly recap of your workouts, PRs and streak', ar: 'ملخص أسبوعي بتمارينك وأرقامك وسلسلتك' },
  { icon: Trophy, en: 'Personal records — watch your numbers climb', ar: 'أرقامك القياسية — شوفها بتكبر' },
  { icon: Zap, en: "Streaks with a freeze — one missed day won't reset you", ar: 'سلسلة أيام مع فريز — يوم فايت مش هيصفّرك' },
  { icon: Target, en: 'Personal challenges — set your own goal and chase it', ar: 'تحديات شخصية — حدد هدفك واجري وراه' },
  { icon: Swords, en: '1 vs 1 duels — challenge a friend, winner takes the XP', ar: 'تحديات واحد ضد واحد — اتحدى صاحبك واللي يكسب ياخد النقط' },
  { icon: UsersRound, en: 'Group challenges — invite friends with a code and compete', ar: 'تحديات جماعية — اعزم أصحابك بكود واتنافسوا' },
  { icon: Globe2, en: 'Open challenges & monthly seasons for everyone', ar: 'تحديات مفتوحة ومواسم شهرية للكل' },
  { icon: Users, en: 'Live group training with a shared timer', ar: 'تمرين جماعي لايف بتايمر مشترك' },
  { icon: Ticket, en: 'Exclusive deals and coupons from our partners', ar: 'عروض وكوبونات حصرية من شركائنا' },
  { icon: CalendarDays, en: 'Events board — classes, runs and workshops near you', ar: 'لوحة فعاليات — حصص وجري وورش قريبة منك' },
  { icon: Gift, en: 'A free daily spin and daily quests worth real XP', ar: 'لفة مجانية كل يوم ومهام يومية بنقط حقيقية' },
  { icon: ClipboardList, en: 'A plan built from your answers — level, program, training days, and why', ar: 'خطة معمولة من إجاباتك — مستوى وبرنامج وأيام تمرين، وليه كده' },
  { icon: Target, en: 'It works around injuries instead of ignoring them', ar: 'بتلف حوالين الإصابات مش بتتجاهلها' },
  { icon: TrendingUp, en: 'Your program remembers where you stopped — "Day 3 of 6, continue"', ar: 'برنامجك فاكر وقفت فين — "اليوم ٣ من ٦، كمّل"' },
  { icon: CalendarDays, en: 'Re-checks your plan every four weeks so it keeps up with you', ar: 'بتراجع خطتك كل أربع أسابيع عشان تفضل ماشية معاك' },
  { icon: MessageSquare, en: 'Tell the team anything — ideas, problems, questions', ar: 'كلّم الفريق في أي حاجة — أفكار أو مشاكل أو أسئلة' },
  { icon: Clapperboard, en: 'Curated workout & yoga reels', ar: 'ريلز تمرين ويوجا مختارة بعناية' },
  { icon: Salad, en: '72 healthy recipes with calories', ar: '٧٢ وصفة صحية بالسعرات' },
  { icon: BookOpen, en: '120 health articles in Arabic', ar: '١٢٠ مقال صحي بالعربي' },
  { icon: Music, en: 'Play your own music during workouts', ar: 'شغّل مزيكتك وانت بتتمرن' },
];

/* ------------------------------------------------------------------ *
 * What makes PULSE different. Each row is a contrast, not a feature —
 * the "most apps" line is the whole point, because a benefit only reads
 * as a differentiator next to the thing it replaces. Ordered strongest
 * first; keep it at five, it stops being memorable at six.
 * See MARKET-RESEARCH.md for what each claim is checked against.
 * ------------------------------------------------------------------ */
type Contrast = { themEn: string; themAr: string; usEn: string; usAr: string };

const DIFFERENCE: Contrast[] = [
  {
    themEn: 'Most apps ask what your goal is.',
    themAr: 'معظم التطبيقات بتسألك هدفك إيه.',
    usEn: 'PULSE asks what hurts — then builds around it instead of ignoring it.',
    usAr: 'PULSE بيسألك بيوجعك إيه — وبيبني الخطة حواليه بدل ما يتجاهله.',
  },
  {
    themEn: 'Most apps hand you a plan and stay quiet.',
    themAr: 'معظم التطبيقات بتديك خطة وتسكت.',
    usEn: 'Yours comes with the reason attached — your level, your days, and why.',
    usAr: 'خطتك بتيجي ومعاها السبب — مستواك وأيامك، وليه كده بالظبط.',
  },
  {
    themEn: '"Free" usually means three workouts, then pay.',
    themAr: '«مجاني» غالباً معناها ٣ تمارين وبعدين ادفع.',
    usEn: 'Everything here is free. All of it. There is no paid version.',
    usAr: 'كل حاجة هنا مجانية. كلها. مفيش نسخة مدفوعة أصلاً.',
  },
  {
    themEn: 'Arabic apps are usually translated, in stiff فصحى.',
    themAr: 'التطبيقات العربية غالباً مترجمة، وبفصحى تقيلة.',
    usEn: 'Every word here was written in Egyptian, by hand. Nothing is machine-translated.',
    usAr: 'كل كلمة هنا اتكتبت بالمصري بإيد. مفيش أي حاجة مترجمة بالآلة.',
  },
  {
    themEn: 'Most plans stay the same while your body changes.',
    themAr: 'معظم الخطط بتفضل زي ما هي وانت بتتغير.',
    usEn: 'Every four weeks PULSE checks whether it worked, and adjusts — deload, ease off, or push.',
    usAr: 'كل ٤ أسابيع PULSE بيشوف الخطة نفعت ولا لأ، ويظبطها — يخفف أو يريّحك أو يزوّد.',
  },
];

const COACH_BENEFITS: Benefit[] = [
  { icon: UserPlus, en: 'Free coach profile with specialties and photo', ar: 'بروفايل مدرب مجاني بتخصصاتك وصورتك' },
  { icon: Dumbbell, en: 'Publish workouts and multi-day programs', ar: 'انشر تمارينك وبرامجك متعددة الأيام' },
  { icon: Users, en: 'Receive coaching requests and manage clients', ar: 'استقبل طلبات تدريب وادير عملاءك' },
  { icon: Star, en: 'Client ratings build your reputation', ar: 'تقييمات عملاءك تبني سمعتك' },
  { icon: BadgeCheck, en: 'Verification badge and featured placement', ar: 'توثيق وظهور مميز في دليل المدربين' },
  { icon: Radio, en: 'Host live group sessions', ar: 'قدّم حصص جماعية لايف' },
  { icon: MessageSquare, en: 'Message your clients directly', ar: 'كلّم عملاءك مباشرة' },
  { icon: HeartHandshake, en: 'Zero commission — the client relationship is yours', ar: 'بدون عمولة — علاقتك بعميلك ملكك' },
];

const SPONSOR_BENEFITS: Benefit[] = [
  { icon: Megaphone, en: 'Home banner, native feed ad and onboarding placements', ar: 'بانر رئيسي وإعلان داخل الفيد وشاشات البداية' },
  { icon: Trophy, en: 'Sponsor a challenge seen by every user', ar: 'ارعَ تحدي يشوفه كل المستخدمين' },
  { icon: Zap, en: 'Impressions and clicks measured for every placement', ar: 'ظهور ونقرات مقاسة لكل مكان' },
  { icon: CalendarDays, en: 'List your event — sponsored and featured slots available', ar: 'اعرض فعاليتك — فيه أماكن برعاية ومميزة' },
  { icon: PhoneCall, en: 'Lead forms: we hand you the name and number, you close it', ar: 'استمارات طلبات: بنديك الاسم والرقم وانت تقفل الصفقة' },
];

const STORE_BENEFITS: Benefit[] = [
  { icon: ShoppingBag, en: 'List your products in the PULSE store', ar: 'اعرض منتجاتك في متجر PULSE' },
  { icon: MessageSquare, en: 'Customers contact you directly on WhatsApp or phone', ar: 'العملاء بيكلموك مباشرة على واتساب أو تليفون' },
  { icon: HeartHandshake, en: 'No commission — PULSE never handles the sale', ar: 'بدون عمولة — PULSE مش بيتدخل في البيع' },
  { icon: Ticket, en: 'Run a coupon and see exactly how many people revealed it', ar: 'اعمل كوبون وشوف بالظبط كام واحد فتحه' },
];

const GYM_BENEFITS: Benefit[] = [
  { icon: BadgeCheck, en: 'Your trainers get verified profiles and reach', ar: 'مدربينك ياخدوا بروفايلات موثقة ووصول' },
  { icon: Swords, en: 'A challenge branded to your gym', ar: 'تحدي باسم الجيم بتاعك' },
  { icon: Building2, en: 'A free retention tool for your members', ar: 'أداة مجانية تخلي أعضاءك مستمرين' },
  { icon: PhoneCall, en: 'A "book a free trial" form on your profile — leads straight to your phone', ar: 'استمارة "احجز يوم تجربة" على بروفايلك — الطلبات توصل تليفونك على طول' },
  { icon: CalendarDays, en: 'Put your classes on the events board and fill empty slots', ar: 'حط حصصك في لوحة الفعاليات واملا الأماكن الفاضية' },
];

/** The daily loop, in the order a real user lives it. Steps are deliberately
 *  small — the point is to show the app takes minutes, not hours. */
type Step = { icon: LucideIcon; en: string; ar: string; enBody: string; arBody: string; to?: string; action?: 'install' };

const HOW_TO: Step[] = [
  {
    icon: ClipboardList, to: '/my-plan',
    en: 'Answer nine questions once',
    ar: 'جاوب تسع أسئلة مرة واحدة',
    enBody: 'Your goal, experience, days, time, equipment and anything that hurts. You get a level, a program, your training days, and the reason behind each choice.',
    arBody: 'هدفك وخبرتك وأيامك ووقتك وأدواتك وأي حاجة بتوجعك. هتطلع بمستوى وبرنامج وأيام تمرين، وسبب كل اختيار.',
  },
  {
    icon: CalendarDays, to: '/schedule',
    en: 'Your week is filled in for you',
    ar: 'أسبوعك بيتظبط لوحده',
    enBody: 'The plan writes your weekly split and spaces the sessions out. Change any day you like — it is yours to edit.',
    arBody: 'الخطة بتكتب جدولك وبتوزع التمرينات على الأسبوع. غيّر أي يوم يعجبك — الجدول بتاعك.',
  },
  {
    icon: Zap, to: '/',
    en: 'Open Home and hit Start',
    ar: 'افتح الرئيسية ودوس ابدأ',
    enBody: "One tap starts today's session. Not sure what to do? Use Surprise me and the app picks for you.",
    arBody: 'دوسة واحدة بتبدأ تمرينة النهاردة. مش عارف تعمل إيه؟ دوس "فاجئني" والتطبيق يختارلك.',
  },
  {
    icon: Dumbbell, to: '/workout',
    en: 'Train with the timer and the voice',
    ar: 'اتمرن مع التايمر والصوت',
    enBody: 'Rest counts down for you, your music keeps playing, and the coach voice calls out what is next.',
    arBody: 'الراحة بتتعد لوحدها، ومزيكتك شغالة، والمدرب الصوتي بينادي على اللي جاي.',
  },
  {
    icon: Salad, to: '/meals',
    en: 'Eat from your plate, not a spreadsheet',
    ar: 'كل من طبقك مش من جدول',
    enBody: "The meal plan fills your day with real food that fits your numbers — every meal says why it's there. Swap what you don't like, log with one tap, or snap a photo and let the app count it.",
    arBody: 'خطة الأكل بتملى يومك بأكل حقيقي على قد أرقامك — كل وجبة معاها سببها. بدّل اللي مش عاجبك، سجّل بدوسة، أو صوّر طبقك وسيب التطبيق يحسب.',
  },
  {
    icon: Target, to: '/',
    en: 'Finish your three daily quests',
    ar: 'خلّص المهام التلاتة',
    enBody: 'They change every day and none of them takes long — drink water, log a meal, log a set. Finish all three for a bonus.',
    arBody: 'بتتغير كل يوم ومحدش فيهم بياخد وقت — اشرب مية، سجّل وجبة، سجّل مجموعة. خلّص التلاتة وخد بونص.',
  },
  {
    icon: Gift, to: '/',
    en: 'Take your free spin',
    ar: 'خد لفتك المجانية',
    enBody: 'One spin a day. XP, or a streak freeze that saves you the next time life gets in the way.',
    arBody: 'لفة واحدة في اليوم. نقط، أو فريز بينقذ سلسلتك أول ما الدنيا تلخبط.',
  },
  {
    icon: Trophy, to: '/leagues',
    en: 'Climb the weekly league',
    ar: 'اطلع في الدوري الأسبوعي',
    enBody: 'Every XP you earn ranks you against about twenty people. Top five promote every Saturday. Bottom five drop.',
    arBody: 'كل نقطة بتكسبها بترتبك مع حوالي ٢٠ واحد. أول ٥ بيصعدوا كل سبت، وآخر ٥ بينزلوا.',
  },
  {
    icon: Swords, to: '/achievements',
    en: 'Join a challenge and pull a friend in',
    ar: 'ادخل تحدي واسحب صاحبك معاك',
    enBody: 'Start with a 7-day sprint. Then duel a friend one-on-one, or open a group challenge with an invite code.',
    arBody: 'ابدأ بتحدي أسبوع. وبعدين اتحدى صاحبك واحد لواحد، أو اعمل تحدي جماعي بكود دعوة.',
  },
  {
    icon: TrendingUp, to: '/progress',
    en: 'Check Progress once a week',
    ar: 'بص على التقدم مرة في الأسبوع',
    enBody: 'Your streak calendar, weight, measurements and personal records — all in one place. This is the part that keeps you honest.',
    arBody: 'تقويم السلسلة والوزن والقياسات وأرقامك القياسية في مكان واحد. الجزء ده هو اللي بيخليك صادق مع نفسك.',
  },
  {
    icon: Download, action: 'install',
    en: 'Put it on your home screen',
    ar: 'حطه على شاشتك الرئيسية',
    enBody: 'One tap makes PULSE a real app — full screen, faster, with reminders. Smaller than a single photo, no app store needed.',
    arBody: 'دوسة واحدة تخلي PULSE تطبيق حقيقي — شاشة كاملة وأسرع وبتنبيهات. أصغر من صورة واحدة ومن غير ستور.',
  },
];

type Tone = 'orange' | 'blue' | 'green' | 'teal';

const TONE_TILE: Record<Tone, string> = {
  orange: 'bg-pink-100 text-brand-pink',
  blue: 'bg-blue-50 text-brand-blue',
  green: 'bg-green-50 text-brand-green',
  teal: 'bg-teal-50 text-brand-teal',
};

type TabId = 'you' | 'howto' | 'coaches' | 'partners';

export default function Help() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('you');

  const isAr = i18n.language.startsWith('ar');
  const pick = (b: Benefit) => (isAr ? b.ar : b.en);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'you', label: t('help.forYou') },
    { id: 'howto', label: t('help.howTo') },
    { id: 'coaches', label: t('help.forCoaches') },
    { id: 'partners', label: t('help.forPartners') },
  ];

  const waText = encodeURIComponent(
    isAr
      ? 'أهلاً PULSE 👋 عايز أعرف تفاصيل الشراكة والرعاية.'
      : "Hi PULSE 👋 I'd like to know more about partnering with you.",
  );
  const waHref = `https://wa.me/${PARTNER_WHATSAPP}?text=${waText}`;
  const mailHref = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent('PULSE partnership')}`;

  return (
    <div className="relative min-h-screen pb-16">
      <AmbientBg tone="cool" />
      <TopBar title={t('help.title')} color="fitness-hero" textColor="text-white" />

      <p className="px-5 pb-1 text-center text-[15px] leading-relaxed text-gray-600">{t('help.intro')}</p>

      {/* Segmented control */}
      <div className="px-4 pb-3 pt-3">
        <div className="glass flex gap-1 rounded-full border border-gray-200 bg-white/80 p-1 shadow-sm backdrop-blur">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setTab(item.id)}
                whileTap={{ scale: 0.96 }}
                transition={tapSpring}
                aria-pressed={active}
                className={`relative min-h-10 flex-1 rounded-full px-2 py-2 text-[13px] font-bold transition ${
                  active ? 'text-white' : 'text-gray-500'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="help-tab-pill"
                    className="fitness-hero absolute inset-0 rounded-full shadow-sm"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 px-4">
        {tab === 'you' && (
          <>
            <WhyDifferent isAr={isAr} />
            <SectionHead title={t('help.userTitle')} chips={[t('help.free'), t('help.noFees')]} />
            <CardList items={USER_BENEFITS} pick={pick} tone="orange" />
          </>
        )}

        {tab === 'howto' && (
          <>
            <SectionHead title={t('help.howToTitle')} chips={[t('help.howToChip')]} />
            <ol className="space-y-2.5">
              {HOW_TO.map((step, i) => (
                <motion.li
                  key={step.en}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(i, 6) * 0.04 }}
                >
                  <button
                    onClick={() => (step.action === 'install' ? openInstall() : step.to && navigate(step.to))}
                    className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-start shadow-sm transition active:scale-[0.98]"
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-brand-pink">
                      <step.icon size={18} />
                      <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-pink text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{isAr ? step.ar : step.en}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                        {isAr ? step.arBody : step.enBody}
                      </span>
                    </span>
                    {step.to && <ArrowRight size={15} className="mt-1 shrink-0 text-gray-300 rtl:rotate-180" />}
                  </button>
                </motion.li>
              ))}
            </ol>
            <p className="px-1 pt-1 text-center text-xs leading-relaxed text-gray-400">{t('help.howToFooter')}</p>
          </>
        )}

        {tab === 'coaches' && (
          <>
            <SectionHead title={t('help.coachTitle')} chips={[t('help.noFees')]} />
            <CardList items={COACH_BENEFITS} pick={pick} tone="blue" />
            <motion.button
              whileTap={{ scale: 0.98 }}
              transition={tapSpring}
              onClick={() => navigate('/coach-profile')}
              className="btn-pill btn-primary mt-2 w-full"
            >
              <UserPlus size={18} />
              {isAr ? 'ابقى مدرب على PULSE' : 'Become a coach'}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </motion.button>
          </>
        )}

        {tab === 'partners' && (
          <>
            <GroupHead icon={Megaphone} title={t('help.sponsorTitle')} tone="orange" />
            <CardList items={SPONSOR_BENEFITS} pick={pick} tone="orange" />

            <GroupHead icon={ShoppingBag} title={t('help.storeTitle')} tone="teal" />
            <CardList items={STORE_BENEFITS} pick={pick} tone="teal" />

            <GroupHead icon={Building2} title={t('help.gymTitle')} tone="green" />
            <CardList items={GYM_BENEFITS} pick={pick} tone="green" />

            {/* Prominent partner CTA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="fitness-hero relative mt-4 overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            >
              <Sparkles size={92} className="absolute -end-4 -top-4 opacity-15" aria-hidden />
              <p className="relative text-lg font-extrabold">{t('help.partnerCta')}</p>
              <p className="relative mt-1 text-sm text-white/85">{t('help.partnerCtaSub')}</p>
              <div className="relative mt-4 flex flex-col gap-2">
                <motion.a
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpring}
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill min-h-[46px] w-full bg-white py-2.5 text-[15px] font-bold text-ink"
                >
                  <MessageSquare size={17} /> {t('help.contactUs')}
                </motion.a>
                <motion.a
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpring}
                  href={mailHref}
                  className="btn-pill min-h-[46px] w-full border border-white/40 bg-white/10 py-2.5 text-[15px] font-semibold text-white"
                >
                  <Mail size={17} /> {PARTNER_EMAIL}
                </motion.a>
              </div>
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              transition={tapSpring}
              onClick={() => navigate('/store')}
              className="flex w-full items-center justify-center gap-2 py-3 text-sm font-bold text-brand-pink"
            >
              <ShoppingBag size={16} />
              {isAr ? 'شوف المتجر' : 'See the store'}
              <ArrowRight size={15} className="rtl:rotate-180" />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

/** The identity block. Deliberately the first thing on the page: the feature
 *  list below only means something once you know what it is different from. */
function WhyDifferent({ isAr }: { isAr: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      className="overflow-hidden rounded-3xl bg-ink text-white shadow-lg"
    >
      <div className="fitness-hero px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
          {isAr ? 'ليه PULSE' : 'Why PULSE'}
        </p>
        <h2 className="mt-1 text-[19px] font-extrabold leading-snug">
          {isAr ? 'مش تطبيق لياقة تاني' : 'Not another fitness app'}
        </h2>
      </div>

      <ul className="divide-y divide-white/10">
        {DIFFERENCE.map((row) => (
          <li key={row.usEn} className="px-5 py-3.5">
            <p className="text-[12px] leading-relaxed text-white/45 line-through decoration-white/25">
              {isAr ? row.themAr : row.themEn}
            </p>
            <p className="mt-1 text-[14px] font-bold leading-relaxed">{isAr ? row.usAr : row.usEn}</p>
          </li>
        ))}
      </ul>

      <p className="border-t border-white/10 px-5 py-3.5 text-[12px] leading-relaxed text-white/60">
        {isAr
          ? 'من غير ستور ومن غير تحميل — دوس «إضافة للشاشة الرئيسية» وهيبقى تطبيق عندك، أصغر من صورة واحدة.'
          : 'No app store, no download — tap "Add to Home Screen" and it becomes an app, smaller than a single photo.'}
      </p>
    </motion.section>
  );
}

function SectionHead({ title, chips }: { title: string; chips: string[] }) {
  return (
    <div className="pb-1 pt-1">
      <h2 className="text-start text-xl font-extrabold leading-snug">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-brand-green"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function GroupHead({ icon: Icon, title, tone }: { icon: LucideIcon; title: string; tone: Tone }) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-4 first:pt-1">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONE_TILE[tone]}`}>
        <Icon size={17} />
      </span>
      <h2 className="text-start text-base font-extrabold leading-tight">{title}</h2>
    </div>
  );
}

function CardList({
  items,
  pick,
  tone,
}: {
  items: Benefit[];
  pick: (b: Benefit) => string;
  tone: Tone;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const Icon = item.icon;
        const text = pick(item);
        const [title, ...rest] = text.split(' — ');
        return (
          <motion.div
            key={`${item.en}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: Math.min(i, 6) * 0.045, type: 'spring', stiffness: 280, damping: 26 }}
            className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-sm"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_TILE[tone]}`}>
              <Icon size={20} />
            </span>
            <div className="min-w-0 flex-1 text-start">
              <p className="text-[15px] font-bold leading-snug">{title}</p>
              {rest.length > 0 && (
                <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{rest.join(' — ')}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
