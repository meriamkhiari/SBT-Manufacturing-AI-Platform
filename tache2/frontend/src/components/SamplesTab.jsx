import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X, Loader2, Sparkles, Eye, EyeOff, AlertTriangle, Tag, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { fetchSamples, analyzeSample } from '../api/qualityApi'
import BBoxCanvas from './BBoxCanvas'
import DetectionCard from './DetectionCard'
import PipelinePanel from './PipelinePanel'
import StatCard from './StatCard'
import GTOverlay from './GTOverlay'
import { Images, AlertOctagon, CheckCircle2 } from 'lucide-react'

const SEV_LABEL = { high: 'Critique', medium: 'Moyen', low: 'Mineur' }

export default function SamplesTab() {
  const [samples, setSamples]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [analyzing, setAnalyzing]   = useState(false)
  const [modalResult, setModalResult] = useState(null)
  const [modalError, setModalError]   = useState(null)
  const [visible, setVisible] = useState({ high: true, medium: true, low: true })
  const [flashIdx, setFlashIdx] = useState(null)
  const [showGT, setShowGT] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchSamples()
      setSamples(data.samples || [])
    } catch { setSamples([]); toast.error('Échec chargement samples') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openModal = s => { setModal(s); setModalResult(null); setModalError(null) }
  const closeModal = () => { setModal(null); setModalResult(null); setModalError(null) }

  const handleAnalyze = async () => {
    if (!modal) return
    setAnalyzing(true); setModalResult(null); setModalError(null)
    const tid = toast.loading('Analyse…')
    try {
      const data = await analyzeSample(modal.filename)
      setModalResult(data); toast.success('Analyse terminée', { id: tid })
    } catch (e) { setModalError(e.message); toast.error(e.message, { id: tid }) }
    setAnalyzing(false)
  }

  const detections = modalResult?.detections || []
  const filtered   = detections.filter(d => visible[d.severity])
  const counts = {
    high:   detections.filter(d => d.severity === 'high').length,
    medium: detections.filter(d => d.severity === 'medium').length,
    low:    detections.filter(d => d.severity === 'low').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Dataset Samples</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Images annotées YOLOv8-OBB · pipeline A2A complet à la demande
          </p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw size={14} /> Actualiser</button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card aspect-square animate-pulse" />
          ))}
        </div>
      ) : samples.length === 0 ? (
        <div className="card p-12 text-center text-ink-500">
          <Images size={36} className="mx-auto mb-2" />
          Aucun sample disponible
        </div>
      ) : (
        <motion.div
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {samples.map(s => <SampleCard key={s.filename} sample={s} onOpen={openModal} />)}
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) closeModal() }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="card w-full max-w-5xl max-h-[92vh] overflow-y-auto"
            >
              <div className="px-5 py-3.5 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between sticky top-0 bg-white dark:bg-ink-900 z-10">
                <div className="font-semibold text-ink-800 dark:text-white truncate">
                  {modal.filename.replace(/_jpg\.rf\.[a-f0-9]+\.jpg/, '').replace(/_/g, ' ')}
                </div>
                <button onClick={closeModal} className="btn-ghost !p-2"><X size={16} /></button>
              </div>

              <div className="p-5 space-y-4">
                {modalResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={Sparkles} label="Détections" value={detections.length} />
                    <StatCard icon={AlertOctagon} label="Critiques" value={counts.high} tone="rose" />
                    <StatCard icon={CheckCircle2} label="Conf. moy." tone="emerald"
                              value={`${Math.round(detections.reduce((a,d)=>a+(d.confidence||0),0) / Math.max(1,detections.length) * 100)}%`} />
                    <StatCard icon={Loader2} label="Temps" value={`${modalResult.pipeline?.total_ms || 0} ms`} />
                  </div>
                )}

                <div className="grid lg:grid-cols-[1fr_320px] gap-4">
                  <div className="relative bg-ink-100 dark:bg-ink-900 rounded-2xl overflow-hidden">
                    <img src={modal.url} alt="" className="w-full max-h-[640px] object-contain block" />
                    {/* Ground-truth annotations from the dataset (toggleable) */}
                    {showGT && modal.ground_truth?.length > 0 && (
                      <GTOverlay annotations={modal.ground_truth} />
                    )}
                    {modalResult && <BBoxCanvas detections={detections} visible={visible} flashIdx={flashIdx} />}
                    {analyzing && (
                      <div className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-ink-950/60 backdrop-blur-sm">
                        <Loader2 size={28} className="animate-spin text-primary-600" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Ground-truth panel — visible AS SOON AS the modal opens */}
                    {modal.ground_truth?.length > 0 && (
                      <div className="card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-ink-800 dark:text-ink-100">
                            <Tag size={14} className="text-primary-600" />
                            Annotations dataset
                            <span className="badge badge-low">{modal.ground_truth.length}</span>
                          </div>
                          <button onClick={() => setShowGT(g => !g)}
                                  className={clsx('btn-ghost !p-1.5', !showGT && 'opacity-50')}
                                  title={showGT ? 'Masquer overlay' : 'Afficher overlay'}>
                            {showGT ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {Object.entries(
                            modal.ground_truth.reduce((m, a) => ({ ...m, [a.class_name]: (m[a.class_name] || 0) + 1 }), {})
                          ).map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between text-xs">
                              <span className="text-ink-600 dark:text-ink-300 capitalize">{name.replace(/_/g, ' ')}</span>
                              <span className="font-mono font-bold text-primary-600">×{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!modalResult && !analyzing && (
                      <button onClick={handleAnalyze} className="btn-primary w-full">
                        <Sparkles size={15} /> Lancer l'analyse
                      </button>
                    )}
                    {analyzing && (
                      <div className="card p-4 flex items-center gap-2 text-primary-600 text-sm font-semibold">
                        <Loader2 size={14} className="animate-spin" /> Analyse en cours…
                      </div>
                    )}
                    {modalError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800
                                      text-xs text-rose-700 dark:text-rose-300 flex gap-2">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {modalError}
                      </div>
                    )}

                    {modalResult && detections.length > 0 && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {['high','medium','low'].map(sev => (
                            <button key={sev}
                              onClick={() => setVisible(v => ({ ...v, [sev]: !v[sev] }))}
                              className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                                visible[sev]
                                  ? sev === 'high' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800' 
                                  : sev === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-ink-50 text-ink-400 border-ink-200 dark:bg-ink-800 dark:border-ink-700',
                              )}
                            >
                              {visible[sev] ? <Eye size={11}/> : <EyeOff size={11} />} {SEV_LABEL[sev]} {counts[sev]}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {filtered.map((d, i) => (
                            <DetectionCard key={i} detection={d} index={i} onFlash={setFlashIdx}
                                           highlighted={flashIdx === i} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {modalResult && <PipelinePanel data={modalResult} loading={false} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SampleCard({ sample, onOpen }) {
  const dc = sample.defect_count || sample.ground_truth?.length || 0
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      onClick={() => onOpen(sample)}
      className="card-hover p-0 overflow-hidden text-left group"
    >
      <div className="relative aspect-square bg-ink-100 dark:bg-ink-900 overflow-hidden">
        <img src={sample.url} alt={sample.filename}
             className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {/* Ground-truth overlay (compact, no labels) */}
        {sample.ground_truth?.length > 0 && (
          <GTOverlay annotations={sample.ground_truth} compact showLabels={false} />
        )}
        {/* Defect count badge */}
        {dc > 0 && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                          bg-primary-600/90 backdrop-blur text-white text-[11px] font-bold shadow-md">
            <Layers size={10} /> {dc} défaut{dc > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs font-mono text-ink-500 dark:text-ink-400 truncate">
          {sample.filename.replace(/_jpg\.rf\.[a-f0-9]+\.jpg/, '').replace(/_/g, ' ')}
        </div>
      </div>
    </motion.button>
  )
}
