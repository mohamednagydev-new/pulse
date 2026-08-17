import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Trophy, Users, Zap } from 'lucide-react';
import { MediaImage } from '../components/ui';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type Board = {
  gym: { id: string; name: string; nameAr?: string | null; logo?: string | null };
  memberCount: number;
  top10: { firstName: string; avatarUrl?: string | null; level: number; currentStreak: number; xp: number }[];
  topStreaks: { firstName: string; avatarUrl?: string | null; streak: number }[];
  joinUrl?: string | null;
};

/** Rank medal tones — gold / silver / bronze, then neutral. */
const RANK_TONE = [
  'from-amber-400 to-yellow-600 text-black',
  'from-slate-300 to-slate-500 text-black',
  'from-orange-400 to-amber-700 text-black',
];

/**
 * PUBLIC gym TV board (/tv/:id) — no login, no app chrome. Runs full-screen in
 * any TV browser and refreshes itself every minute. Huge type on dark, readable
 * from across the gym floor; Arabic-first with small English subtitles.
 */
export default function TvBoard() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery<Board>({
    queryKey: ['tv-board', id],
    // Plain fetch on purpose: this screen is a logged-out TV — no tokens,
    // no refresh dance, just the public board endpoint.
    queryFn: async () => {
      const res = await fetch(`/api/org/gym/${id}/board`);
      if (!res.ok) throw new Error('board unavailable');
      return res.json();
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 55_000,
  });

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Slow ambient gradient — alive but never distracting on a wall screen. */}
      <style>{`
        @keyframes tvdrift {
          0% { transform: translate(-8%, -6%) scale(1); }
          50% { transform: translate(6%, 8%) scale(1.15); }
          100% { transform: translate(-8%, -6%) scale(1); }
        }
        @keyframes tvdrift2 {
          0% { transform: translate(10%, 6%) scale(1.1); }
          50% { transform: translate(-6%, -8%) scale(1); }
          100% { transform: translate(10%, 6%) scale(1.1); }
        }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-1/4 -start-1/4 h-[70vh] w-[70vw] rounded-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/10 blur-3xl"
          style={{ animation: 'tvdrift 26s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-1/4 -end-1/4 h-[70vh] w-[70vw] rounded-full bg-gradient-to-br from-sky-600/25 to-emerald-500/10 blur-3xl"
          style={{ animation: 'tvdrift2 32s ease-in-out infinite' }}
        />
      </div>

      {isLoading && (
        <div className="relative flex min-h-screen items-center justify-center text-2xl font-bold text-white/60">
          … ثواني
        </div>
      )}
      {isError && (
        <div className="relative flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-3xl font-extrabold">اللوحة مش متاحة دلوقتي</p>
          <p className="text-lg text-white/50">Board unavailable — check the link</p>
        </div>
      )}

      {data && (
        <div className="relative mx-auto flex min-h-screen max-w-[1400px] flex-col p-[3vw] lg:p-[2.5vw]">
          {/* Header: gym identity + week title */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="flex flex-wrap items-center gap-[1.5vw]"
          >
            <div className="flex h-[7vw] max-h-24 min-h-14 w-[7vw] min-w-14 max-w-24 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
              <MediaImage path={data.gym.logo} label={data.gym.name} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[3.2vw] font-black leading-tight lg:text-5xl">
                {data.gym.nameAr ?? data.gym.name}
              </h1>
              <p className="text-[1.2vw] font-semibold text-white/40 lg:text-lg" dir="ltr">
                {data.gym.name} · PULSE
              </p>
            </div>
            <div className="text-end">
              <p className="flex items-center justify-end gap-[0.8vw] text-[2.6vw] font-black text-amber-300 lg:text-4xl">
                <Trophy className="h-[2.6vw] min-h-7 w-[2.6vw] min-w-7" /> أبطال الأسبوع
              </p>
              <p className="text-[1.1vw] font-semibold text-white/40 lg:text-base" dir="ltr">
                Champions of the Week
              </p>
            </div>
          </motion.header>

          {/* Body: leaderboard (main) + side column */}
          <div className="mt-[2vw] grid flex-1 grid-cols-1 gap-[2vw] lg:grid-cols-[1fr_minmax(280px,26%)]">
            {/* Leaderboard */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.08 }}
              className="rounded-3xl bg-white/5 p-[1.5vw] ring-1 ring-white/10 backdrop-blur"
            >
              {/* Cold start: no members joined yet — the board's whole job is
                  recruiting, so the QR takes center stage instead of an empty
                  list that reads as "broken". */}
              {data.memberCount === 0 && data.joinUrl ? (
                <div className="flex h-full flex-col items-center justify-center gap-[1.5vw] py-10 text-center">
                  <p className="text-[2.8vw] font-black lg:text-4xl">كن أول الأبطال هنا 🏆</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(data.joinUrl)}`}
                    alt="Join QR"
                    className="h-[22vw] max-h-80 min-h-44 w-[22vw] min-w-44 max-w-80 rounded-3xl bg-white p-3 shadow-2xl"
                  />
                  <p className="text-[1.8vw] font-extrabold lg:text-2xl">امسح الكود وانضم لجيمك على PULSE 📲</p>
                  <p className="text-[1.2vw] text-white/50 lg:text-lg">
                    كل تمرينة بنقط… وأول ١٠ أسماء هتتعلق على الشاشة دي
                  </p>
                </div>
              ) : (
                data.top10.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                    <p className="text-[2.2vw] font-extrabold lg:text-3xl">لسه مفيش أبطال الأسبوع ده</p>
                    <p className="text-[1.2vw] text-white/50 lg:text-lg">اتمرن النهارده وخد مكانك على الشاشة 💪</p>
                  </div>
                )
              )}
              <div className="grid gap-[0.7vw]">
                {data.top10.map((m, i) => (
                  <motion.div
                    key={`${m.firstName}-${i}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                    className={`flex items-center gap-[1.2vw] rounded-2xl px-[1.2vw] py-[0.7vw] ${
                      i === 0 ? 'bg-amber-400/15 ring-1 ring-amber-300/30' : 'bg-white/5'
                    }`}
                  >
                    <span
                      className={`flex h-[3vw] max-h-14 min-h-9 w-[3vw] min-w-9 max-w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[1.6vw] font-black lg:text-2xl ${
                        RANK_TONE[i] ?? 'from-white/15 to-white/5 text-white/70'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <MediaImage
                      path={m.avatarUrl}
                      label={m.firstName}
                      className="h-[3.4vw] max-h-16 min-h-10 w-[3.4vw] min-w-10 max-w-16 shrink-0 rounded-full ring-2 ring-white/20"
                    />
                    <span className="min-w-0 flex-1 truncate text-[2vw] font-extrabold lg:text-3xl">{m.firstName}</span>
                    {m.currentStreak > 1 && (
                      <span className="flex shrink-0 items-center gap-1 text-[1.3vw] font-bold text-orange-300 lg:text-xl">
                        <Flame className="h-[1.4vw] min-h-4 w-[1.4vw] min-w-4" /> {m.currentStreak}
                      </span>
                    )}
                    <span className="flex shrink-0 items-center gap-[0.4vw] text-[2vw] font-black tabular-nums text-emerald-300 lg:text-3xl" dir="ltr">
                      {m.xp.toLocaleString()} <Zap className="h-[1.7vw] min-h-5 w-[1.7vw] min-w-5" />
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Side column: streak podium + members + QR */}
            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              className="flex flex-col gap-[1.5vw]"
            >
              {/* Streak podium */}
              <div className="scene-tex rounded-3xl bg-gradient-to-br from-orange-500/90 to-rose-700/80 p-[1.3vw] ring-1 ring-white/10">
                <p className="flex items-center gap-2 text-[1.6vw] font-black lg:text-2xl">
                  <Flame className="h-[1.6vw] min-h-5 w-[1.6vw] min-w-5" /> ملوك الالتزام
                </p>
                <p className="text-[1vw] font-semibold text-white/60 lg:text-sm" dir="ltr">Streak podium</p>
                <div className="mt-[1vw] space-y-[0.6vw]">
                  {data.topStreaks.map((s, i) => (
                    <div key={`${s.firstName}-${i}`} className="flex items-center gap-[0.9vw] rounded-2xl bg-black/20 px-[0.9vw] py-[0.5vw]">
                      <span className="text-[1.5vw] lg:text-2xl">{['🥇', '🥈', '🥉'][i]}</span>
                      <MediaImage
                        path={s.avatarUrl}
                        label={s.firstName}
                        className="h-[2.6vw] max-h-12 min-h-9 w-[2.6vw] min-w-9 max-w-12 rounded-full ring-2 ring-white/25"
                      />
                      <span className="min-w-0 flex-1 truncate text-[1.4vw] font-extrabold lg:text-xl">{s.firstName}</span>
                      <span className="shrink-0 text-[1.4vw] font-black tabular-nums lg:text-xl" dir="ltr">
                        {s.streak} 🔥
                      </span>
                    </div>
                  ))}
                  {data.topStreaks.length === 0 && (
                    <p className="py-3 text-center text-[1.2vw] font-bold text-white/70 lg:text-base">
                      ابدأ سلسلة أيامك النهارده 🔥
                    </p>
                  )}
                </div>
              </div>

              {/* Member count */}
              <div className="rounded-3xl bg-white/5 p-[1.3vw] ring-1 ring-white/10">
                <p className="flex items-center gap-2 text-[1.2vw] font-bold text-white/60 lg:text-lg">
                  <Users className="h-[1.3vw] min-h-4 w-[1.3vw] min-w-4" /> أعضاء الجيم على PULSE
                </p>
                <p className="mt-1 text-[3.4vw] font-black tabular-nums leading-none text-sky-300 lg:text-6xl" dir="ltr">
                  {data.memberCount.toLocaleString()}
                </p>
                <p className="mt-1 text-[0.9vw] text-white/40 lg:text-sm" dir="ltr">members on PULSE</p>
              </div>

              {/* Join QR — the poster that recruits for the gym while it hangs there */}
              {data.joinUrl && (
                <div className="flex items-center gap-[1.2vw] rounded-3xl bg-white/5 p-[1.3vw] ring-1 ring-white/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.joinUrl)}`}
                    alt="Join QR"
                    className="h-[9vw] max-h-40 min-h-24 w-[9vw] min-w-24 max-w-40 shrink-0 rounded-2xl bg-white p-2"
                  />
                  <div className="min-w-0">
                    <p className="text-[1.5vw] font-black lg:text-2xl">اعمل سكان وانضم لينا 📲</p>
                    <p className="mt-1 text-[1vw] font-semibold text-white/50 lg:text-sm">
                      كل تمرينة بتتحسبلك نقط… وممكن اسمك يطلع هنا
                    </p>
                    <p className="mt-1 text-[0.85vw] text-white/35 lg:text-xs" dir="ltr">
                      Scan to join {data.gym.name} on PULSE
                    </p>
                  </div>
                </div>
              )}
            </motion.aside>
          </div>

          {/* Footer strip */}
          <p className="mt-[1.5vw] text-center text-[0.9vw] font-semibold text-white/25 lg:text-sm" dir="ltr">
            PULSE · pulse.geddo.online — board refreshes every minute
          </p>
        </div>
      )}
    </div>
  );
}
