import { useState, useEffect } from 'react'
import { Search, Filter, Download, RefreshCw, Zap, Star, BarChart2, FileSpreadsheet, Scale } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import CompanyTable      from '../components/CompanyTable'
import CompanyDetailModal from '../components/CompanyDetailModal'
import CompanyCompare     from '../components/CompanyCompare'
import EmailModal         from '../components/EmailModal'
import { TierPieChart, CountryBarChart, ScoreDistributionChart } from '../components/StatsCharts'
import { SkeletonStatCard } from '../components/Skeleton'
import StatCard from '../components/StatCard'
import useStore from '../store/useStore'
import { useCompanies, useStats } from '../hooks/useApi'
import * as XLSX from 'xlsx'

const TIER_OPTS  = [
  { v: '',  l: 'Tous les tiers' },
  { v: 1,   l: 'Tier 1 — Fabricants' },
  { v: 2,   l: 'Tier 2 — S/T' },
  { v: 3,   l: 'Tier 3 — Concurrents' },
]
const SCORE_OPTS = [
  { v: 0,  l: 'Tous scores' },
  { v: 30, l: '≥ 30' },
  { v: 50, l: '≥ 50' },
  { v: 70, l: '≥ 70 — Haute priorité' },
]

/* ── Export Excel avec mise en forme ── */
function exportExcel(companies) {
  if (!companies.length) { toast.error('Aucune entreprise à exporter'); return }

  const rows = companies.map(c => ({
    'Nom':          c.name       || '',
    'Tier':         c.tier       || '',
    'Pays':         c.country    || '',
    'Score':        c.score_final ?? '',
    'Email':        c.email      || '',
    'Téléphone':    c.phone      || '',
    'LinkedIn':     c.linkedin   || '',
    'Site web':     c.website    || '',
    'Description':  c.description || '',
    'Adresse':      c.address    || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Largeurs de colonnes
  ws['!cols'] = [
    { wch: 30 }, { wch: 8 }, { wch: 14 }, { wch: 8 },
    { wch: 30 }, { wch: 16 }, { wch: 40 }, { wch: 35 },
    { wch: 50 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Prospects SBT')
  XLSX.writeFile(wb, `prospects_SBT_${new Date().toISOString().slice(0,10)}.xlsx`)
  toast.success(`${companies.length} entreprises exportées en Excel`)
}

/* ── Export CSV ── */
function exportCSV(companies) {
  if (!companies.length) { toast.error('Aucune entreprise à exporter'); return }
  const headers = ['Nom', 'Tier', 'Pays', 'Score', 'Email', 'LinkedIn', 'Site', 'Description']
  const rows    = companies.map(c => [
    c.name, c.tier, c.country, c.score_final ?? '',
    c.email ?? '', c.linkedin ?? '', c.website ?? '',
    (c.description ?? '').replace(/,/g, ' '),
  ])
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href  = URL.createObjectURL(blob)
  link.download = `prospects_SBT_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  toast.success(`${companies.length} entreprises exportées en CSV`)
}

export default function Dashboard() {
  const selectedCountry = useStore(s => s.selectedCountry)
  const favorites       = useStore(s => s.favorites)

  const [tier,       setTier]       = useState('')
  const [minScore,   setMinScore]   = useState(0)
  const [search,     setSearch]     = useState('')
  const [limit,      setLimit]      = useState(100)
  const [onlyFavs,   setOnlyFavs]   = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [activeTab,  setActiveTab]  = useState('all') // 'all' | 'favs' | 'hot'
  const [selected,   setSelected]   = useState(null)   // entreprise sélectionnée → modal
  const [emailTarget, setEmailTarget] = useState(null)  // entreprise pour le générateur email

  const { data: stats, isLoading: statsLoading } = useStats()
  const { data, isLoading, refetch } = useCompanies({
    tier:      tier || undefined,
    country:   selectedCountry || undefined,
    min_score: minScore,
    limit,
  })

  /* Filtre côté client : tabs + recherche texte + favoris */
  const companies = (data?.companies || []).filter(c => {
    if (activeTab === 'favs' && !favorites.has(c.name)) return false
    if (activeTab === 'hot'  && (c.score_final ?? 0) < 70) return false
    if (onlyFavs && !favorites.has(c.name)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  /* Notification navigateur quand pipeline se termine */
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-sub">
            {data?.total ?? 0} entreprises{selectedCountry ? ` · ${selectedCountry}` : ''}
            {onlyFavs ? ` · ⭐ ${companies.length} favoris` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCharts(v => !v)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${showCharts ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : ''}`}>
            <BarChart2 size={13} /> {showCharts ? 'Masquer' : 'Graphiques'}
          </button>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={13} /> Rafraîchir
          </button>
          <button onClick={() => exportCSV(companies)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download size={13} /> CSV
          </button>
          <button onClick={() => exportExcel(companies)} className="btn-secondary flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsLoading ? (
          <>
            <SkeletonStatCard /><SkeletonStatCard />
            <SkeletonStatCard /><SkeletonStatCard />
          </>
        ) : (
          <>
            {[1, 2, 3].map(t => {
              const count  = (data?.companies || []).filter(c => c.tier === t).length
              const labels = { 1: 'Fabricants T1', 2: 'Sous-traitants T2', 3: 'Concurrents T3' }
              const colors = { 1: 'green', 2: 'blue', 3: 'amber' }
              return <StatCard key={t} icon={Filter} value={count} label={labels[t]} color={colors[t]} delay={t * 0.05} />
            })}
            <StatCard icon={Zap}
              value={(data?.companies || []).filter(c => c.score_final >= 70).length}
              label="Score ≥ 70"
              color="purple"
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* Graphiques */}
      <AnimatePresence>
        {showCharts && companies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden"
          >
            <TierPieChart companies={companies} />
            <CountryBarChart companies={companies} />
            <ScoreDistributionChart companies={companies} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full sm:w-auto">
        {[
          { id: 'all',  label: 'Toutes',        count: data?.total ?? 0 },
          { id: 'favs', label: '⭐ Favoris',    count: favorites.size },
          { id: 'hot',  label: '🔥 Score ≥ 70', count: (data?.companies || []).filter(c => c.score_final >= 70).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <motion.div
        className="card p-3 flex flex-wrap items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher nom, pays, email..."
            className="input pl-8 text-sm"
          />
        </div>

        {/* Tier */}
        <select value={tier} onChange={e => setTier(e.target.value)} className="select w-auto min-w-[140px] text-sm">
          {TIER_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        {/* Score min */}
        <select value={minScore} onChange={e => setMinScore(+e.target.value)} className="select w-auto min-w-[140px] text-sm">
          {SCORE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        {/* Favoris toggle */}
        <button
          onClick={() => setOnlyFavs(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
            onlyFavs
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          } font-semibold`}
        >
          <Star size={13} fill={onlyFavs ? 'currentColor' : 'none'} />
          {onlyFavs ? `Favoris (${favorites.size})` : 'Favoris'}
        </button>

        {/* Pays actif */}
        {selectedCountry && (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1.5 rounded-full border border-primary-200 dark:border-primary-700">
            🌍 {selectedCountry}
          </span>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto whitespace-nowrap">
          {companies.length} / {data?.total ?? 0}
        </span>
      </motion.div>

      {/* Tableau */}
      <CompanyTable
        companies={companies}
        loading={isLoading}
        onRowClick={setSelected}
        searchQuery={search}
        lastSessionAt={useStore.getState().lastSessionAt}
      />

      {/* Load more */}
      {(data?.total ?? 0) > limit && (
        <div className="text-center">
          <button onClick={() => setLimit(l => l + 100)} className="btn-secondary text-sm">
            Charger 100 de plus ({(data?.total ?? 0) - limit} restants)
          </button>
        </div>
      )}

      {/* Modal détail entreprise */}
      <AnimatePresence>
        {selected && (
          <CompanyDetailModal
            company={selected}
            onClose={() => setSelected(null)}
            onEmailGen={(company) => {
              setSelected(null)
              setEmailTarget(company)
            }}
          />
        )}
      </AnimatePresence>

      {/* Générateur d'email IA */}
      <AnimatePresence>
        {emailTarget && (
          <EmailModal
            company={emailTarget}
            onClose={() => setEmailTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
