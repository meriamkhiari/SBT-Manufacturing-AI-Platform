import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image, Eye, CheckCircle2, Scale, FileText, ArrowRight, ChevronDown,
  Activity, Sparkles, Network, Wrench, ScrollText, AlertTriangle, AlertOctagon,
  Loader2, Package, Brain,
} from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { id: 'preprocessor', icon: Image, label: 'Préparation', tool: 'analyze_image_quality',
    desc: 'Examine la photo avant l\'analyse. Mesure trois choses concrètes : à quel point l\'image est claire ou sombre, à quel point elle est nette ou floue, et sa taille en pixels. Établit ensuite une note de qualité globale entre 0 et 100, et liste les recommandations éventuelles. Cette étape ne change rien à l\'image — elle prépare un compte-rendu utilisé par les agents suivants pour ajuster leur niveau de confiance.',
    inputs: ['Photo brute'], outputs: ['Compte-rendu qualité image'] },
  { id: 'vision', icon: Eye, label: 'Détection visuelle', tool: 'detect_defects',
    desc: 'Examine la photo en profondeur et identifie les défauts visibles parmi quatre catégories : boîtes collées entre elles, logo illisible, peinture irrégulière, trou obstrué. Pour chaque défaut repéré, dessine un cadre autour de la zone et rédige une explication détaillée : ce qui a été observé exactement, où c\'est situé, en quoi cela diffère d\'une pièce normale, à quel point le système est sûr, et ce qu\'il faudrait changer pour corriger le défaut.',
    inputs: ['Compte-rendu qualité image'], outputs: ['Liste de défauts','Explications détaillées'] },
  { id: 'validator', icon: CheckCircle2, label: 'Validation', tool: 'validate_detections',
    desc: 'Fait le ménage dans les défauts détectés avant de les remonter à l\'opérateur. Trois actions : écarter les détections dont le système n\'est pas suffisamment sûr, fusionner les doublons quand plusieurs cadres désignent en réalité le même défaut, et vérifier que chaque détection est cohérente. Calcule un indicateur de fiabilité qui mesure la part des détections retenues après ce filtrage.',
    inputs: ['Liste de défauts'], outputs: ['Défauts validés'] },
  { id: 'severity', icon: Scale, label: 'Sévérité', tool: 'classify_severity',
    desc: 'Traduit les défauts en une décision claire pour l\'opérateur. Chaque défaut reçoit une note qui combine la gravité de son type, la confiance du système et la surface qu\'il occupe. Les notes sont agrégées en une criticité globale 0-100 qui aboutit à l\'un des quatre verdicts : « accepté », « accepté sous condition », « à vérifier » ou « refusé ». Produit aussi une liste d\'actions correctives concrètes.',
    inputs: ['Défauts validés'], outputs: ['Verdict + actions correctives'] },
  { id: 'reporter', icon: FileText, label: 'Rapport final', tool: 'generate_report',
    desc: 'Rassemble les résultats des quatre étapes en un seul rapport cohérent destiné à l\'interface. Inclut le verdict, les défauts avec leurs explications, le temps total de l\'analyse et les actions correctives. Y figure aussi le journal complet du parcours de la donnée à travers la chaîne de traitement, ce qui permet à n\'importe qui de rejouer ou d\'auditer la décision après coup.',
    inputs: ['Verdict + actions correctives'], outputs: ['Rapport final complet'] },
]

