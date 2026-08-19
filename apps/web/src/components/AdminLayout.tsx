import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Newspaper, Clapperboard, Users, Award,
  MessagesSquare, Shield, Store, Ticket, CalendarDays, Building2, Mail, BarChart3,
  Upload, Search, ExternalLink, Menu, X, Trophy, Import, ClipboardList, Radio, type LucideIcon,
} from 'lucide-react';

/**
 * The admin workspace shell — desktop-first (the ONE surface in the product
 * that is): persistent left sidebar + topbar, mounted at the route level so
 * every admin screen gets it without per-page edits. Below lg it collapses to
 * a slim bar with a drawer, so phone administration keeps working.
 *
 * Rendered OUTSIDE the 480px .app-frame (App.tsx swaps the frame class for
 * /admin) — the whole point is using the monitor you actually have.
 */

type NavItem = { to: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/programs', label: 'Programs', icon: Dumbbell },
      { to: '/admin/exercises', label: 'Exercises', icon: ClipboardList },
      { to: '/admin/recipes', label: 'Recipes', icon: UtensilsCrossed },
      { to: '/admin/articles', label: 'Articles', icon: Newspaper },
      { to: '/admin/reels', label: 'Reels', icon: Clapperboard },
      { to: '/admin/video-import', label: 'Video import', icon: Import },
      { to: '/admin/upload', label: 'Media upload', icon: Upload },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/sessions', label: 'Live sessions', icon: Radio },
      { to: '/admin/moderation', label: 'Moderation', icon: Shield },
      { to: '/admin/support', label: 'Support', icon: MessagesSquare },
      { to: '/admin/posts', label: 'Community posts', icon: Newspaper },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { to: '/admin/challenges', label: 'Challenges', icon: Trophy },
      { to: '/admin/challenge-audit', label: 'Challenge audit', icon: Award },
      { to: '/admin/email', label: 'Email blast', icon: Mail },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/admin/partners', label: 'Partners', icon: Building2 },
      { to: '/admin/banners', label: 'Banners', icon: Ticket },
      { to: '/admin/events', label: 'Events', icon: CalendarDays },
      { to: '/admin/leads', label: 'Leads', icon: Store },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');

  const flat = NAV.flatMap((g) => g.items);
  const matches = q.trim()
    ? flat.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()))
    : [];

  const isActive = (to: string) =>
    to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to);

  const SideNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4">
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2 px-2">
        <img src="/pwa-192.png" alt="" className="h-8 w-auto" />
        <span className="text-sm font-extrabold tracking-wide text-white">ADMIN</span>
      </Link>
      {NAV.map((g) => (
        <div key={g.label}>
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">{g.label}</p>
          {g.items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition ${
                isActive(i.to) ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <i.icon size={15} className="shrink-0" /> {i.label}
            </Link>
          ))}
        </div>
      ))}
      <a
        href="/"
        className="mt-auto flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-white/50 hover:text-white"
      >
        <ExternalLink size={14} /> View site
      </a>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-100 text-ink lg:grid lg:grid-cols-[220px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen bg-[#161513] lg:block">
        <SideNav />
      </aside>

      {/* Mobile top strip + drawer */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-[#161513] px-4 py-3 text-white lg:hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={() => setDrawer(true)} aria-label="Admin menu"><Menu size={22} /></button>
        <span className="text-sm font-extrabold">ADMIN</span>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 start-0 w-64 bg-[#161513]">
            <button onClick={() => setDrawer(false)} aria-label="Close" className="absolute end-3 top-3 text-white"><X size={20} /></button>
            <SideNav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="min-w-0">
        {/* Desktop topbar: quick screen search */}
        <div className="sticky top-0 z-30 hidden items-center gap-3 border-b border-gray-200 bg-white/90 px-6 py-2.5 backdrop-blur lg:flex">
          <div className="relative w-72">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Jump to… (users, reels, leads)"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-1.5 ps-9 pe-3 text-sm outline-none focus:border-gray-400"
            />
            {matches.length > 0 && (
              <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {matches.slice(0, 6).map((m) => (
                  <button
                    key={m.to}
                    onClick={() => { navigate(m.to); setQ(''); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-gray-50"
                  >
                    <m.icon size={14} className="text-gray-400" /> {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1440px] p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
