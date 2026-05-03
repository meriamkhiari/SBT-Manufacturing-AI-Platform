import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Boxes, LayoutDashboard, Cpu, ScanSearch, Network, Home, Command, Volume2, VolumeX, Maximize2, Minimize2, Moon, Sun, LogOut, ShieldCheck, Users, Menu, X } from 'lucide-react'
import { cx } from './ui'
import { useAppStore } from '../store/useAppStore'
import { useState, useEffect } from 'react'
import CommandPalette from './CommandPalette'
import OnboardingTour from './OnboardingTour'
import RouteProgress from './RouteProgress'
import LanguageSwitcher from './LanguageSwitcher'
import { useAuth } from '../lib/AuthContext'

const NAV_BASE = [
  { to: '/',          label: 'Accueil',          icon: Home,       roles: ['admin', 'employee'] },
  { to: '/task1',     label: 'SBT Vision',       icon: Cpu,        roles: ['employee'] },
  { to: '/task2',     label: 'QualityVision',    icon: ScanSearch, roles: ['employee'] },
  { to: '/task3',     label: 'SBT Intelligence', icon: Network,    roles: ['admin'] },
  { to: '/admin/users', label: 'Users',          icon: Users,      roles: ['admin'] },
]

function NavItem({ to, icon: Icon, label, compact }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden',
          compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
          isActive
            ? 'text-white shadow-lg shadow-primary-500/25'
            : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/80 dark:text-ink-300 dark:hover:text-white dark:hover:bg-ink-800/80'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-active-glow"
              className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-500"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              aria-hidden="true"
            />
          )}
          <Icon size={compact ? 16 : 18} className={cx('relative z-10 transition-transform group-hover:scale-110', isActive && 'drop-shadow')} />
          <span className="relative z-10">{label}</span>
          {isActive && (
            <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { darkMode, toggleDarkMode, compactMode, toggleCompactMode, soundEnabled, toggleSound, allSystemsOnline } = useAppStore()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const { user, logout } = useAuth()
  const role = user?.role || 'employee'
  const NAV  = NAV_BASE.filter(n => n.roles.includes(role))

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Re-apply Google Translate after React navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      window.sbtReapplyTranslation?.()
    }, 300)
    return () => clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Task routes get the entire viewport — no portal chrome.
  const isTask = /^\/task[123]$/.test(location.pathname)

  if (isTask) {
    // Full-screen takeover. The TaskShell renders its own minimal floating UI.
    return (
      <>
        <RouteProgress />
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-ink-950">
      <RouteProgress />

      {/* ─── Desktop Sidebar (left) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-ink-800 z-30 overflow-hidden">
        {/* Subtle decorative gradient orb */}
        <div aria-hidden className="absolute -top-32 -right-20 w-56 h-56 rounded-full bg-gradient-to-br from-primary-200/40 to-accent-200/40 dark:from-primary-700/20 dark:to-accent-700/20 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-32 -left-20 w-56 h-56 rounded-full bg-gradient-to-tr from-accent-200/30 to-primary-200/30 dark:from-accent-800/15 dark:to-primary-800/15 blur-3xl pointer-events-none" />

        {/* Brand */}
        <NavLink to="/" className="relative flex items-center gap-2.5 px-5 h-16 border-b border-ink-200 dark:border-ink-800 shrink-0 group">
          <motion.div
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 grid place-items-center text-white shadow-lg shadow-primary-500/30"
          >
            <Boxes size={18} />
          </motion.div>
          <div className="leading-tight">
            <div className="font-bold text-ink-900 dark:text-white text-sm">Integration Portal</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-500 font-semibold">Smart Brain Tech</div>
          </div>
        </NavLink>

        {/* Nav links */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-ink-200 to-transparent dark:from-ink-700" />
            Workspace
            <span className="h-px flex-1 bg-gradient-to-l from-ink-200 to-transparent dark:from-ink-700" />
          </div>
          {NAV.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* Status pulse */}
        {allSystemsOnline && (
          <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5">
            <div className="relative">
              <span className="block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">All systems online</span>
          </div>
        )}

        {/* User card */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative m-3 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-ink-800/50 dark:to-ink-900 border border-ink-200 dark:border-ink-800 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full grid place-items-center font-bold text-white bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/30">
                  {(user.fullname || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-ink-900" title="Online" />
              </div>
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-sm font-bold text-ink-900 dark:text-white truncate">{user.fullname || user.email}</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 text-primary-600 dark:text-primary-400">
                  {role === 'admin' && <ShieldCheck size={10} />}
                  {role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-ink-500 hover:text-rose-500 transition-colors shrink-0"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </aside>

      {/* ─── Right column (header + main) ───────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <header className="sticky top-0 z-20 border-b border-ink-200 dark:border-ink-800 bg-white/85 dark:bg-ink-900/85 backdrop-blur-md">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
            {/* Mobile: hamburger + brand */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <NavLink to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 grid place-items-center text-white">
                  <Boxes size={16} />
                </div>
                <span className="font-bold text-ink-900 dark:text-white text-sm">Integration Portal</span>
              </NavLink>
            </div>

            {/* Desktop: page breadcrumb / search */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
              <Home size={14} />
              <span>/</span>
              <span className="font-semibold text-ink-900 dark:text-white capitalize">
                {location.pathname === '/' ? 'Home' : location.pathname.replace(/^\//, '').replace('/', ' / ')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <LanguageSwitcher variant="navbar" />
              <button
                onClick={() => setCommandOpen(true)}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors"
                title="Command Palette (Ctrl+K)"
              >
                <Command size={18} />
              </button>
              <button onClick={toggleSound} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors hidden sm:inline-flex" title={soundEnabled ? 'Mute' : 'Unmute'}>
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button onClick={toggleCompactMode} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors hidden sm:inline-flex" title={compactMode ? 'Normal mode' : 'Compact mode'}>
                {compactMode ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors" title={darkMode ? 'Light mode' : 'Dark mode'}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Mobile: avatar pill */}
              {user && (
                <div className="lg:hidden flex items-center gap-2 ml-1 pl-2 border-l border-ink-200 dark:border-ink-800">
                  <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white bg-gradient-to-br from-primary-500 to-accent-500">
                    {(user.fullname || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-ink-900 z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-ink-200 dark:border-ink-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 grid place-items-center text-white">
                    <Boxes size={18} />
                  </div>
                  <span className="font-bold text-ink-900 dark:text-white">SBT Portal</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300">
                  <X size={20} />
                </button>
              </div>

              {user && (
                <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center gap-3">
                  <div className={cx('w-10 h-10 rounded-full grid place-items-center font-bold text-white', role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500')}>
                    {(user.fullname || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink-900 dark:text-white truncate">{user.fullname || user.email}</div>
                    <div className={cx('text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1', role === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')}>
                      {role === 'admin' && <ShieldCheck size={10} />}
                      {role}
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV.map(item => <NavItem key={item.to} {...item} />)}
              </nav>

              <div className="p-3 border-t border-ink-200 dark:border-ink-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <AnimatePresence mode="wait">
              <Outlet key={location.pathname} />
            </AnimatePresence>
          </div>
        </main>
      </div>

      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
      <OnboardingTour />
    </div>
  )
}
