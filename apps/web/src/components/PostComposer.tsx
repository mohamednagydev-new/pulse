import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, BarChart3, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { api, uploadWithAuth } from '../lib/api';
import { toast } from '../lib/toast';
import { MediaImage } from './ui';
import Avatar from './Avatar';
import Sheet from './Sheet';

type Tagged = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };

/**
 * Full-height post composer in a bottom sheet — the inline feed strip was a
 * one-line input with no room to think. Here: a real textarea, media preview,
 * admin polls, and friend tagging (buddies get a notification).
 * `draft` seeds the textarea (the daily-prompt chip passes the question in).
 */
export default function PostComposer({
  open, onClose, draft, isAdmin, onPosted,
}: {
  open: boolean;
  onClose: () => void;
  draft?: string;
  isAdmin: boolean;
  onPosted: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<{ mediaType: string; mediaUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [tagged, setTagged] = useState<Tagged[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Seed the draft each time the sheet opens (prompt chip → prefilled question).
  useEffect(() => {
    if (open) {
      setText(draft ?? '');
      setTimeout(() => areaRef.current?.focus(), 250); // after the sheet animates in
    }
  }, [open, draft]);

  const { data: buddies } = useQuery<Tagged[]>({
    queryKey: ['buddies'],
    queryFn: () => api.get('/api/social/buddies'),
    enabled: open && tagOpen,
  });

  const reset = () => {
    setText(''); setMedia(null); setPollOptions(null); setTagged([]); setTagOpen(false); setTagSearch('');
  };

  const post = useMutation({
    mutationFn: () => {
      const poll = pollOptions?.map((o) => o.trim()).filter(Boolean);
      return api.post('/api/social/posts', {
        text,
        ...(media ?? {}),
        ...(poll && poll.length >= 2 ? { poll } : {}),
        ...(tagged.length ? { mentions: tagged.map((u) => u.id) } : {}),
      });
    },
    onSuccess: () => {
      reset();
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast(L('Posted ✅', 'اتنشر ✅'), 'success');
      onPosted();
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (res.ok) setMedia(await res.json());
      else toast(L('Upload failed — try a smaller file', 'الرفع فشل — جرّب ملف أصغر'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const addTag = (u: Tagged) => {
    if (tagged.some((x) => x.id === u.id)) return;
    setTagged([...tagged, u]);
    setText((v) => (v.endsWith(' ') || v === '' ? v : v + ' ') + `@${u.firstName} `);
    setTagOpen(false);
    setTagSearch('');
    areaRef.current?.focus();
  };

  const canPost = !post.isPending && !uploading && (text.trim() || media);
  const filteredBuddies = (buddies ?? []).filter(
    (b) => !tagged.some((x) => x.id === b.id) && `${b.firstName} ${b.lastName}`.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  return (
    <Sheet open={open} onClose={() => !uploading && !post.isPending && onClose()} label={L('New post', 'بوست جديد')}>
      <div className="px-4 pb-4">
        <textarea
          ref={areaRef}
          className="min-h-[130px] w-full resize-none rounded-2xl bg-gray-100 p-4 text-[15px] outline-none placeholder:text-gray-400"
          placeholder={t('community.sharePh')}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-1 text-end text-[10px] text-gray-300">{text.length}/500</p>

        {/* Tagged friends */}
        {tagged.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tagged.map((u) => (
              <span key={u.id} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand-blue">
                @{u.firstName}
                <button onClick={() => setTagged(tagged.filter((x) => x.id !== u.id))} aria-label="Remove tag"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Media preview */}
        {media && (
          <div className="relative mb-2 w-fit">
            {media.mediaType === 'image' ? (
              <MediaImage path={media.mediaUrl} className="h-28 w-28 rounded-xl object-cover" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">🎬 {L('Video ready', 'الفيديو جاهز')}</div>
            )}
            <button onClick={() => setMedia(null)} aria-label="Remove media" className="absolute -end-2 -top-2 rounded-full bg-black/70 p-1.5 text-white"><X size={12} /></button>
          </div>
        )}

        {/* Poll builder (admin) */}
        {pollOptions && (
          <div className="mb-2 space-y-1.5">
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                className="w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none"
                placeholder={`${t('community.pollOption')} ${i + 1}`}
                value={opt}
                maxLength={80}
                onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))}
              />
            ))}
            {pollOptions.length < 4 && (
              <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-violet-500">
                + {t('community.pollAddOption')}
              </button>
            )}
          </div>
        )}

        {/* Tag picker */}
        {tagOpen && (
          <div className="mb-2 rounded-2xl border border-gray-100 p-2">
            <input
              className="mb-1 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none"
              placeholder={L('Search buddies…', 'دوّر على أصحابك…')}
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filteredBuddies.map((b) => (
                <button key={b.id} onClick={() => addTag(b)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start hover:bg-gray-50">
                  <Avatar path={b.avatarUrl ?? undefined} name={b.firstName} className="h-7 w-7" />
                  <span className="text-sm font-semibold">{b.firstName} {b.lastName}</span>
                </button>
              ))}
              {!filteredBuddies.length && (
                <p className="px-2 py-3 text-center text-xs text-gray-400">
                  {L('No buddies to tag yet — connect with people first', 'مفيش أصحاب تعملهم منشن لسه — اعمل صحاب الأول')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500" aria-label={t('community.addMedia')}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
          <button onClick={() => { setTagOpen(!tagOpen); }} className={`flex h-10 w-10 items-center justify-center rounded-full ${tagOpen || tagged.length ? 'bg-blue-50 text-brand-blue' : 'bg-gray-100 text-gray-500'}`} aria-label={L('Tag friends', 'منشن أصحابك')}>
            <AtSign size={18} />
          </button>
          {isAdmin && (
            <button onClick={() => setPollOptions(pollOptions ? null : ['', ''])} className={`flex h-10 w-10 items-center justify-center rounded-full ${pollOptions ? 'bg-violet-50 text-violet-500' : 'bg-gray-100 text-gray-500'}`} aria-label={t('community.addPoll')}>
              <BarChart3 size={18} />
            </button>
          )}
          <button
            onClick={() => canPost && post.mutate()}
            disabled={!canPost}
            className="btn-pill btn-primary ms-auto flex-1 disabled:opacity-50"
          >
            {post.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {L('Post', 'انشر')}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    </Sheet>
  );
}
