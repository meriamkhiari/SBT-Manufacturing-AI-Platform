import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ExternalLink, Mail, Phone, Linkedin, MapPin,
  Star, BarChart3, Globe, Building2, Send, Copy, Check,
} from 'lucide-react'
import { useState } from 'react'
import { ScoreBar } from './ScoreBar'
import useStore from '../store/useStore'

const TIER_INFO = {
  1: { label: 'Tier 1 — Fabricant',      color: 'emerald' },
  2: { label: 'Tier 2 — Sous-traitant',  color: 'blue'    },
  3: { label: 'Tier 3 — Concurrent',     color: 'amber'   },
}

function Row({ label, value, href, icon: Icon }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      {Icon && <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />}
      <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[80px] shrink-0">{label}</span>
      {href
        ? <a href={href} target="_blank" rel="noreferrer"
             className="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate flex items-center gap-1">
            {value} <ExternalLink size={10} />
          </a>
        : <span className="text-xs text-slate-800 dark:text-slate-200 flex-1">{value}</span>
      }
    </div>
  )
}

function ScoreDimension({ label, value, color }) {
  if (value == null) return null
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}/100</span>
      </div>
      <ScoreBar value={value} size="sm" />
    </div>
  )
}

export default function CompanyDetailModal({ company, onClose, onEmailGen }) {
  const [copied, setCopied] = useState(false)
  const favorites    = useStore(s => s.favorites)
  const toggleFav    = useStore(s => s.toggleFavorite)
  const isFav        = favorites.has(company?.name)
  const tierInfo     = TIER_INFO[company?.tier] || {}

  if (!company) return null

  const copyEmail = () => {
    if (!company.email) return
    navigator.clipboard.writeText(company.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex"
        onClick={onClose}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Panneau latéral */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative ml-auto w-full max-w-md h-full glass-modal flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-5 py-4 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tierInfo.color === 'emerald' ? 'bg-emerald-400/20 text-emerald-200' :
                    tierInfo.color === 'blue'    ? 'bg-blue-400/20 text-blue-200' :
                    'bg-amber-400/20 text-amber-200'
                  }`}>{tierInfo.label || `Tier ${company.tier}`}</span>
                </div>
                <h2 className="text-white font-bold text-lg leading-tight truncate">{company.name}</h2>
                {company.country && (
                  <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {company.country}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleFav(company.name)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isFav ? 'bg-yellow-400/30 text-yellow-300' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star size={15} fill={isFav ? 'currentColor' : 'none'} />
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Score global */}
            {company.score_final != null && (
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary-500" /> Score global
                  </h3>
                  <span className={`text-xl font-black ${
                    company.score_final >= 70 ? 'text-emerald-600' :
                    company.score_final >= 50 ? 'text-blue-600' :
                    company.score_final >= 30 ? 'text-amber-600' : 'text-red-600'
                  }`}>{company.score_final}<span className="text-sm font-normal text-slate-400">/100</span></span>
                </div>
                <ScoreBar value={company.score_final} />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <ScoreDimension label="Pertinence"  value={company.score_relevance}   />
                  <ScoreDimension label="Potentiel"   value={company.score_potential}   />
                  <ScoreDimension label="Compétition" value={company.score_competition} />
                  <ScoreDimension label="Marché"      value={company.score_market}      />
                </div>
              </div>
            )}

            {/* Informations */}
            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Building2 size={14} className="text-primary-500" /> Informations
              </h3>
              <div>
                <Row label="Site web"  value={company.website}  href={company.website}  icon={Globe}    />
                <Row label="Pays"      value={company.country}                          icon={MapPin}   />
                <Row label="Adresse"   value={company.address}                          icon={MapPin}   />
                <Row label="LinkedIn"  value={company.linkedin && 'Voir profil'} href={company.linkedin} icon={Linkedin} />
              </div>
            </div>

            {/* Description */}
            {company.description && (
              <div className="card p-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Description</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{company.description}</p>
              </div>
            )}

            {/* Contact */}
            <div className="card p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Mail size={14} className="text-primary-500" /> Contact
              </h3>
              {company.email && (
                <div className="flex items-center gap-2">
                  <a href={`mailto:${company.email}`}
                     className="flex-1 flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    <Mail size={12} /> {company.email}
                  </a>
                  <button onClick={copyEmail} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                </div>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`}
                   className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  <Phone size={12} /> {company.phone}
                </a>
              )}
              {!company.email && !company.phone && (
                <p className="text-xs text-slate-400">Aucun contact disponible</p>
              )}
            </div>

            {/* XAI recommandation */}
            {company.xai_recommendation && (
              <div className={`card p-4 border-l-4 ${
                company.xai_recommendation === 'HAUTE'   ? 'border-emerald-500' :
                company.xai_recommendation === 'MOYENNE' ? 'border-blue-500' : 'border-amber-500'
              }`}>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Recommandation XAI</p>
                <p className={`text-sm font-bold ${
                  company.xai_recommendation === 'HAUTE'   ? 'text-emerald-600 dark:text-emerald-400' :
                  company.xai_recommendation === 'MOYENNE' ? 'text-blue-600 dark:text-blue-400' :
                  'text-amber-600 dark:text-amber-400'
                }`}>{company.xai_recommendation} PRIORITÉ</p>
                {company.xai_summary && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{company.xai_summary}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 shrink-0 bg-white dark:bg-slate-900">
            {(company.email || company.linkedin) && onEmailGen && (
              <button
                onClick={() => onEmailGen(company)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
              >
                <Send size={14} /> Générer email IA
              </button>
            )}
            {company.linkedin && (
              <a
                href={company.linkedin}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
