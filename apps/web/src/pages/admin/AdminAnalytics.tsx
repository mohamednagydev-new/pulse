import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';

interface DauPoint {
  day: string; // YYYY-MM-DD
  users: number;
}
interface CountRow {
  path?: string;
  name?: string;
  count: number;
}
interface AnalyticsData {
  dau: DauPoint[];
  funnel?: Record<string, Record<string, number>>;
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

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold">{value.toLocaleString()}</p>
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

/** Acquisition funnel per ad source: where people stall between the ad click
 *  and a created account. Steps ordered; each shows count + % of that source's
 *  landings, so TikTok and Facebook campaigns are directly comparable. */
const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: 'funnel-landing', label: 'Landed' },
  { key: 'funnel-onboarding', label: 'Onboarding' },
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

  const totals = data?.totals;
  const tiles: { label: string; value: number }[] = [
    { label: 'Users', value: totals?.users ?? 0 },
    { label: 'Workouts', value: totals?.workouts ?? 0 },
    { label: 'Reel views', value: totals?.reelWatches ?? 0 },
    { label: 'Duels', value: totals?.duels ?? 0 },
    { label: 'Posts', value: totals?.posts ?? 0 },
    { label: 'Connections', value: totals?.connections ?? 0 },
  ];

  const emptyText = 'No analytics yet — events start flowing as users browse.';

  return (
    <div className="min-h-screen pb-10">
      <header className="flex items-center gap-2 bg-ink px-4 py-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Analytics</h1>
      </header>

      {isLoading || !data ? (
        <Loader />
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-3">
            {tiles.map((t) => (
              <StatTile key={t.label} value={t.value} label={t.label} />
            ))}
          </div>

          <Card title="Daily active users (14 days)">
            <DauChart dau={data.dau} />
          </Card>

          <Card title="Ad funnel by source (30 days)">
            <FunnelCard funnel={data.funnel} />
          </Card>

          <Card title="Top screens (7 days)">
            <BarList rows={data.topScreens ?? []} empty={emptyText} />
          </Card>

          <Card title="Top events (7 days)">
            <BarList rows={data.topEvents ?? []} empty={emptyText} />
          </Card>
        </div>
      )}
    </div>
  );
}