const VERDICT_TONE = {
  'ACCEPTÉ':                    { icon: CheckCircle2,   bg: 'bg-emerald-50  dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  'CONDITIONNELLEMENT ACCEPTÉ': { icon: AlertTriangle,  bg: 'bg-amber-50    dark:bg-amber-900/20',   border: 'border-amber-200   dark:border-amber-800',   text: 'text-amber-700   dark:text-amber-300'   },
  'À VÉRIFIER':                 { icon: AlertTriangle,  bg: 'bg-amber-50    dark:bg-amber-900/20',   border: 'border-amber-200   dark:border-amber-800',   text: 'text-amber-700   dark:text-amber-300'   },
  'REFUSÉ':                     { icon: AlertOctagon,   bg: 'bg-rose-50     dark:bg-rose-900/20',    border: 'border-rose-200    dark:border-rose-800',    text: 'text-rose-700    dark:text-rose-300'    },
}

const TABS = [
  { id: 'pipeline', label: 'Pipeline', icon: Activity },
  { id: 'a2a',      label: 'A2A',      icon: Network },
  { id: 'mcp',      label: 'MCP',      icon: Wrench },
  { id: 'xai',      label: 'XAI',      icon: Brain },
  { id: 'logs',     label: 'Logs',     icon: ScrollText },
]

export default function PipelinePanel({ data, loading }) {
  const [tab, setTab] = useState('pipeline')
  const [activeAgent, setActiveAgent] = useState(null)

  if (!data && !loading) return null

  const pipeline  = data?.pipeline || {}
  const logs      = pipeline.agent_logs   || []
  const steps     = pipeline.steps        || []
  const tasks     = pipeline.a2a_tasks    || []
  const tools     = pipeline.mcp_tools    || []
  const resources = pipeline.mcp_resources|| []
  const stats     = pipeline.mcp_stats    || {}
  const msMap = Object.fromEntries(steps.map(s => [s.agent, s.elapsed_ms]))

  const verdict = data?.verdict || ''
  const vTone   = VERDICT_TONE[verdict] || VERDICT_TONE['À VÉRIFIER']
  const VIcon   = vTone.icon
  const val     = data?.validation || {}
  const xai     = data?.xai || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between gap-3 flex-wrap
                      bg-gradient-to-r from-ink-50 to-white dark:from-ink-900 dark:to-ink-900/50">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-800 dark:text-ink-100">
            <Sparkles size={16} className="text-primary-600" /> A2A Pipeline
          </div>
          <Pill tone="violet">MCP v2.0</Pill>
          <Pill tone="emerald">Google A2A</Pill>
          <Pill tone="primary">XAI</Pill>
          {stats.tasks > 0 && <Pill tone="emerald">{stats.tasks} tasks</Pill>}
        </div>
        {pipeline.id && (
          <span className="text-[10px] font-mono text-ink-400 dark:text-ink-500">id: {pipeline.id}</span>
        )}
      </div>

      {/* Agent flow */}
      <div className="px-5 pt-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-[640px]">
          {STEPS.map((step, i) => (
            <Fragment key={step.id}>
              <AgentStep
                step={step} done={!loading && data} loading={loading} ms={msMap[step.id]}
                active={activeAgent === step.id}
                onClick={() => setActiveAgent(activeAgent === step.id ? null : step.id)}
              />
              {i < STEPS.length - 1 && (
                <ArrowRight size={14} className={clsx('shrink-0', !loading && data ? 'text-primary-500' : 'text-ink-300 dark:text-ink-700')} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Agent detail */}
      <AnimatePresence>
        {activeAgent && (() => {
          const s = STEPS.find(x => x.id === activeAgent)
          if (!s) return null
          const SIcon = s.icon
          return (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-5 mt-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/15 border border-primary-200 dark:border-primary-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <SIcon size={16} className="text-primary-600" />
                  <strong className="text-primary-700 dark:text-primary-300 text-sm">{s.label}</strong>
                  <code className="text-xs text-ink-500 dark:text-ink-400">tool: {s.tool}</code>
                </div>
                <p className="text-xs text-ink-600 dark:text-ink-300 mb-3 leading-relaxed">{s.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.inputs.map(x => <Pill key={x} tone="primary"  small>IN: {x}</Pill>)}
                  {s.outputs.map(x => <Pill key={x} tone="emerald" small>OUT: {x}</Pill>)}
                </div>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-5 pt-4 border-b border-ink-200 dark:border-ink-800 mt-3">
        {TABS.map(t => {
          const TIcon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px',
                active ? 'text-primary-600 border-primary-600' : 'text-ink-500 dark:text-ink-400 border-transparent hover:text-ink-700 dark:hover:text-ink-200',
              )}
            >
              <TIcon size={13} /> {t.label}
              {t.id === 'a2a' && tasks.length > 0 && <span className="text-[10px] text-ink-400">({tasks.length})</span>}
              {t.id === 'mcp' && tools.length > 0 && <span className="text-[10px] text-ink-400">({tools.length})</span>}
            </button>
          )
        })}
      </div>

      <div className="p-5">
        {tab === 'pipeline' && (
          <>
            {data && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <Metric label="Temps total"   value={`${pipeline.total_ms || 0} ms`} />
                  <Metric label="Brut"          value={val.raw_detections || 0} />
                  <Metric label="Validés"       value={val.validated || 0} tone="emerald" />
                  <Metric label="Rejetés"       value={val.rejected || 0}  tone={(val.rejected || 0) > 0 ? 'amber' : 'emerald'} />
                  <Metric label="NMS"           value={val.nms_removed || 0} />
                  <Metric label="Fiabilité"     value={`${Math.round((val.reliability || 1) * 100)}%`}
                                                tone={(val.reliability || 1) >= 0.8 ? 'emerald' : (val.reliability || 1) >= 0.5 ? 'amber' : 'rose'} />
                  <Metric label="Criticité"     value={`${data.global_criticality || 0}/100`}
                                                tone={(data.global_criticality || 0) >= 70 ? 'rose' : (data.global_criticality || 0) >= 45 ? 'amber' : 'emerald'} />
                  <Metric label="Conf. moy"     value={`${Math.round((data.avg_confidence || 0) * 100)}%`} />
                </div>

                {verdict && (
                  <div className={clsx('rounded-xl border p-4 flex items-start justify-between gap-4', vTone.bg, vTone.border)}>
                    <div className="min-w-0">
                      <div className={clsx('text-base font-bold flex items-center gap-2', vTone.text)}>
                        <VIcon size={18} /> {verdict}
                      </div>
                      <div className="text-xs text-ink-500 dark:text-ink-400 mt-1.5">{data.verdict_reason}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wide text-ink-500 dark:text-ink-400">Criticité</div>
                      <div className={clsx('font-bold text-lg', vTone.text)}>{data.global_criticality || 0}/100</div>
                    </div>
                  </div>
                )}

                {(data.corrective_actions || []).length > 0 && (
                  <div className="mt-4">
                    <SectionLabel>Actions correctives</SectionLabel>
                    <div className="space-y-1.5">
                      {data.corrective_actions.map((a, i) => (
                        <div key={i} className="flex gap-2 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700 text-sm text-ink-700 dark:text-ink-200">
                          <ArrowRight size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {loading && <Loading />}
          </>
        )}

        {tab === 'a2a' && (
          <div>
            <p className="text-xs text-ink-500 dark:text-ink-400 mb-3 leading-relaxed">
              Chaque agent émet une <strong className="text-primary-600">Task Card A2A</strong> (Google A2A) pour formaliser le handoff.
              Le broker MCP route les messages.
            </p>
            <SectionLabel>Task Cards A2A</SectionLabel>
            {tasks.length === 0 && !loading && <Empty>Aucune task card générée</Empty>}
            {loading && <Loading />}
            <div className="space-y-2">
              {tasks.map((t, i) => <A2ACard key={i} task={t} />)}
            </div>
          </div>
        )}

        {tab === 'mcp' && (
          <div>
            <SectionLabel>Tool registry</SectionLabel>
            {tools.length === 0 && !loading && <Empty>Aucun tool MCP enregistré</Empty>}
            {loading && <Loading />}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tools.map((t, i) => (
                <div key={i} className="p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-300">{t.name}</span>
                    <span className="text-[10px] text-ink-500 px-1.5 py-0.5 rounded bg-white dark:bg-ink-900">{t.owner}</span>
                  </div>
                  <p className="text-[11px] text-ink-600 dark:text-ink-300 leading-snug">{t.description}</p>
                  {t.stats && (
                    <div className="flex gap-3 mt-2 font-mono text-[10px] text-ink-500">
                      <span>calls: <strong className="text-emerald-600">{t.stats.calls}</strong></span>
                      <span>avg: {t.stats.avg_ms}ms</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {resources.length > 0 && (
              <>
                <SectionLabel className="mt-4">Ressources publiées</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800">
                      <Package size={12} className="text-emerald-600" />
                      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">{r.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {Object.keys(stats).length > 0 && (
              <>
                <SectionLabel className="mt-4">Broker stats</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(stats).map(([k, v]) => <Metric key={k} label={k} value={v} tone="violet" />)}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'xai' && (
          <div>
            {!data && !loading && <Empty>Lancez une analyse pour voir les explications XAI</Empty>}
            {loading && <Loading />}
            {xai && Object.keys(xai).length > 0 && (
              <>
                <div className="text-xs text-ink-500 dark:text-ink-400 mb-3 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/15 border border-primary-200 dark:border-primary-800 font-mono">
                  {xai.method || 'Feature Importance + Counterfactual + SHAP-like'} · {xai.model}
                </div>

                {xai.global_decision_basis && (
                  <>
                    <SectionLabel>Décision globale</SectionLabel>
                    <div className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed mb-4 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
                      {xai.global_decision_basis}
                    </div>
                  </>
                )}

                {xai.aggregate_feature_importance && Object.keys(xai.aggregate_feature_importance).length > 0 && (
                  <>
                    <SectionLabel>Feature importance agrégée</SectionLabel>
                    <FeatureBars features={xai.aggregate_feature_importance} />
                  </>
                )}

                {xai.uncertainty_factors?.length > 0 && (
                  <>
                    <SectionLabel>Facteurs d'incertitude</SectionLabel>
                    <div className="space-y-1.5 mb-3">
                      {xai.uncertainty_factors.map((f, i) => (
                        <div key={i} className="flex gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5" />{f}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(data?.detections || []).filter(d => d.xai).length > 0 && (
                  <>
                    <SectionLabel className="mt-4">XAI par détection</SectionLabel>
                    <div className="space-y-1.5">
                      {(data.detections || []).filter(d => d.xai).map((d, i) => <DetectionXAI key={i} detection={d} />)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div className="rounded-xl bg-ink-900 dark:bg-black/50 border border-ink-200 dark:border-ink-700 p-3 max-h-72 overflow-y-auto font-mono text-xs">
            {loading && <div className="text-primary-400 animate-pulse">Pipeline en cours d'exécution...</div>}
            {logs.length === 0 && !loading && <div className="text-ink-500">Aucun log</div>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="text-primary-400 min-w-[88px]">[{log.agent}]</span>
                <span className={clsx('flex-1', log.level === 'error' ? 'text-rose-400' : 'text-ink-200')}>{log.message}</span>
                <span className="text-ink-500 ml-auto shrink-0">{log.elapsed_ms}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Sub-components ─── */

function AgentStep({ step, done, loading, ms, active, onClick }) {
  const Icon = step.icon
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center min-w-[100px] py-2.5 px-2 rounded-xl border transition-all text-center',
        active   ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600' :
        done     ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800' :
        loading  ? 'bg-primary-50/60 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' :
                   'bg-ink-50 dark:bg-ink-800/50 border-ink-200 dark:border-ink-700',
      )}
    >
      <Icon size={18} className={clsx('mb-1', done ? 'text-emerald-600' : loading ? 'text-primary-600' : 'text-ink-400')} />
      <div className={clsx('text-[10px] font-mono uppercase tracking-wide font-bold', active ? 'text-primary-700 dark:text-primary-300' : 'text-ink-500')}>
        {step.label}
      </div>
      <div className="text-[9px] text-violet-500 dark:text-violet-400 mt-0.5 font-mono">{step.tool}</div>
      <div className={clsx('text-[10px] font-mono mt-1.5 font-bold',
        done ? 'text-emerald-600' : loading ? 'text-primary-600 animate-pulse' : 'text-transparent')}>
        {done ? '✓ OK' : loading ? '...' : '—'}
      </div>
      {ms != null && <div className="text-[9px] font-mono text-ink-400 mt-0.5">{ms}ms</div>}
    </button>
  )
}

function A2ACard({ task }) {
  const [open, setOpen] = useState(false)
  const TONE = { completed: 'text-emerald-600', running: 'text-primary-600', pending: 'text-ink-400', failed: 'text-rose-600' }
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-700 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-ink-700 dark:text-ink-200">{task.from}</span>
          <ArrowRight size={12} className="text-ink-400" />
          <span className="font-mono text-xs font-bold text-primary-600">{task.to}</span>
          <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded bg-ink-100 dark:bg-ink-800', TONE[task.status])}>{task.status}</span>
          {task.duration_ms > 0 && <span className="text-[10px] text-ink-400 font-mono">{task.duration_ms}ms</span>}
        </div>
        <ChevronDown size={14} className={clsx('text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-ink-200 dark:border-ink-700">
              <div className="text-[10px] font-mono text-ink-400 mt-2 mb-2">task/{task.id}</div>
              {task.output_refs?.length > 0 && (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-ink-500 mb-1">Ressources publiées</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {task.output_refs.map((r, j) => (
                      <span key={j} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        📦 {r.split('/').slice(-1)[0]}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {task.error && <div className="text-xs text-rose-600 mt-2">❌ {task.error}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeatureBars({ features }) {
  const entries = Object.entries(features).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1
  return (
    <div className="space-y-2 mb-3">
      {entries.map(([feat, score]) => (
        <div key={feat}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-mono text-ink-600 dark:text-ink-300">{feat}</span>
            <span className="font-mono text-primary-600">{score.toFixed(3)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(score / max) * 100}%` }} transition={{ duration: 0.6 }}
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DetectionXAI({ detection }) {
  const [open, setOpen] = useState(false)
  const xai = detection.xai || {}
  const tier = xai.confidence_tier
  const TIER = { high: 'bg-emerald-100 text-emerald-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-rose-100 text-rose-700' }
  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-700 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-ink-50 dark:hover:bg-ink-800/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 capitalize">
            {(detection.class_name || '').replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] font-mono text-ink-500">conf={Math.round((detection.confidence || 0) * 100)}%</span>
          {tier && <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded', TIER[tier])}>{tier}</span>}
          {xai.shap_score != null && <span className="text-[10px] font-mono text-violet-600">shap={xai.shap_score.toFixed(3)}</span>}
        </div>
        <ChevronDown size={14} className={clsx('text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-ink-200 dark:border-ink-700 space-y-3 pt-3">
              {xai.feature_importance && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-500 mb-1.5">Feature importance</div>
                  <FeatureBars features={xai.feature_importance} />
                </div>
              )}
              {xai.narrative_explanation && <Row label="Feature principale" value={xai.narrative_explanation} />}
              {xai.visual_evidence && <Row label="Indices visuels" value={xai.visual_evidence} />}
              {xai.counterfactual && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  ↩ <strong>Contrefactuel</strong> : {xai.counterfactual}
                </div>
              )}
              {xai.contributing_features?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink-500 mb-1.5">Features contributives</div>
                  <div className="flex flex-wrap gap-1.5">
                    {xai.contributing_features.map((f, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-900/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="text-xs">
      <span className="text-[10px] uppercase tracking-wide text-ink-500 dark:text-ink-400 font-mono">{label}: </span>
      <span className="text-ink-700 dark:text-ink-200">{value}</span>
    </div>
  )
}

function Metric({ label, value, tone = 'slate' }) {
  const TONE = {
    slate:   'text-ink-800 dark:text-ink-100',
    emerald: 'text-emerald-600',
    amber:   'text-amber-600',
    rose:    'text-rose-600',
    violet:  'text-violet-600',
  }
  return (
    <div className="px-3 py-2 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800/40">
      <div className="text-[9px] uppercase tracking-wide text-ink-500 font-mono">{label}</div>
      <div className={clsx('font-mono font-bold text-sm tabular-nums mt-0.5', TONE[tone])}>{value}</div>
    </div>
  )
}

function Pill({ children, tone = 'slate', small }) {
  const TONE = {
    slate:   'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  }
  return (
    <span className={clsx(
      'inline-flex items-center font-mono font-semibold rounded-md',
      small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
      TONE[tone],
    )}>{children}</span>
  )
}

function SectionLabel({ children, className }) {
  return <div className={clsx('text-[10px] uppercase tracking-widest font-mono text-ink-500 dark:text-ink-400 mb-2', className)}>{children}</div>
}
function Empty({ children }) { return <div className="text-center text-sm text-ink-500 py-8">{children}</div> }
function Loading() { return <div className="flex items-center gap-2 text-sm text-primary-600"><Loader2 size={14} className="animate-spin" />Pipeline en cours...</div> }

