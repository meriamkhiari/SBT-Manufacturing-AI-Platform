import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Home, Globe, LayoutDashboard, Share2, Megaphone,
  Moon, Sun, Star, Trash2, Download, RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

const PAGES = [
  { id: 'home',      label: 'Accueil',    desc: 'Page d\'accueil et pipeline',    icon: Home,            path: '/',          category: 'Navigation' },
  { id: 'map',       label: 'Carte',      desc: 'Carte géographique des prospects', icon: Globe,          path: '/map',       category: 'Navigation' },
  { id: 'dashboard', label: 'Dashboard',  desc: 'Tableau de bord des entreprises',  icon: LayoutDashboard, path: '/dashboard', category: 'Navigation' },
  { id: 'graph',     label: 'Graphe',     desc: 'Relations Neo4j interactives',     icon: Share2,         path: '/graph',     category: 'Navigation' },
  { id: 'marketing', label: 'Marketing',  desc: 'Analyses et pitchs IA',           icon: Megaphone,       path: '/marketing', category: 'Navigation' },
]

export default function CommandPalette() {
  const open         = useStore(s => s.commandPaletteOpen)
  const closePalette = useStore(s => s.closePalette)
  const isDark       = useStore(s => s.isDark)
  const toggleTheme  = useStore(s => s.toggleTheme)
  const _favoritesArr = useStore(s => s._favoritesArr)
  const clearFavs    = useStore(s => s.clearFavorites)

  const [query,  setQuery]  = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Actions are re-computed each render so they reflect latest store state
  const getActions = () => [
    {
      id: 'dark',  label: isDark ? 'Mode clair' : 'Mode sombre',
      desc: 'Changer le thème de l\'interface', icon: isDark ? Sun : Moon,
      action: () => { toggleTheme(); closePalette() }, category: 'Actions',
    },
    {
      id: 'favs',  label: `Mes favoris (${_favoritesArr.length})`,
      desc: 'Voir les entreprises en favoris', icon: Star,
      action: () => { navigate('/dashboard'); closePalette() }, category: 'Actions',
    },
    {
      id: 'clear', label: 'Effacer les favoris',
      desc: 'Supprimer tous les favoris', icon: Trash2,
      action: () => { clearFavs(); closePalette() }, category: 'Actions',
    },
  ]

  const allItems = [...PAGES, ...getActions()]
  const q        = query.toLowerCase()
  const filtered = q
    ? allItems.filter(i => i.label.toLowerCase().includes(q) || i.desc?.toLowerCase().includes(q))
    : allItems

  // Build groups with flat indices for keyboard nav
  const groups = {}
  filtered.forEach((item, idx) => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push({ ...item, flatIdx: idx })
  })

  const execute = useCallback((item) => {
    if (item.path)   { navigate(item.path); closePalette() }
    else if (item.action) item.action()
  }, [navigate, closePalette])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape')    { e.preventDefault(); closePalette() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); filtered[active] && execute(filtered[active]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, active, filtered, execute, closePalette])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[500] flex items-start justify-center pt-[12vh] px-4"
          onClick={closePalette}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.14 }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-700">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher une page ou action…"
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 select-none">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[340px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
                  Aucun résultat pour « {query} »
                </p>
              ) : (
                Object.entries(groups).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                      {cat}
                    </p>
                    {items.map(item => {
                      const Icon     = item.icon
                      const isActive = active === item.flatIdx
                      return (
                        <button
                          key={item.id}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setActive(item.flatIdx)}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-primary-100 dark:bg-primary-800/50'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{item.label}</p>
                            {item.desc && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.desc}</p>
                            )}
                          </div>
                          {item.path && (
                            <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 select-none">↵</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5 text-[10px] text-slate-400 dark:text-slate-500 select-none">
              <span><kbd className="font-mono">↑↓</kbd> naviguer</span>
              <span><kbd className="font-mono">↵</kbd> sélectionner</span>
              <span><kbd className="font-mono">Esc</kbd> fermer</span>
              <span className="ml-auto opacity-60">Ctrl+K pour ouvrir</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
