import { motion } from 'framer-motion'
import { Microscope, Moon, Sun, Maximize2, Minimize2, Volume2, VolumeX, Command } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Navbar({ onOpenCommandPalette }) {
  const { darkMode, toggleDarkMode, compactMode, toggleCompactMode, soundEnabled, toggleSound, isAnalyzing } = useAppStore()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-ink-900/80
                 border-b border-ink-200 dark:border-ink-700 shadow-sm"
    >
      <div className="relative overflow-hidden">
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-400/20 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700
                            flex items-center justify-center shadow-md">
                <Microscope size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">
                  QualityVision
                </h1>
                {isAnalyzing && (
                  <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-green-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="font-medium">Analyzing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCommandPalette}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800
                         text-ink-600 dark:text-ink-300 transition-colors"
                title="Command Palette (Ctrl+K)"
              >
                <Command size={18} />
              </button>

              <button
                onClick={toggleSound}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800
                         text-ink-600 dark:text-ink-300 transition-colors"
                title={soundEnabled ? 'Mute' : 'Unmute'}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                onClick={toggleCompactMode}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800
                         text-ink-600 dark:text-ink-300 transition-colors"
                title={compactMode ? 'Normal mode' : 'Compact mode'}
              >
                {compactMode ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800
                         text-ink-600 dark:text-ink-300 transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

