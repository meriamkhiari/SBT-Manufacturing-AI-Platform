import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image as ImageIcon, Eye, EyeOff, RotateCcw, Sparkles, AlertOctagon, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import BBoxCanvas from './BBoxCanvas'
import DetectionCard from './DetectionCard'
import PipelinePanel from './PipelinePanel'
import StatCard from './StatCard'
import XAIModal from './XAIModal'
import { analyzeImage } from '../api/qualityApi'
import { useAppStore } from '../store/useAppStore'

const SEV_LABEL = { high: 'Critique', medium: 'Moyen', low: 'Mineur' }

export default function UploadTab({ onAnalyzingChange }) {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const [flashIdx, setFlashIdx] = useState(null)
  const [visible, setVisible] = useState({ high: true, medium: true, low: true })
  const [dragging, setDragging] = useState(false)
  const [xaiModal, setXaiModal] = useState({ isOpen: false, detection: null, index: null })
  const fileRef = useRef()
  const { playSound } = useAppStore()

  useEffect(() => { onAnalyzingChange?.(loading) }, [loading, onAnalyzingChange])

  const loadFile = useCallback(f => {
    if (!f || !f.type.startsWith('image/')) {
      toast.error('Fichier image requis')
      return
    }
    setFile(f); setResult(null); setError(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }, [])

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setResult(null); setError(null)
    const tid = toast.loading('Analyse en cours…')
    try {
      const data = await analyzeImage(file, context)
      setResult(data); setVisible({ high: true, medium: true, low: true })
      toast.success(`${data.detections?.length || 0} détection(s)`, { id: tid })
      playSound('success')
    } catch (e) {
      setError(e.message); toast.error(e.message, { id: tid })
      playSound('error')
    } finally { setLoading(false) }
  }

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); setContext('') }

  const openXAIModal = (detection, index) => {
    setXaiModal({ isOpen: true, detection, index })
  }

  const closeXAIModal = () => {
    setXaiModal({ isOpen: false, detection: null, index: null })
  }

  const detections = result?.detections || []
  const filtered   = detections.filter(d => visible[d.severity])
  const counts = {
    high:   detections.filter(d => d.severity === 'high').length,
    medium: detections.filter(d => d.severity === 'medium').length,
    low:    detections.filter(d => d.severity === 'low').length,
  }
  const avgConf = detections.length
    ? Math.round(detections.reduce((a,d) => a + (d.confidence || 0), 0) / detections.length * 100)
    : 0
  const elapsed = result?.pipeline?.total_ms || 0

  return (
    <div className="space-y-6">
      {/* Stat strip */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Sparkles}      label="Détections"  value={detections.length} delay={0.0} />
          <StatCard icon={AlertOctagon}  label="Critiques"   value={counts.high}    tone="rose"   delay={0.05} />
          <StatCard icon={CheckCircle2}  label="Confiance ⌀" value={`${avgConf}%`}  tone="emerald" delay={0.10} />
          <StatCard icon={Loader2}       label="Temps"       value={`${elapsed} ms`} delay={0.15} />
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left: image + bboxes */}
        <div className="card p-4 sm:p-6">
          {!preview ? (
            <DropZone
              dragging={dragging} setDragging={setDragging}
              onFile={loadFile}
              onClick={() => fileRef.current?.click()}
            />
          ) : (
            <div>
              <div className="relative bg-ink-100 dark:bg-ink-900 rounded-2xl overflow-hidden">
                <img src={preview} alt="" className="w-full max-h-[640px] object-contain block" />
                {result && (
                  <BBoxCanvas detections={detections} visible={visible} flashIdx={flashIdx} />
                )}
                {loading && (
                  <div className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-ink-950/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-primary-600">
                      <Loader2 size={32} className="animate-spin" />
                      <span className="text-sm font-semibold">Claude Vision analyse…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Severity filters */}
              {result && detections.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {['high','medium','low'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setVisible(v => ({ ...v, [sev]: !v[sev] }))}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                        visible[sev]
                          ? sev === 'high'   ? 'bg-rose-50    text-rose-700    border-rose-200    dark:bg-rose-900/20    dark:text-rose-300    dark:border-rose-800'
                          : sev === 'medium' ? 'bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-900/20   dark:text-amber-300   dark:border-amber-800'
                                             : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-ink-50 text-ink-400 border-ink-200 dark:bg-ink-800 dark:border-ink-700',
                      )}
                    >
                      {visible[sev] ? <Eye size={12}/> : <EyeOff size={12} />} {SEV_LABEL[sev]}
                      <span className="font-mono">{counts[sev]}</span>
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={reset} className="btn-ghost"><RotateCcw size={14} /> Reset</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: controls + detections */}
        <div className="space-y-4">
          <div className="card p-5">
            <input ref={fileRef} type="file" accept="image/*" hidden
                   onChange={e => loadFile(e.target.files?.[0])} />

            {!file ? (
              <button onClick={() => fileRef.current?.click()} className="btn-primary w-full">
                <Upload size={15} /> Choisir une image
              </button>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={14} className="text-primary-600" />
                  <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                  <button onClick={reset} className="text-ink-400 hover:text-rose-500">
                    <X size={14} />
                  </button>
                </div>

                <label className="block text-xs font-semibold text-ink-500 dark:text-ink-400 mb-1.5">
                  Contexte (optionnel)
                </label>
                <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
                          placeholder="ex : ligne d'assemblage XYZ, lot du 12/04…"
                          className="input mb-3 resize-none" />

                <button onClick={handleAnalyze} disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {loading ? 'Analyse en cours…' : 'Analyser'}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800
                              text-xs text-rose-700 dark:text-rose-300 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}
          </div>

          {/* Detection cards */}
          <AnimatePresence>
            {filtered.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="text-xs uppercase tracking-wide font-mono text-ink-500 dark:text-ink-400 px-1">
                  Détections ({filtered.length})
                </div>
                {filtered.map((d, i) => (
                  <DetectionCard 
                    key={i} 
                    detection={d} 
                    index={i} 
                    onFlash={setFlashIdx}
                    onOpen={openXAIModal}
                    highlighted={flashIdx === i} 
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pipeline panel under everything */}
      {(result || loading) && <PipelinePanel data={result} loading={loading} />}

      {/* XAI Modal */}
      <XAIModal 
        detection={xaiModal.detection}
        index={xaiModal.index}
        isOpen={xaiModal.isOpen}
        onClose={closeXAIModal}
      />
    </div>
  )
}

function DropZone({ dragging, setDragging, onFile, onClick }) {
  return (
    <div
      onClick={onClick}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]) }}
      className={clsx(
        'relative bg-grid border-2 border-dashed rounded-2xl cursor-pointer transition-all',
        'flex flex-col items-center justify-center text-center py-20 px-6',
        dragging
          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-900/10 scale-[1.01]'
          : 'border-ink-300 dark:border-ink-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/5',
      )}
    >
      <motion.div
        animate={{ y: dragging ? -4 : 0 }}
        className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 grid place-items-center text-primary-600 dark:text-primary-400 mb-4"
      >
        <Upload size={28} />
      </motion.div>
      <h3 className="text-lg font-bold text-ink-800 dark:text-white">
        {dragging ? 'Déposez l\'image ici' : 'Glissez une image ou cliquez'}
      </h3>
      <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">JPEG · PNG · max 20 MB</p>
    </div>
  )
}
