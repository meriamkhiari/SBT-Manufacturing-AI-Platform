import { NavLink, useLocation } from 'react-router-dom'
import { Moon, Sun, Globe, LayoutDashboard, Share2, Megaphone, Home, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import clsx from 'clsx'
import useStore from '../store/useStore'
import LanguageSwitcher from './LanguageSwitcher'

// Navbar links: primary actions only.
// Secondary tools (Map, Graph, Marketing) are in the sidebar (Sidebar.jsx).
const LINKS = [
  { to: '/',          icon: Home,            label: 'Accueil'   },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

export default function Navbar() {
  const location        = useLocation()
  const isDark          = useStore(s => s.isDark)
  const toggleTheme     = useStore(s => s.toggleTheme)
  const selectedCountry = useStore(s => s.selectedCountry)
  const agentStatus     = useStore(s => s.agentStatus)
  const soundEnabled    = useStore(s => s.soundEnabled)
  const toggleSound     = useStore(s => s.toggleSound)
  const isCompact       = useStore(s => s.isCompact)
  const toggleCompact   = useStore(s => s.toggleCompact)
  const [mobileOpen, setMobileOpen] = useState(false)

  const anyRunning = Object.values(agentStatus).some(a => a?.running)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-primary-900 to-primary-700 shadow-lg shadow-primary-900/20">
        {/* Shimmer sweep — overflow-hidden scoped ici uniquement */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="navbar-shimmer" />
        </div>

        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3 relative">

          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 overflow-hidden">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <rect x="2" y="8" width="28" height="16" rx="2" fill="white" fillOpacity="0.15"/>
                <path d="M6 14h4M6 18h6M16 14h4M16 18h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="24" cy="10" r="4" fill="#60a5fa"/>
                <path d="M22 10l1.5 1.5L26 8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 12V20M28 12V20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
              </svg>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-black text-white tracking-tight text-sm">SBT</span>
              <span className="text-white/60 text-[9px] font-medium tracking-wide uppercase">Intelligence</span>
            </div>
            <span className="font-black text-white tracking-tight text-sm sm:hidden">SBT</span>
            <AnimatePresence>
              {anyRunning && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="hidden sm:flex items-center gap-1 text-xs text-emerald-300 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Nav links — desktop with micro-animations */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {LINKS.map(({ to, icon: Icon, label }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    clsx('nav-link shrink-0 relative', isActive && 'nav-link-active')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.span
                        animate={isActive ? { scale: 1.15, rotate: 0 } : { scale: 1, rotate: 0 }}
                        whileHover={{ scale: 1.2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex"
                      >
                        <Icon size={13} />
                      </motion.span>
                      <span>{label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="navUnderline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/60 rounded-full"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* Right side */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Country badge */}
            <AnimatePresence>
              {selectedCountry && (
                <motion.div
                  key={selectedCountry}
                  initial={{ opacity: 0, scale: 0.8, x: 8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 8 }}
                  className="hidden sm:flex items-center gap-1 bg-white/15 border border-white/20 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                >
                  <Globe size={10} />
                  {selectedCountry}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Sound toggle */}
            <motion.button
              onClick={toggleSound}
              whileTap={{ scale: 0.85 }}
              className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
              title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {soundEnabled
                  ? <motion.span key="on"  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Volume2 size={14} /></motion.span>
                  : <motion.span key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><VolumeX size={14} className="opacity-50" /></motion.span>
                }
              </AnimatePresence>
            </motion.button>

            {/* Compact mode toggle */}
            <motion.button
              onClick={toggleCompact}
              whileTap={{ scale: 0.85 }}
              className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors"
              title={isCompact ? 'Mode normal' : 'Mode compact'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isCompact
                  ? <motion.span key="max" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Maximize2 size={13} /></motion.span>
                  : <motion.span key="min" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Minimize2 size={13} /></motion.span>
                }
              </AnimatePresence>
            </motion.button>

            {/* Theme toggle */}
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.85, rotate: 20 }}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark
                  ? <motion.span key="sun"  initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={{ duration: 0.2 }}><Sun  size={14} /></motion.span>
                  : <motion.span key="moon" initial={{ rotate: 90, scale: 0 }}  animate={{ rotate: 0, scale: 1 }} exit={{ rotate: -90, scale: 0 }} transition={{ duration: 0.2 }}><Moon size={14} /></motion.span>
                }
              </AnimatePresence>
            </motion.button>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex flex-col items-center justify-center gap-1 text-white transition-colors"
              aria-label="Menu"
            >
              <span className={clsx('block w-4 h-0.5 bg-white transition-all duration-200', mobileOpen && 'rotate-45 translate-y-1.5')} />
              <span className={clsx('block w-4 h-0.5 bg-white transition-all duration-200', mobileOpen && 'opacity-0')} />
              <span className={clsx('block w-4 h-0.5 bg-white transition-all duration-200', mobileOpen && '-rotate-45 -translate-y-1.5')} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed top-14 left-0 right-0 z-40 bg-primary-900 border-b border-primary-700 shadow-xl"
          >
            <div className="px-3 py-2 flex flex-col gap-0.5">
              {LINKS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/10',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.span
                        animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                        className="flex"
                      >
                        <Icon size={16} />
                      </motion.span>
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
              {/* Mobile-only: sound + compact toggles */}
              <div className="flex gap-2 px-3 py-2 border-t border-white/10 mt-1">
                <button
                  onClick={toggleSound}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} className="opacity-50" />}
                  Son {soundEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={toggleCompact}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors ml-4"
                >
                  {isCompact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                  {isCompact ? 'Normal' : 'Compact'}
                </button>
              </div>
              {selectedCountry && (
                <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-emerald-300 font-medium">
                  <Globe size={12} />
                  Filtre actif : {selectedCountry}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay pour fermer le menu mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-30 bg-black/30"
            style={{ top: '56px' }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
