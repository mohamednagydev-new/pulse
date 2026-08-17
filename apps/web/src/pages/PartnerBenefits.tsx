import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, BadgeCheck, BarChart3, Building2, CalendarDays, ChevronLeft, Gift,
  Handshake, LayoutDashboard, Link2, Megaphone, MessageCircle, MonitorPlay,
  QrCode, Radio, Send, ShoppingBag, Sparkles, Star, Ticket, Trophy, Users,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import ScreenHeader from '../components/ScreenHeader';

/** Same partner contacts as Help.tsx — change together. */
const PARTNER_WHATSAPP = '201070799007';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type Benefit = { icon: LucideIcon; en: string; ar: string; subEn: string; subAr: string };
type Audience = {
  key: 'coach' | 'gym' | 'store' | 'sponsor';
  emoji: string;
  en: string; ar: string;
  taglineEn: string; taglineAr: string;
  grad: string;
  benefits: Benefit[];
  steps: { en: string; ar: string }[];
  bizEn: string; bizAr: string; // default business-type value for the lead form
};

/* Every bullet is a shipped feature — nothing aspirational. The pitch only
 * works face-to-face if the thing can be demoed on the spot. */
const AUDIENCES: Audience[] = [
  {
    key: 'coach', emoji: '🏋️', en: 'Coach', ar: 'مدرب',
    taglineEn: 'Your clients, your programs, your name — with real tools.',
    taglineAr: 'عملاءك وبرامجك واسمك — بأدوات حقيقية مش إكسل وواتساب.',
    grad: 'from-blue-500/90 to-indigo-700/80',
    bizEn: 'Personal trainer', bizAr: 'مدرب شخصي',
    benefits: [
      {
        icon: QrCode,
        en: 'Invite link + QR', ar: 'لينك دعوة + QR',
        subEn: 'Client scans, registers, and lands already connected to you — zero setup on their side.',
        subAr: 'العميل يمسح الكود ويسجّل ويلاقي نفسه متوصّل بيك على طول — من غير أي خطوة زيادة.',
      },
      {
        icon: LayoutDashboard,
        en: 'Client progress dashboard', ar: 'داشبورد متابعة العملاء',
        subEn: 'Every client’s workouts and streak in one screen, with a quiet flag when someone goes missing.',
        subAr: 'تمرين وانتظام كل عميل في شاشة واحدة، وعلامة هادية لما حد يختفي عشان تلحقه قبل ما يسيّب.',
      },
      {
        icon: Radio,
        en: 'Broadcast to all clients', ar: 'رسالة لكل عملائك بضغطة',
        subEn: 'One message reaches everyone as an in-app notification.',
        subAr: 'رسالة واحدة توصل لكل عملائك إشعار جوه الأبلكيشن.',
      },
      {
        icon: Sparkles,
        en: 'Programs: public or clients-only', ar: 'برامجك: عامة أو لعملائك بس',
        subEn: 'Publish to everyone, or keep premium programs private and assign them per client.',
        subAr: 'انشر للكل، أو خلّي برامجك المدفوعة لعملائك بس وأسندها لكل عميل بنفسك.',
      },
      {
        icon: BadgeCheck,
        en: 'Ratings + verified badge', ar: 'تقييمات + علامة موثّق',
        subEn: 'Real client ratings and a spot in the coaches directory bring you clients you never met.',
        subAr: 'تقييمات حقيقية وعلامة التوثيق ومكانك في دليل المدربين بيجيبولك عملاء جداد من المجتمع.',
      },
    ],
    steps: [
      { en: 'Create a free account', ar: 'اعمل حساب ببلاش' },
      { en: 'Activate your coach profile', ar: 'فعّل بروفايل المدرب من جوه الأبلكيشن' },
      { en: 'Send your invite link — clients arrive connected', ar: 'ابعت لينك الدعوة — عملاءك يوصلوا متوصّلين بيك' },
    ],
  },
  {
    key: 'gym', emoji: '🏢', en: 'Gym', ar: 'جيم',
    taglineEn: 'Turn your members into a community — and see who’s about to leave.',
    taglineAr: 'حوّل أعضاء الجيم لمجتمع بيتنافس — واعرف مين قرّب يسيّب قبل ما يمشي.',
    grad: 'from-teal-500/90 to-cyan-700/80',
    bizEn: 'Gym', bizAr: 'جيم',
    benefits: [
      {
        icon: Link2,
        en: 'Gym invite code', ar: 'كود دعوة باسم الجيم',
        subEn: 'Members join under your gym’s name with one code on the front desk.',
        subAr: 'كود واحد على المكتب — أعضاءك يتجمعوا كلهم تحت اسم الجيم في الأبلكيشن.',
      },
      {
        icon: Trophy,
        en: 'Members weekly leaderboard', ar: 'لوحة صدارة أسبوعية لأعضائك',
        subEn: 'Your members compete with each other every week — competition keeps them showing up.',
        subAr: 'أعضاء الجيم بيتنافسوا مع بعض كل أسبوع — المنافسة بتخليهم ييجوا أكتر.',
      },
      {
        icon: MonitorPlay,
        en: 'Live TV board for your screen', ar: 'شاشة عرض حية للجيم',
        subEn: 'A public board made for the gym TV: this week’s top members, live.',
        subAr: 'صفحة معمولة مخصوص لشاشة الجيم: أوائل الأسبوع بيظهروا لايف قدام الكل.',
      },
      {
        icon: BarChart3,
        en: 'Owner analytics + at-risk members', ar: 'تحليلات للمالك + المعرضين للتسرب',
        subEn: 'Activity numbers plus a list of members going quiet — call them before they cancel.',
        subAr: 'أرقام النشاط + قايمة الأعضاء اللي بيقلّ نشاطهم — كلمهم قبل ما يلغوا الاشتراك.',
      },
    ],
    steps: [
      { en: 'Send us your gym details', ar: 'ابعتلنا بيانات الجيم' },
      { en: 'We set up your gym page + invite code', ar: 'نجهزلك صفحة الجيم وكود الدعوة' },
      { en: 'Put the QR on the desk & the board on your TV', ar: 'علّق الـQR على المكتب وشغّل اللوحة على شاشة الجيم' },
    ],
  },
  {
    key: 'store', emoji: '🛍', en: 'Store & Brand', ar: 'متجر وبراند',
    taglineEn: 'Your products in front of people who actually train.',
    taglineAr: 'منتجاتك قدام ناس بتتمرن فعلاً — مش إعلان لحد نايم.',
    grad: 'from-orange-500/90 to-rose-700/80',
    bizEn: 'Store / brand', bizAr: 'متجر / براند',
    benefits: [
      {
        icon: ShoppingBag,
        en: 'Your own catalog page', ar: 'صفحة كتالوج باسمك',
        subEn: 'Products, prices and photos inside the app, with your logo and contact.',
        subAr: 'منتجاتك بالصور والأسعار جوه الأبلكيشن، بلوجو المتجر ووسائل التواصل بتاعتك.',
      },
      {
        icon: Ticket,
        en: 'Deals seen by the community', ar: 'عروض بتوصل للمجتمع',
        subEn: 'Your offers appear in the Deals tab — with a direct WhatsApp button.',
        subAr: 'عروضك بتظهر في صفحة العروض — وزرار واتساب مباشر ليك.',
      },
      {
        icon: Star,
        en: 'Featured placement', ar: 'ظهور مميز',
        subEn: 'Early partners get featured spots in the store and on the board.',
        subAr: 'الشركاء الأوائل بياخدوا أماكن مميزة في المتجر والواجهة.',
      },
      {
        icon: Send,
        en: 'Lead forms — names & numbers to you', ar: 'استمارات عملاء بالاسم والرقم',
        subEn: 'Interested members leave name + phone; leads land in your own partner portal.',
        subAr: 'العميل المهتم يسيب اسمه ورقمه — والبيانات توصلك في بوابة الشريك الخاصة بيك.',
      },
    ],
    steps: [
      { en: 'Send us your store details', ar: 'ابعتلنا بيانات المتجر' },
      { en: 'We publish your catalog & deals', ar: 'نرفعلك الكتالوج والعروض' },
      { en: 'Receive leads straight on WhatsApp', ar: 'استقبل العملاء على الواتساب على طول' },
    ],
  },
  {
    key: 'sponsor', emoji: '🎪', en: 'Sponsor & Events', ar: 'راعي وفعاليات',
    taglineEn: 'Put your name on the podium, not just on a banner.',
    taglineAr: 'حط اسمك على منصة التتويج — مش على بانر وخلاص.',
    grad: 'from-violet-500/90 to-purple-700/80',
    bizEn: 'Sponsor / events', bizAr: 'راعي / منظم فعاليات',
    benefits: [
      {
        icon: Gift,
        en: 'Prize challenges in your name', ar: 'تحديات بجوائز باسمك',
        subEn: 'A branded challenge with a podium, a raffle and a Wall of Champions carrying your name.',
        subAr: 'تحدي برعايتك: منصة تتويج + قرعة + حائط الأبطال — واسمك عليهم كلهم.',
      },
      {
        icon: Megaphone,
        en: 'Sponsored banners', ar: 'بانرات برعايتك',
        subEn: 'Your banner inside the app, shown to the whole community.',
        subAr: 'بانر باسمك جوه الأبلكيشن قدام المجتمع كله.',
      },
      {
        icon: CalendarDays,
        en: 'Events with RSVP + attribution', ar: 'فعاليات بحجز مسبق ومنسوبة ليك',
        subEn: 'Your event listed with RSVP, and every signup attributed to you.',
        subAr: 'فعاليتك بتتعرض بحجز RSVP، وكل تسجيل بيتحسب باسمك.',
      },
      {
        icon: Users,
        en: 'A community that opens the app daily', ar: 'مجتمع بيفتح الأبلكيشن كل يوم',
        subEn: 'Streaks, leagues and daily quests mean your name is seen on habit, not by luck.',
        subAr: 'ستريكات ودوري وتحديات يومية — يعني اسمك بيتشاف كل يوم مش بالصدفة.',
      },
    ],
    steps: [
      { en: 'Tell us your goal & budget', ar: 'قولنا هدفك وميزانيتك' },
      { en: 'We design the challenge or event with you', ar: 'نصمم التحدي أو الفعالية معاك' },
      { en: 'Your name on the podium & Wall of Champions', ar: 'اسمك على البوديوم وحائط الأبطال' },
    ],
  },
];

