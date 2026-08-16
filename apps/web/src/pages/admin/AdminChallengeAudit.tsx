import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, AlertTriangle, Trophy } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Winner verification before prizes get paid. Self-reported data can't be
 * proven, but cheating leaves fingerprints — this page surfaces them and a
 * human makes the call. Green = clean pattern; amber = look closer.
 */
export default function AdminChallengeAudit() {
  const [picked, setPicked] = useState<string | null>(null);

  const { data: list } = useQuery({
    queryKey: ['admin-chal-audit'],
    queryFn: () => api.get('/api/admin/challenge-audit'),
  });
  const { data: detail } = useQuery({
    queryKey: ['admin-chal-audit', picked],
    queryFn: () => api.get(`/api/admin/challenge-audit/${picked}`),
    enabled: !!picked,
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} /> Challenge audit</h1>
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-gray-700">Pick a challenge</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {(list ?? []).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setPicked(c.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start text-sm ${
                  picked === c.id ? 'border-brand-blue bg-blue-50 font-bold' : 'border-gray-200'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{c.title} {c.prizeText ? '🎁' : ''}</span>
                  <span className="block text-[11px] text-gray-400">{c.startsOn} → {c.endsOn} · {c.goalType}/{c.goalValue} · {c.participants} joined</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {detail && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
              <Trophy size={15} className="text-amber-500" /> Top 10 — {detail.challenge.title}
            </h2>
            {detail.challenge.prizeText && <p className="mb-3 text-xs text-gray-400">Prizes: {detail.challenge.prizeText}</p>}
            <div className="space-y-2">
              {detail.participants.map((p: any, i: number) => (
                <div key={p.userId} className={`rounded-xl border p-3 ${p.suspicious ? 'border-amber-300 bg-amber-50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-bold">
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`} {p.name}
                      {p.suspicious ? <AlertTriangle size={13} className="ms-1 inline text-amber-500" /> : <span className="ms-1 text-emerald-500">✓</span>}
                    </p>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums">{p.progress}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {p.email} · account {p.accountAgeDays}d old · {p.totalXpInWindow} XP in window · max/day: {p.maxXpDay} XP, {p.maxWorkoutsDay} workouts, {p.maxCalDay} kcal · {p.entryCount} food entries · 📸 {p.proofCount} proof check-ins
                  </p>
                  {p.flags.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {p.flags.map((f: string) => (
                        <li key={f} className="text-[11px] font-bold text-amber-600">⚠ {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
              Flags are fingerprints, not verdicts — a real user can trip one. Before paying a prize: message the winner
              (screenshots, a quick video of them in the app), and check their profile activity looks human.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
