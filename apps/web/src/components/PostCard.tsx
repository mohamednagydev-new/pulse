import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Trash2, Flag } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../store/auth';
import { useSignedMedia } from '../lib/media';
import { MediaImage } from './ui';
import CoachBadge from './CoachBadge';

// 👏 first — the cheer. One tap on a buddy's workout sends them a named
// "X cheered you" notification, which is the loop that brings people back.
const EMOJIS = ['👏', '💪', '🔥', '❤️'];

/** System milestones render as celebration banners, not plain text rows. */
const KIND_BANNER: Record<string, { grad: string; emoji: string }> = {
  completion: { grad: 'from-emerald-500 to-teal-600', emoji: '💪' },
  badge: { grad: 'from-amber-400 to-orange-500', emoji: '🏅' },
  levelup: { grad: 'from-pink-500 to-orange-500', emoji: '🎉' },
  challenge: { grad: 'from-blue-500 to-indigo-600', emoji: '🏆' },
};

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function PostVideo({ id }: { id: string }) {
  const src = useSignedMedia('video', id);
  return <video controls playsInline className="mt-3 max-h-96 w-full rounded-xl bg-black" src={src} />;
}

/** Turn each stored @name into a profile link. Mentions ride on the post as
 *  [{id,name}], so linking never guesses — an @ in plain prose stays text. */
