import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Activity, UserPlus, Dumbbell, UtensilsCrossed, MessagesSquare, Inbox, Building2,
  Flag, GraduationCap, Trophy, BellRing, LogOut, Mail, Ticket, Clapperboard, Database,
  HardDriveDownload, Bot, ShieldAlert, type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';
import { useAuth } from '../../store/auth';

/**
 * The admin dashboard proper. The old page was a hub of links — redundant now
 * that the AdminLayout sidebar carries navigation — so this screen answers the
 * two questions an admin actually opens it with: "how is the product doing
 * today?" (KPIs) and "does anything need me?" (queues + system health).
 */

interface JobRun {
  key: string;
  ranAt: string;
}
interface OverviewData {
  totalUsers: number;
  weeklyActives: number;
  signupsToday: number;
  workoutsToday: number;
  foodLogsToday: number;
  openSupportTickets: number;
  newLeads: number;
  pendingGymJoinRequests: number;
  reportedPostsPending: number;
  chatReportsOpen: number;
  pendingCoachRequests: number;
  activeChallenges: number;
  pushSubscribers: number;
  system: {
    lastBackupAt: string | null;
    smtpOk: boolean;
    smtpReason: string | null;
    aiEnabled: boolean;
    dbSizeMB: number | null;
    lastJobRuns: JobRun[];
  };
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function KpiCard({ to, icon: Icon, value, label }: { to?: string; icon: LucideIcon; value: number; label: string }) {
  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold leading-tight">{value.toLocaleString()}</span>
        <span className="block truncate text-[11px] font-medium text-gray-400">{label}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm transition';
  return to ? (
    <Link to={to} className={`${cls} hover:shadow-md active:scale-[0.98]`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
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

/** ok/warn/fail pill used across the system-health card. */
function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'fail'; children: ReactNode }) {
  const cls =
    tone === 'ok' ? 'bg-emerald-50 text-emerald-600' : tone === 'warn' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

export default function AdminHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/api/admin/overview'),
    refetchInterval: 60_000,
  });

  const sys = data?.system;
  const backupAgeH = sys?.lastBackupAt ? (Date.now() - new Date(sys.lastBackupAt).getTime()) / 3600000 : Infinity;
  const backupStale = backupAgeH > 36;

  const attention: { to?: string; icon: LucideIcon; label: string; count: number; hint: string }[] = data
    ? [
        { to: '/admin/moderation', icon: Flag, label: 'Reported posts', count: data.reportedPostsPending, hint: 'Review in Moderation' },
        { to: '/admin/moderation', icon: Flag, label: 'Open chat reports', count: data.chatReportsOpen, hint: 'Review in Moderation' },
        { to: '/admin/support', icon: MessagesSquare, label: 'Open support tickets', count: data.openSupportTickets, hint: 'Reply in Support' },
        { to: '/admin/leads', icon: Inbox, label: 'New partner leads', count: data.newLeads, hint: 'Triage in Leads' },
        // No admin screen — gym owners accept these in their own portal.
        { icon: Building2, label: 'Pending gym join requests', count: data.pendingGymJoinRequests, hint: 'Handled by gym partners' },
      ].filter((r) => r.count > 0)
    : [];

