import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';

interface DauPoint {
  day: string; // YYYY-MM-DD
  users: number;
}
interface TimelinePoint {
  day: string; // YYYY-MM-DD (UTC bucket)
  signups: number;
  actives: number;
  workouts: number;
}
interface TimelineData {
  days: TimelinePoint[];
  activesSource: string;
}
interface MonitoringData {
  funnel: { registerViews: number; registered: number; onboarded: number };
  cohorts: { weekStart: string; size: number; weeks: (number | null)[] }[];
  topScreens: { path: string; count: number }[];
  topSources: { source: string; count: number }[];
}
interface CountRow {
  path?: string;
  name?: string;
  count: number;
}
interface AnalyticsData {
  onlineNow?: number;
  pushUsers?: number;
  activation?: { signups: number; onboarded: number; activated24h: number };
  dau: DauPoint[];
  funnel?: Record<string, Record<string, number>>;
  clientErrors?: { message: string; count: number }[];
  topScreens: { path: string; count: number }[];
  topEvents: { name: string; count: number }[];
  totals: {
    users: number;
    workouts: number;
    reelWatches: number;
    duels: number;
    posts: number;
    connections: number;
  };
}

const BRAND_ORANGE = '#f97316';

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build the last-14-days axis (oldest first), filling gaps with 0. */
function buildDauSeries(dau: DauPoint[] | undefined): { key: string; label: number; users: number; isToday: boolean }[] {
  const byDay = new Map<string, number>();
  for (const p of dau ?? []) byDay.set(p.day, p.users);
  const todayKey = toDayKey(new Date());
  const out: { key: string; label: number; users: number; isToday: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDayKey(d);
    out.push({ key, label: d.getDate(), users: byDay.get(key) ?? 0, isToday: key === todayKey });
  }
  return out;
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-400">{label}</p>
    </div>
  );
}

