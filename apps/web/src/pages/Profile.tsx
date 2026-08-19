import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bookmark, Camera, Download, Dumbbell, ChevronRight, Flame, Gift, Loader2, Pencil, Ruler, TrendingUp, Medal, Settings, Weight } from 'lucide-react';
import { useAuth } from '../store/auth';
import { api, uploadWithAuth } from '../lib/api';
import { installAvailable, openInstall } from '../lib/install';
import { toast } from '../lib/toast';
import { MediaImage } from '../components/ui';
import MenuDrawer from '../components/MenuDrawer';
import ScreenHeader from '../components/ScreenHeader';
import Sheet from '../components/Sheet';
import ShareCardButton from '../components/ShareCardButton';
import { levelLabel, levelTitle, nextRank, rankRing } from '../lib/levels';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const ME_KEY = ['me'];

function LevelStrip() {
  const { t, i18n } = useTranslation();
  const { data: me } = useQuery({ queryKey: ME_KEY, queryFn: () => api.get('/api/me') });
  if (!me) return null;
  const xp = me.xp ?? 0;
  const level = me.level ?? 1;
  const pct = Math.round(((xp % 500) / 500) * 100);
  const rank = levelTitle(level);
  const next = nextRank(level);
  return (
    <div className="mt-3 w-56 max-w-full">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: `${rank.color}1A`, color: rank.color }}
          title={i18n.language.startsWith('ar') ? 'إطار صورتك بيتغير مع رتبتك' : 'Your avatar ring changes with your rank'}
        >
          <span aria-hidden>{rank.icon}</span> {levelLabel(level, i18n.language)} · {t('fun.level', { n: level })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-gray-500"><Flame size={12} className="text-orange-500" /> {me.currentStreak ?? 0}</span>
          {(me.streakFreezes ?? 0) > 0 && (
            <span
              title={t('profile.freezeHint')}
              className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-600"
            >
              🧊 ×{me.streakFreezes}
            </span>
          )}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="h-full rounded-full bg-brand-pink"
        />
      </div>
      <p className="mt-0.5 text-center text-[10px] text-gray-400">
        {next
          ? t('fun.nextRank', { xp: (next.level - level) * 500 - (xp % 500), rank: i18n.language.startsWith('ar') ? next.rank.titleAr : next.rank.title })
          : t('fun.maxRank')}
      </p>
      <div className="mt-2 flex justify-center">
        <ShareCardButton emoji={rank.icon} title={levelLabel(level, i18n.language)} subtitle={`${me.currentStreak ?? 0}-day streak`} />
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label, delay }: { to: string; icon: React.ReactNode; label: string; delay: number }) {
  return (
    <MotionLink
      to={to}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileTap={{ scale: 0.94 }}
      className="card-hover flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 shadow-sm"
    >
      {icon}
      <span className="w-full truncate text-center text-[11px] font-semibold">{label}</span>
    </MotionLink>
  );
}

/* ---------- Edit profile bottom sheet ---------- */

const FIELD = 'w-full rounded-xl bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-pink/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400';

function EditProfileSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: any }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const refreshUser = useAuth((s) => s.refreshUser);
  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '', gender: '' as '' | 'male' | 'female', birthYear: '', heightCm: '', weightKg: '' });

  useEffect(() => {
    if (open) {
      setForm({
        firstName: me?.firstName ?? '',
        lastName: me?.lastName ?? '',
        bio: me?.bio ?? '',
        gender: me?.gender ?? '',
        birthYear: me?.birthYear ? String(me.birthYear) : '',
        heightCm: me?.heightCm ? String(me.heightCm) : '',
        weightKg: me?.weightKg ? String(me.weightKg) : '',
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (form.firstName.trim() && form.firstName.trim() !== me?.firstName) body.firstName = form.firstName.trim();
      if (form.lastName.trim() && form.lastName.trim() !== me?.lastName) body.lastName = form.lastName.trim();
      if (form.bio.trim() !== (me?.bio ?? '')) body.bio = form.bio.trim();
      if (form.gender && form.gender !== me?.gender) body.gender = form.gender;
      const by = parseInt(form.birthYear, 10);
      if (Number.isFinite(by) && by !== me?.birthYear) body.birthYear = by;
      const h = parseInt(form.heightCm, 10);
      if (Number.isFinite(h) && h !== me?.heightCm) body.heightCm = h;
      const w = parseFloat(form.weightKg);
      if (Number.isFinite(w) && w !== me?.weightKg) body.weightKg = w;
      if (Object.keys(body).length === 0) return null;
      return api.patch('/api/me', body);
    },
    onSuccess: async (res) => {
      if (res) {
        qc.invalidateQueries({ queryKey: ME_KEY });
        await refreshUser();
        toast(t('profile.updated'), 'success');
      }
      onClose();
    },
    onError: () => toast(t('profile.saveFailed'), 'error'),
  });

  return (
    <Sheet open={open} onClose={onClose} label={t('profile.edit')}>
      <div className="px-5 pb-8 pt-3">
            <h2 className="text-lg font-extrabold uppercase">{t('profile.edit')}</h2>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>{t('profile.firstName')}</label>
                  <input className={FIELD} value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <label className={LABEL}>{t('profile.lastName')}</label>
                  <input className={FIELD} value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} autoComplete="family-name" />
                </div>
              </div>

              <div>
                <label className={LABEL}>{t('profile.bio')}</label>
                <textarea
                  className={`${FIELD} resize-none`}
                  rows={3}
                  maxLength={300}
                  placeholder={t('profile.bioPh')}
                  value={form.bio}
                  onChange={(e) => set('bio')(e.target.value)}
                />
                <p className="mt-0.5 text-end text-[10px] text-gray-400">{form.bio.length}/300</p>
              </div>

              <div>
                <label className={LABEL}>{t('profile.gender')}</label>
                <div className="flex gap-2">
                  {([['male', `♂ ${t('assess.sex.male')}`], ['female', `♀ ${t('assess.sex.female')}`]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set('gender')(val)}
                      className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${form.gender === val ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>{t('profile.birthYear')}</label>
                  <input className={FIELD} type="number" inputMode="numeric" placeholder="1995" value={form.birthYear} onChange={(e) => set('birthYear')(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>{t('profile.heightCm')}</label>
                  <input className={FIELD} type="number" inputMode="numeric" placeholder="175" value={form.heightCm} onChange={(e) => set('heightCm')(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>{t('profile.weightKg')}</label>
                  <input className={FIELD} type="number" inputMode="decimal" placeholder="70" value={form.weightKg} onChange={(e) => set('weightKg')(e.target.value)} />
                </div>
              </div>
            </div>

            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-pill btn-primary mt-6 w-full disabled:opacity-60">
              {save.isPending ? t('common.saving') : t('profile.saveChanges')}
            </button>
      </div>
    </Sheet>
  );
}

/* ---------- Page ---------- */

export default function Profile() {
  const user = useAuth((s) => s.user);
  const refreshUser = useAuth((s) => s.refreshUser);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ME_KEY, queryFn: () => api.get('/api/me') });

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const pickAvatar = async (n: number) => {
    try {
      await api.patch('/api/me', { avatarUrl: `/avatars/a${n}.svg` });
      qc.invalidateQueries({ queryKey: ME_KEY });
      await refreshUser();
      setAvatarOpen(false);
      toast(t('profile.avatarSet'), 'success');
    } catch {
      toast(t('profile.photoFailed'), 'error');
    }
  };

  const onAvatarFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (!res.ok) throw new Error('upload failed');
      const { mediaUrl } = await res.json();
      await api.patch('/api/me', { avatarUrl: mediaUrl });
      qc.invalidateQueries({ queryKey: ME_KEY });
      await refreshUser();
      toast('Photo updated', 'success');
    } catch {
      toast(t('profile.photoFailed'), 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const age = me?.birthYear ? new Date().getFullYear() - me.birthYear : null;
  const chips: { key: string; node: React.ReactNode }[] = [];
  if (me?.gender) chips.push({ key: 'gender', node: <>{me.gender === 'male' ? '♂' : '♀'} {me.gender === 'male' ? 'Male' : 'Female'}</> });
  if (age) chips.push({ key: 'age', node: <>{age} yrs</> });
  if (me?.heightCm) chips.push({ key: 'height', node: <><Ruler size={12} className="text-brand-teal" /> {me.heightCm} cm</> });
  if (me?.weightKg) chips.push({ key: 'weight', node: <><Weight size={12} className="text-brand-blue" /> {me.weightKg} kg</> });

  return (
    <div className="min-h-screen overflow-x-hidden pb-6">
      {/* Section tone: Profile owns teal. Same 28px curve as every other tab. */}
      <ScreenHeader tone="teal" padBottom="pb-16" className="text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">{t('profile.title')}</h1>
        {/* Drawer on every tab, not just Home. Mirrors the Settings link's slot. */}
        <div className="absolute start-3 flex h-10 w-10 items-center justify-center" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}>
          <MenuDrawer />
        </div>
        <Link to="/info" aria-label="Settings" className="absolute end-3 flex h-10 w-10 items-center justify-center" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 2.5rem)' }}><Settings size={22} /></Link>
      </ScreenHeader>

      <div className="-mt-12 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={spring} className="relative">
          {/* The ring is a rank cosmetic — it escalates with your tier. Plain white until we know the level. */}
          <MediaImage
            path={user?.avatarUrl}
            label={user?.firstName}
            className={`h-28 w-28 rounded-full ${typeof me?.level === 'number' ? rankRing(me.level) : 'ring-4 ring-white'}`}
            seed={1}
          />
          <button
            onClick={() => setAvatarOpen(true)}
            disabled={uploading}
            aria-label="Change photo"
            className="absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-white shadow-md ring-2 ring-white transition active:scale-90"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatarFile(e.target.files[0])} />
          {/* Photo or fitness avatar — a real choice, not an upload-only door. */}
          <Sheet open={avatarOpen} onClose={() => setAvatarOpen(false)} label={t('profile.avatarTitle')}>
            <div className="p-4 pb-6">
              <h3 className="text-base font-bold">{t('profile.avatarTitle')}</h3>
              <p className="mt-0.5 text-xs text-gray-400">{t('profile.avatarSub')}</p>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => pickAvatar(n)}
                    className={`overflow-hidden rounded-full ring-offset-2 transition active:scale-90 ${user?.avatarUrl === `/avatars/a${n}.svg` ? 'ring-2 ring-brand-pink' : ''}`}
                  >
                    <img src={`/avatars/a${n}.svg`} alt="" className="aspect-square w-full" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setAvatarOpen(false); fileRef.current?.click(); }}
                className="mt-5 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 font-bold text-white"
              >
                <Camera size={16} /> {t('profile.uploadPhoto')}
              </button>
            </div>
          </Sheet>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.08 }}
          className="mt-3 max-w-full break-words px-5 text-center text-xl font-bold uppercase"
        >
          {user?.firstName} {user?.lastName}
        </motion.p>
        {me?.bio && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-1 max-w-xs break-words px-5 text-center text-sm text-gray-500"
          >
            {me.bio}
          </motion.p>
        )}
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-1.5 px-5"
          >
            {chips.map((c) => (
              <span key={c.key} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-600 shadow-sm">
                {c.node}
              </span>
            ))}
          </motion.div>
        )}
        <LevelStrip />
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setEditOpen(true)}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-600 shadow-sm"
        >
          <Pencil size={12} className="text-brand-pink" /> {t('profile.edit')}
        </motion.button>
      </div>

      <p className="mt-6 px-5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('today.explore')}</p>
      <div className="mt-2 grid grid-cols-4 gap-2 px-5">
        <QuickLink to="/progress" icon={<TrendingUp className="text-brand-teal" />} label={t('tracker.progress')} delay={0.1} />
        <QuickLink to="/tracker" icon={<Flame className="text-brand-green" />} label={t('tracker.calories')} delay={0.15} />
        <QuickLink to="/achievements" icon={<Medal className="text-amber-500" />} label={t('profile.badges')} delay={0.2} />
        <QuickLink to="/meals" icon={<Dumbbell className="text-brand-blue" />} label={t('meals.title')} delay={0.25} />
      </div>

      {/* Invite friends — the referral page was buried in the drawer; give it a front door. */}
      <MotionLink
        to="/my-invite"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={spring}
        whileTap={{ scale: 0.97 }}
        className="mx-5 mt-5 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg,#34d399,#0d9488)' }}>
          <Gift size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{isAr ? 'اعزم صحابك' : 'Invite friends'}</span>
          <span className="block text-xs text-gray-500">{isAr ? 'انتوا الاتنين تكسبوا فريز للسلسلة 🎁' : 'You both earn streak freezes 🎁'}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
      </MotionLink>

      {/* Install card — shown until we know the app lives on the home screen. */}
      {installAvailable() && (
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={spring}
          whileTap={{ scale: 0.97 }}
          onClick={openInstall}
          className="mx-5 mt-5 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg,#fb923c,#ea580c)' }}>
            <Download size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t('install.title')}</span>
            <span className="block text-xs text-gray-500">{t('install.desc')}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </motion.button>
      )}

      <PartnerHubEntry />

      {/* Compact rows, not slabs — same information, half the visual weight. */}
      <div className="mt-5 space-y-2 px-5">
        <MotionLink
          to="/bookmarks"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
          transition={spring}
          whileTap={{ scale: 0.97 }}
          className="card-hover flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal"><Bookmark size={20} /></span>
          <span className="min-w-0 flex-1 text-sm font-bold">{t('profile.bookmarks')}</span>
          <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </MotionLink>

        <MotionLink
          to="/programs-done"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
          transition={{ ...spring, delay: 0.05 }}
          whileTap={{ scale: 0.97 }}
          className="card-hover flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal"><Dumbbell size={20} /></span>
          <span className="min-w-0 flex-1 text-sm font-bold">{t('profile.programsDone')}</span>
          <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </MotionLink>
      </div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} me={me} />
    </div>
  );
}

/** Shows only for users the admin linked to a partner — their door to the
 *  self-service dashboard (edit page + work leads). */
function PartnerHubEntry() {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ['partner-portal'], queryFn: () => api.get('/api/partner-portal/me'), staleTime: 5 * 60_000 });
  if (!data?.partner) return null;
  return (
    <div className="mt-5 px-5">
      <MotionLink
        to="/partner-hub"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-600 to-slate-800 p-4 text-white shadow-sm"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">🏪</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">{t('partnerHub.title')}</span>
          <span className="block truncate text-xs text-white/70">
            {data.newLeads > 0 ? t('partnerHub.entryNew', { n: data.newLeads }) : t('partnerHub.entrySub')}
          </span>
        </span>
        {data.newLeads > 0 && (
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-pink px-1.5 text-xs font-bold">{data.newLeads}</span>
        )}
      </MotionLink>
    </div>
  );
}
