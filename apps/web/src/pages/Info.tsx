import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, Check, ChevronDown, ChevronLeft, Copy, Download, Gift, Globe, HelpCircle, Instagram, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Share2, SlidersHorizontal, Unplug, Watch, type LucideIcon } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { ErrorMsg } from '../components/ui';
import { useAuth } from '../store/auth';
import LanguageToggle from '../components/LanguageToggle';
import PushToggle from '../components/PushToggle';
import MenuDrawer from '../components/MenuDrawer';
import AmbientBg from '../components/AmbientBg';
import { WaIcon, waOpen } from '../components/WaShare';
import ScreenHeader from '../components/ScreenHeader';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function Info() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const logout = useAuth((s) => s.logout);
  const [open, setOpen] = useState<string | null>('settings');
  const { data: me, isLoading: meLoading, isError: meError, refetch } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen pb-10">
      <AmbientBg tone="cool" />
      {/* Section tone: Settings shares Profile's teal — it is Profile's detail screen. */}
      <ScreenHeader tone="teal" padBottom="pb-6">
        <div className="flex items-center justify-between">
          {/* Back first — Settings is a detail screen people arrive at from
              Profile/the drawer and expect to leave the same way. */}
          <button
            onClick={() => {
              const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
              if (idx > 0) navigate(-1);
              else navigate('/profile', { replace: true });
            }}
            aria-label={t('common.back')}
            className="-ms-2 flex min-h-11 min-w-11 items-center justify-center"
          >
            <ChevronLeft size={26} className="rtl:rotate-180" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">{t('info.title')}</h1>
          <MenuDrawer />
        </div>
      </ScreenHeader>

      <div className="space-y-3 px-4 pt-4">
        {/* The static settings below stay usable even if /api/me fails — this
            banner just surfaces the failure and offers a retry. */}
        {meError && <ErrorMsg onRetry={() => refetch()} />}

        <SectionLabel>{t('info.settings')}</SectionLabel>

        <Accordion
          id="settings"
          title={t('info.settings')}
          subtitle={isAr ? 'الإيميل وكلمة السر' : 'Email & password'}
          icon={SlidersHorizontal}
          tint="bg-teal-50 text-brand-teal"
          open={open}
          setOpen={setOpen}
        >
          <SettingsForms />
        </Accordion>

        <div className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Globe size={20} />
          </span>
          <span className="min-w-0 flex-1 font-bold">{t('info.language')} / اللغة</span>
          <LanguageToggle />
        </div>

        {/* Wait for /api/me so the pickers open on the saved values instead of
            rendering defaults and snapping once the response lands. */}
        {!meLoading && <CountryPicker me={me} />}

        {!meLoading && <ReminderSection me={me} />}

        <SectionLabel>{isAr ? 'التطبيق' : 'App'}</SectionLabel>

        {/* Install — works any time, even after dismissing the auto banner */}
        {!window.matchMedia('(display-mode: standalone)').matches && (
          <Row
            icon={Download}
            tint="text-white"
            tintStyle={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}
            title={t('install.title')}
            subtitle={t('install.desc')}
            onClick={() => window.dispatchEvent(new CustomEvent('pulse:install-open'))}
          />
        )}

        <Row
          icon={HelpCircle}
          tint="bg-brand-blue/10 text-brand-blue"
          title={t('help.title')}
          subtitle={t('help.intro')}
          onClick={() => navigate('/help')}
        />

        <WearablesSection />

        <InviteFriendsCard />

        <SectionLabel>{isAr ? 'تواصل' : 'More'}</SectionLabel>

        <Accordion
          id="membership"
          title={t('info.membership')}
          icon={Gift}
          tint="bg-green-50 text-brand-green"
          open={open}
          setOpen={setOpen}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-bold text-brand-green">{t('info.freeTitle')}</p>
              <p className="text-sm text-gray-500">{t('info.freeDesc')}</p>
            </div>
          </div>
        </Accordion>

        <Accordion
          id="support"
          title={t('info.support')}
          icon={MessageSquare}
          tint="bg-blue-50 text-brand-blue"
          open={open}
          setOpen={setOpen}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{t('info.supportDesc')}</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={tapSpring}
              onClick={() => navigate('/support')}
              className="btn-pill flex min-h-[40px] w-full items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white"
            >
              <MessageSquare size={15} /> {t('support.title')}
            </motion.button>
          </div>
        </Accordion>

        <Row
          icon={Instagram}
          tint="bg-pink-100 text-brand-pink"
          title={t('info.instagram')}
          subtitle={isAr ? 'تابعنا على انستجرام' : 'Follow us on Instagram'}
          href="https://instagram.com"
        />

        {/* Nuclear refresh for installed apps stuck on an old build: drop every
            service worker + cache, then reload from the network. The automatic
            controllerchange reload (main.tsx) makes this rarely needed — this
            row is for "I deployed and my phone still shows the old design". */}
        <Row
          icon={RefreshCw}
          tint="bg-amber-50 text-amber-600"
          title={isAr ? 'تحديث التطبيق' : 'Force app update'}
          subtitle={isAr ? 'لو شكل التطبيق قديم بعد تحديث — دوس هنا' : 'Stuck on an old version? Tap here'}
          chevron={false}
          onClick={async () => {
            try {
              const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
              await Promise.all(regs.map((r) => r.unregister()));
              const keys = (await caches?.keys()) ?? [];
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch { /* partial cleanup still helps */ }
            window.location.replace('/');
          }}
        />

        {me?.role === 'ADMIN' && (
          <Row
            icon={LayoutDashboard}
            tint="bg-ink text-white"
            title="Admin Dashboard"
            onClick={() => navigate('/admin')}
          />
        )}

        <Row
          icon={LogOut}
          tint="bg-red-50 text-brand-red"
          title={t('info.logout')}
          titleClass="text-brand-red"
          chevron={false}
          onClick={doLogout}
        />
      </div>
    </div>
  );
}

