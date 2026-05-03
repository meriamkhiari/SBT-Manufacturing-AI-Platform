import { NavLink } from 'react-router-dom'
import { Home, Globe, LayoutDashboard, Share2, Megaphone } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

const LINKS = [
  { to: '/',          icon: Home,            label: 'Accueil'   },
  { to: '/map',       icon: Globe,           label: 'Carte'     },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/graph',     icon: Share2,          label: 'Graphe'    },
  { to: '/marketing', icon: Megaphone,       label: 'Marketing' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/10">
      <div className="flex items-stretch h-14">
        {LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center justify-center"
          >
            {({ isActive }) => (
              <div className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full">
                {/* Pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavPill"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-primary-600 dark:bg-primary-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon container */}
                <motion.div
                  animate={isActive ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={clsx(
                    'w-9 h-6 rounded-full flex items-center justify-center transition-colors duration-150',
                    isActive ? 'bg-primary-100 dark:bg-primary-900/50' : '',
                  )}
                >
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-400 dark:text-slate-500'}
                  />
                </motion.div>

                {/* Label */}
                <span className={clsx(
                  'text-[9px] font-semibold tracking-wide transition-colors duration-150',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-400 dark:text-slate-500',
                )}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
