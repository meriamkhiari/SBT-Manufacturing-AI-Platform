import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, CheckCircle, XCircle, Loader2, Check, Clock } from 'lucide-react'
import clsx from 'clsx'
import useStore from '../store/useStore'
import { useRunAgent } from '../hooks/useApi'

const STEP_LABELS = {
  searcher:  ['Initialisation', 'Génération requêtes', 'Scraping Serper', 'Classification Claude', 'Stockage'],
  scrapper:  ['Initialisation', 'Crawl4AI', 'Extraction LLM', 'Enrichissement', 'Stockage Neo4j'],
  marketing: ['Initialisation', 'Analyse prospects', 'Génération pitchs', 'Scoring XAI', 'Export'],
}

const EST_DURATION = { searcher: '~45s', scrapper: '~2min', marketing: '~1min' }

function playDoneSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {}
}

function StatusBadge({ status }) {
  const { running, message } = status || {}
  if (running) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-full">
      <Loader2 size={11} className="animate-spin" /> {message || 'En cours...'}
    </span>
  )
  if (message === 'Terminé') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
      <CheckCircle size={11} /> Terminé
    </span>
  )
  if (message?.startsWith('Erreur')) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
      <XCircle size={11} /> Erreur
    </span>
  )
  return (
    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
      Prêt
    </span>
  )
}

export default function AgentPanel({ agent, icon: Icon, title, description, accentClass, params = {} }) {
  const agentStatus     = useStore(s => s.agentStatus)
  const selectedCountry = useStore(s => s.selectedCountry)
  const selectedSector  = useStore(s => s.selectedSector)
  const soundEnabled    = useStore(s => s.soundEnabled)
  const { mutate: run, isPending } = useRunAgent()

  const [justDone, setJustDone] = useState(false)
  const prevRunning = useRef(false)

  const status   = agentStatus[agent] || {}
  const disabled = status.running || isPending

  // Détecte la fin de l'agent → animation check + son
  useEffect(() => {
    if (prevRunning.current && !status.running && status.message === 'Terminé') {
      setJustDone(true)
      if (soundEnabled) playDoneSound()
      setTimeout(() => setJustDone(false), 2500)
    }
    prevRunning.current = !!status.running
  }, [status.running, status.message, soundEnabled])

  const handleRun = () => {
    run({ agent, params: { ...params, country: selectedCountry, sector: selectedSector } })
  }

  const steps     = STEP_LABELS[agent] || []
  const progress  = status.progress || 0
  const stepIndex = status.running ? Math.floor((progress / 100) * steps.length) : -1

  return (
    <motion.div
      className={clsx('card p-5 flex flex-col gap-4 border-l-4 transition-all duration-200 hover:shadow-md', accentClass)}
      whileHover={{ x: 2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-sm">
            <Icon size={24} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Barre de progression avec étapes */}
      {status.running && (
        <div className="space-y-2">
          <div className="score-track">
            <motion.div
              className="score-fill bg-primary-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {steps[stepIndex] && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> {steps[stepIndex]}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock size={10} /> {EST_DURATION[agent]}
              </span>
            </div>
          )}
          {/* Mini steps indicators */}
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                  i < stepIndex ? 'bg-primary-500' :
                  i === stepIndex ? 'bg-primary-300 animate-pulse' :
                  'bg-slate-200 dark:bg-slate-700'
                }`}
                title={s}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={disabled}
        className={clsx(
          'btn-primary flex items-center justify-center gap-2 text-sm w-full relative overflow-hidden',
          justDone && 'bg-emerald-600 hover:bg-emerald-600',
        )}
      >
        <AnimatePresence mode="wait">
          {justDone ? (
            <motion.span
              key="done"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-2"
            >
              <Check size={14} /> Terminé !
            </motion.span>
          ) : disabled ? (
            <motion.span key="loading" className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> En cours...
            </motion.span>
          ) : (
            <motion.span key="idle" className="flex items-center gap-2">
              <Play size={14} fill="currentColor" /> Lancer {title}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  )
}