/** Small uppercase group label — same voice as Profile's "Explore". */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{children}</p>;
}

/**
 * The one tappable-row anatomy every plain action on this screen uses:
 * tinted icon tile + bold title + xs gray subtitle + end chevron, on the
 * house rounded-2xl bg-white shadow-sm card (no borders).
 */
function Row({
  icon: Icon,
  tint,
  tintStyle,
  title,
  subtitle,
  titleClass = '',
  chevron = true,
  onClick,
  href,
}: {
  icon: LucideIcon;
  tint: string;
  tintStyle?: React.CSSProperties;
  title: string;
  subtitle?: string;
  titleClass?: string;
  chevron?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`} style={tintStyle}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${titleClass}`}>{title}</span>
        {subtitle && <span className="block truncate text-xs text-gray-500">{subtitle}</span>}
      </span>
      {chevron && <ChevronDown size={18} className="shrink-0 -rotate-90 text-gray-300 rtl:rotate-90" />}
    </>
  );
  const cls = 'flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm';
  if (href) {
    return (
      <motion.a whileTap={{ scale: 0.98 }} transition={tapSpring} href={href} target="_blank" rel="noreferrer" className={cls}>
        {body}
      </motion.a>
    );
  }
  return (
    <motion.button whileTap={{ scale: 0.98 }} transition={tapSpring} onClick={onClick} className={cls}>
      {body}
    </motion.button>
  );
}

/**
 * Where you are — scopes gyms, deals, the store and events.
 *
 * Only the local half of the app. Programmes, exercises, articles and recipes are
 * the same wherever you open them, and hiding those behind a country would be an
 * own goal. The hint under the picker says exactly that, because a settings control
 * whose blast radius is unclear is a control people avoid.
 */
function CountryPicker({ me }: { me: any }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const [saved, setSaved] = useState(false);

  const COUNTRIES: { code: string; en: string; ar: string }[] = [
    { code: 'EG', en: 'Egypt', ar: 'مصر' },
    { code: 'SA', en: 'Saudi Arabia', ar: 'السعودية' },
    { code: 'AE', en: 'United Arab Emirates', ar: 'الإمارات' },
    { code: 'KW', en: 'Kuwait', ar: 'الكويت' },
    { code: 'QA', en: 'Qatar', ar: 'قطر' },
    { code: 'BH', en: 'Bahrain', ar: 'البحرين' },
    { code: 'OM', en: 'Oman', ar: 'عُمان' },
    { code: 'JO', en: 'Jordan', ar: 'الأردن' },
    { code: 'MA', en: 'Morocco', ar: 'المغرب' },
    { code: 'DZ', en: 'Algeria', ar: 'الجزائر' },
    { code: 'TN', en: 'Tunisia', ar: 'تونس' },
  ];

  const onChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSaved(false);
    try {
      await api.patch('/api/me', { country });
      // Every local listing is now stale — drop them rather than show the old country.
      for (const k of ['venues', 'deals', 'store', 'events', 'me']) qc.invalidateQueries({ queryKey: [k] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* keep the selection; they can retry */
    }
  };

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      <label className="flex items-center justify-between gap-3">
        <span className="font-bold">{t('country.title')}</span>
        <select
          value={me?.country ?? ''}
          onChange={onChange}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
        >
          <option value="">{t('country.all')}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{isAr ? c.ar : c.en}</option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-gray-500">{t('country.hint')}</p>
      {saved && <p className="text-xs text-brand-green">{t('reminders.saved')}</p>}
    </div>
  );
}

