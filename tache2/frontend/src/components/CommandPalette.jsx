import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Upload, Image, X } from 'lucide-react'

export default function CommandPalette({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('')

  const commands = [
    { id: 'upload', label: 'Téléverser une image', icon: Upload, action: () => onNavigate('upload') },
    { id: 'samples', label: 'Voir les échantillons', icon: Image, action: () => onNavigate('samples') }
  ]

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-ink-800 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-200 dark:border-ink-700">
            <Search size={18} className="text-ink-400" />
            <input
              type="text"
              placeholder="Rechercher une action..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none text-ink-900 dark:text-white
                       placeholder:text-ink-400"
            />
            <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
              <X size={18} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-500">
                Aucun résultat
              </div>
            ) : (
              filtered.map((cmd) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action()
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3
                             hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors
                             text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40
                                  flex items-center justify-center text-primary-600 dark:text-primary-300">
                      <Icon size={16} />
                    </div>
                    <span className="text-ink-900 dark:text-white font-medium">
                      {cmd.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 bg-ink-50 dark:bg-ink-900 border-t border-ink-200 dark:border-ink-700
                        text-xs text-ink-500 flex items-center justify-between">
            <span>Utilisez ↑↓ pour naviguer</span>
            <span>ESC pour fermer</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
