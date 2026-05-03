import clsx from 'clsx'
import { useState } from 'react'
import { Info } from 'lucide-react'

function scoreColor(v) {
  if (v >= 75) return 'bg-emerald-500'
  if (v >= 50) return 'bg-primary-500'
  if (v >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

export function ScoreBar({ value, label, showValue = true, size = 'md' }) {
  const v = value ?? 0
  return (
    <div className={clsx('w-full', size === 'sm' ? 'space-y-0.5' : 'space-y-1')}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          {showValue && <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{v}</span>}
        </div>
      )}
      <div className="score-track">
        <div
          className={clsx('score-fill', scoreColor(v))}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreBadge({ value, size = 'sm', company = null }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const v = value ?? 0
  const { bg, text, dot, label } =
    v >= 70 ? { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'Haute priorité' } :
    v >= 50 ? { bg: 'bg-blue-100 dark:bg-blue-900/50',       text: 'text-blue-800 dark:text-blue-300',       dot: 'bg-blue-500',   label: 'Priorité moyenne' } :
    v >= 30 ? { bg: 'bg-amber-100 dark:bg-amber-900/50',     text: 'text-amber-800 dark:text-amber-300',     dot: 'bg-amber-500',  label: 'Priorité faible' } :
              { bg: 'bg-red-100 dark:bg-red-900/50',         text: 'text-red-800 dark:text-red-300',         dot: 'bg-red-500',    label: 'Non qualifié' }

  const dims = company ? [
    { label: 'Pertinence',    val: company.score_relevance,   color: 'bg-blue-500' },
    { label: 'Potentiel',     val: company.score_potential,   color: 'bg-emerald-500' },
    { label: 'Compétition',   val: company.score_competition, color: 'bg-amber-500' },
    { label: 'Marché',        val: company.score_market,      color: 'bg-violet-500' },
  ].filter(d => d.val != null) : []

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      <span className={clsx(
        'inline-flex items-center gap-1 font-bold rounded-full cursor-help',
        bg, text,
        size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5',
      )}>
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
        {v}
        <Info size={9} className="opacity-60" />
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-slate-900 dark:bg-slate-800 rounded-xl p-3 shadow-2xl border border-slate-700 pointer-events-none">
          <div className="text-xs font-bold text-white mb-1">{label}</div>
          <div className="text-[10px] text-slate-400 mb-2">Score global : {v}/100</div>
          {dims.length > 0 ? (
            <div className="space-y-1.5">
              {dims.map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                    <span>{d.label}</span><span>{d.val}</span>
                  </div>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">Détails non disponibles</p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>
      )}
    </div>
  )
}

export function ScoreRadar({ scores = {} }) {
  const dims = [
    { key: 'relevance',   label: 'Pertinence',    color: '#3b82f6' },
    { key: 'potential',   label: 'Potentiel',      color: '#10b981' },
    { key: 'competition', label: 'Compétitivité',  color: '#f59e0b' },
    { key: 'market',      label: 'Position marché', color: '#8b5cf6' },
  ]
  return (
    <div className="space-y-3">
      {dims.map(({ key, label, color }) => (
        <div key={key}>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
            <span className="text-xs font-bold" style={{ color }}>{scores[key] ?? 0}/100</span>
          </div>
          <div className="score-track">
            <div
              className="score-fill"
              style={{ width: `${scores[key] ?? 0}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
