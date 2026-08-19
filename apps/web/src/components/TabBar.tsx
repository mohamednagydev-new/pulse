import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, ClipboardList, Users, Flame, User } from 'lucide-react';

/** Each tab owns its section color — the active pill slides between them and
 *  recolors, so the bar itself tells you where you are.
 *  IA: Home · Train · Community · Food · Me. The old Wellness slot now fronts
 *  the food tracker (/wellness stays routable via search & Food hub); the
 *  locale keys keep their historic names — only their VALUES were relabeled. */
const tabs = [
  { to: '/', key: 'recommended', icon: Star, grad: 'from-orange-500 to-pink-600', glow: 'shadow-orange-500/40', text: 'text-orange-500' },
  { to: '/programs', key: 'programs', icon: ClipboardList, grad: 'from-blue-500 to-indigo-600', glow: 'shadow-blue-500/40', text: 'text-brand-blue' },
  { to: '/community', key: 'community', icon: Users, grad: 'from-violet-500 to-purple-700', glow: 'shadow-violet-500/40', text: 'text-violet-500' },
  { to: '/tracker', key: 'wellness', icon: Flame, grad: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/40', text: 'text-brand-green' },
  { to: '/profile', key: 'profile', icon: User, grad: 'from-teal-500 to-cyan-600', glow: 'shadow-teal-500/40', text: 'text-brand-teal' },
];

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <nav className="glass-nav fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-white/40">
      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {tabs.map(({ to, key, icon: Icon, grad, glow, text }) => (
          <NavLink key={to} to={to} end={to === '/'} className="relative flex flex-1 flex-col items-center py-1">
            {({ isActive }) => (
              <motion.div className="relative flex flex-col items-center gap-0.5" whileTap={{ scale: 0.85 }}>
                <span className="relative flex h-9 w-14 items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${grad} shadow-lg ${glow}`}
                    />
                  )}
                  <Icon size={21} className={`relative ${isActive ? 'text-white drop-shadow' : 'text-gray-400'}`} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className={`max-w-[72px] truncate text-[10px] font-bold ${isActive ? text : 'text-gray-400'}`}>
                  {t(`nav.${key}`)}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
