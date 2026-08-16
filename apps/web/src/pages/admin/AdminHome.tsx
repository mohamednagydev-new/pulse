import { Link, useNavigate } from 'react-router-dom';
import {
  Upload, Users, LogOut, BarChart3, Clapperboard, Inbox, Film, MessagesSquare, Megaphone, ShieldCheck, Mail, Trophy,
  type LucideIcon,
} from 'lucide-react';
import { RESOURCES, GROUP_LABEL, type ResourceGroup } from './adminConfig';
import { useAuth } from '../../store/auth';

/**
 * The admin dashboard.
 *
 * The previous version stacked six full-width gradient cards — each about ninety
 * pixels tall — above a flat two-column grid of nineteen content links. You scrolled
 * past a wall of colour to reach the things used most, and the nineteen links had no
 * order at all, so finding one meant reading every label.
 *
 * Two changes. The tools become a compact icon grid: same six destinations, roughly a
 * fifth of the height, still one tap. The content links are grouped by the job you
 * came to do — training, wellness, engagement, partners — which turns one long list
 * into four short ones you can scan by heading.
 */

type Tool = { to: string; label: string; hint: string; icon: LucideIcon; tone: string };

/** Ordered by how often they are actually opened, not by when they were built. */
const TOOLS: Tool[] = [
  { to: '/admin/reels', label: 'Reels', hint: 'Add by link', icon: Clapperboard, tone: 'bg-sky-500' },
  { to: '/admin/upload', label: 'Media', hint: 'Videos & images', icon: Upload, tone: 'bg-brand-pink' },
  { to: '/admin/video-import', label: 'Video import', hint: 'Bulk links', icon: Film, tone: 'bg-violet-600' },
  { to: '/admin/leads', label: 'Leads', hint: 'Partner requests', icon: Inbox, tone: 'bg-orange-500' },
  { to: '/admin/support', label: 'Support', hint: 'Tickets & posts', icon: MessagesSquare, tone: 'bg-teal-600' },
  { to: '/admin/analytics', label: 'Analytics', hint: 'Users & screens', icon: BarChart3, tone: 'bg-ink' },
  { to: '/admin/posts', label: 'Posts', hint: 'FB page studio', icon: Megaphone, tone: 'bg-blue-600' },
  { to: '/admin/moderation', label: 'Moderation', hint: 'Feed & rooms', icon: ShieldCheck, tone: 'bg-rose-600' },
  { to: '/admin/email', label: 'Email blast', hint: 'Re-engage by mail', icon: Mail, tone: 'bg-emerald-600' },
  { to: '/admin/challenge-audit', label: 'Challenge audit', hint: 'Verify winners', icon: Trophy, tone: 'bg-amber-600' },
];

const GROUP_ORDER: ResourceGroup[] = ['training', 'wellness', 'engagement', 'business'];

export default function AdminHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-12">
      <header className="safe-header-tall bg-ink px-5 pb-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold italic">PULSE Admin</h1>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            aria-label="Sign out"
            className="shrink-0 rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* Tools — three across, so all six fit above the fold on a phone. */}
        <div className="grid grid-cols-3 gap-2.5">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm transition active:scale-[0.97]"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${tool.tone}`}>
                <tool.icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold leading-tight">{tool.label}</span>
                <span className="mt-0.5 block truncate text-[10px] leading-tight text-gray-400">{tool.hint}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* Content, grouped. Each section is short enough to scan without reading. */}
        {GROUP_ORDER.map((group) => {
          const items = RESOURCES.filter((r) => r.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mt-6">
              <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {GROUP_LABEL[group]}
              </h2>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {items.map((r, i) => (
                  <Link
                    key={r.key}
                    to={`/admin/${r.key}`}
                    className={`flex items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition active:bg-gray-50 ${
                      i > 0 ? 'border-t border-gray-100' : ''
                    }`}
                  >
                    <span className="min-w-0 truncate">{r.label}</span>
                    <span className="shrink-0 text-gray-300" aria-hidden>
                      ›
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-6">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">People</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <Link
              to="/admin/users"
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition active:bg-gray-50"
            >
              <Users size={16} className="shrink-0 text-gray-400" /> Users
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
