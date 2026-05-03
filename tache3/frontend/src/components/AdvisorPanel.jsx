import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Sparkles, TrendingUp, Shield, FileText,
  Loader2, ChevronDown, ChevronUp, Download, RefreshCw,
  BarChart2, Target, Eye, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useStore from '../store/useStore'

/* ── Configuration des 4 modes ─────────────────────────────────────────── */
const MODES = [
  {
    id:          'score_explain',
    icon:        BarChart2,
    label:       'Expliqueur de Score',
    description: 'Comprendre pourquoi une entreprise a ce score XAI',
    color:       'text-blue-600 dark:text-blue-400',
    bg:          'bg-blue-50 dark:bg-blue-900/20',
    border:      'border-blue-200 dark:border-blue-800',
    needCompany: true,
  },
  {
    id:          'strategy',
    icon:        Target,
    label:       'Stratégie de Prospection',
    description: 'Plan d\'action priorisé sur toutes les entreprises',
    color:       'text-emerald-600 dark:text-emerald-400',
    bg:          'bg-emerald-50 dark:bg-emerald-900/20',
    border:      'border-emerald-200 dark:border-emerald-800',
    needCompany: false,
  },
  {
    id:          'competitive',
    icon:        Shield,
    label:       'Veille Concurrentielle',
    description: 'Analyse SWOT des concurrents Tier 3 détectés',
    color:       'text-amber-600 dark:text-amber-400',
    bg:          'bg-amber-50 dark:bg-amber-900/20',
    border:      'border-amber-200 dark:border-amber-800',
    needCompany: false,
  },
  {
    id:          'pdf_report',
    icon:        FileText,
    label:       'Rapport PDF Direction',
    description: 'Rapport exécutif complet prêt à présenter',
    color:       'text-violet-600 dark:text-violet-400',
    bg:          'bg-violet-50 dark:bg-violet-900/20',
    border:      'border-violet-200 dark:border-violet-800',
    needCompany: false,
    isPdf:       true,
  },
]

