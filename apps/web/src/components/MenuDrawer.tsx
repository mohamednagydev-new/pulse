import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, CalendarDays, Settings, Shield, LogOut, Moon, Sun, MessagesSquare,
  ChevronDown, Award, UserPlus, ShoppingBag, HelpCircle, Ticket, Building2,
  Bot, Gem, Salad, Handshake, Dumbbell, Users, Flame, HeartHandshake,
  TrendingUp, Medal, HeartPulse, ClipboardList, ScanLine, ListChecks, Music,
  UtensilsCrossed, Trophy, Clapperboard, Crown, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { MediaImage } from './ui';
import { rankRing } from '../lib/levels';
import LanguageToggle from './LanguageToggle';
import { currentTheme, toggleTheme } from '../lib/theme';

type Item = { to: string; en: string; ar: string; icon: LucideIcon };
type Group = { en: string; ar: string; items: Item[] };

/** Slim shortcut set. Everything that used to live here is still one tap away
 *  somewhere obvious: Train tools moved into the merged Train tab, tracking
 *  screens into the Food tab + Profile + Home quick actions, social extras
 *  into Home/Community — the drawer keeps only what has no tab of its own. */
const GROUPS: Group[] = [
  {
    // The bottom tabs only render on the five main screens — from every inner
    // screen this drawer IS the navigation. And the owner wants it to double
    // as the feature showcase: everything the app offers, grouped, one
    // accordion open at a time so it stays compact.
    en: 'Main', ar: 'الأساسية',
    items: [
      { to: '/programs', en: 'Train', ar: 'التمرين', icon: Dumbbell },
      { to: '/community', en: 'Community', ar: 'المجتمع', icon: Users },
      { to: '/tracker', en: 'Food', ar: 'الأكل', icon: Flame },
      { to: '/wellness', en: 'Wellness library', ar: 'مكتبة العافية', icon: HeartPulse },
      { to: '/buddies', en: 'Buddies', ar: 'أصحابي', icon: HeartHandshake },
      { to: '/progress', en: 'Progress', ar: 'تقدمي', icon: TrendingUp },
      { to: '/achievements', en: 'Challenges', ar: 'التحديات', icon: Medal },
    ],
  },
  {
    en: 'My training', ar: 'تمريني',
    items: [
      { to: '/my-plan', en: 'My plan', ar: 'خطتي', icon: ClipboardList },
      { to: '/schedule', en: 'Schedule', ar: 'جدولي', icon: CalendarDays },
      { to: '/exercises', en: 'Muscle map', ar: 'خريطة العضلات', icon: ScanLine },
      { to: '/routines', en: 'My routines', ar: 'روتيناتي', icon: ListChecks },
      { to: '/group', en: 'Group live', ar: 'تمرين جماعي', icon: Users },
      { to: '/music', en: 'My music', ar: 'مزيكتي', icon: Music },
    ],
  },
  {
    en: 'My food', ar: 'أكلي',
    items: [
      { to: '/meals', en: 'Meal plan', ar: 'خطة الأكل', icon: UtensilsCrossed },
      { to: '/diet-programs', en: 'Diet programs', ar: 'برامج الدايت', icon: Salad },
      { to: '/wellness/kitchen', en: 'Healthy kitchen', ar: 'مطبخ العافية', icon: HeartPulse },
    ],
  },
  {
    en: 'Compete', ar: 'نافس',
    items: [
      { to: '/leagues', en: 'League', ar: 'الدوري', icon: Trophy },
      { to: '/champions', en: 'Champions', ar: 'الأبطال', icon: Crown },
      { to: '/reels', en: 'Reels', ar: 'ريلز', icon: Clapperboard },
    ],
  },
  {
    en: 'Assistant', ar: 'المساعد',
    items: [
      { to: '/coach-chat', en: 'AI Coach', ar: 'كوتش AI', icon: Bot },
      { to: '/nutritionist', en: 'Nutritionist', ar: 'أخصائي التغذية', icon: Salad },
    ],
  },
  {
    en: 'Around you', ar: 'حواليك',
    items: [
      { to: '/gyms', en: 'Find a gym', ar: 'دوّر على جيم', icon: Building2 },
      { to: '/store', en: 'Store', ar: 'المتجر', icon: ShoppingBag },
      { to: '/deals', en: 'Deals', ar: 'العروض', icon: Ticket },
      { to: '/events', en: 'Events', ar: 'الفعاليات', icon: CalendarDays },
    ],
  },
  {
    en: 'Grow', ar: 'انشر واكسب',
    items: [
      { to: '/my-invite', en: 'Invite people', ar: 'اعزم ناس', icon: UserPlus },
      { to: '/coaches-community', en: 'Find a coach', ar: 'دوّر على مدرب', icon: Award },
      { to: '/why-partner', en: 'Partner with us', ar: 'اعرض بيزنس معانا', icon: Handshake },
      { to: '/support', en: 'Contact us', ar: 'كلّمنا', icon: MessagesSquare },
    ],
  },
];