function InviteFriendsCard() {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ['referral'], queryFn: () => api.get('/api/me/referral') });
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      showToast(t('invite.copied'));
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    if (!data?.link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on PULSE 💪', url: data.link });
        return;
      } catch {
        return; // user cancelled the share sheet
      }
    }
    await copyLink();
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-brand-green" />
        <span className="font-bold">{t('invite.title')}</span>
      </div>
      <p className="text-sm text-gray-500">{t('invite.desc')}</p>
      {typeof data?.invited === 'number' && data.invited > 0 && (
        <p className="text-sm font-semibold text-brand-green">{t('invite.joined', { count: data.invited })}</p>
      )}
      <div className="truncate rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" dir="ltr">
        {data?.link ?? '…'}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => data?.link && waOpen(`تعالى نتمرن مع بعض على PULSE 💪 تمارين وسعرات بالأكل المصري وتحديات — مجاني ١٠٠٪:\n${data.link}`)}
          disabled={!data?.link}
          className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
        >
          <WaIcon size={16} /> WhatsApp
        </button>
        <motion.button whileTap={{ scale: 0.95 }} transition={tapSpring} onClick={share} disabled={!data?.link} className="btn-pill flex min-h-[40px] flex-1 items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white disabled:opacity-60">
          <Share2 size={16} /> {t('invite.share')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} transition={tapSpring} onClick={copyLink} disabled={!data?.link} className="btn-pill flex min-h-[40px] w-11 items-center justify-center border border-gray-200 bg-white py-2 disabled:opacity-60" aria-label={t('invite.copy')}>
          <Copy size={16} />
        </motion.button>
      </div>
      {toast && <p className="text-xs text-brand-green">{toast}</p>}
    </div>
  );
}

function formatHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function ReminderSection({ me }: { me: any }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [hour, setHour] = useState<number>(me?.reminderHour ?? 19);
  const [saved, setSaved] = useState(false);

  // Keep the picker in sync once /api/me resolves.
  useEffect(() => {
    if (typeof me?.reminderHour === 'number') setHour(me.reminderHour);
  }, [me?.reminderHour]);

  const onChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const h = Number(e.target.value);
    setHour(h);
    setSaved(false);
    try {
      await api.patch('/api/tracker/goals', { reminderHour: h });
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* keep the selected value; user can retry */
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-brand-green" />
        <span className="font-bold">{t('reminders.title')}</span>
      </div>
      <p className="text-sm text-gray-500">{t('reminders.desc')}</p>
      <PushToggle />
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{t('reminders.remindAt')}</span>
        <select
          value={hour}
          onChange={onChange}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold"
          dir="ltr"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </label>
      {saved && <p className="text-xs text-brand-green">{t('reminders.saved')}</p>}
    </div>
  );
}

