import { Search, Globe, BarChart3, Zap, Database, Brain, X, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatCard from '../components/StatCard'
import AgentPanel from '../components/AgentPanel'
import AdvisorPanel from '../components/AdvisorPanel'
import PullToRefresh from '../components/PullToRefresh'
import useStore from '../store/useStore'
import { useStats, useRunAll, useCountries, useDeleteStatus, useCompanies } from '../hooks/useApi'

const SECTORS = [
  'Câblage électrique industriel',
  'Coffrets et armoires électriques',
  'Faisceaux et connectique automobile',
  'Équipements de mesure & comptage',
  'Automatisme et contrôle-commande',
  'Énergie renouvelable & smart grid',
  'Télécom & infrastructure réseau',
  'Aéronautique & défense',
]

function ConfirmDeleteModal({ status, count, onConfirm, onCancel }) {
  const label   = status === 'pending' ? 'en attente' : 'en erreur'
  const color   = status === 'pending' ? 'amber' : 'red'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="card p-6 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'
        }`}>
          <AlertTriangle size={22} className={color === 'amber' ? 'text-amber-600' : 'text-red-600'} />
        </div>
        <h3 className="text-lg font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
          Supprimer les entrées {label} ?
        </h3>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
          Cette action supprimera <strong className="text-slate-700 dark:text-slate-200">{count}</strong> entrée(s) {label} de la base de données. Cette opération est irréversible.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold px-4 py-2 rounded-lg text-white transition-all ${
              color === 'amber'
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Supprimer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats()
  const { data: countries = [] } = useCountries()
  const { data: companiesData }  = useCompanies({ limit: 500 })
  const { mutate: runAll, isPending: runAllPending } = useRunAll()
  const { mutate: deleteStatus, isPending: deleteLoading } = useDeleteStatus()

  const [confirmDelete, setConfirmDelete] = useState(null) // 'pending' | 'error' | null

  const selectedCountry = useStore(s => s.selectedCountry)
  const selectedSector  = useStore(s => s.selectedSector)
  const setCountry      = useStore(s => s.setCountry)
  const setSector       = useStore(s => s.setSector)
  const clearCountry    = useStore(s => s.clearCountry)
  const agentStatus     = useStore(s => s.agentStatus)
  const anyRunning      = Object.values(agentStatus).some(a => a?.running)

  const handleRunAll = () => {
    if (!selectedCountry) {
      toast.error('Sélectionnez un pays sur la carte avant de lancer le pipeline')
      navigate('/map')
      return
    }
    runAll({ country: selectedCountry, sector: selectedSector, max_per_query: 5 })
  }

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return
    deleteStatus(confirmDelete, {
      onSuccess: () => setConfirmDelete(null),
      onError:   () => setConfirmDelete(null),
    })
  }

  const pendingCount = stats?.pending ?? 0
  const errorCount   = stats?.error   ?? 0

  return (
    <PullToRefresh onRefresh={refetchStats}>
    <div className="page-wrapper">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">SBT Intelligence Pipeline</h1>
          <p className="section-sub">
            Prospection B2B géolocalisée — données réelles · AI-driven · XAI
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Système opérationnel
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <StatCard icon={Database}   value={stats?.total}         label="Résultats"   color="blue"   delay={0}    />
        <StatCard icon={Loader2}    value={pendingCount}         label="En attente"  color="amber"  delay={0.05} />
        <StatCard icon={Globe}      value={stats?.scraped}       label="Scrapés"     color="green"  delay={0.1}  />
        <StatCard icon={X}          value={errorCount}           label="Erreurs"     color="red"    delay={0.15} />
        <StatCard icon={BarChart3}  value={stats?.raw_companies} label="Entreprises" color="purple" delay={0.2}  />
      </div>

      {/* Gestion des entrées pending / error */}
      {(pendingCount > 0 || errorCount > 0) && (
        <motion.div
          className="card p-4 border-l-4 border-amber-400"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2 text-sm">
            <Trash2 size={15} className="text-amber-500" />
            Nettoyage de la base de données
          </h2>
          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => setConfirmDelete('pending')}
                disabled={deleteLoading || anyRunning}
                className="btn-warning flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Supprimer {pendingCount} en attente
              </button>
            )}
            {errorCount > 0 && (
              <button
                onClick={() => setConfirmDelete('error')}
                disabled={deleteLoading || anyRunning}
                className="btn-danger flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Supprimer {errorCount} erreur{errorCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Supprime définitivement les entrées de la base SQLite. Les agents ne peuvent pas tourner pendant la suppression.
          </p>
        </motion.div>
      )}

      {/* Context: Country + Sector selector */}
      <motion.div
        className="card p-4 sm:p-5 border-l-4 border-primary-500"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 text-sm">
          <Globe size={15} className="text-primary-600" />
          Contexte de recherche
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Country */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Pays cible (strict)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedCountry || ''}
                  onChange={e => e.target.value ? setCountry(e.target.value) : clearCountry()}
                  className="select pl-8"
                >
                  <option value="">— Tous les pays —</option>
                  {['France','Italie','Espagne','Allemagne','Maroc','Tunisie','Roumanie','Bulgarie','Belgique','Suisse','Portugal','Pologne','Royaume-Uni','Pays-Bas','Autriche'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {countries.filter(c => !['France','Italie','Espagne','Allemagne','Maroc','Tunisie','Roumanie','Bulgarie','Belgique','Suisse','Portugal','Pologne','Royaume-Uni','Pays-Bas','Autriche'].includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => navigate('/map')}
                className="btn-secondary text-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <Globe size={12} /> Carte
              </button>
            </div>
            {selectedCountry && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                Filtre strict activé — uniquement {selectedCountry}
              </p>
            )}
          </div>

          {/* Sector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
              Secteur cible
            </label>
            <select
              value={selectedSector}
              onChange={e => setSector(e.target.value)}
              className="select"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Agent panels */}
      <div>
        <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm">
          <Zap size={14} className="text-primary-500" />
          Contrôle du pipeline
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <AgentPanel
            agent="searcher"
            icon={Search}
            title="Target Search"
            description="Serper + génération requêtes dynamiques + classification Claude"
            accentClass="border-primary-400"
            params={{ max_per_query: 5 }}
          />
          <AgentPanel
            agent="scrapper"
            icon={Globe}
            title="Scrapper Agent"
            description="Crawl4AI multi-pages · extraction LLM · stockage Neo4j"
            accentClass="border-emerald-400"
          />
          <AgentPanel
            agent="marketing"
            icon={BarChart3}
            title="Marketing Agent"
            description="Analyse prospects & concurrents · pitchs personnalisés · export CSV"
            accentClass="border-amber-400"
          />
        </div>
      </div>

      {/* Run all */}
      <motion.div
        className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
            <Zap size={15} className="text-yellow-400" />
            Pipeline complet automatique
          </h3>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5">
            Exécute Target Search → Scrapper → Marketing en séquence
            {selectedCountry && ` · Pays: ${selectedCountry}`}
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={anyRunning || runAllPending}
          className="bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
        >
          {anyRunning || runAllPending
            ? <><Loader2 size={14} className="animate-spin" /> En cours...</>
            : <><Zap size={14} fill="currentColor" /> Lancer tout</>
          }
        </button>
      </motion.div>

      {/* SBT Advisor — Agent IA XAI */}
      <AdvisorPanel companies={companiesData?.companies || []} />

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/dashboard', icon: Database,  label: 'Dashboard',     sub: 'Toutes les entreprises & statuts', color: 'text-primary-600' },
          { to: '/graph',     icon: Globe,     label: 'Graphe Neo4j',  sub: 'Relations inter-entreprises',      color: 'text-emerald-600' },
          { to: '/marketing', icon: Brain,     label: 'Marketing XAI', sub: 'Scores, pitchs & analyses',        color: 'text-violet-600'  },
        ].map(({ to, icon: Icon, label, sub, color }) => (
          <motion.button
            key={to}
            onClick={() => navigate(to)}
            className="card-hover p-4 flex items-center gap-3 text-left w-full"
            whileHover={{ scale: 1.01 }}
          >
            <Icon size={20} className={color} />
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            status={confirmDelete}
            count={confirmDelete === 'pending' ? pendingCount : errorCount}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
    </PullToRefresh>
  )
}