/** Official channels. Facebook: keep in sync with the live Page URL. */
const SOCIALS: { label: string; href: string; bg: string; icon: React.ReactNode }[] = [
  {
    label: 'Telegram',
    href: 'https://t.me/pulse_egypt',
    bg: '#229ED9',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" width="18" height="18" fill="#fff" aria-hidden>
        <path d="M21.9 4.6 18.9 19c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.6L18.2 7c.4-.3-.1-.5-.6-.2L7.3 13.3l-4.4-1.4c-1-.3-1-.9.2-1.4L20.6 3.5c.8-.3 1.5.2 1.3 1.1Z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/pulsefitegypt',
    bg: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden>
        <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.6c0-.9.3-1.6 1.7-1.6h1.4V4.3c-.3 0-1.2-.1-2.2-.1-2.3 0-3.9 1.4-3.9 4v2.3H8v3h2.5V21h3Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/pulse2029eg',
    bg: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="#fff" stroke="none" />
      </svg>
    ),
  },
];

export default function MenuDrawer({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // One group expanded at a time. Collapsed, the whole menu is three rows plus the
  // footer, so it fits any phone without scrolling at all — which is a better fix
  // than making a long list scroll well.
  const [openGroup, setOpenGroup] = useState<string>(GROUPS[0].en);
  const [theme, setTheme] = useState(currentTheme());
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  // Lock the page behind the drawer so scrolling stays inside the menu,
  // and close on Escape like any dialog.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const doLogout = async () => { await logout(); navigate('/login'); };

  /** Icon over label, three to a row — labels get more width than a
   *  two-column row layout gave them. */
  const Tile = ({ to, en, ar, icon: Icon }: Item) => (
    <Link
      to={to}
      onClick={close}
      className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl bg-white/5 px-1 py-2 text-center transition active:scale-95 hover:bg-white/10"
    >
      <Icon size={18} className="shrink-0 text-white/75" />
      <span className="line-clamp-2 w-full text-[10px] font-semibold leading-tight">{L(en, ar)}</span>
    </Link>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={L('Open menu', 'افتح القائمة')} className={className}>
        <Menu size={26} />
      </button>

      {createPortal(
      <AnimatePresence>
        {/* h-[100dvh] matters on phones: `fixed inset-0` resolves against the LAYOUT
            viewport, which is taller than what you can see while the browser's URL
            bar is visible. The nav scrolled fine, but the drawer's own bottom - and
            with it the footer - sat below the visible area and could not be reached.
            dvh tracks the visible viewport instead. */}
        {open && (
          <div className="fixed inset-0 z-[80] h-[100dvh]" role="dialog" aria-modal="true">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fitness-hero absolute inset-y-0 start-0 flex h-full w-80 max-w-[88%] flex-col overflow-hidden text-white shadow-2xl"
              // start-0 anchors to the right edge in RTL, but framer's x is
              // physical — without the flip the panel flies across the whole
              // screen from off-screen-left in Arabic.
              initial={{ x: isAr ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isAr ? '100%' : '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            >
              <div className="flex shrink-0 items-center justify-between px-5 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}>
                <span className="text-2xl font-extrabold italic">PULSE</span>
                <button onClick={close} aria-label={L('Close menu', 'اقفل القائمة')} className="p-1"><X /></button>
              </div>

              <Link to="/profile" onClick={close} className="mx-3 flex shrink-0 items-center gap-3 rounded-2xl bg-white/5 p-3">
                {/* Rank ring cosmetic when the auth user carries a level; the User
                    type doesn't declare it, so read defensively and fall back to
                    the plain white ring when it's absent. */}
                <MediaImage
                  path={user?.avatarUrl}
                  label={user?.firstName}
                  className={`h-11 w-11 rounded-full ${typeof (user as any)?.level === 'number' ? rankRing((user as any).level as number) : 'ring-2 ring-white/30'}`}
                  seed={3}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user?.firstName} {user?.lastName}</p>
                  <p className="truncate text-xs text-white/60">{L('View profile', 'شوف بروفايلك')}</p>
                </div>
              </Link>

              {/* overscroll-contain keeps scroll momentum inside the drawer */}
              {/* min-h-0 is load-bearing: a flex child defaults to min-height:auto, so
                  without it this grows to its content height instead of scrolling and
                  pushes the last items past the bottom of the drawer. */}
              <nav className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
                {GROUPS.map((g) => {
                  const expanded = openGroup === g.en;
                  return (
                    <section key={g.en} className="mb-1.5">
                      <button
                        onClick={() => setOpenGroup(expanded ? '' : g.en)}
                        aria-expanded={expanded}
                        className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-2 text-start transition active:scale-[0.98] hover:bg-white/5"
                      >
                        <span className="text-sm font-bold">{L(g.en, g.ar)}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40">{g.items.length}</span>
                          <ChevronDown
                            size={16}
                            className={`text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-3 gap-1.5 pb-2 pt-1">
                              {g.items.map((it) => <Tile key={it.to} {...it} />)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  );
                })}

                {/* Role shortcuts */}
                <section className="mb-2 grid grid-cols-2 gap-1.5">
                  {user?.isCoach ? (
                    <Link to="/coach-dashboard" onClick={close} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-center text-[11px] font-bold transition active:scale-95">
                      <Award size={15} className="shrink-0" /> <span className="truncate">{L('Coach', 'المدرب')}</span>
                    </Link>
                  ) : (
                    <Link to="/coach-profile" onClick={close} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-center text-[11px] font-bold transition active:scale-95">
                      <UserPlus size={15} className="shrink-0" /> <span className="truncate">{L('Become a coach', 'ابقى مدرب')}</span>
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" onClick={close} className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-center text-[11px] font-bold text-brand-yellow transition active:scale-95">
                      <Shield size={15} className="shrink-0" /> <span className="truncate">{L('Admin', 'الإدارة')}</span>
                    </Link>
                  )}
                </section>
              </nav>

              <div className="shrink-0 space-y-2 border-t border-white/10 p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
                {/* Social channels — brand-colored, official icons. */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-white/50">{L('Follow PULSE', 'تابع PULSE')}</span>
                  <div className="flex items-center gap-2">
                    {SOCIALS.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener"
                        aria-label={s.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90"
                        style={{ background: s.bg }}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between px-1">
                  <button onClick={() => setTheme(toggleTheme())} className="flex items-center gap-2 text-sm font-medium">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {theme === 'dark' ? L('Light', 'فاتح') : L('Dark', 'داكن')}
                  </button>
                  <LanguageToggle variant="compact" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/help" onClick={close} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition active:scale-95">
                    <HelpCircle size={16} /> {L('How it works', 'إزاي بيشتغل')}
                  </Link>
                  <Link to="/info" onClick={close} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition active:scale-95">
                    <Settings size={16} /> {L('Settings', 'الإعدادات')}
                  </Link>
                </div>
                <button onClick={doLogout} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/5 text-sm font-semibold transition active:scale-95 hover:bg-white/15">
                  <LogOut size={16} /> {L('Logout', 'خروج')}
                </button>
                {/* Treasures demoted from the grid to a footer text link — still reachable. */}
                <Link to="/features" onClick={close} className="flex min-h-[32px] items-center justify-center gap-1.5 text-xs font-semibold text-white/50 transition hover:text-white/80">
                  <Gem size={12} /> {L('PULSE treasures', 'كنوز PULSE')}
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}
