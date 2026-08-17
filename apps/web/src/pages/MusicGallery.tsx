import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Music, Upload, Play, Pause, Star, Trash2, Globe } from 'lucide-react';
import { api, uploadWithAuth } from '../lib/api';
import { signedMediaUrl } from '../lib/media';
import { toast } from '../lib/toast';
import { useAuth } from '../store/auth';
import { Loader, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function MusicGallery() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [asDefault, setAsDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tracks, isLoading } = useQuery({ queryKey: ['music'], queryFn: () => api.get('/api/music') });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.[^.]+$/, ''));
      if (isAdmin && asDefault) fd.append('isDefault', 'true');
      const res = await uploadWithAuth('/api/music', fd);
      if (!res.ok) { toast(t('music.uploadFailed'), 'error'); return; }
      qc.invalidateQueries({ queryKey: ['music'] });
      toast(t('music.added'), 'success');
    } finally {
      setUploading(false);
    }
  };

  const fav = useMutation({ mutationFn: (id: string) => api.patch(`/api/music/${id}/favorite`), onSuccess: () => qc.invalidateQueries({ queryKey: ['music'] }) });
  const del = useMutation({ mutationFn: (id: string) => api.del(`/api/music/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['music'] }) });
  // Admin: promote an already-uploaded track to the everyone-default (the
  // upload-time checkbox is easy to miss, and re-uploading shouldn't be the fix).
  const isAr = useTranslation().i18n.language.startsWith('ar');
  const mkDefault = useMutation({
    mutationFn: (id: string) => api.patch(`/api/music/${id}/default`),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['music'] });
      toast(
        r.isDefault
          ? (isAr ? 'بقت الموسيقى الافتراضية للكل 🎵' : 'Now the default track for everyone 🎵')
          : (isAr ? 'رجعت مقطع شخصي' : 'Back to a personal track'),
        'success',
      );
    },
  });

  const toggle = async (id: string) => {
    const el = audioRef.current;
    if (!el) return;
    if (playing === id) { el.pause(); setPlaying(null); return; }
    el.src = await signedMediaUrl('audio', id);
    el.play().catch(() => {});
    setPlaying(id);
  };

  return (
    <div className="relative min-h-screen pb-10">
      <AmbientBg tone="cool" />
      <TopBar title={t('music.title')} color="fitness-hero" textColor="text-white" />
      <div className="px-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-pill btn-primary w-full">
          <Upload size={18} /> {uploading ? t('music.uploading') : t('music.upload')}
        </motion.button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {isAdmin && (
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} className="accent-brand-pink" />
            {t('music.defaultForAll')}
          </label>
        )}
        <p className="mt-2 text-xs text-gray-400">{t('music.starHint')}</p>
      </div>

      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      {isLoading ? (
        <Loader />
      ) : (
        <div className="mt-4 space-y-2 px-4">
          {(tracks ?? []).map((track: any, i: number) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: Math.min(i, 4) * 0.05 }}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
            >
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggle(track.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full btn-primary text-white">
                {playing === track.id ? <Pause size={18} /> : <Play size={18} />}
              </motion.button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{track.title}</p>
                <div className="flex gap-2">
                  {track.isDefault && <span className="text-[10px] font-bold uppercase text-brand-blue">{t('music.default')}</span>}
                  {track.favorite && <span className="text-[10px] font-bold uppercase text-brand-pink">{t('music.sessionPick')}</span>}
                </div>
              </div>
              {!track.isDefault && (
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => fav.mutate(track.id)} aria-label={t('music.setSession')} className="shrink-0">
                  <Star size={18} className={track.favorite ? 'fill-brand-pink text-brand-pink' : 'text-gray-300'} />
                </motion.button>
              )}
              {isAdmin && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => mkDefault.mutate(track.id)}
                  aria-label={isAr ? 'اجعلها الافتراضية للكل' : 'Make default for everyone'}
                  title={isAr ? 'اجعلها الافتراضية للكل' : 'Make default for everyone'}
                  className="shrink-0"
                >
                  <Globe size={18} className={track.isDefault ? 'text-brand-blue' : 'text-gray-300'} />
                </motion.button>
              )}
              {(!track.isDefault || isAdmin) && (
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => del.mutate(track.id)} className="shrink-0 text-gray-300 hover:text-red-500"><Trash2 size={18} /></motion.button>
              )}
            </motion.div>
          ))}
          {!tracks?.length && (
            <EmptyState icon={<Music size={40} />} title={t('music.empty')} hint={t('music.emptyHint')} />
          )}
        </div>
      )}
    </div>
  );
}
