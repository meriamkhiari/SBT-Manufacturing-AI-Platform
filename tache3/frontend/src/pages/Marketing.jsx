import { useState, useMemo } from 'react'
import {
  BarChart3, Target, Users, TrendingUp, Download, RefreshCw,
  ChevronDown, ChevronUp, Zap, Mail, Linkedin, Globe, AlertCircle,
  Copy, Check, Eye,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useMarketingResults, useCompanies } from '../hooks/useApi'
import useStore from '../store/useStore'
import { ScoreBadge, ScoreBar } from '../components/ScoreBar'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLE = {
  haute:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  moyenne: 'bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300',
  faible:  'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  HAUTE:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  MOYENNE: 'bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300',
  FAIBLE:  'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
}

// ── Pitch card ────────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      title="Copier"
    >
      <AnimatePresence mode="wait">
        {copied
          ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check size={12} className="text-emerald-500" />
            </motion.div>
          : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Copy size={12} className="text-slate-400" />
            </motion.div>
        }
      </AnimatePresence>
    </button>
  )
}

function EmailPreviewModal({ item, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Faux header Outlook */}
        <div className="bg-[#0078d4] px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Aperçu email</span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-14 shrink-0">De :</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">vous@smartbtechnologie.com</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-14 shrink-0">À :</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{item.email || 'contact@' + (item.name?.toLowerCase().replace(/\s/g,'')||'entreprise') + '.com'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-14 shrink-0">Objet :</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{item.pitch?.subject || 'Opportunité de partenariat'}</span>
          </div>
        </div>
        <div className="p-4 max-h-72 overflow-y-auto text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/30">
          {item.pitch?.pitch_email || 'Aucun pitch email généré.'}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <CopyButton text={item.pitch?.pitch_email || ''} />
          <button onClick={onClose} className="btn-secondary text-sm">Fermer</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PitchCard({ item, index }) {
  const [open, setOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const tierColors = {
    1: 'border-l-emerald-500',
    2: 'border-l-blue-500',
    3: 'border-l-amber-500',
  }

  const priority = item.pitch?.priority || item.xai_recommendation
  const hasPitch  = !!item.pitch

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`card border-l-4 ${tierColors[item.tier] || 'border-l-slate-300'} overflow-hidden`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
            <Target size={14} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{item.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              T{item.tier} • {item.country || '—'}
              {priority && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_STYLE[priority] || ''}`}>
                  {priority.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {item.score_final != null && <ScoreBadge value={item.score_final} />}
          {item.email && (
            <a href={`mailto:${item.email}`} onClick={e => e.stopPropagation()} title={item.email}
               className="text-slate-400 hover:text-primary-500 transition-colors">
              <Mail size={14} />
            </a>
          )}
          {item.linkedin && (
            <a href={item.linkedin} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
               className="text-slate-400 hover:text-blue-500 transition-colors">
              <Linkedin size={14} />
            </a>
          )}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </div>

      {/* Score bar */}
      {item.score_final != null && (
        <div className="px-4 pb-2">
          <ScoreBar value={item.score_final} size="sm" />
        </div>
      )}

      {/* Expanded */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
          >
            <div className="p-4 space-y-3">

              {/* Description */}
              {item.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Pitch email */}
              {hasPitch && item.pitch.pitch_email && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Mail size={11} /> Email de prospection
                    {item.pitch.subject && (
                      <span className="ml-1 text-slate-400 font-normal truncate">— {item.pitch.subject}</span>
                    )}
                    <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <CopyButton text={item.pitch.pitch_email} />
                      <button
                        onClick={e => { e.stopPropagation(); setShowPreview(true) }}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title="Aperçu email"
                      >
                        <Eye size={12} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                    {item.pitch.pitch_email}
                  </div>
                </div>
              )}

              {/* LinkedIn */}
              {hasPitch && item.pitch.pitch_linkedin && (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Linkedin size={11} /> Message LinkedIn
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    {item.pitch.pitch_linkedin}
                  </div>
                </div>
              )}

              {/* Key argument / pitch_angle */}
              {(item.pitch?.key_argument || item.pitch_angle) && (
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg p-3">
                  <div className="text-xs font-bold text-primary-700 dark:text-primary-300 mb-1 flex items-center gap-1">
                    <Zap size={11} /> Argument clé
                  </div>
                  <p className="text-xs text-primary-800 dark:text-primary-200">
                    {item.pitch?.key_argument || item.pitch_angle}
                  </p>
                </div>
              )}

              {/* Follow up */}
              {hasPitch && item.pitch.follow_up && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <span className="shrink-0 font-semibold">Relance :</span>
                  <span>{item.pitch.follow_up}</span>
                </div>
              )}

              {/* Contact reason from marketing analysis */}
              {item.contact_angle && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <span className="shrink-0 font-semibold">Angle :</span>
                  <span>{item.contact_angle}</span>
                </div>
              )}

              {/* Visit website */}
              {item.website && (
                <a href={item.website} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 text-xs btn-secondary py-1">
                  <Globe size={11} /> Visiter le site
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email preview modal */}
      <AnimatePresence>
        {showPreview && <EmailPreviewModal item={item} onClose={() => setShowPreview(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Segment stat card ─────────────────────────────────────────────────────────

function SegCard({ label, count, color, sub }) {
  return (
    <div className={`card p-4 border-t-4 ${color}`}>
      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{label}</div>
      <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">{count}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">{sub}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const selectedCountry = useStore(s => s.selectedCountry)
  const selectedSector  = useStore(s => s.selectedSector)

  const [tierFilter, setTierFilter] = useState(0)
  const [sortBy,     setSortBy]     = useState('score')
  const [search,     setSearch]     = useState('')

  const { data: mktData, isLoading: mktLoading, refetch } = useMarketingResults()
  const { data: companiesData } = useCompanies({
    country: selectedCountry || undefined,
    limit:   300,
  })

  // Build pitch lookup from marketing results
  const pitchMap = useMemo(() => {
    const map = {}
    for (const pitch of mktData?.pitches || []) {
      map[pitch.company] = pitch
    }
    return map
  }, [mktData])

  // Build contact_angle lookup from marketing analysis
  const contactAngleMap = useMemo(() => {
    const map = {}
    for (const p of [
      ...(mktData?.tier1_analysis?.top_prospects || []),
      ...(mktData?.tier2_analysis?.top_prospects || []),
    ]) {
      if (p.name) map[p.name] = p.contact_angle
    }
    return map
  }, [mktData])

  // Enrich companies with pitch data
  const enriched = useMemo(() => {
    return (companiesData?.companies || []).map(c => ({
      ...c,
      pitch:         pitchMap[c.name] || null,
      contact_angle: contactAngleMap[c.name] || null,
    }))
  }, [companiesData, pitchMap, contactAngleMap])

  const filtered = enriched
    .filter(c => !tierFilter || c.tier === tierFilter)
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'score')    return (b.score_final ?? -1) - (a.score_final ?? -1)
      if (sortBy === 'priority') {
        const ord = { haute: 0, moyenne: 1, faible: 2 }
        return (ord[a.pitch?.priority] ?? 9) - (ord[b.pitch?.priority] ?? 9)
      }
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      return 0
    })

  const tier1       = enriched.filter(c => c.tier === 1)
  const tier2       = enriched.filter(c => c.tier === 2)
  const tier3       = enriched.filter(c => c.tier === 3)
  const withPitch   = enriched.filter(c => c.pitch)
  const highPrio    = enriched.filter(c => (c.score_final ?? 0) >= 70)

  // CSV export
  const handleExport = () => {
    const headers = ['Nom', 'Tier', 'Pays', 'Score', 'Priorité', 'Email', 'LinkedIn', 'Sujet email', 'Argument clé', 'Pitch LinkedIn']
    const rows = filtered.map(c => [
      c.name, c.tier, c.country, c.score_final ?? '',
      c.pitch?.priority ?? '',
      c.email ?? '', c.linkedin ?? '',
      (c.pitch?.subject ?? '').replace(/,/g, ' '),
      (c.pitch?.key_argument ?? c.pitch_angle ?? '').replace(/,/g, ' '),
      (c.pitch?.pitch_linkedin ?? '').replace(/,/g, ' '),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `marketing_pitches_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success(`${filtered.length} prospects exportés`)
  }

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 size={20} className="text-amber-500" />
            Marketing Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pitchs personnalisés, segmentation, plan de ciblage
            {selectedCountry && ` — ${selectedCountry}`}
            {selectedSector  && ` • ${selectedSector}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={13} /> Rafraîchir
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Segments */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SegCard label="Fabricants T1" count={tier1.length} color="border-t-emerald-500" sub={
          <>
            <div className="flex justify-between"><span>Avec pitch</span><span className="font-semibold text-slate-700 dark:text-slate-300">{tier1.filter(c => c.pitch).length}</span></div>
            <div className="flex justify-between"><span>Score moyen</span><span className="font-semibold text-slate-700 dark:text-slate-300">{tier1.length ? Math.round(tier1.reduce((s,c)=>s+(c.score_final||0),0)/tier1.length) : 0}</span></div>
          </>
        } />
        <SegCard label="Sous-traitants T2" count={tier2.length} color="border-t-blue-500" sub={
          <>
            <div className="flex justify-between"><span>Avec pitch</span><span className="font-semibold text-slate-700 dark:text-slate-300">{tier2.filter(c => c.pitch).length}</span></div>
            <div className="flex justify-between"><span>Score moyen</span><span className="font-semibold text-slate-700 dark:text-slate-300">{tier2.length ? Math.round(tier2.reduce((s,c)=>s+(c.score_final||0),0)/tier2.length) : 0}</span></div>
          </>
        } />
        <SegCard label="Concurrents T3" count={tier3.length} color="border-t-amber-500" sub={
          <>
            <div className="flex justify-between"><span>Menace haute</span><span className="font-semibold text-slate-700 dark:text-slate-300">{(mktData?.competitor_analysis?.competitor_analysis||[]).filter(c=>c.threat_level==='haute').length}</span></div>
          </>
        } />
        <SegCard label="Pitchs générés" count={withPitch.length} color="border-t-violet-500" sub={
          <>
            <div className="flex justify-between"><span>Score ≥ 70</span><span className="font-semibold text-violet-600 dark:text-violet-400">{highPrio.length}</span></div>
            <div className="flex justify-between"><span>Avec contact</span><span className="font-semibold text-slate-700 dark:text-slate-300">{withPitch.filter(c=>c.email||c.linkedin).length}</span></div>
          </>
        } />
      </div>

      {/* Strategy summary */}
      {mktData?.strategy_summary && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="card p-4 border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-900/10">
          <div className="font-bold text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-2 text-sm">
            <TrendingUp size={14} /> Synthèse stratégique — Marketing Agent
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{mktData.strategy_summary}</p>
        </motion.div>
      )}

      {/* Targeting plan */}
      {mktData?.targeting_plan?.priorité_1 && (
        <div className="grid md:grid-cols-3 gap-3">
          {['priorité_1', 'priorité_2', 'priorité_3'].map((key, i) => {
            const p = mktData.targeting_plan[key]
            if (!p) return null
            const colors = ['border-t-emerald-500', 'border-t-blue-500', 'border-t-amber-500']
            return (
              <div key={key} className={`card p-4 border-t-4 ${colors[i]}`}>
                <div className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  {key.replace('_', ' ').toUpperCase()}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(p.entreprises || []).map(n => (
                    <span key={n} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">{n}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-semibold">Action :</span> {p.action}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1"><span className="font-semibold">Message :</span> {p.message_cle}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par nom..." className="input pl-8 text-sm" />
        </div>
        <select value={tierFilter} onChange={e => setTierFilter(+e.target.value)} className="select w-auto min-w-[160px] text-sm">
          <option value={0}>Tous les tiers</option>
          <option value={1}>Tier 1 — Fabricants</option>
          <option value={2}>Tier 2 — S/T</option>
          <option value={3}>Tier 3 — Concurrents</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select w-auto min-w-[150px] text-sm">
          <option value="score">Par score</option>
          <option value="priority">Par priorité</option>
          <option value="name">Par nom</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} prospect(s)</span>
      </div>

      {/* Pitch list */}
      {mktLoading ? (
        <div className="card p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 dark:text-slate-600">
          <AlertCircle size={40} className="mx-auto mb-4 opacity-20" />
          <p className="font-semibold">Aucun prospect</p>
          <p className="text-sm mt-1">Lancez le pipeline complet pour générer des pitchs</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c, i) => <PitchCard key={c.name + i} item={c} index={i} />)}
        </div>
      )}
    </div>
  )
}
