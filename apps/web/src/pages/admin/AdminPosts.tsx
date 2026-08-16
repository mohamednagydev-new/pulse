import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Send, CalendarClock, ImagePlus, Sparkles } from 'lucide-react';
import { api, getAccessToken } from '../../lib/api';
import { Loader, MediaImage } from '../../components/ui';
import { toast } from '../../lib/toast';

/** Daily posting loop without leaving the app: 3 suggested captions (AI when
 *  configured, else content-aware rotation) → edit → attach image → post or
 *  schedule straight to the Facebook Page. */

interface Suggestion { label: string; caption: string }

export default function AdminPosts() {
  const { data: status } = useQuery({ queryKey: ['fb-status'], queryFn: () => api.get('/api/admin/fb/status') });
  const {
    data: sugg,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<{ source: string; posts: Suggestion[] }>({
    queryKey: ['fb-suggestions'],
    queryFn: () => api.get('/api/admin/fb/suggestions'),
    staleTime: 10 * 60_000,
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Posts</h1>
        <span className="ms-auto text-xs text-white/60">
          {status?.configured ? `→ ${status.pageName ?? 'Facebook Page'}` : 'FB not configured'}
        </span>
      </header>

      {!status?.configured && (
        <p className="m-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
          Set FB_PAGE_ID and FB_PAGE_TOKEN in the server .env to enable posting. Suggestions still work.
        </p>
      )}

      <BroadcastCard />

      <div className="flex items-center justify-between px-4 pt-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
          <Sparkles size={15} className="text-brand-pink" />
          Today's suggestions {sugg ? `· ${sugg.source === 'ai' ? 'AI' : 'rotation'}` : ''}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-gray-600 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-4 p-4">
          {(sugg?.posts ?? []).map((p, i) => (
            <PostCardEditor key={`${sugg?.source}-${i}-${p.label}`} suggestion={p} canPost={!!status?.configured} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Ready-made attractive broadcasts — tap ✨ to cycle and fill all fields. */
const BROADCAST_IDEAS = [
  { title: 'Your streak misses you 🔥', titleAr: 'سلسلتك واحشاها 🔥', body: 'One 15-minute workout today keeps it alive. Tap a muscle and go.', bodyAr: 'تمرين ١٥ دقيقة النهارده يكفي عشان تفضل مكمّل. دوس على العضلة ويلا.', url: '/workout' },
  { title: "Today's plan is waiting 💪", titleAr: 'خطتك النهارده مستنياك 💪', body: "Your session is ready — finish it before the day finishes you.", bodyAr: 'جلستك جاهزة — خلّصها قبل ما اليوم يخلص عليك 😄', url: '/' },
  { title: 'Challenge your friend ⚔️', titleAr: 'اتحدى صاحبك ⚔️', body: 'A 7-day duel: whoever trains more takes the XP. Pick your victim.', bodyAr: 'تحدي ٧ أيام: اللي يتمرن أكتر ياخد النقط. اختار ضحيتك 😏', url: '/buddies' },
  { title: 'The league settles Saturday 🏅', titleAr: 'الدوري بيتحسم السبت 🏅', body: 'Top 5 promote. Every workout this week counts double for your pride.', bodyAr: 'أول ٥ بيصعدوا. كل تمرينة الأسبوع ده بتفرق — فين مركزك دلوقتي؟', url: '/leagues' },
  { title: "Tonight's healthy recipe 😋", titleAr: 'وصفة النهارده 😋', body: 'Quick, Egyptian, with real calorie counts. Dinner is solved.', bodyAr: 'سريعة ومصرية وبسعراتها الحقيقية. العشا اتحل.', url: '/wellness/kitchen' },
  { title: 'Weekend ≠ day off 😄', titleAr: 'الويك اند مش إجازة من جسمك 😄', body: '20 minutes today and you own the weekend instead of it owning you.', bodyAr: '٢٠ دقيقة النهارده وتبقى كسبان الويك اند بدل ما هو كسبك.', url: '/workout' },
  { title: 'New weekly challenge 🏆', titleAr: 'تحدي الأسبوع نزل 🏆', body: 'The whole app is competing this week. Your name belongs on that podium.', bodyAr: 'كل التطبيق بيلعب الأسبوع ده. اسمك ناقص على البوديوم.', url: '/achievements' },
  { title: 'Drink up 💧', titleAr: 'اشرب مية 💧', body: 'Two glasses now. Your focus, skin and workout will thank you.', bodyAr: 'كوبايتين دلوقتي حالاً. تركيزك وبشرتك وتمرينك هيشكروك.', url: '/' },
  { title: '5 minutes. That’s it ⏱️', titleAr: '٥ دقايق بس ⏱️', body: 'Too tired for a full workout? Do 5 minutes. Momentum beats motivation.', bodyAr: 'تعبان؟ اعمل ٥ دقايق بس. البداية أهم من الحماس.', url: '/workout' },
  { title: 'Your buddy is waiting 👊', titleAr: 'صاحبك مستنيك 👊', body: 'Training with a friend doubles your consistency. Invite one from your profile.', bodyAr: 'التمرين مع صاحب بيخليك تكمّل ضعف المدة. اعزم واحد من البروفايل.', url: '/buddies' },
  { title: 'Sleep is a workout 😴', titleAr: 'النوم تمرين برضه 😴', body: 'Muscles grow at night. 7+ hours tonight = a stronger session tomorrow.', bodyAr: 'العضلات بتكبر بالليل. نام ٧ ساعات النهارده وبكرة هتحس بالفرق.', url: '/wellness' },
  { title: 'Protein check 🍗', titleAr: 'كشف البروتين 🍗', body: 'Palm-sized protein at every meal — the one rule that changes everything.', bodyAr: 'بروتين قد كفة إيدك في كل وجبة — القاعدة الواحدة اللي بتغير كل حاجة.', url: '/wellness/kitchen' },
  { title: 'Progress ≠ the scale 📈', titleAr: 'التقدم مش بس الميزان 📈', body: 'Clothes fitting better? Climbing stairs easier? That counts. Log today and see.', bodyAr: 'الهدوم بقت أوسع؟ السلم بقى أسهل؟ ده تقدم. سجّل النهارده وشوف.', url: '/progress' },
  { title: 'The comeback starts now 🚀', titleAr: 'الرجعة بتبدأ دلوقتي 🚀', body: 'Missed a few days? Perfect — the best workout of your life is the next one.', bodyAr: 'غبت كام يوم؟ ولا يهمك — أحسن تمرين في حياتك هو الجاي.', url: '/workout' },
  { title: 'Cheer someone today 👏', titleAr: 'شجّع حد النهارده 👏', body: 'Someone in the community just finished a workout. One tap makes their day.', bodyAr: 'حد في المجتمع لسه مخلص تمرين. دوسة واحدة تعمله يومه.', url: '/community' },
  { title: 'Rest day done right 😌', titleAr: 'يوم الراحة الصح 😌', body: 'Rest is part of the plan, not a break from it. Stretch 10 minutes and recover.', bodyAr: 'الراحة جزء من الخطة مش هروب منها. اعمل استرتش ١٠ دقايق وارتاح بضمير.', url: '/wellness' },
  { title: 'Log your lifts 🏋️', titleAr: 'سجّل أوزانك 🏋️', body: "Can't beat a number you never wrote down. Track today's sets and beat them next week.", bodyAr: 'مش هتكسر رقم عمرك ما سجلته. اكتب مجموعات النهارده واكسرها الأسبوع الجاي.', url: '/workout' },
  { title: 'Morning move ☀️', titleAr: 'حركة الصبح ☀️', body: 'Train before your day starts and nothing can cancel it. Tomorrow, 20 minutes.', bodyAr: 'اتمرن قبل ما يومك يبدأ ومحدش هيقدر يلغيه. بكرة الصبح، ٢٠ دقيقة.', url: '/workout' },
  { title: 'Your streak is your story 📖', titleAr: 'سلسلتك حكايتك 📖', body: 'Every day you show up writes another page. Don’t leave today blank.', bodyAr: 'كل يوم بتيجي فيه بتكتب صفحة. متسيبش النهارده فاضي.', url: '/' },
  { title: 'Recipe of the day 🍽️', titleAr: 'أكلة اليوم 🍽️', body: 'Healthy, Egyptian, and actually tasty. Counted calories included.', bodyAr: 'صحية ومصرية وطعمها حلو بجد. وسعراتها محسوبة جاهزة.', url: '/wellness/kitchen' },
  { title: 'Free reminder: it’s free 🎁', titleAr: 'تذكير: التطبيق ببلاش 🎁', body: 'Programs, recipes, challenges, community — all of it, zero pounds. Tell a friend.', bodyAr: 'برامج ووصفات وتحديات ومجتمع — كله بصفر جنيه. قول لصاحبك.', url: '/' },
  { title: 'Water before hunger 💡', titleAr: 'مية قبل الجوع 💡', body: 'Feeling snacky? Drink a glass first — half the time it was thirst.', bodyAr: 'حاسس إنك عايز تقرمش؟ اشرب كوباية الأول — نص المرات بيكون عطش.', url: '/' },
  { title: 'Level up night 🎮', titleAr: 'ليلة الليفل أب 🎮', body: 'You’re closer to the next level than you think. One workout might do it.', bodyAr: 'انت أقرب للمستوى الجاي مما متخيل. ممكن تمرينة واحدة تكفي.', url: '/profile' },
];

/** Push + in-app notification to all users (or a segment), straight from admin.
 *  Two-tap send; per-user language pick when both AR and EN are filled. */
function BroadcastCard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState<'all' | 'active7' | 'lapsed7'>('all');
  const reach = useQuery<Record<string, { users: number; push: number }>>({
    queryKey: ['broadcast-reach'],
    queryFn: () => api.get('/api/admin/broadcast/reach'),
    staleTime: 60_000,
  });
  const [arm, setArm] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [ideaIdx, setIdeaIdx] = useState(0);

  // Shuffled once per mount so ✨ doesn't replay the same order every session.
  const [order] = useState(() =>
    BROADCAST_IDEAS.map((_, i) => i).sort(() => Math.random() - 0.5),
  );
  const [suggesting, setSuggesting] = useState(false);
  const fill = (s: { title: string; titleAr: string; body: string; bodyAr: string; url?: string }) => {
    setTitle(s.title); setTitleAr(s.titleAr); setBody(s.body); setBodyAr(s.bodyAr); setUrl(s.url ?? '');
    setSent(null);
  };
  // AI writes a fresh one when the key is set; the static pool is the fallback,
  // so the button never dead-ends.
  const suggest = async () => {
    setSuggesting(true);
    try {
      const r = await api.post('/api/admin/broadcast/suggest', {});
      fill(r.idea);
    } catch {
      fill(BROADCAST_IDEAS[order[ideaIdx % BROADCAST_IDEAS.length]]);
      setIdeaIdx((i) => i + 1);
    } finally {
      setSuggesting(false);
    }
  };

  const send = useMutation({
    mutationFn: () =>
      api.post('/api/admin/broadcast', {
        title: title.trim(),
        body: body.trim(),
        ...(titleAr.trim() ? { titleAr: titleAr.trim() } : {}),
        ...(bodyAr.trim() ? { bodyAr: bodyAr.trim() } : {}),
        ...(url.trim() ? { url: url.trim() } : {}),
        audience,
      }),
    onSuccess: (r: any) => {
      setSent(`Sent to ${r.queued} user(s) ✓ — ${r.pushSubscribed ?? 0} can get a push banner, the rest see it in the app bell`);
      setArm(false);
      setTitle(''); setBody(''); setTitleAr(''); setBodyAr(''); setUrl('');
      toast(`Queued for ${r.queued} user(s) · ${r.pushSubscribed ?? 0} push-subscribed`, 'success');
    },
    onError: (e: any) => { setArm(false); toast(e?.message ?? 'Broadcast failed', 'error'); },
  });

  const FIELD = 'w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-pink/40';
  const ready = title.trim().length >= 2 && body.trim().length >= 2;

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-gray-600">📣 Broadcast to users</p>
          <p className="mt-0.5 text-xs text-gray-400">Push on subscribed devices + in-app notification for everyone. Fill AR fields too and each user gets their own language.</p>
        </div>
        <button onClick={suggest} disabled={suggesting} className="flex shrink-0 items-center gap-1 rounded-full bg-brand-pink/10 px-3 py-1.5 text-xs font-bold text-brand-pink transition active:scale-95 disabled:opacity-60">
          <Sparkles size={13} className={suggesting ? 'animate-pulse' : ''} /> {suggesting ? 'Writing…' : 'Suggest'}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input className={FIELD} placeholder="Title (EN or single)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={FIELD} dir="rtl" placeholder="العنوان (عربي، اختياري)" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        <textarea className={`${FIELD} min-h-20 resize-y`} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <textarea className={`${FIELD} min-h-20 resize-y`} dir="rtl" placeholder="الرسالة (عربي، اختياري)" value={bodyAr} onChange={(e) => setBodyAr(e.target.value)} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input className={`${FIELD} min-w-0 flex-1`} dir="ltr" placeholder="/challenge/abc or /  (where a tap lands)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select value={audience} onChange={(e) => setAudience(e.target.value as any)} className="shrink-0 rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none">
          <option value="all">All users</option>
          <option value="active7">Active last 7d</option>
          <option value="lapsed7">Lapsed 7d+</option>
        </select>
      </div>
      {/* Reach preview BEFORE sending — the answer to "who will receive this?" */}
      {reach.data?.[audience] && (
        <p className="mt-2 text-center text-xs text-gray-500">
          🔔 <b>{reach.data[audience].push}</b> of <b>{reach.data[audience].users}</b> users in this audience can receive a push banner — the rest see it in the app bell only.
        </p>
      )}
      <button
        onClick={() => (arm ? send.mutate() : setArm(true))}
        disabled={!ready || send.isPending}
        className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-sm font-extrabold transition disabled:opacity-50 ${
          arm ? 'bg-red-500 text-white' : 'btn-pill btn-primary'
        }`}
      >
        <Send size={15} /> {send.isPending ? 'Sending…' : arm ? `Tap again to notify ${audience === 'all' ? 'ALL users' : audience}` : 'Send broadcast'}
      </button>
      {sent && <p className="mt-2 text-center text-xs font-semibold text-emerald-600">{sent}</p>}
    </div>
  );
}

function PostCardEditor({ suggestion, canPost }: { suggestion: Suggestion; canPost: boolean }) {
  const [caption, setCaption] = useState(suggestion.caption);
  const [imagePath, setImagePath] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [posted, setPosted] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setCaption(suggestion.caption); }, [suggestion.caption]);

  const uploadImage = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/admin/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.path) throw new Error(json.error || 'Upload failed');
      setImagePath(json.path);
      toast('Image attached', 'success');
    } catch (e: any) {
      toast(e?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const post = useMutation({
    mutationFn: () =>
      api.post('/api/admin/fb/post', {
        message: caption.trim(),
        ...(imagePath.trim() ? { imagePath: imagePath.trim() } : {}),
        ...(scheduleAt ? { scheduleAt: new Date(scheduleAt).toISOString() } : {}),
      }),
    onSuccess: (r: any) => {
      setPosted(r.scheduled ? 'Scheduled ✓ — see Page → Publishing tools' : 'Posted ✓');
      toast(r.scheduled ? 'Scheduled on the Page' : 'Posted to the Page', 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Post failed', 'error'),
  });

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-pink">{suggestion.label}</p>
      <textarea
        dir="auto"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="min-h-32 w-full resize-y rounded-xl bg-gray-50 p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand-pink/40"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          dir="ltr"
          value={imagePath}
          onChange={(e) => setImagePath(e.target.value)}
          placeholder="Attach an image (optional) — pick or paste a path"
          className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs outline-none"
        />
        {/* Inline upload — no round-trip through the Upload screen. */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-600 disabled:opacity-50"
        >
          <ImagePlus size={14} /> {uploading ? 'Uploading…' : 'Pick image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
        />
      </div>
      {imagePath.trim() && <MediaImage path={imagePath.trim()} className="mt-2 h-32 w-full rounded-xl" />}

      <div className="mt-3 flex items-center gap-2">
        <CalendarClock size={15} className="shrink-0 text-gray-400" />
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 text-xs outline-none"
        />
        <button
          onClick={() => post.mutate()}
          disabled={!canPost || post.isPending || !caption.trim() || !!posted}
          className="btn-pill btn-primary flex min-h-[40px] shrink-0 items-center gap-1.5 px-4 text-sm disabled:opacity-50"
        >
          <Send size={14} /> {posted ? 'Done' : post.isPending ? 'Posting…' : scheduleAt ? 'Schedule' : 'Post now'}
        </button>
      </div>
      {posted && <p className="mt-2 text-xs font-semibold text-emerald-600">{posted}</p>}
    </div>
  );
}
