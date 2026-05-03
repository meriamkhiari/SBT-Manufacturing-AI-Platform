import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, MapPin, Scale } from 'lucide-react'
import { ScoreBar } from './ScoreBar'
import useStore from '../store/useStore'

const SCORE_DIMS = [
  { key: 'score_final',       label: 'Score final'  },
  { key: 'score_relevance',   label: 'Pertinence'   },
  { key: 'score_potential',   label: 'Potentiel'    },
  { key: 'score_competition', label: 'Compétition'  },
  { key: 'score_market',      label: 'Marché'       },
]

function ScoreCompareRow({ label, va, vb }) {
  if (va == null && vb == null) return null
  const a       = va ?? 0
  const b       = vb ?? 0
  const winner  = a > b ? 'a' : b > a ? 'b' : 'tie'

  return (
    <div className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* Left value */}
      <div className="space-y-1">
        <div className="flex justify-end">
          <span className={`text-sm font-black ${winner === 'a' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {va != null ? `${va}/100` : '—'}
          </span>
        </div>
        {va != null && <ScoreBar value={va} size="sm" />}
      </div>

      {/* Label */}
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wide">
        {label}
      </p>

      {/* Right value */}
      <div className="space-y-1">
        <div className="flex justify-start">
          <span className={`text-sm font-black ${winner === 'b' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {vb != null ? `${vb}/100` : '—'}
          </span>
        </div>
        {vb != null && <ScoreBar value={vb} size="sm" />}
      </div>
    </div>
  )
}

function InfoCompareRow({ label, va, vb }) {
  if (!va && !vb) return null
  return (
    <div className="grid grid-cols-[1fr_80px_1fr] items-start gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-600 dark:text-slate-400 text-right truncate">{va || '—'}</span>
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center">{label}</span>
      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{vb || '—'}</span>
    </div>
  )
}

function CompanyHeader({ company, side }) {
  const favorites = useStore(s => s.favorites)
  const toggleFav = useStore(s => s.toggleFavorite)
  const isFav     = company ? favorites.has(company.name) : false

  if (!company) {
    return (
      <div className="p-5 flex items-center justify-center h-full">
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Sélectionnez une entreprise</p>
      </div>
    )
  }

  const tierColors = {
    1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <div className={`p-5 ${side === 'right' ? 'text-right' : ''}`}>
      <div className={`flex items-start gap-2 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{company.name}</p>
          <div className={`flex items-center gap-2 mt-1.5 flex-wrap ${side === 'right' ? 'justify-end' : ''}`}>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColors[company.tier] || 'bg-slate-100 text-slate-500'}`}>
              Tier {company.tier}
            </span>
            {company.country && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                <MapPin size={9} /> {company.country}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => toggleFav(company.name)}
          className="shrink-0 transition-colors"
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star size={15} fill={isFav ? 'currentColor' : 'none'} className={isFav ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400'} />
        </button>
      </div>

      {/* Score pill */}
      {company.score_final != null && (
        <div className={`mt-3 flex ${side === 'right' ? 'justify-end' : ''}`}>
          <span className={`text-2xl font-black ${
            company.score_final >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
            company.score_final >= 50 ? 'text-blue-600 dark:text-blue-400' :
            company.score_final >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'
          }`}>{company.score_final}<span className="text-sm font-normal text-slate-400">/100</span></span>
        </div>
      )}
    </div>
  )
}

export default function CompanyCompare({ onClose }) {
  const compareList  = useStore(s => s.compareList)
  const clearCompare = useStore(s => s.clearCompare)

  const [a, b] = compareList

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-white/80" />
              <h2 className="text-white font-bold text-base">Comparaison d'entreprises</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Company headers — 2 cols */}
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <CompanyHeader company={a} side="left"  />
            <CompanyHeader company={b} side="right" />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Score comparison */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Scores détaillés
              </p>
              {SCORE_DIMS.map(d => (
                <ScoreCompareRow key={d.key} label={d.label} va={a?.[d.key]} vb={b?.[d.key]} />
              ))}
            </div>

            {/* Info comparison */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Coordonnées
              </p>
              <InfoCompareRow label="Email"   va={a?.email}   vb={b?.email}   />
              <InfoCompareRow label="Tél"     va={a?.phone}   vb={b?.phone}   />
              <InfoCompareRow
                label="Site"
                va={a?.website?.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}
                vb={b?.website?.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}
              />
            </div>

            {/* XAI */}
            {(a?.xai_recommendation || b?.xai_recommendation) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Recommandation XAI
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[a, b].map((c, i) => {
                    const rec = c?.xai_recommendation
                    return (
                      <div key={i} className={`rounded-xl p-3 text-center border ${
                        rec === 'HAUTE'   ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                        rec === 'MOYENNE' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                        'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                      }`}>
                        <p className={`text-sm font-black ${
                          rec === 'HAUTE'   ? 'text-emerald-600 dark:text-emerald-400' :
                          rec === 'MOYENNE' ? 'text-blue-600 dark:text-blue-400' :
                          'text-slate-400 dark:text-slate-500'
                        }`}>{rec || '—'}</p>
                        {c?.xai_summary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{c.xai_summary}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              🟢 Score en vert = meilleur résultat
            </p>
            <button
              onClick={() => { clearCompare(); onClose() }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              Effacer la sélection
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