  const quickActions: { to: string; icon: LucideIcon; label: string }[] = [
    { to: '/admin/challenges', icon: Trophy, label: 'New challenge' },
    { to: '/admin/banners', icon: Ticket, label: 'New banner' },
    { to: '/admin/email', icon: Mail, label: 'Email blast' },
    { to: '/admin/reels', icon: Clapperboard, label: 'Add reel' },
  ];

  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold italic">PULSE Admin</h1>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-gray-400 transition hover:bg-white hover:text-ink"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {isLoading || !data ? (
        <Loader />
      ) : (
        <div className="space-y-4">
          {/* KPI grid — every number is one tap from the screen that acts on it. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard to="/admin/users" icon={Users} value={data.totalUsers} label="Total users" />
            <KpiCard to="/admin/analytics" icon={Activity} value={data.weeklyActives} label="Weekly actives" />
            <KpiCard to="/admin/users" icon={UserPlus} value={data.signupsToday} label="Signups today" />
            <KpiCard to="/admin/analytics" icon={Dumbbell} value={data.workoutsToday} label="Workouts today" />
            <KpiCard to="/admin/analytics" icon={UtensilsCrossed} value={data.foodLogsToday} label="Food logs today" />
            <KpiCard to="/admin/support" icon={MessagesSquare} value={data.openSupportTickets} label="Open tickets" />
            <KpiCard to="/admin/leads" icon={Inbox} value={data.newLeads} label="New leads" />
            <KpiCard icon={Building2} value={data.pendingGymJoinRequests} label="Gym requests" />
            <KpiCard to="/admin/moderation" icon={Flag} value={data.reportedPostsPending + data.chatReportsOpen} label="Open reports" />
            <KpiCard to="/admin/users?role=coach-pending" icon={GraduationCap} value={data.pendingCoachRequests} label="Coach requests" />
            <KpiCard to="/admin/challenges" icon={Trophy} value={data.activeChallenges} label="Active challenges" />
            <KpiCard to="/admin/email" icon={BellRing} value={data.pushSubscribers} label="Push subscribers" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Queues that need a human, merged and deep-linked. */}
            <Card title="Needs attention">
              {attention.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">All clear ✅ — no open queues.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attention.map((r) => {
                    const row = (
                      <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <r.icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{r.label}</span>
                          <span className="block text-[11px] text-gray-400">{r.hint}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-700">
                          {r.count}
                        </span>
                        {r.to && <span className="shrink-0 text-gray-300" aria-hidden>›</span>}
                      </>
                    );
                    return r.to ? (
                      <Link key={r.label} to={r.to} className="flex items-center gap-3 py-2.5 transition hover:bg-gray-50">
                        {row}
                      </Link>
                    ) : (
                      <div key={r.label} className="flex items-center gap-3 py-2.5">{row}</div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Is the machinery running? SMTP, AI, backups, nightly jobs, disk. */}
            <Card title="System health">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><Mail size={14} className="text-gray-400" /> SMTP</span>
                  {sys?.smtpOk ? (
                    <StatusPill tone="ok">OK</StatusPill>
                  ) : (
                    <StatusPill tone="fail">{sys?.smtpReason ? `Fail — ${sys.smtpReason}` : 'Fail'}</StatusPill>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><Bot size={14} className="text-gray-400" /> AI</span>
                  {sys?.aiEnabled ? <StatusPill tone="ok">On</StatusPill> : <StatusPill tone="warn">Off</StatusPill>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><HardDriveDownload size={14} className="text-gray-400" /> Last backup</span>
                  <StatusPill tone={backupStale ? 'fail' : 'ok'}>{timeAgo(sys?.lastBackupAt ?? null)}</StatusPill>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><Database size={14} className="text-gray-400" /> Database size</span>
                  <span className="text-xs font-bold text-gray-500">{sys?.dbSizeMB != null ? `${sys.dbSizeMB} MB` : '—'}</span>
                </div>
                <div className="border-t border-gray-100 pt-2.5">
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                    <ShieldAlert size={13} /> Last job runs
                  </p>
                  {sys?.lastJobRuns.length ? (
                    <div className="space-y-1">
                      {sys.lastJobRuns.map((j) => (
                        <div key={j.key} className="flex items-center justify-between gap-2 text-xs">
                          <code className="min-w-0 truncate font-mono text-gray-600">{j.key}</code>
                          <span className="shrink-0 text-gray-400">{timeAgo(j.ranAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No job runs recorded yet.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick actions — the four things admins create most, one tap each. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold shadow-sm transition hover:shadow-md active:scale-[0.98]"
              >
                <a.icon size={16} className="text-gray-400" /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
