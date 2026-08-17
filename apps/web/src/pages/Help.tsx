import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  ChefHat,
  Clapperboard,
  ClipboardList,
  ScanBarcode,
  Download,
  Dumbbell,
  Flame,
  Footprints,
  Gift,
  HeartHandshake,
  Mail,
  Megaphone,
  MessageSquare,
  Music,
  PhoneCall,
  QrCode,
  Radio,
  Salad,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Tv,
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
import ScreenshotRail from '../components/ScreenshotRail';
import AmbientBg from '../components/AmbientBg';
import { openInstall } from '../lib/install';
import { useAuth } from '../store/auth';

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
  { icon: Bot, en: 'AI Coach — ask anything about training & food, answers from our own library', ar: 'كوتش AI — اسأل أي حاجة في التمرين والأكل، والإجابة من مكتبتنا' },
  { icon: ScanBarcode, en: 'Scan any supermarket barcode — macros + a 1-10 score for YOUR goal', ar: 'امسح باركود أي منتج — القيم الغذائية + تقييم من ١٠ على حسب هدفك' },
  { icon: ChefHat, en: 'Build your own recipes — macros calculated per serving, log with one tap', ar: 'اعمل وصفاتك بنفسك — السعرات محسوبة للحصة، وسجّلها بضغطة' },
  { icon: Trophy, en: 'A fresh weekly challenge every Saturday — podium winners announced to everyone', ar: 'تحدي جديد كل سبت — والفايزين بيتعلنوا قدام الكل' },
  { icon: Sparkles, en: 'Cheer your buddies with 👏 — they get a named notification instantly', ar: 'شجّع صحابك بـ👏 — بيوصلهم إشعار باسمك في ثانيتها' },
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
    icon: Bot, to: '/coach-chat',
    en: 'Ask the AI Coach anything',
    ar: 'اسأل كوتش الـAI أي حاجة',
    enBody: 'Training, food, plateaus, soreness — short practical answers from PULSE\'s own library, in Egyptian Arabic.',
    arBody: 'تمرين، أكل، ثبات وزن، شد عضلي — إجابات قصيرة وعملية من مكتبة PULSE نفسها وبالمصري.',
  },
  {
    icon: ScanBarcode, to: '/tracker',
    en: 'Scan what you buy',
    ar: 'امسح اللي بتشتريه',
    enBody: 'In the calorie tracker, scan any supermarket barcode: full macros plus a 1-10 score for your goal before you eat it.',
    arBody: 'من متتبع السعرات، امسح باركود أي منتج: القيم الغذائية كاملة + تقييم من ١٠ على حسب هدفك قبل ما تاكله.',
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

/* ------------------------------------------------------------------ *
 * "What just shipped" how-tos. Same Step shape as HOW_TO but grouped by
 * audience: training upgrades, buddies, coaches, gyms. Not numbered — these
 * are features to discover, not a sequence to follow.
 * ------------------------------------------------------------------ */
const NEW_TRAINING: Step[] = [
  {
    icon: Dumbbell, to: '/workout',
    en: 'Log sets one by one',
    ar: 'سجّل مجموعاتك واحدة واحدة',
    enBody: 'Inside a session every set logs on its own — weight and reps. Flag a set as warmup, dropset or to-failure, and tap any logged set to edit it if you slipped.',
    arBody: 'جوه التمرينة كل مجموعة بتتسجل لوحدها — الوزن والعدات. علّم المجموعة تسخين أو دروب سِت أو لحد الفشل، ولو غلطت دوس على أي مجموعة اتسجلت وعدّلها عادي.',
  },
  {
    icon: Timer, to: '/workout',
    en: 'Set your own rest time',
    ar: 'ظبط وقت الراحة على مزاجك',
    enBody: 'The rest timer counts down between sets. Change the seconds once and it sticks — 30, 60, 90, whatever fits your training.',
    arBody: 'تايمر الراحة بيعد لوحده بين المجموعات. غيّر الثواني مرة واحدة وهتفضل زي ما انت عايز — ٣٠ أو ٦٠ أو ٩٠ على حسب تمرينك.',
  },
  {
    icon: TrendingUp, to: '/progress',
    en: 'Read your exercise chart — and what e1RM means',
    ar: 'اقرا رسم التمرينة — ويعني إيه e1RM',
    enBody: 'Every exercise gets a chart of your weights over time. e1RM is the heaviest single rep you could probably lift, estimated from your weight × reps. There is a 1RM calculator too if you want to play with the numbers.',
    arBody: 'كل تمرينة ليها رسم بيوريك أوزانك بتكبر إزاي. الـe1RM هو أتقل وزن متوقع ترفعه مرة واحدة — محسوب من وزنك وعداتك. وفيه حاسبة 1RM لو حابب تلعب بالأرقام.',
  },
  {
    icon: ClipboardList, to: '/routines',
    en: 'Save, copy and run routines',
    ar: 'احفظ وانسخ وشغّل روتينات',
    enBody: 'Finished a good session? Save it as a routine and start it any day with one tap. See a routine you like on someone else? Copy it — it becomes yours instantly.',
    arBody: 'خلصت تمرينة حلوة؟ احفظها روتين وشغّلها أي يوم بضغطة. عجبك روتين حد تاني؟ انسخه — هيبقى عندك في ثانيتها.',
  },
];

const NEW_BUDDIES: Step[] = [
  {
    icon: Footprints, to: '/buddies',
    en: 'Invite a buddy to walk',
    ar: 'اعزم صاحبك على مشوار',
    enBody: "From your buddies page send a walk (or workout) invite — «تعالى نمشي النهارده؟». They accept or decline, and if they accept you've got a plan.",
    arBody: 'من صفحة صحابك ابعت عزومة مشي أو تمرين — «تعالى نمشي النهارده؟». صاحبك يقبل أو يعتذر، ولو قبل يبقى اتفقتوا خلاص.',
  },
  {
    icon: Target, to: '/buddies',
    en: 'Share your goal',
    ar: 'شارك هدفك',
    enBody: 'Write your goal and share it with your buddies. A goal people know about is a goal you keep.',
    arBody: 'اكتب هدفك وشاركه مع صحابك. الهدف اللي الناس عارفاه صعب تسيبه.',
  },
  {
    icon: Trophy, to: '/achievements',
    en: 'Walking challenges',
    ar: 'تحديات المشي',
    enBody: 'Join a walking challenge and log your walks — every walk counts on the leaderboard.',
    arBody: 'ادخل تحدي مشي وسجّل مشاويرك — كل مشوار بيتحسب في الترتيب.',
  },
];

const COACH_STEPS: Step[] = [
  {
    icon: QrCode, to: '/coach-dashboard',
    en: 'Your invite link & QR',
    ar: 'لينك دعوتك والـQR',
    enBody: 'Copy your invite link or print the QR from the coach dashboard. Anyone who opens it signs up already connected to you — no requests, no waiting.',
    arBody: 'انسخ لينك دعوتك أو اطبع الـQR من لوحة المدرب. أي متدرب يفتحه بيتسجل وهو متوصل بيك على طول — من غير طلبات ولا استنى.',
  },
  {
    icon: TrendingUp, to: '/coach-dashboard',
    en: 'Client progress dashboard',
    ar: 'لوحة تقدم عملاءك',
    enBody: "One screen shows every client's progress. Anyone who's gone quiet gets a gentle flag — so you check on them before they disappear.",
    arBody: 'شاشة واحدة بتوريك تقدم كل عميل. واللي اختفى بقاله مدة بيظهر عليه علامة هادية — عشان تسأل عليه قبل ما يسيب خالص.',
  },
  {
    icon: Megaphone, to: '/coach-dashboard',
    en: 'Broadcast to all your clients',
    ar: 'رسالة لكل عملاءك مرة واحدة',
    enBody: 'Write one message and it reaches every client — schedule changes, motivation, announcements.',
    arBody: 'اكتب رسالة واحدة توصل لكل عملاءك — تغيير معاد أو تحفيز أو إعلان.',
  },
  {
    icon: ClipboardList, to: '/coach-dashboard',
    en: 'Assign programs — public or clients-only',
    ar: 'عيّن برامج — عامة أو لعملاءك بس',
    enBody: 'Build a program, set it to clients-only if you want it private, and assign it to any client with one tap — it shows up on their side immediately.',
    arBody: 'اعمل برنامج، وخليه «للعملاء بس» لو عايزه خاص، وعيّنه لأي عميل بضغطة — هيلاقيه عنده في ثانيتها.',
  },
];

const GYM_STEPS: Step[] = [
  {
    icon: Ticket, to: '/gyms',
    en: 'Your gym invite code',
    ar: 'كود جيمك',
    enBody: 'Every gym gets an invite code. Members enter it once and they count for your gym from then on.',
    arBody: 'كل جيم ليه كود دعوة. أعضاءك يدخلوه مرة واحدة ويبقوا محسوبين على جيمك من ساعتها.',
  },
  {
    icon: Tv, to: '/gyms',
    en: 'The TV champions board',
    ar: 'شاشة أبطال الجيم',
    enBody: "Open your gym's /tv link on any screen at the front desk — a live champions board that refreshes itself in front of your members.",
    arBody: 'افتح لينك الـ/tv بتاع جيمك على أي شاشة عند الاستقبال — لوحة أبطال لايف بتتحدث لوحدها قدام أعضاءك.',
  },
  {
    icon: TrendingUp, to: '/gyms',
    en: 'Member leaderboard & owner analytics',
    ar: 'ترتيب الأعضاء وأرقام صاحب الجيم',
    enBody: "A leaderboard just for your gym's members, plus analytics for the owner — who shows up, who's fading, and how active the gym really is.",
    arBody: 'لوحة ترتيب لأعضاء جيمك بس، وإحصائيات لصاحب الجيم — مين بييجي ومين بيكسل والجيم نشيط قد إيه فعلاً.',
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
  const rawNavigate = useNavigate();
  const guest = useAuth((s) => s.status !== 'authed');
  // Guests may READ everything here, but every deep link targets an auth-only
  // screen — bouncing them to a login wall unexplained converted nobody.
  // Route them to /register instead: the page just sold them the feature.
  const navigate = (to: string) => rawNavigate(guest ? '/register' : to);
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
                    /* Solid explicit gradient (no ::before/blur tricks): active must
                       ALWAYS render orange with white text on every GPU/theme. */
                    className="absolute inset-0 rounded-full shadow-sm"
                    style={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}
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
            <CardList items={USER_BENEFITS} pick={pick} tone="orange" compact />
          </>
        )}

        {tab === 'howto' && (
          <>
            <button
              onClick={() => navigate('/features')}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 text-start text-white shadow-sm transition active:scale-[0.98]"
            >
              <span className="text-xl" aria-hidden>💎</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{t('feat.homeCta')}</span>
                <span className="block truncate text-[11px] text-white/75">{t('feat.homeCtaSub')}</span>
              </span>
            </button>
            {/* Screens beat sentences — the walkthrough rail above the steps. */}
            <div className="-mx-4 mb-3">
              <ScreenshotRail />
            </div>
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
            <SectionHead title={isAr ? 'جديد في التمرين' : 'New in training'} chips={[isAr ? 'وصل حالاً' : 'Just shipped']} />
            <StepCards steps={NEW_TRAINING} isAr={isAr} onGo={navigate} />

            <SectionHead title={isAr ? 'انت وصحابك' : 'You & your buddies'} chips={[isAr ? 'وصل حالاً' : 'Just shipped']} />
            <StepCards steps={NEW_BUDDIES} isAr={isAr} onGo={navigate} />

            <p className="px-1 pt-1 text-center text-xs leading-relaxed text-gray-400">{t('help.howToFooter')}</p>
          </>
        )}

        {tab === 'coaches' && (
          <>
            <SectionHead title={t('help.coachTitle')} chips={[t('help.noFees')]} />
            <CardList items={COACH_BENEFITS} pick={pick} tone="blue" />

            <SectionHead
              title={isAr ? 'أدوات المدرب الجديدة — بتشتغل إزاي' : 'New coach tools — how they work'}
              chips={[isAr ? 'وصل حالاً' : 'Just shipped']}
            />
            <StepCards steps={COACH_STEPS} isAr={isAr} onGo={navigate} />

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
            <button
              onClick={() => rawNavigate('/why-partner')}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-brand-blue"
            >
              {isAr ? 'اعرف كل مميزات الشراكة' : 'See every partner benefit'}
              <ArrowRight size={15} className="rtl:rotate-180" />
            </button>
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

            <GroupHead icon={Tv} title={isAr ? 'جديد للجيمات — بيشتغل إزاي' : 'New for gyms — how it works'} tone="green" />
            <StepCards steps={GYM_STEPS} isAr={isAr} onGo={navigate} />
            <button
              onClick={() => rawNavigate('/why-partner')}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-brand-green"
            >
              {isAr ? 'اعرف كل مميزات الشراكة' : 'See every partner benefit'}
              <ArrowRight size={15} className="rtl:rotate-180" />
            </button>

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
      <div className="fitness-hero relative px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
          {isAr ? 'ليه PULSE' : 'Why PULSE'}
        </p>
        <h2 className="mt-1 text-[19px] font-extrabold leading-snug">
          {isAr ? 'مش تطبيق لياقة تاني' : 'Not another fitness app'}
        </h2>
      </div>

      <ul className="divide-y divide-white/10">
        {DIFFERENCE.map((row) => (
          <li key={row.usEn} className="px-5 py-2.5">
            <p className="text-[12px] leading-relaxed text-white/45 line-through decoration-white/25">
              {isAr ? row.themAr : row.themEn}
            </p>
            <p className="mt-1 text-[14px] font-bold leading-relaxed">{isAr ? row.usAr : row.usEn}</p>
          </li>
        ))}
      </ul>

      <p className="border-t border-white/10 px-5 py-2.5 text-[12px] leading-relaxed text-white/60">
        {isAr
          ? 'من غير ستور ومن غير تحميل — دوس «إضافة للشاشة الرئيسية» وهيبقى تطبيق عندك، أصغر من صورة واحدة.'
          : 'No app store, no download — tap "Add to Home Screen" and it becomes an app, smaller than a single photo.'}
      </p>
    </motion.section>
  );
}

/** Un-numbered how-to cards — same shape as the HOW_TO steps but for feature
 *  groups (new training tools, buddies, coaches, gyms) where order is not a
 *  sequence. Tapping a card deep-links into the feature itself. */
function StepCards({ steps, isAr, onGo }: { steps: Step[]; isAr: boolean; onGo: (to: string) => void }) {
  return (
    <ul className="space-y-2.5">
      {steps.map((step, i) => (
        <motion.li
          key={step.en}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(i, 6) * 0.04 }}
        >
          <button
            onClick={() => step.to && onGo(step.to)}
            className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-start shadow-sm transition active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-brand-pink">
              <step.icon size={18} />
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
    </ul>
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
  compact = false,
}: {
  items: Benefit[];
  pick: (b: Benefit) => string;
  tone: Tone;
  /** Dense 2-col grid of icon + short title, tap a cell to expand the full
   *  sentence inline. Used by the long "for you" list; the shorter lists keep
   *  the classic full-width card style. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!compact) {
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

  // Compact grid: chunk into rows of two so an expanded cell's detail can
  // render as a full-width row directly beneath its own grid row.
  const rows: number[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.length - i > 1 ? [i, i + 1] : [i]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const openIdx = expanded !== null && row.includes(expanded) ? expanded : null;
        return (
          <div key={row[0]}>
            <div className="grid grid-cols-2 gap-2">
              {row.map((i) => {
                const item = items[i];
                const Icon = item.icon;
                const [title] = pick(item).split(' — ');
                const isOpen = expanded === i;
                return (
                  <motion.button
                    key={`${item.en}-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: (i % 8) * 0.03, type: 'spring', stiffness: 280, damping: 26 }}
                    onClick={() => setExpanded(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className={`flex min-h-[76px] flex-col items-start justify-start gap-1.5 rounded-2xl bg-white p-3 text-start shadow-sm transition active:scale-[0.97] ${
                      isOpen ? 'ring-2 ring-brand-pink/40' : ''
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[tone]}`}>
                      <Icon size={16} />
                    </span>
                    <span className="line-clamp-2 text-[12px] font-bold leading-snug">{title}</span>
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence initial={false}>
              {openIdx !== null && (
                <motion.div
                  key={openIdx}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-2xl bg-white p-3.5 text-[13px] leading-relaxed text-gray-600 shadow-sm">
                    {pick(items[openIdx])}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