/* ── Composant principal ─────────────────────────────────────────────────── */
export default function AdvisorPanel({ companies = [] }) {
  const [activeMode,  setActiveMode]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState('')
  const [expanded,    setExpanded]    = useState(true)
  const [selCompany,  setSelCompany]  = useState('')

  const agentStatus = useStore(s => s.agentStatus)
  const anyRunning  = Object.values(agentStatus).some(a => a?.running)

  const scoredCompanies = companies.filter(c => c.score_final != null)
  const activeConf      = MODES.find(m => m.id === activeMode)

  const handleRun = async (mode) => {
    const conf = MODES.find(m => m.id === mode)
    if (!conf) return

    // Score explain nécessite une entreprise sélectionnée
    if (conf.needCompany && !selCompany) {
      toast.error('Sélectionnez une entreprise d\'abord')
      return
    }
    if (!conf.needCompany && scoredCompanies.length === 0) {
      toast.error('Lancez d\'abord les agents pour scorer des entreprises')
      return
    }

    setActiveMode(mode)
    setLoading(true)
    setResult('')

    const body = { mode }
    if (conf.needCompany) {
      body.company = scoredCompanies.find(c => c.name === selCompany)
    } else {
      body.companies = scoredCompanies
    }

    try {
      // Mode PDF → téléchargement direct
      if (conf.isPdf) {
        const res = await fetch('/api/advisor', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erreur serveur')
        }
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `SBT_Rapport_${new Date().toISOString().slice(0,10)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Rapport PDF téléchargé !')
        setResult('__pdf_done__')
      } else {
        // Modes texte
        const res  = await fetch('/api/advisor', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResult(data.result || '')
        toast.success('Analyse terminée !')
      }
    } catch (err) {
      toast.error(`Erreur : ${err.message}`)
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  /* Rendu du markdown basique (gras, listes, titres) */
  const renderResult = (text) => {
    if (!text || text === '__pdf_done__') return null
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-2" />
      if (line.startsWith('### '))
        return <h4 key={i} className="font-bold text-sm text-primary-700 dark:text-primary-300 mt-3 mb-1">{line.slice(4)}</h4>
      if (line.startsWith('## '))
        return <h3 key={i} className="font-bold text-base text-slate-800 dark:text-slate-100 mt-4 mb-1.5 border-b border-slate-200 dark:border-slate-700 pb-1">{line.slice(3)}</h3>
      if (line.startsWith('# '))
        return <h2 key={i} className="font-black text-lg text-primary-800 dark:text-primary-200 mt-2 mb-2">{line.slice(2)}</h2>
      if (line.startsWith('- ') || line.startsWith('* '))
        return <p key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2 leading-relaxed"><span className="text-primary-500 shrink-0">•</span>{line.slice(2)}</p>
      if (line.startsWith('**') && line.endsWith('**'))
        return <p key={i} className="font-semibold text-sm text-slate-800 dark:text-slate-200">{line.slice(2,-2)}</p>
      if (line.startsWith('---'))
        return <hr key={i} className="border-slate-200 dark:border-slate-700 my-2" />
      return <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{line}</p>
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-gradient-to-r from-primary-900 to-primary-700"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">SBT Advisor</h2>
            <p className="text-white/60 text-xs">Agent IA — Analyse XAI & Stratégie</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scoredCompanies.length > 0 && (
            <span className="text-xs text-emerald-300 font-medium bg-white/10 px-2 py-0.5 rounded-full">
              {scoredCompanies.length} entreprises scorées
            </span>
          )}
          {expanded
            ? <ChevronUp size={16} className="text-white/70" />
            : <ChevronDown size={16} className="text-white/70" />
          }
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4">

              {/* Message si pas de données */}
              {scoredCompanies.length === 0 && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <Eye size={16} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Lancez les agents <strong>Searcher → Scrapper → Marketing</strong> pour scorer des entreprises, puis revenez ici.
                  </p>
                </div>
              )}

              {/* Sélecteur d'entreprise (score_explain uniquement) */}
              {scoredCompanies.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Entreprise (pour "Expliqueur de Score")
                  </label>
                  <select
                    value={selCompany}
                    onChange={e => setSelCompany(e.target.value)}
                    className="select text-sm w-full"
                  >
                    <option value="">— Sélectionner une entreprise —</option>
                    {scoredCompanies
                      .sort((a,b) => (b.score_final||0) - (a.score_final||0))
                      .map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} — {c.score_final}/100 ({c.xai_recommendation || '?'})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Grille des 4 modes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODES.map(mode => {
                  const Icon      = mode.icon
                  const isActive  = activeMode === mode.id
                  const isLoading = loading && isActive
                  const disabled  = loading || anyRunning ||
                    (mode.needCompany && !selCompany) ||
                    (!mode.needCompany && scoredCompanies.length === 0)

                  return (
                    <motion.button
                      key={mode.id}
                      onClick={() => !disabled && handleRun(mode.id)}
                      whileHover={!disabled ? { y: -1 } : {}}
                      whileTap={!disabled ? { scale: 0.97 } : {}}
                      className={`
                        relative text-left p-4 rounded-xl border-2 transition-all duration-150
                        ${isActive
                          ? `${mode.bg} ${mode.border} shadow-sm`
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mode.bg}`}>
                          {isLoading
                            ? <Loader2 size={15} className={`${mode.color} animate-spin`} />
                            : <Icon size={15} className={mode.color} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isActive ? mode.color : 'text-slate-700 dark:text-slate-200'}`}>
                            {mode.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {mode.description}
                          </p>
                        </div>
                        {mode.isPdf && (
                          <Download size={13} className="text-slate-400 shrink-0 mt-0.5" />
                        )}
                      </div>
                      {isLoading && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 rounded-b-xl overflow-hidden">
                          <motion.div
                            className={`h-full ${mode.color.replace('text-', 'bg-').replace('dark:text-', '')}`}
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                          />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Résultat */}
              <AnimatePresence>
                {result && result !== '__pdf_done__' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2"
                  >
                    {/* En-tête résultat */}
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${activeConf?.bg || 'bg-slate-50 dark:bg-slate-800'} border ${activeConf?.border || 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className={activeConf?.color || 'text-primary-500'} />
                        <span className={`text-xs font-semibold ${activeConf?.color || 'text-primary-600'}`}>
                          {activeConf?.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRun(activeMode)}
                        disabled={loading}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-40"
                      >
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                        Régénérer
                      </button>
                    </div>

                    {/* Corps du résultat */}
                    <div className={`border-x border-b ${activeConf?.border || 'border-slate-200 dark:border-slate-700'} rounded-b-xl bg-white dark:bg-slate-900 p-4 max-h-[500px] overflow-y-auto`}>
                      <div className="space-y-0.5">
                        {renderResult(result)}
                      </div>
                    </div>
                  </motion.div>
                )}

                {result === '__pdf_done__' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4"
                  >
                    <FileText size={20} className="text-violet-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-violet-700 dark:text-violet-300">Rapport PDF généré !</p>
                      <p className="text-xs text-violet-500 dark:text-violet-400">Le fichier a été téléchargé automatiquement.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
