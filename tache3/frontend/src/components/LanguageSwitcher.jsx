import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Check, ChevronDown, Loader2 } from 'lucide-react'

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

export default function LanguageSwitcher() {
  const [open,     setOpen]     = useState(false)
  const [current,  setCurrent]  = useState('fr')
  const [loading,  setLoading]  = useState(false)
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

    // Affiche un spinner — la page va recharger dans un instant
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

  const activeLang = LANGUAGES.find(l => l.code === current) || LANGUAGES[0]

  return (
    <div ref={dropRef} className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => !loading && setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 bg-white/12 hover:bg-white/20 border border-white/20 rounded-lg px-2 py-1.5 text-white transition-all duration-150 text-xs font-medium disabled:opacity-70"
        title="Changer la langue / Change language"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <span className="text-sm leading-none">{activeLang.flag}</span>
        )}
        <span className="hidden sm:inline max-w-[64px] truncate">
          {loading ? 'Loading...' : activeLang.name}
        </span>
        {!loading && (
          <ChevronDown
            size={11}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl shadow-black/15 overflow-hidden z-[9999]"
          >
            {/* En-tête */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Languages size={10} /> Langue du site
              </p>
            </div>

            {/* Liste des langues */}
            <div className="max-h-64 overflow-y-auto">
              {LANGUAGES.map(lang => {
                const isActive = lang.code === current
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors duration-100 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-base leading-none w-5 text-center">{lang.flag}</span>
                    <span className="flex-1 truncate">{lang.name}</span>
                    {isActive && (
                      <Check size={12} className="text-primary-600 dark:text-primary-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Note de bas de liste */}
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <p className="text-[9px] text-slate-400 leading-tight">
                La page se rechargera pour appliquer la traduction.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
