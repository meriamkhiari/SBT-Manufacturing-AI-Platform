import { Outlet, useLocation, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import SBTChatbot from './SBTChatbot'
import BottomNav from './BottomNav'
import BackToTop from './BackToTop'
import OfflineBanner from './OfflineBanner'
import RouteProgressBar from './RouteProgressBar'
import { useStatusStream } from '../hooks/useApi'
import { ChevronRight, Home } from 'lucide-react'
import useStore from '../store/useStore'

const PAGE_LABELS = {
  '/':          'Accueil',
  '/map':       'Carte',
  '/dashboard': 'Dashboard',
  '/graph':     'Graphe',
  '/marketing': 'Marketing',
}

function Breadcrumb() {
  const location = useLocation()
  if (location.pathname === '/') return null
  const label = PAGE_LABELS[location.pathname] || location.pathname.slice(1)
  return (
    <nav className="hidden md:flex items-center gap-1.5 px-4 lg:px-6 py-1.5 bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
      <NavLink to="/" className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        <Home size={11} /> Accueil
      </NavLink>
      <ChevronRight size={11} className="text-slate-300 dark:text-slate-600" />
      <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    </nav>
  )
}

export default function Layout() {
  useStatusStream()

  const location  = useLocation()
  const isCompact = useStore(s => s.isCompact)

  /*
   * Ré-applique Google Translate après chaque navigation React Router.
   * Sans ce hook, le contenu rendu par React après un changement de route
   * n'est pas traduit (React écrase les noeuds DOM que GT avait modifiés).
   */
  useEffect(() => {
    // Double appel : 1er après le rendu initial, 2ème pour le contenu chargé en lazy
    const t1 = setTimeout(() => window.sbtReapplyTranslation?.(), 500)
    const t2 = setTimeout(() => window.sbtReapplyTranslation?.(), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [location.pathname])

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200${isCompact ? ' compact' : ''}`}>
      <RouteProgressBar />
      <OfflineBanner />
      <Navbar />
      <Breadcrumb />

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Navigation mobile en bas (visible < md) */}
      <BottomNav />

      {/* Retour en haut */}
      <BackToTop />

      {/* Chatbot flottant — visible sur toutes les pages */}
      <SBTChatbot />
    </div>
  )
}
