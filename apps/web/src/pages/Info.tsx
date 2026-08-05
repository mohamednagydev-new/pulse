import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, Check, ChevronDown, Copy, Download, Gift, HelpCircle, Instagram, LayoutDashboard, LogOut, MessageSquare, Share2 } from 'lucide-react';
import { api } from '../lib/api';
import { ErrorMsg } from '../components/ui';
import { useAuth } from '../store/auth';
import LanguageToggle from '../components/LanguageToggle';
import PushToggle from '../components/PushToggle';
import MenuDrawer from '../components/MenuDrawer';
import AmbientBg from '../components/AmbientBg';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function Info() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      <header className="flex items-center px-5 pt-12 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <MenuDrawer />
        <h1 className="mx-auto pe-6 text-lg font-bold uppercase">{t('info.title')}</h1>
      </header>

      <div className="space-y-3 px-4">
        {/* The static settings below stay usable even if /api/me fails — this
            banner just surfaces the failure and offers a retry. */}
        {meError && <ErrorMsg onRetry={() => refetch()} />}

        <Accordion id="settings" title={t('info.settings')} open={open} setOpen={setOpen}>
          <SettingsForms />
        </Accordion>

        <Accordion id="membership" title={t('info.membership')} open={open} setOpen={setOpen}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-bold text-brand-green">{t('info.freeTitle')}</p>
              <p className="text-sm text-gray-500">{t('info.freeDesc')}</p>
            </div>
          </div>
        </Accordion>

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="font-bold">{t('info.language')} / اللغة</span>
          <LanguageToggle />
        </div>

        {/* Wait for /api/me so the pickers open on the saved values instead of
            rendering defaults and snapping once the response lands. */}
        {!meLoading && <CountryPicker me={me} />}

        <motion.button
          whileTap={{ scale: 0.98 }}
          transition={tapSpring}
          onClick={() => navigate('/help')}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <HelpCircle size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t('help.title')}</span>
            <span className="block truncate text-xs text-gray-500">{t('help.intro')}</span>
          </span>
          <ChevronDown size={18} className="shrink-0 -rotate-90 text-gray-300 rtl:rotate-90" />
        </motion.button>

        {/* Install — works any time, even after dismissing the auto banner */}
        {!window.matchMedia('(display-mode: standalone)').matches && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={tapSpring}
            onClick={() => window.dispatchEvent(new CustomEvent('pulse:install-open'))}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-start shadow-sm"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}>
              <Download size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t('install.title')}</span>
              <span className="block truncate text-xs text-gray-500">{t('install.desc')}</span>
            </span>
            <ChevronDown size={18} className="shrink-0 -rotate-90 text-gray-300 rtl:rotate-90" />
          </motion.button>
        )}

        <InviteFriendsCard />

        {!meLoading && <ReminderSection me={me} />}

        <Accordion id="support" title={t('info.support')} open={open} setOpen={setOpen}>
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

        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 font-semibold shadow-sm">
          <Instagram size={18} /> {t('info.instagram')}
        </a>

        {me?.role === 'ADMIN' && (
          <motion.button whileTap={{ scale: 0.98 }} transition={tapSpring} onClick={() => navigate('/admin')} className="flex w-full items-center gap-2 rounded-2xl bg-ink p-4 font-semibold text-white shadow-sm">
            <LayoutDashboard size={18} /> Admin Dashboard
          </motion.button>
        )}

        <motion.button whileTap={{ scale: 0.98 }} transition={tapSpring} onClick={doLogout} className="flex w-full items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 font-semibold text-brand-red shadow-sm">
          <LogOut size={18} /> {t('info.logout')}
        </motion.button>
      </div>
    </div>
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
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
        <motion.button whileTap={{ scale: 0.95 }} transition={tapSpring} onClick={share} disabled={!data?.link} className="btn-pill flex min-h-[40px] flex-1 items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white disabled:opacity-60">
          <Share2 size={16} /> {t('invite.share')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} transition={tapSpring} onClick={copyLink} disabled={!data?.link} className="btn-pill flex min-h-[40px] flex-1 items-center justify-center gap-2 border border-gray-200 bg-white py-2 text-sm font-semibold disabled:opacity-60">
          <Copy size={16} /> {t('invite.copy')}
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
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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

function Accordion({ id, title, open, setOpen, children }: { id: string; title: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-center justify-between p-4 font-bold">
        {title} <ChevronDown className={`transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="border-t border-gray-100 p-4">{children}</div>}
    </div>
  );
}

function SettingsForms() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });

  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.patch('/api/me/email', { email }); setMsg(`${t('info.changeEmail')} ✓`); }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Failed'); }
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
    </div>
  );
}
