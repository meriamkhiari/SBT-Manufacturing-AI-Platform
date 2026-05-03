import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Check, ChevronDown, Loader2, Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'fr',    flag: '🇫🇷', name: 'Français'    },
  { code: 'en',    flag: '🇬🇧', name: 'English'     },
  { code: 'ar',    flag: '🇸🇦', name: 'العربية'     },
  { code: 'de',    flag: '🇩🇪', name: 'Deutsch'     },
  { code: 'es',    flag: '🇪🇸', name: 'Español'     },
  { code: 'it',    flag: '🇮🇹', name: 'Italiano'    },
  { code: 'pt',    flag: '🇵🇹', name: 'Português'   },
  { code: 'nl',    flag: '🇳🇱', name: 'Nederlands'  },
  { code: 'ru',    flag: '🇷🇺', name: 'Русский'     },
  { code: 'zh-CN', flag: '🇨🇳', name: '中文'        },
  { code: 'ja',    flag: '🇯🇵', name: '日本語'      },
  { code: 'ko',    flag: '🇰🇷', name: '한국어'      },
  { code: 'tr',    flag: '🇹🇷', name: 'Türkçe'     },
  { code: 'pl',    flag: '🇵🇱', name: 'Polski'      },
  { code: 'ro',    flag: '🇷🇴', name: 'Română'      },
  { code: 'bg',    flag: '🇧🇬', name: 'Български'   },
  { code: 'sv',    flag: '🇸🇪', name: 'Svenska'     },
  { code: 'da',    flag: '🇩🇰', name: 'Dansk'       },
  { code: 'fi',    flag: '🇫🇮', name: 'Suomi'       },
  { code: 'hu',    flag: '🇭🇺', name: 'Magyar'      },
  { code: 'cs',    flag: '🇨🇿', name: 'Čeština'    },
  { code: 'uk',    flag: '🇺🇦', name: 'Українська' },
  { code: 'he',    flag: '🇮🇱', name: 'עברית'       },
]

export default function LanguageSwitcher({ variant = 'default' }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('fr')
  const [loading, setLoading] = useState(false)
  const dropRef = useRef(null)

  // Lit le cookie googtrans au montage pour afficher la langue active
  useEffect(() => {
    const lang = window.sbtGetCurrentLang?.() || 'fr'
    setCurrent(lang)
  }, [])

  // Ferme le dropdown si clic en dehors
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (code) => {
    setOpen(false)
    if (code === current) return

    setLoading(true)

    /*
     * Mécanisme fiable sur React SPA :
     * 1. Écriture du cookie googtrans (ex: /fr/en)
     * 2. window.location.reload()
     * 3. Après rechargement, Google Translate lit le cookie et traduit
     *    AVANT que React monte — donc aucun conflit avec le Virtual DOM.
     */
    window.sbtChangeLanguage?.(code)
  }

  const activeLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0]

  // Variant "navbar" pour le header
  if (variant === 'navbar') {
    return (
      <div ref={dropRef} className="relative">
        <button
          onClick={() => !loading && setOpen((v) => !v)}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 transition-colors disabled:opacity-50"
          title="Change language"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Globe size={18} />
          )}
        </button>

        <AnimatePresence>
          {open && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-xl shadow-xl overflow-hidden z-[9999]"
            >
              <div className="px-3 py-2 border-b border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950">
                <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Languages size={10} /> Select Language
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {LANGUAGES.map((lang) => {
                  const isActive = lang.code === current
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                          : 'text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800'
                      }`}
                    >
                      <span className="text-base leading-none w-5 text-center">
                        {lang.flag}
                      </span>
                      <span className="flex-1 truncate">{lang.name}</span>
                      {isActive && (
                        <Check
                          size={14}
                          className="text-primary-600 dark:text-primary-400 shrink-0"
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="px-3 py-2 border-t border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950">
                <p className="text-[9px] text-ink-400 leading-tight">
                  Page will reload to apply translation
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Variant "default" - bouton avec flag visible
  return (
    <div ref={dropRef} className="relative">
      <button
        onClick={() => !loading && setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-primary-300 dark:hover:border-primary-700 text-ink-700 dark:text-ink-300 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
        title="Change language"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <span className="text-lg leading-none">{activeLang.flag}</span>
        )}
        <span className="hidden sm:inline truncate">
          {loading ? 'Loading...' : activeLang.name}
        </span>
        {!loading && (
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-xl shadow-xl overflow-hidden z-[9999]"
          >
            <div className="px-3 py-2 border-b border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950">
              <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
                <Languages size={10} /> Select Language
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {LANGUAGES.map((lang) => {
                const isActive = lang.code === current
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800'
                    }`}
                  >
                    <span className="text-base leading-none w-5 text-center">
                      {lang.flag}
                    </span>
                    <span className="flex-1 truncate">{lang.name}</span>
                    {isActive && (
                      <Check
                        size={14}
                        className="text-primary-600 dark:text-primary-400 shrink-0"
                      />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="px-3 py-2 border-t border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950">
              <p className="text-[9px] text-ink-400 leading-tight">
                Page will reload to apply translation
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
