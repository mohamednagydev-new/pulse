import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Camera, Copy, Dumbbell, ExternalLink, Loader2, MessageCircle, Phone, QrCode, Save, Tv, Users } from 'lucide-react';
import { api, uploadWithAuth } from '../lib/api';
import { toast } from '../lib/toast';
import { Loader, MediaImage, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

const STATUS_FLOW: Record<string, string> = { new: 'contacted', contacted: 'won', won: 'lost', lost: 'new' };
const STATUS_TONE: Record<string, string> = {
  new: 'bg-blue-100 text-brand-blue',
  contacted: 'bg-amber-100 text-amber-600',
  won: 'bg-emerald-100 text-emerald-600',
  lost: 'bg-gray-100 text-gray-400',
};

/**
 * The partner's own dashboard: edit the public page (text, contact, images)
 * and work the leads pipeline — without going through the PULSE admin.
 */
export default function PartnerHub() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  /** Inline bilingual label for the new gym toolkit — no locale-file edits. */
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({ queryKey: ['partner-portal'], queryFn: () => api.get('/api/partner-portal/me') });
  const { data: leads } = useQuery({
    queryKey: ['partner-leads'],
    queryFn: () => api.get('/api/partner-portal/leads'),
    enabled: !!data?.partner,
  });

  // ---- Gym toolkit (only for type=gym partners) ----
  const isGym = data?.partner?.type === 'gym';
  // POST is get-or-create and idempotent, so it is safe as a query fn.
  const { data: invite } = useQuery({
    queryKey: ['gym-invite-code'],
    queryFn: () => api.post('/api/org/gym/code'),
    enabled: isGym,
    staleTime: Infinity,
  });
  const { data: gymStats } = useQuery({
    queryKey: ['gym-analytics'],
    queryFn: () => api.get('/api/org/gym/mine/analytics'),
    enabled: isGym,
  });
  // The no-QR membership path: «أنا بتمرن هنا» requests waiting for a yes/no.
  const { data: joinRequests } = useQuery({
    queryKey: ['gym-join-requests'],
    queryFn: () => api.get('/api/org/gym/mine/join-requests'),
    enabled: isGym,
    refetchInterval: 60_000,
  });
  const decideRequest = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'decline' }) =>
      api.post(`/api/org/gym/join-requests/${id}/${action}`, {}),
    onSuccess: (_r, v) => {
      toast(v.action === 'approve' ? L('Member approved 🏋️', 'تم اعتماد العضو 🏋️') : L('Request declined', 'تم رفض الطلب'), 'success');
      qc.invalidateQueries({ queryKey: ['gym-join-requests'] });
      qc.invalidateQueries({ queryKey: ['gym-analytics'] });
    },
  });

  const copyInvite = async () => {
    if (!invite?.url) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      toast(L('Link copied!', 'اتنسخ اللينك!'), 'success');
    } catch {
      toast(invite.url, 'info');
    }
  };

  useEffect(() => {
    if (data?.partner && !form) {
      const p = data.partner;
      setForm({
        tagline: p.tagline ?? '', taglineAr: p.taglineAr ?? '',
        description: p.description ?? '', descriptionAr: p.descriptionAr ?? '',
        phone: p.phone ?? '', whatsapp: p.whatsapp ?? '', website: p.website ?? '',
        instagram: p.instagram ?? '', mapUrl: p.mapUrl ?? '', address: p.address ?? '',
      });
    }
  }, [data, form]);

  const save = useMutation({
    mutationFn: () => api.patch('/api/partner-portal/me', form),
    onSuccess: () => { toast(t('partnerHub.saved'), 'success'); qc.invalidateQueries({ queryKey: ['partner-portal'] }); },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/partner-portal/leads/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-leads'] }),
  });

  const uploadImage = async (kind: 'logo' | 'cover', file: File) => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (!res.ok) throw new Error('upload failed');
      const { mediaUrl } = await res.json();
      await api.patch('/api/partner-portal/me', { [kind]: mediaUrl });
      qc.invalidateQueries({ queryKey: ['partner-portal'] });
      toast(t('partnerHub.saved'), 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Failed', 'error');
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) return <Loader />;

  if (!data?.partner) {
    return (
      <div className="min-h-screen pb-10">
        <TopBar title={t('partnerHub.title')} color="bg-gradient-to-b from-slate-600 to-slate-800" textColor="text-white" />
        <EmptyState icon={<Phone size={40} />} title={t('partnerHub.noneTitle')} hint={t('partnerHub.noneHint')} />
      </div>
    );
  }

  const p = data.partner;
  const F = (name: string, label: string, textarea = false) => (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-500">{label}</span>
      {textarea ? (
        <textarea className="input-field rounded-2xl" rows={3} value={form?.[name] ?? ''} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
      ) : (
        <input className="input-field" value={form?.[name] ?? ''} onChange={(e) => setForm({ ...form, [name]: e.target.value })} />
      )}
    </label>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="cool" />
      <TopBar title={t('partnerHub.title')} color="bg-gradient-to-b from-slate-600 to-slate-800" textColor="text-white" />

      {/* Identity + images */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="relative h-28 bg-gray-100">
          {p.cover && <MediaImage path={p.cover} label="" className="h-28 w-full" />}
          <button
            onClick={() => coverRef.current?.click()}
            className="absolute bottom-2 end-2 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            {uploading === 'cover' ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />} {t('partnerHub.cover')}
          </button>
        </div>
        <div className="flex items-center gap-3 p-4">
          <div className="relative shrink-0">
            <MediaImage path={p.logo} label={p.name} className="h-14 w-14 rounded-xl" />
            <button
              onClick={() => logoRef.current?.click()}
              aria-label={t('partnerHub.logo')}
              className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue text-white ring-2 ring-white"
            >
              {uploading === 'logo' ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{p.name}</p>
            <p className="text-xs text-gray-400">{t('partnerHub.leadsSummary', { total: data.totalLeads, fresh: data.newLeads })}</p>
          </div>
          <Link to={`/partner/${p.id}`} className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
            <ExternalLink size={12} /> {t('partnerHub.viewPage')}
          </Link>
        </div>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage('logo', e.target.files[0])} />
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage('cover', e.target.files[0])} />
      </motion.section>

      {/* ---- Gym toolkit: invite card, analytics, TV board ---- */}
      {isGym && (
        <>
          {/* Invite-code card */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.03 }}
            className="scene-tex mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/90 to-indigo-700/80 p-4 text-white shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><QrCode size={18} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold">{L('Your gym invite link', 'لينك دعوة الجيم بتاعك')}</h2>
                <p className="text-[11px] text-white/70">
                  {L('Members who scan it join your gym board', 'اللي يعمل سكان بينضم للوحة جيمك على طول')}
                </p>
              </div>
            </div>
            {invite?.url ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(invite.url)}`}
                    alt="QR"
                    className="h-24 w-24 shrink-0 rounded-xl bg-white p-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate rounded-xl bg-black/25 px-3 py-2 text-[11px] font-bold" dir="ltr">{invite.url}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={copyInvite} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white/20 px-3 py-2 text-xs font-bold">
                        <Copy size={13} /> {L('Copy', 'انسخ')}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(L(`Join our gym on PULSE: ${invite.url}`, `انضم لجيمنا على PULSE: ${invite.url}`))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold"
                      >
                        <MessageCircle size={13} /> {L('WhatsApp', 'واتساب')}
                      </a>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-white/70">
                  {L('Print the QR and put it at the front desk 🖨️', 'اطبع الـQR وحطها على الاستقبال 🖨️')}
                </p>
              </>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-white/70"><Loader2 size={14} className="animate-spin" /> …</div>
            )}
          </motion.section>

          {/* Membership requests — people who tapped «أنا بتمرن هنا» on the
              gym page. Approval is what actually adds them to the board. */}
          {(joinRequests?.length ?? 0) > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.04 }}
              className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm"
            >
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Users size={15} /> {L('Membership requests', 'طلبات الانضمام')}
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-600">
                  {joinRequests.length}
                </span>
              </h2>
              <div className="mt-3 space-y-2">
                {joinRequests.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-2.5">
                    <MediaImage path={r.user.avatarUrl} label={r.user.firstName} className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.user.firstName} {r.user.lastName}</p>
                      <p className="text-[11px] text-gray-400">
                        {L('Level', 'مستوى')} {r.user.level}{r.user.currentStreak > 0 ? ` · ${r.user.currentStreak}🔥` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => decideRequest.mutate({ id: r.id, action: 'approve' })}
                      disabled={decideRequest.isPending}
                      className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-white"
                    >
                      {L('Approve', 'اعتمد')}
                    </button>
                    <button
                      onClick={() => decideRequest.mutate({ id: r.id, action: 'decline' })}
                      disabled={decideRequest.isPending}
                      className="shrink-0 rounded-full bg-gray-200 px-3 py-2 text-xs font-bold text-gray-500"
                    >
                      {L('No', 'لا')}
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Analytics tiles */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm"
          >
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <Users size={15} /> {L('Your members this week', 'أعضاءك الأسبوع ده')}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { v: gymStats?.members, label: L('Members', 'الأعضاء'), tone: 'text-brand-blue bg-blue-50' },
                { v: gymStats?.joinedThisMonth, label: L('Joined this month', 'انضموا الشهر ده'), tone: 'text-violet-600 bg-violet-50' },
                {
                  v: gymStats != null ? `${gymStats.active7d} (${gymStats.active7dPct}%)` : undefined,
                  label: L('Active last 7 days', 'نشطين آخر ٧ أيام'),
                  tone: 'text-emerald-600 bg-emerald-50',
                },
                { v: gymStats?.workoutsThisWeek, label: L('Workouts this week', 'تمرينات الأسبوع ده'), tone: 'text-orange-600 bg-orange-50' },
              ].map((tile, i) => (
                <div key={i} className={`rounded-xl p-3 ${tile.tone.split(' ')[1]}`}>
                  <p className={`text-xl font-extrabold tabular-nums ${tile.tone.split(' ')[0]}`} dir="ltr">{tile.v ?? '—'}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-gray-500">{tile.label}</p>
                </div>
              ))}
            </div>
            {(gymStats?.atRisk?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-extrabold text-rose-600">
                  {L('Gone quiet — give them a call 📞', 'ناس مختفية — كلمهم 📞')}
                </h3>
                <div className="mt-2 space-y-1.5">
                  {gymStats.atRisk.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2">
                      <MediaImage path={m.avatarUrl} label={`${m.firstName} ${m.lastName}`} className="h-8 w-8 rounded-full" />
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{m.firstName} {m.lastName}</p>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
                        {isAr ? `غايب ${m.daysQuiet} يوم` : `${m.daysQuiet}d quiet`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* TV board card */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.07 }}
            className="mx-4 mt-4"
          >
            <Link
              to={`/tv/${p.id}`}
              className="scene-tex flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-700/95 to-slate-900/90 p-4 text-white shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><Tv size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{L('Show the board on your gym TV', 'اعرض اللوحة على شاشة الجيم')}</span>
                <span className="mt-0.5 block text-[11px] text-white/70">
                  {L('Weekly champions, live — opens in any TV browser, no login', 'أبطال الأسبوع لايف — بتشتغل على أي متصفح تلفزيون من غير تسجيل دخول')}
                </span>
              </span>
              <Dumbbell size={18} className="shrink-0 text-white/50" />
            </Link>
          </motion.section>
        </>
      )}

      {/* Page content */}
      {form && (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }} className="mx-4 mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700">📝 {t('partnerHub.pageSection')}</h2>
          {F('taglineAr', t('partnerHub.taglineAr'))}
          {F('descriptionAr', t('partnerHub.descriptionAr'), true)}
          {F('tagline', t('partnerHub.tagline'))}
          {F('description', t('partnerHub.description'), true)}
          <h2 className="pt-1 text-sm font-bold text-gray-700">📞 {t('partnerHub.contactSection')}</h2>
          {F('phone', t('partnerHub.phone'))}
          {F('whatsapp', t('partnerHub.whatsapp'))}
          {F('address', t('partnerHub.address'))}
          {F('mapUrl', t('partnerHub.mapUrl'))}
          {F('website', t('partnerHub.website'))}
          {F('instagram', t('partnerHub.instagram'))}
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-pill btn-primary w-full disabled:opacity-60"
          >
            <Save size={16} /> {save.isPending ? '…' : t('common.save')}
          </button>
        </motion.section>
      )}

      {/* Leads pipeline */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }} className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700">📬 {t('partnerHub.leadsSection')}</h2>
        <p className="mt-0.5 text-[11px] text-gray-400">{t('partnerHub.leadsHint')}</p>
        <div className="mt-3 space-y-2">
          {(leads ?? []).map((l: any) => (
            <div key={l.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold">{l.name}</p>
                <button
                  onClick={() => setStatus.mutate({ id: l.id, status: STATUS_FLOW[l.status] ?? 'contacted' })}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[l.status] ?? STATUS_TONE.new}`}
                >
                  {t(`partnerHub.status.${l.status}`)}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                <a href={`tel:${l.phone}`} className="font-bold text-brand-blue" dir="ltr">{l.phone}</a>
                {l.city ? ` · ${l.city}` : ''} · {l.form?.titleAr ?? l.form?.title}
              </p>
              {l.note && <p className="mt-1 text-xs text-gray-400">{l.note}</p>}
            </div>
          ))}
          {(leads ?? []).length === 0 && <p className="py-6 text-center text-sm text-gray-400">{t('partnerHub.noLeads')}</p>}
        </div>
      </motion.section>
    </div>
  );
}