/* Value statements instead of made-up numbers — no fake social proof. */
const PROOF: { en: string; ar: string }[] = [
  { en: 'Free for early partners', ar: 'مجاني للشركاء الأوائل' },
  { en: 'Arabic-first, made for Egypt', ar: 'بالمصري وأول مرة تتعمل كده' },
  { en: 'You keep your clients — we hand you tools', ar: 'عملاءك بيفضلوا عملاءك — إحنا بنديك أدوات' },
  { en: 'Set up in a day, not a month', ar: 'التجهيز في يوم مش شهر' },
];

export default function PartnerBenefits() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const { user, status } = useAuth();
  const authed = status === 'authed' && !!user;

  const [tab, setTab] = useState<Audience['key']>('coach');
  const aud = AUDIENCES.find((a) => a.key === tab)!;

  /* Lead mini-form (gym / store / sponsor). Reuses the public guest-support
   * endpoint — the admin inbox is already the leads inbox, tagged by subject. */
  const [form, setForm] = useState({ name: '', whatsapp: '', city: '', biz: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/support/guest', {
        name: form.name || undefined,
        contact: form.whatsapp,
        subject: `Partner lead — ${aud.en} (why-partner)`,
        body: [
          `WhatsApp: ${form.whatsapp}`,
          `City: ${form.city || '—'}`,
          `Business: ${form.biz || aud.bizEn}`,
          `Audience tab: ${aud.en}`,
          'Source: why-partner',
        ].join('\n'),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Could not send — try again.', 'ماقدرناش نبعت — جرّب تاني.'));
    } finally {
      setBusy(false);
    }
  };

  const waText = encodeURIComponent(
    isAr
      ? `أهلاً، أنا ${aud.ar} ومهتم أشترك مع PULSE. ممكن التفاصيل؟`
      : `Hi, I'm a ${aud.en.toLowerCase()} interested in partnering with PULSE. Can you share details?`,
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <ScreenHeader tone="violet" padBottom="pb-8">
        <div className="flex items-center gap-3">
          <Link to={authed ? '/' : '/login'} aria-label={L('Back', 'رجوع')}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
          <div className="min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="truncate text-2xl font-extrabold"
            >
              {L('Partner with PULSE', 'اعرض بيزنس معانا')}
            </motion.h1>
            <p className="mt-0.5 text-xs text-white/70">
              {L('Coaches, gyms, brands, sponsors — real tools, live today.', 'مدربين وجيمات وبراندات ورعاة — أدوات حقيقية شغالة النهارده.')}
            </p>
          </div>
        </div>
      </ScreenHeader>

      {/* Audience switcher. relative z-10: the header's backdrop-blur promotes
          it to its own layer, which painted OVER this -mt-4 overlap row. */}
      <div className="no-scrollbar relative z-10 -mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {AUDIENCES.map((a) => {
          const active = a.key === tab;
          return (
            <motion.button
              key={a.key}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => { setTab(a.key); setSent(false); setError(''); }}
              className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-md transition ${
                active ? 'bg-brand-pink text-white' : 'card text-ink'
              }`}
            >
              <span>{a.emoji}</span> {L(a.en, a.ar)}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
          className="px-4"
        >
          {/* Tagline hero */}
          <div className={`scene-tex mt-4 rounded-2xl bg-gradient-to-br ${aud.grad} p-5 text-white shadow-lg`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">{aud.emoji}</span>
            <p className="mt-3 text-lg font-extrabold leading-snug">{L(aud.taglineEn, aud.taglineAr)}</p>
          </div>

          {/* Benefits */}
          <div className="mt-4 space-y-2.5">
            {aud.benefits.map((b, i) => (
              <motion.div
                key={b.en}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: i * 0.04 }}
                className={`scene-tex flex items-start gap-3 rounded-2xl bg-gradient-to-br ${aud.grad} p-4 text-white shadow-md`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <b.icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">{L(b.en, b.ar)}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-white/85">{L(b.subEn, b.subAr)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How to start */}
          <div className="card mt-5 rounded-2xl p-4 shadow-sm">
            <h2 className="text-base font-extrabold">{L('How to start', 'إزاي تبدأ')}</h2>
            <ol className="mt-3 space-y-3">
              {aud.steps.map((s, i) => (
                <li key={s.en} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-pink/10 text-sm font-extrabold text-brand-pink">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-sm font-medium">{L(s.en, s.ar)}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA */}
          {aud.key === 'coach' ? (
            <div className="mt-4">
              <Link
                to={authed ? '/coach-profile' : '/register'}
                className="btn-pill btn-primary flex min-h-[48px] w-full items-center justify-center gap-2"
              >
                <Award size={18} />
                {authed
                  ? L('Activate your coach profile', 'فعّل بروفايل المدرب دلوقتي')
                  : L('Create your free account', 'اعمل حسابك ببلاش وابدأ')}
              </Link>
              <a
                href={`https://wa.me/${PARTNER_WHATSAPP}?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="btn-pill mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 bg-emerald-600 text-white"
              >
                <MessageCircle size={18} /> {L('Questions? WhatsApp us', 'عندك سؤال؟ كلمنا واتساب')}
              </a>
            </div>
          ) : (
            <div className="card mt-4 rounded-2xl p-4 shadow-sm">
              {sent ? (
                <div className="py-4 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✅</span>
                  <h3 className="mt-3 text-lg font-extrabold">{L('Got it — we’ll call you', 'وصلنا — هنكلمك قريب')}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {L('Our team reaches out on WhatsApp within a day or two.', 'فريقنا هيتواصل معاك واتساب خلال يوم أو يومين.')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink">
                      <Handshake size={18} />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold">{L('Let’s talk', 'سيب بياناتك ونكلمك')}</h3>
                      <p className="text-xs text-gray-400">{L('Free for early partners — no commitment.', 'مجاني للشركاء الأوائل — من غير أي التزام.')}</p>
                    </div>
                  </div>
                  <form onSubmit={submitLead} className="mt-4 space-y-2.5">
                    <input className="input-field" placeholder={L('Your name', 'اسمك')} value={form.name} onChange={set('name')} required />
                    <input
                      className="input-field" type="tel" inputMode="tel" dir="ltr"
                      placeholder={L('WhatsApp number', 'رقم الواتساب')}
                      value={form.whatsapp} onChange={set('whatsapp')} required minLength={8}
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input className="input-field" placeholder={L('City', 'المدينة')} value={form.city} onChange={set('city')} />
                      <input className="input-field" placeholder={L(aud.bizEn, aud.bizAr)} value={form.biz} onChange={set('biz')} />
                    </div>
                    {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
                    <button type="submit" disabled={busy} className="btn-pill btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-60">
                      <Send size={16} /> {busy ? L('Sending…', 'بيتبعت…') : L('Request a call', 'اطلب مكالمة')}
                    </button>
                  </form>
                </>
              )}
              <a
                href={`https://wa.me/${PARTNER_WHATSAPP}?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="btn-pill mt-2.5 flex min-h-[48px] w-full items-center justify-center gap-2 bg-emerald-600 text-white"
              >
                <MessageCircle size={18} /> {L('Or WhatsApp us directly', 'أو كلمنا واتساب على طول')}
              </a>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Social-proof strip — value statements, no invented numbers. */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-4">
        {PROOF.map((p) => (
          <span key={p.en} className="card shrink-0 rounded-full px-4 py-2 text-xs font-bold text-ink shadow-sm">
            ✦ {L(p.en, p.ar)}
          </span>
        ))}
      </div>

      {/* Cross-links guests can actually open */}
      <div className="mt-5 grid grid-cols-2 gap-2 px-4">
        <Link to="/help" className="card flex min-h-[48px] items-center justify-center gap-2 rounded-2xl text-sm font-bold text-ink shadow-sm">
          <Building2 size={16} /> {L('What is PULSE?', 'إيه هو PULSE؟')}
        </Link>
        <Link to="/gyms" className="card flex min-h-[48px] items-center justify-center gap-2 rounded-2xl text-sm font-bold text-ink shadow-sm">
          <Trophy size={16} /> {L('Browse gyms', 'شوف الجيمات')}
        </Link>
      </div>
    </div>
  );
}
