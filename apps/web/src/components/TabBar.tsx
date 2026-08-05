import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, ClipboardList, Users, Apple, User } from 'lucide-react';

const tabs = [
  { to: '/', key: 'recommended', icon: Star, color: 'text-brand-pink' },
  { to: '/programs', key: 'programs', icon: ClipboardList, color: 'text-brand-blue' },
  { to: '/community', key: 'community', icon: Users, color: 'text-brand-pink' },
  { to: '/wellness', key: 'wellness', icon: Apple, color: 'text-brand-green' },
  { to: '/profile', key: 'profile', icon: User, color: 'text-brand-pink' },
];

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <nav className="glass-nav fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-white/40">
      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {tabs.map(({ to, key, icon: Icon, color }) => (
          <NavLink key={to} to={to} end={to === '/'} className="relative flex flex-1 flex-col items-center gap-1 py-1.5">
            {({ isActive }) => (
              <motion.div className="relative flex flex-col items-center gap-1" whileTap={{ scale: 0.85 }}>
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className={`absolute -top-1.5 h-[3px] w-7 rounded-full ${color.replace('text-', 'bg-')}`}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <Icon size={22} className={isActive ? color : 'text-gray-400'} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[9px] font-semibold uppercase tracking-wide ${isActive ? color : 'text-gray-400'}`}>
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