function BarList({ rows, empty }: { rows: CountRow[]; empty: string }) {
  if (!rows.length) return <p className="py-4 text-center text-sm text-gray-400">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const label = r.path ?? r.name ?? '';
        return (
          <div key={label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium">{label}</span>
              <span className="shrink-0 text-xs font-semibold text-gray-500">{r.count.toLocaleString()}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-ink/70"
                style={{ width: `${Math.max((r.count / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DauChart({ dau }: { dau: DauPoint[] | undefined }) {
  const series = buildDauSeries(dau);
  const max = Math.max(...series.map((s) => s.users), 1);
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {series.map((s) => (
          <div key={s.key} className="flex min-w-0 flex-1 flex-col items-center justify-end self-stretch" title={`${s.key}: ${s.users}`}>
            <div
              className="w-full rounded-t"
              style={{
                height: `${(s.users / max) * 100}%`,
                minHeight: s.users > 0 ? 3 : 2,
                backgroundColor: s.isToday ? BRAND_ORANGE : '#d1d5db',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {series.map((s) => (
          <span
            key={s.key}
            className={`flex-1 text-center text-[10px] ${s.isToday ? 'font-bold' : 'text-gray-400'}`}
            style={s.isToday ? { color: BRAND_ORANGE } : undefined}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 30-day monitoring chart: actives + workouts as lines on one count axis,
 *  signups (a much smaller magnitude — same axis would flatten it) as its own
 *  bar strip below. Inline SVG like every chart in the app; no libraries. */
const C_ACTIVES = '#3b82f6';
const C_WORKOUTS = BRAND_ORANGE;

function TimelineChart({ days }: { days: TimelinePoint[] }) {
  const W = 600;
  const H = 150;
  const PAD = 6;
  const n = days.length;
  if (!n) return <p className="py-4 text-center text-sm text-gray-400">No data yet.</p>;
  const lineMax = Math.max(...days.map((d) => Math.max(d.actives, d.workouts)), 1);
  const signupMax = Math.max(...days.map((d) => d.signups), 1);
  const x = (i: number) => PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / lineMax) * (H - PAD * 2);
  const pts = (pick: (d: TimelinePoint) => number) => days.map((d, i) => `${x(i)},${y(pick(d))}`).join(' ');
  const colW = (W - PAD * 2) / n;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C_ACTIVES }} /> Active users
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: C_WORKOUTS }} /> Workouts
        </span>
        <span className="ms-auto text-gray-400">peak {lineMax.toLocaleString()}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Active users and workouts per day, last 30 days">
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2)} y2={H - PAD - f * (H - PAD * 2)} stroke="#f3f4f6" strokeWidth="1" />
        ))}
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="#e5e7eb" strokeWidth="1" />
        <polyline points={pts((d) => d.workouts)} fill="none" stroke={C_WORKOUTS} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts((d) => d.actives)} fill="none" stroke={C_ACTIVES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* hover targets: one full-height column per day with a native tooltip */}
        {days.map((d, i) => (
          <rect key={d.day} x={x(i) - colW / 2} y={0} width={colW} height={H} fill="transparent">
            <title>{`${d.day} — actives ${d.actives} · workouts ${d.workouts} · signups ${d.signups}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
        <span>{days[0].day.slice(5)}</span>
        <span>{days[Math.floor(n / 2)].day.slice(5)}</span>
        <span>{days[n - 1].day.slice(5)}</span>
      </div>

      <p className="mb-1 mt-3 text-xs font-semibold text-gray-500">
        Signups / day <span className="font-normal text-gray-400">(own scale · peak {signupMax})</span>
      </p>
      <div className="flex h-10 items-end gap-px">
        {days.map((d) => (
          <div key={d.day} className="min-w-0 flex-1" title={`${d.day}: ${d.signups} signups`}>
            <div
              className="w-full rounded-t bg-ink/60"
              style={{ height: `${(d.signups / signupMax) * 40}px`, minHeight: d.signups > 0 ? 3 : 1 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Registration funnel, last 30 days: register-page views → completed
 *  registrations (both raw funnel-* event counts — guests included) →
 *  users who finished onboarding (profile goal set). */
function RegistrationFunnel({ funnel }: { funnel: MonitoringData['funnel'] }) {
  const steps = [
    { label: 'Register views', value: funnel.registerViews, note: 'funnel-register-view events' },
    { label: 'Registered', value: funnel.registered, note: 'funnel-registered events' },
    { label: 'Onboarded', value: funnel.onboarded, note: 'new users with a fitness goal' },
  ];
  const base = Math.max(steps[0].value, 1);
  if (!steps.some((s) => s.value > 0)) {
    return <p className="py-4 text-center text-sm text-gray-400">No registration activity in the last 30 days.</p>;
  }
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / base) * 100);
        const prev = i > 0 ? Math.max(steps[i - 1].value, 1) : null;
        const conv = prev != null ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                {s.label} <span className="text-[10px] font-normal text-gray-400">{s.note}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500">
                {s.value.toLocaleString()}
                {conv != null && <span className="ms-1.5 text-emerald-600">{conv}% of prev</span>}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${i === steps.length - 1 ? 'bg-emerald-500' : 'bg-ink/60'}`}
                style={{ width: `${Math.min(Math.max(pct, s.value > 0 ? 3 : 0), 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Weekly retention grid: each row is a signup cohort, each cell the % of it
 *  active N weeks later. Heat = single-hue opacity ramp (magnitude, one hue). */
function RetentionCohorts({ cohorts }: { cohorts: MonitoringData['cohorts'] }) {
  if (!cohorts.some((c) => c.size > 0)) {
    return <p className="py-4 text-center text-sm text-gray-400">No signups in the last 6 weeks yet.</p>;
  }
  const cell = (pct: number | null, key: number) => {
    if (pct === null) return <td key={key} className="p-1 text-center text-xs text-gray-300">—</td>;
    return (
      <td key={key} className="p-1">
        <div
          className="rounded-lg py-1.5 text-center text-xs font-bold tabular-nums"
          style={{
            backgroundColor: `rgba(59, 130, 246, ${0.08 + (pct / 100) * 0.72})`,
            color: pct > 55 ? '#fff' : '#1e3a8a',
          }}
        >
          {pct}%
        </div>
      </td>
    );
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-0">
        <thead>
          <tr className="text-[11px] font-bold uppercase text-gray-400">
            <th className="p-1 text-start">Cohort week</th>
            <th className="p-1 text-end">Size</th>
            {['+1w', '+2w', '+3w', '+4w'].map((h) => (
              <th key={h} className="p-1 text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.weekStart}>
              <td className="p-1 text-xs font-semibold text-gray-600">{c.weekStart}</td>
              <td className="p-1 text-end text-xs font-semibold tabular-nums text-gray-500">{c.size}</td>
              {c.weeks.map((w, i) => (c.size === 0 ? <td key={i} className="p-1 text-center text-xs text-gray-300">—</td> : cell(w, i)))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-gray-400">Active = any tracked event during that week. Weeks that have not happened yet show a dash.</p>
    </div>
  );
}

/** Acquisition funnel per ad source: where people stall between the ad click
 *  and a created account. Steps ordered; each shows count + % of that source's
 *  landings, so TikTok and Facebook campaigns are directly comparable. */
const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: 'funnel-landing', label: 'Landed' },
  { key: 'funnel-welcome-view', label: 'Saw landing page' },
  { key: 'funnel-onboarding', label: 'Onboarding' },
  { key: 'funnel-guest-browse', label: 'Browsed as guest' },
  { key: 'funnel-register-intent', label: 'Tapped join' },
  { key: 'funnel-login-view', label: 'Saw login' },
  { key: 'funnel-register-view', label: 'Saw register' },
  { key: 'funnel-registered', label: 'Registered ✓' },
];

function FunnelCard({ funnel }: { funnel?: Record<string, Record<string, number>> }) {
  const sources = Object.entries(funnel ?? {})
    .sort((a, b) => (b[1]['funnel-landing'] ?? 0) - (a[1]['funnel-landing'] ?? 0));
  if (!sources.length) {
    return <p className="py-4 text-center text-sm text-gray-400">No funnel data yet — appears once ad links with utm_source are visited.</p>;
  }
  return (
    <div className="space-y-5">
      {sources.map(([source, steps]) => {
        const base = Math.max(steps['funnel-landing'] ?? 0, 1);
        return (
          <div key={source}>
            <p className="mb-2 text-sm font-bold">{source}</p>
            <div className="space-y-2">
              {FUNNEL_STEPS.map((s) => {
                const n = steps[s.key] ?? 0;
                const pct = Math.round((n / base) * 100);
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-gray-500">{s.label}</span>
                    <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${s.key === 'funnel-registered' ? 'bg-emerald-500' : 'bg-ink/60'}`}
                        style={{ width: `${Math.min(Math.max(pct, n > 0 ? 3 : 0), 100)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-end text-xs font-semibold tabular-nums">
                      {n.toLocaleString()} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Two-tap clear (confirm on second tap) — wipes triaged crash reports so the
 *  card starts clean instead of waiting out the 7-day window. */
function ClearErrorsButton() {
  const qc = useQueryClient();
  const [arm, setArm] = useState(false);
  const clear = useMutation({
    mutationFn: () => api.del('/api/admin/analytics/client-errors'),
    onSuccess: () => {
      setArm(false);
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
  return (
    <button
      onClick={() => (arm ? clear.mutate() : setArm(true))}
      disabled={clear.isPending}
      className={`mt-3 w-full rounded-full py-2 text-xs font-bold transition disabled:opacity-50 ${
        arm ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {clear.isPending ? 'Clearing…' : arm ? 'Tap again to clear all error reports' : 'Clear list'}
    </button>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase text-gray-400">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/api/admin/analytics'),
  });
  const { data: timeline } = useQuery<TimelineData>({
    queryKey: ['admin', 'analytics', 'timeline'],
    queryFn: () => api.get('/api/admin/analytics/timeline'),
  });
  const { data: monitoring } = useQuery<MonitoringData>({
    queryKey: ['admin', 'analytics', 'monitoring'],
    queryFn: () => api.get('/api/admin/analytics/monitoring'),
  });

  const totals = data?.totals;
  const act = data?.activation;
  const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');
  const tiles: { label: string; value: number | string }[] = [
    { label: '🟢 Online now', value: data?.onlineNow ?? 0 },
    { label: '🔔 Push-enabled', value: data?.pushUsers ?? 0 },
    // The retention predictor: of last-30d signups, how many finished a workout
    // within 24h. Move this number and day-3 retention follows.
    { label: '⚡ Activated ≤24h (30d)', value: act ? `${act.activated24h}/${act.signups} (${pct(act.activated24h, act.signups)})` : '—' },
    { label: '📋 Intake done (30d)', value: act ? pct(act.onboarded, act.signups) : '—' },
    { label: 'Users', value: totals?.users ?? 0 },
    { label: 'Workouts', value: totals?.workouts ?? 0 },
    { label: 'Reel views', value: totals?.reelWatches ?? 0 },
    { label: 'Duels', value: totals?.duels ?? 0 },
    { label: 'Posts', value: totals?.posts ?? 0 },
    { label: 'Connections', value: totals?.connections ?? 0 },
  ];

  const emptyText = 'No analytics yet — events start flowing as users browse.';

  return (
    <div className="pb-10">
      <h1 className="mb-4 text-xl font-extrabold">Analytics</h1>

      {isLoading || !data ? (
        <Loader />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {tiles.map((t) => (
              <StatTile key={t.label} value={t.value} label={t.label} />
            ))}
          </div>

          <Card title="30-day timeline — actives, workouts & signups">
            {timeline ? <TimelineChart days={timeline.days} /> : <Loader />}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Registration funnel (30 days)">
              {monitoring ? <RegistrationFunnel funnel={monitoring.funnel} /> : <Loader />}
            </Card>
            <Card title="Weekly retention cohorts">
              {monitoring ? <RetentionCohorts cohorts={monitoring.cohorts} /> : <Loader />}
            </Card>
          </div>

          <Card title="Daily active users (14 days)">
            <DauChart dau={data.dau} />
          </Card>

          {/* Ad-funnel card removed at owner request (Aug 2026) — the events
              still record, so it can return if ad debugging is ever needed. */}
          <Card title="Client errors on real devices (7 days)">
            {data.clientErrors?.length ? (
              <>
                <div className="space-y-2">
                  {data.clientErrors.map((e) => (
                    <div key={e.message} className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2">
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">×{e.count}</span>
                      <code dir="ltr" className="min-w-0 flex-1 break-words font-mono text-[11px] leading-relaxed text-red-700">{e.message}</code>
                    </div>
                  ))}
                </div>
                <ClearErrorsButton />
              </>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No client errors reported 🎉</p>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top screens (7 days)">
              <BarList rows={data.topScreens ?? []} empty={emptyText} />
            </Card>

            <Card title="Top events (7 days)">
              <BarList rows={data.topEvents ?? []} empty={emptyText} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top screens (30 days)">
              <BarList rows={monitoring?.topScreens ?? []} empty={emptyText} />
            </Card>

            <Card title="Top ad sources (30 days)">
              <BarList
                rows={(monitoring?.topSources ?? []).map((s) => ({ name: s.source, count: s.count }))}
                empty="No UTM landings yet — appears once ad links with utm_source (or ttclid/fbclid) are visited."
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