function linkifyMentions(text: string, mentions?: { id: string; name: string }[] | null) {
  if (!mentions?.length) return text;
  const names = [...mentions]
    .sort((a, b) => b.name.length - a.name.length)
    .map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`@(${names.join('|')})`, 'g'));
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const m = mentions.find((x) => x.name === part);
      if (m) {
        return (
          <Link key={i} to={`/u/${m.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-brand-blue">
            @{part}
          </Link>
        );
      }
      return `@${part}`;
    }
    return part;
  });
}

export default function PostCard({ post, queryKey }: { post: any; queryKey: any[] }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const meId = useAuth((s) => s.user?.id);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const react = useMutation({
    mutationFn: (emoji: string) => api.post(`/api/social/posts/${post.id}/react`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const addComment = useMutation({
    mutationFn: (text: string) => api.post(`/api/social/posts/${post.id}/comments`, { text }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey });
    },
    // A closed announcement returns 410 — silence here left users typing into the void.
    onError: (e: any) => toast(e?.message || t('community.commentFailed'), 'error'),
  });
  const delPost = useMutation({
    mutationFn: () => api.del(`/api/social/posts/${post.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast(t('community.postDeleted'), 'success'); },
  });
  const delComment = useMutation({
    mutationFn: (cid: string) => api.del(`/api/social/comments/${cid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const report = useMutation({
    mutationFn: () => api.post(`/api/social/posts/${post.id}/report`, {}),
    onSuccess: () => toast(t('community.reported'), 'success'),
  });

  const mine = meId && post.user.id === meId;
  const name = `${post.user.firstName} ${post.user.lastName}`.trim();

  return (
    <div className="animate-fade-up card-hover rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link to={`/u/${post.user.id}`}>
          <MediaImage path={post.user.avatarUrl} label={post.user.firstName} className="h-10 w-10 rounded-full" seed={name.length} />
        </Link>
        <div className="flex-1">
          <Link to={`/u/${post.user.id}`} className="font-semibold">{name}</Link>
          {post.user.isCoach && <span className="ms-1"><CoachBadge verified={post.user.coachVerified} /></span>}
          <span className="ms-2 rounded-full bg-brand-pink/10 px-2 py-0.5 text-[10px] font-bold text-brand-pink">{t('common.lv', { n: post.user.level })}</span>
          <p className="text-[11px] text-gray-400">
            {post.pinned && <span className="me-1.5 rounded bg-amber-100 px-1.5 py-px text-[9px] font-bold text-amber-600">📌 {t('community.pinned')}</span>}
            {timeAgo(post.createdAt)}
          </p>
        </div>
        {/* Own post → delete; someone else's → report. Users shouldn't need an admin for either. */}
        {mine ? (
          <button
            onClick={() => window.confirm(t('community.deleteConfirm')) && delPost.mutate()}
            aria-label={t('common.delete', { defaultValue: 'Delete' })}
            className="shrink-0 p-1.5 text-gray-300 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <button
            onClick={() => window.confirm(t('community.reportConfirm')) && report.mutate()}
            aria-label={t('community.report')}
            className="shrink-0 p-1.5 text-gray-300 hover:text-amber-500"
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {(() => {
        // System posts carry both languages — show the reader's own.
        const text = i18n.language === 'ar' && post.textAr ? post.textAr : post.text;
        if (!text) return null;
        const banner = KIND_BANNER[post.kind];
        if (!banner) return <p className="mt-3 text-ink">{linkifyMentions(text, post.mentions)}</p>;
        const inner = (
          <div className={`mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-r ${banner.grad} p-3 text-white shadow-sm`}>
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-2xl"
            >
              {banner.emoji}
            </motion.span>
            <p className="min-w-0 flex-1 text-sm font-bold leading-snug">{text}</p>
          </div>
        );
        // Challenge banners deep-link into the room — the feed's highest-intent tap.
        return post.kind === 'challenge' && post.refId ? <Link to={`/challenge/${post.refId}`}>{inner}</Link> : inner;
      })()}

      {post.mediaType === 'image' && (
        <MediaImage path={post.mediaUrl} className="mt-3 max-h-96 w-full rounded-xl object-cover" seed={post.id.length} />
      )}
      {post.mediaType === 'video' && <PostVideo id={post.mediaUrl} />}

      {post.poll && <PollBlock post={post} queryKey={queryKey} />}

      <div className="mt-3 flex items-center gap-1">
        {EMOJIS.map((e) => {
          const count = post.reactions?.[e] ?? 0;
          const mine = post.myReaction === e;
          return (
            <button
              key={e}
              onClick={() => react.mutate(e)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${mine ? 'bg-brand-pink/10 ring-1 ring-brand-pink' : 'bg-gray-100'}`}
            >
              <span>{e}</span>
              {count > 0 && <span className="text-xs text-gray-500">{count}</span>}
            </button>
          );
        })}
        <button onClick={() => setShowComments((s) => !s)} className="ms-auto flex items-center gap-1 text-sm text-gray-400">
          <MessageCircle size={16} /> {post.commentCount ?? 0}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {(post.comments ?? []).map((c: any) => (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              <span className="font-semibold">{c.user.firstName}</span>
              <span className="min-w-0 flex-1 text-gray-600">{c.text}</span>
              {meId && c.user.id === meId && (
                <button onClick={() => delComment.mutate(c.id)} aria-label={t('common.delete', { defaultValue: 'Delete' })} className="shrink-0 text-gray-300">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-sm outline-none"
              placeholder={t('community.commentPh')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && comment.trim() && addComment.mutate(comment)}
            />
            <button onClick={() => comment.trim() && addComment.mutate(comment)} className="text-brand-pink"><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Poll block: tap to vote, bars afterwards; tapping another option changes
 *  the vote. Admin surveys («التحدي الجاي يبقى إيه؟») live right in the feed. */
function PollBlock({ post, queryKey }: { post: any; queryKey: any[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const poll = post.poll as { options: string[]; counts: number[]; total: number; myVote: number | null };
  const vote = useMutation({
    mutationFn: (option: number) => api.post(`/api/social/posts/${post.id}/vote`, { option }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const voted = poll.myVote !== null;
  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((opt, i) => {
        const pct = poll.total ? Math.round((poll.counts[i] / poll.total) * 100) : 0;
        const mine = poll.myVote === i;
        return (
          <button
            key={i}
            onClick={() => !vote.isPending && vote.mutate(i)}
            disabled={vote.isPending}
            className={`relative block w-full overflow-hidden rounded-xl border px-3 py-2.5 text-start text-sm font-semibold transition active:scale-[0.99] ${
              mine ? 'border-violet-400 text-violet-700' : 'border-gray-200 text-gray-700'
            }`}
          >
            {voted && (
              <span
                className={`absolute inset-y-0 start-0 ${mine ? 'bg-violet-100' : 'bg-gray-100'}`}
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{mine ? '✓ ' : ''}{opt}</span>
              {voted && <span className="shrink-0 text-xs font-extrabold tabular-nums">{pct}%</span>}
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-gray-400">🗳 {t('community.pollVotes', { n: poll.total })}</p>
    </div>
  );
}