function Accordion({ id, title, subtitle, icon: Icon, tint, open, setOpen, children }: { id: string; title: string; subtitle?: string; icon: LucideIcon; tint: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Same row anatomy as Row, with a rotating chevron instead of a "go" one. */}
      <button onClick={() => setOpen(isOpen ? null : id)} className="flex min-h-[64px] w-full items-center gap-3 p-4 text-start">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          {subtitle && <span className="block truncate text-xs text-gray-500">{subtitle}</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-gray-300 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}

function SettingsForms() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/me/email', { email, currentPassword: emailPw });
      setMsg(`${t('info.changeEmail')} ✓`);
      setEmailPw('');
      qc.invalidateQueries({ queryKey: ['me'] }); // the settings screen must not keep showing the old address
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Failed'); }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.patch('/api/me/password', pw); setMsg(`${t('info.changePassword')} ✓`); setPw({ currentPassword: '', newPassword: '' }); }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={changeEmail} className="space-y-2">
        <input className="input-field" placeholder={t('info.changeEmail')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        {/* The email is the recovery anchor — the server now demands the password. */}
        <input className="input-field" placeholder={t('auth.password')} type="password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} />
        <motion.button whileTap={{ scale: 0.97 }} transition={tapSpring} className="btn-pill flex min-h-[40px] w-full items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white">
          <Check size={15} /> {t('common.save')}
        </motion.button>
      </form>
      <form onSubmit={changePw} className="space-y-2">
        <input className="input-field" placeholder={t('auth.password')} type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <input className="input-field" placeholder={t('info.changePassword')} type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        <motion.button whileTap={{ scale: 0.97 }} transition={tapSpring} className="btn-pill flex min-h-[40px] w-full items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white">
          <Check size={15} /> {t('common.save')}
        </motion.button>
      </form>
      {msg && <p className="text-center text-sm text-brand-green">{msg}</p>}
      <DeleteAccount />
    </div>
  );
}

/* ---------- Connected devices (wearables — see WEARABLES.md) ---------- */

function WearablesSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: status } = useQuery({ queryKey: ['wearables'], queryFn: () => api.get('/api/wearables/status') });

  // Toast the OAuth landing (?wearable=connected|error) exactly once.
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get('wearable');
    if (!flag) return;
    toast(flag === 'connected' ? t('wearables.connected') : t('wearables.error'), flag === 'connected' ? 'success' : 'error');
    window.history.replaceState({}, '', window.location.pathname);
    qc.invalidateQueries({ queryKey: ['wearables'] });
  }, [qc, t]);

  // Server has no Strava keys → the whole section stays invisible.
  if (!status?.strava?.enabled) return null;
  const connected = Boolean(status.strava.connected);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await api.get('/api/wearables/strava/connect');
      window.location.href = url;
    } catch {
      toast(t('wearables.error'), 'error');
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const r = await api.post('/api/wearables/strava/sync');
      toast(t('wearables.synced', { n: r.added ?? 0 }), 'success');
      qc.invalidateQueries({ queryKey: ['wearables'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : t('wearables.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.del('/api/wearables/strava');
      toast(t('wearables.disconnected'), 'info');
      qc.invalidateQueries({ queryKey: ['wearables'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <Watch size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t('wearables.title')}</p>
          <p className="text-xs text-gray-500">
            {connected ? t('wearables.stravaOn', { n: status.imported ?? 0 }) : t('wearables.desc')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {connected ? (
          <>
            <button
              onClick={sync}
              disabled={busy}
              className="btn-pill btn-primary flex min-h-10 flex-1 items-center justify-center gap-1.5 text-sm disabled:opacity-60"
            >
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {t('wearables.sync')}
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="btn-pill flex min-h-10 items-center justify-center gap-1.5 border border-gray-200 px-4 text-sm font-semibold text-gray-500 disabled:opacity-60"
            >
              <Unplug size={14} /> {t('wearables.disconnect')}
            </button>
          </>
        ) : (
          <button
            onClick={connect}
            disabled={busy}
            className="btn-pill btn-primary min-h-10 w-full text-sm disabled:opacity-60"
          >
            {t('wearables.connectStrava')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Self-service account deletion — a legal requirement, not a nicety. Double
 *  confirm + password (OAuth-only accounts pass an empty one; server skips). */
function DeleteAccount() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const doDelete = async () => {
    if (!window.confirm(t('info.deleteConfirm1'))) return;
    const password = window.prompt(t('info.deletePw')) ?? '';
    if (!window.confirm(t('info.deleteConfirm2'))) return;
    setBusy(true);
    try {
      await api.post('/api/me/delete-account', { password });
      localStorage.clear();
      window.location.href = '/welcome';
    } catch (e: any) {
      toast(e?.message ?? 'Failed', 'error');
      setBusy(false);
    }
  };
  return (
    <button
      onClick={doDelete}
      disabled={busy}
      className="mt-2 w-full text-center text-xs font-bold text-red-400 disabled:opacity-50"
    >
      {t('info.deleteAccount')}
    </button>
  );
}
