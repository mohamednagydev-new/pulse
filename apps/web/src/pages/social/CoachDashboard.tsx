import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Check, X, Dumbbell, UserPlus, ImagePlus, Video as VideoIcon } from 'lucide-react';
import { api, uploadWithAuth } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Loader, MediaImage, EmptyState, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';

interface Ex { name: string; sets: string; reps: string }

export default function CoachDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: me, isError: meError, error: meErr, refetch: refetchMe } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const meId = user?.id;

  const { data: workouts } = useQuery({ queryKey: ['coach-workouts', meId], queryFn: () => api.get(`/api/coach/${meId}/workouts`), enabled: !!meId && !!me?.isCoach });
  const { data: requests } = useQuery({ queryKey: ['coach-requests'], queryFn: () => api.get('/api/coach/requests'), enabled: !!me?.isCoach });
  const { data: clients } = useQuery({ queryKey: ['coach-clients'], queryFn: () => api.get('/api/coach/clients'), enabled: !!me?.isCoach });
  const { data: programs } = useQuery({ queryKey: ['coach-programs', meId], queryFn: () => api.get(`/api/coach/${meId}/programs`), enabled: !!meId && !!me?.isCoach });

  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [exercises, setExercises] = useState<Ex[]>([{ name: '', sets: '3 sets', reps: '10-12 reps' }]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);

  // Same upload pipe as community posts — images stored as-is, videos
  // transcoded to mobile-safe H.264 with a poster on the server.
  const uploadMedia = async (file: File, kind: 'image' | 'video') => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (!res.ok) throw new Error('upload failed');
      const j = await res.json();
      if (kind === 'image') setCoverImage(j.mediaUrl);
      else setVideoId(j.mediaUrl);
      toast(t('coach.mediaReady'), 'success');
    } catch {
      toast(t('profile.photoFailed'), 'error');
    } finally {
      setUploading(null);
    }
  };
  const [pTitle, setPTitle] = useState('');
  const [pDays, setPDays] = useState<{ label: string; workoutId: string }[]>([{ label: 'Day 1', workoutId: '' }]);

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/coach/workouts', {
        title,
        muscleFocus: focus,
        exercises: exercises.filter((e) => e.name.trim()),
        ...(coverImage ? { coverImage } : {}),
        ...(videoId ? { videoId } : {}),
      }),
    onSuccess: () => {
      setTitle(''); setFocus(''); setExercises([{ name: '', sets: '3 sets', reps: '10-12 reps' }]);
      setCoverImage(null); setVideoId(null);
      qc.invalidateQueries({ queryKey: ['coach-workouts', meId] });
      toast(t('coach.workoutPublished'), 'success');
    },
  });
  const del = useMutation({ mutationFn: (id: string) => api.del(`/api/coach/workouts/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-workouts', meId] }) });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => api.post(`/api/coach/requests/${id}/${action}`),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['coach-requests'] });
      qc.invalidateQueries({ queryKey: ['coach-clients'] });
      toast(v.action === 'accept' ? t('coach.clientAccepted') : t('coach.requestDeclined'), 'success');
    },
  });
  const createProg = useMutation({
    mutationFn: () => api.post('/api/coach/programs', { title: pTitle, days: pDays.filter((d) => d.workoutId) }),
    onSuccess: () => {
      setPTitle(''); setPDays([{ label: 'Day 1', workoutId: '' }]);
      qc.invalidateQueries({ queryKey: ['coach-programs', meId] });
      toast(t('coach.programPublished'), 'success');
    },
  });
  const delProg = useMutation({ mutationFn: (id: string) => api.del(`/api/coach/programs/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-programs', meId] }) });

  // A failed /api/me used to leave this on the skeleton forever.
  if (meError)
    return (
      <div className="min-h-screen">
        <TopBar title={t('coach.title')} color="fitness-hero" textColor="text-white" />
        <ErrorMsg error={meErr} onRetry={() => refetchMe()} />
      </div>
    );
  if (!me) return <Loader />;

  if (!me.isCoach) {
    return (
      <div className="min-h-screen">
        <TopBar title={t('coach.title')} color="fitness-hero" textColor="text-white" />
        <EmptyState
          icon={<Dumbbell size={40} />}
          title={t('coach.notYet')}
          hint={t('coach.notYetHint')}
          action={<Link to="/coach-profile" className="btn-pill btn-primary px-6"><UserPlus size={16} /> {t('coach.become')}</Link>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={t('coach.dashboard')} color="fitness-hero" textColor="text-white" />

      {/* Pending requests */}
      {!!requests?.length && (
        <section className="mb-5 px-4">
          <h2 className="mb-2 font-bold">{t('coach.requests')}</h2>
          <div className="space-y-2">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <MediaImage path={r.client?.avatarUrl} label={r.client?.firstName} className="h-10 w-10 rounded-full" seed={2} />
                <span className="flex-1 text-sm font-semibold">{r.client?.firstName} {r.client?.lastName}</span>
                <button onClick={() => act.mutate({ id: r.id, action: 'accept' })} className="flex h-9 w-9 items-center justify-center rounded-full btn-green"><Check size={16} /></button>
                <button onClick={() => act.mutate({ id: r.id, action: 'decline' })} className="flex h-9 w-9 items-center justify-center rounded-full btn-ghost"><X size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clients */}
      {!!clients?.length && (
        <section className="mb-5 px-4">
          <h2 className="mb-2 font-bold">{t('coach.myClients')} · {clients.length}</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {clients.map((c: any) => (
              <Link key={c.id} to={`/u/${c.id}`} className="w-20 shrink-0 text-center">
                <MediaImage path={c.avatarUrl} label={c.firstName} className="mx-auto h-14 w-14 rounded-full" seed={c.id.length} />
                <p className="mt-1 truncate text-xs font-medium">{c.firstName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Create workout */}
      <section className="px-4">
        <h2 className="mb-2 font-bold">{t('coach.newWorkout')}</h2>
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <input className="input-field" placeholder={t('coach.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input-field" placeholder={t('coach.focusPh')} value={focus} onChange={(e) => setFocus(e.target.value)} />
          {/* Cover + intro video — the media that makes a workout look bought, not typed. */}
          <div className="flex gap-2">
            <label className={`flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${coverImage ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
              <ImagePlus size={14} /> {uploading === 'image' ? '…' : coverImage ? t('coach.coverReady') : t('coach.addCover')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0], 'image')} />
            </label>
            <label className={`flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${videoId ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
              <VideoIcon size={14} /> {uploading === 'video' ? t('coach.uploadingVideo') : videoId ? t('coach.videoReady') : t('coach.addVideo')}
              <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0], 'video')} />
            </label>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, idx) => (
              <div key={idx} className="flex gap-2">
                <input className="input-field flex-1" placeholder={t('coach.exercisePh')} value={ex.name} onChange={(e) => setExercises((a) => a.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                <input className="input-field w-20 px-2" placeholder={t('coach.setsPh')} value={ex.sets} onChange={(e) => setExercises((a) => a.map((x, i) => (i === idx ? { ...x, sets: e.target.value } : x)))} />
                <input className="input-field w-24 px-2" placeholder={t('coach.repsPh')} value={ex.reps} onChange={(e) => setExercises((a) => a.map((x, i) => (i === idx ? { ...x, reps: e.target.value } : x)))} />
                {exercises.length > 1 && <button onClick={() => setExercises((a) => a.filter((_, i) => i !== idx))} className="text-gray-300"><Trash2 size={16} /></button>}
              </div>
            ))}
          </div>
          <button onClick={() => setExercises((a) => [...a, { name: '', sets: '3 sets', reps: '10-12 reps' }])} className="flex items-center gap-1 text-sm font-semibold text-brand-blue"><Plus size={16} /> {t('coach.addExercise')}</button>
          <button onClick={() => title.trim() && create.mutate()} disabled={create.isPending} className="btn-pill btn-primary w-full">{t('coach.publishWorkout')}</button>
        </div>
      </section>

      {/* My workouts */}
      <section className="mt-5 px-4">
        <h2 className="mb-2 font-bold">{t('coach.myWorkouts')}</h2>
        <div className="space-y-2">
          {(workouts ?? []).map((w: any) => (
            <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex-1">
                <p className="font-semibold">{w.title}</p>
                <p className="text-xs text-gray-400">{w.muscleFocus} · {t('group.exercisesCount', { n: w.exercises.length })}</p>
              </div>
              <button onClick={() => navigate(`/session/w/${w.id}`)} className="flex h-9 w-9 items-center justify-center rounded-full btn-primary"><Play size={16} /></button>
              <button onClick={() => del.mutate(w.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          ))}
          {!workouts?.length && <p className="py-6 text-center text-sm text-gray-400">{t('coach.noWorkouts')}</p>}
        </div>
      </section>

      {/* Multi-day programs */}
      <section className="mt-6 px-4">
        <h2 className="mb-2 font-bold">{t('coach.buildProgram')}</h2>
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <input className="input-field" placeholder={t('coach.programTitlePh')} value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
          <div className="space-y-2">
            {pDays.map((d, idx) => (
              <div key={idx} className="flex gap-2">
                <input className="input-field w-24 px-2" placeholder={t('coach.dayPh')} value={d.label} onChange={(e) => setPDays((a) => a.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                <select className="input-field flex-1 px-2" value={d.workoutId} onChange={(e) => setPDays((a) => a.map((x, i) => (i === idx ? { ...x, workoutId: e.target.value } : x)))}>
                  <option value="">{t('coach.pickWorkout')}</option>
                  {(workouts ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.title}</option>)}
                </select>
                {pDays.length > 1 && <button onClick={() => setPDays((a) => a.filter((_, i) => i !== idx))} className="text-gray-300"><Trash2 size={16} /></button>}
              </div>
            ))}
          </div>
          <button onClick={() => setPDays((a) => [...a, { label: `Day ${a.length + 1}`, workoutId: '' }])} className="flex items-center gap-1 text-sm font-semibold text-brand-blue"><Plus size={16} /> {t('coach.addDay')}</button>
          <button onClick={() => pTitle.trim() && pDays.some((d) => d.workoutId) && createProg.mutate()} disabled={createProg.isPending} className="btn-pill btn-primary w-full">{t('coach.publishProgram')}</button>
          {!workouts?.length && <p className="text-xs text-gray-400">{t('coach.workoutsFirst')}</p>}
        </div>
        {!!programs?.length && (
          <div className="mt-3 space-y-2">
            {programs.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex-1"><p className="font-semibold">{p.title}</p><p className="text-xs text-gray-400">{t('coach.daysCount', { n: p.days.length })}</p></div>
                <button onClick={() => navigate(`/coach-program/${p.id}`)} className="flex h-9 w-9 items-center justify-center rounded-full btn-primary"><Play size={16} /></button>
                <button onClick={() => delProg.mutate(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
