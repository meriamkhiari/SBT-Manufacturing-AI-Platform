import { motion } from 'framer-motion'
import { ChevronRight, AlertTriangle, AlertOctagon, Info, Brain } from 'lucide-react'
import clsx from 'clsx'
import ScoreBar from './ScoreBar'

const SEV_LABEL = { high: 'Critique', medium: 'Moyen', low: 'Mineur' }
const SEV_BADGE = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
const SEV_ICON  = { high: AlertOctagon, medium: AlertTriangle, low: Info }
const SEV_BORDER= {
  high:   'border-l-rose-500 dark:border-l-rose-400',
  medium: 'border-l-amber-500 dark:border-l-amber-400',
  low:    'border-l-emerald-500 dark:border-l-emerald-400',
}

export default function DetectionCard({ detection: d, index, onFlash, onOpen, highlighted }) {
  const SevIcon = SEV_ICON[d.severity] || Info
  const hasXAI = d.xai && Object.keys(d.xai).length > 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={() => onFlash?.(index)}
      className={clsx(
        'card-hover p-4 cursor-pointer border-l-4 group relative',
        SEV_BORDER[d.severity],
        highlighted && 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-ink-900',
      )}
    >
      {hasXAI && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 
                        flex items-center justify-center text-violet-600 dark:text-violet-400"
               title="XAI disponible">
            <Brain size={12} />
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-ink-100 dark:bg-ink-800 grid place-items-center
                        text-ink-600 dark:text-ink-300 font-mono text-sm font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm text-ink-900 dark:text-white capitalize truncate">
              {(d.class_name || '').replace(/_/g, ' ')}
            </div>
            <span className={clsx('badge', SEV_BADGE[d.severity])}>
              <SevIcon size={11} /> {SEV_LABEL[d.severity] || '—'}
            </span>
          </div>
          {d.location_description && (
            <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5 line-clamp-2">
              {d.location_description}
            </div>
          )}
          <ScoreBar value={d.confidence || 0} severity={d.severity} className="mt-3" label="Confidence" />
          
          {hasXAI && onOpen && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(d, index) }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                       bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30
                       border border-violet-200 dark:border-violet-800
                       text-violet-700 dark:text-violet-300 text-xs font-medium transition-colors"
            >
              <Brain size={14} />
              Voir explications XAI
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
