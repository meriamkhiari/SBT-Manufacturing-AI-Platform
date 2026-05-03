import { useEffect, useRef, useState, useMemo } from 'react'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import { motion } from 'framer-motion'
import { Share2, RefreshCw, ZoomIn, ZoomOut, Eye, EyeOff } from 'lucide-react'
import { useGraphData } from '../hooks/useApi'

// ─── Couleurs cohérentes avec le consolidator backend ──────────────────────────
const TIER_COLORS = {
  1: '#10b981', // Tier 1 — Fabricant
  2: '#3b82f6', // Tier 2 — Assembleur
  3: '#f59e0b', // Tier 3 — Concurrent
}

const NODE_LEGEND = [
  { color: TIER_COLORS[1], label: 'Tier 1 — Fabricant coffrets' },
  { color: TIER_COLORS[2], label: 'Tier 2 — Assembleur câblage' },
  { color: TIER_COLORS[3], label: 'Tier 3 — Concurrent' },
  { color: '#cbd5e1',     label: 'Hub Tier (groupe)' },
]

// Toggleables par défaut : on cache les relations massives qui font de la bouillie
const REL_TYPES = [
  { key: 'BELONGS_TO',         color: '#94a3b8', dashes: false, defaultOn: true,  label: 'Appartenance Tier' },
  { key: 'MENTIONS',           color: '#8b5cf6', dashes: false, defaultOn: true,  label: 'Mentions' },
  { key: 'SUPPLIES',           color: '#ef4444', dashes: false, defaultOn: true,  label: 'Fournit' },
  { key: 'POTENTIAL_SUPPLIER', color: '#0ea5e9', dashes: true,  defaultOn: false, label: 'Fournisseur potentiel' },
  { key: 'COMPETES_WITH',      color: '#f97316', dashes: true,  defaultOn: false, label: 'Concurrent face à' },
]

// ─── Inférence du type de relation depuis edge ────────────────────────────────
function relTypeOf(edge) {
  if (edge.label) return edge.label
  if (edge.dashes && edge.color === '#64748b') return 'POTENTIAL_SUPPLIER'
  if (edge.dashes) return 'POTENTIAL_SUPPLIER'
  if (edge.color === '#f97316') return 'BELONGS_TO'
  if (edge.color === '#8b5cf6') return 'MENTIONS'
  if (edge.color === '#ef4444') return 'SUPPLIES'
  return 'OTHER'
}

export default function GraphPage() {
  const containerRef = useRef(null)
  const networkRef   = useRef(null)
  const { data, isLoading, refetch } = useGraphData()

  const [filterTier,  setFilterTier]  = useState(0)
  const [relsOn,      setRelsOn]      = useState(() =>
    Object.fromEntries(REL_TYPES.map(r => [r.key, r.defaultOn]))
  )
  const [selected,    setSelected]    = useState(null)
  const [counts,      setCounts]      = useState({ nodes: 0, edges: 0 })

  // ── compte des relations par type (info bandeau)
  const relCounts = useMemo(() => {
    if (!data?.edges) return {}
    const c = {}
    for (const e of data.edges) {
      const t = relTypeOf(e)
      c[t] = (c[t] || 0) + 1
    }
    return c
  }, [data])

  useEffect(() => {
    if (!data || !containerRef.current) return

    let nodes = data.nodes || []
    let edges = data.edges || []

    // Filtre tier
    if (filterTier) {
      const allowed = new Set(
        nodes.filter(n => n.tier === filterTier || n.tier === null || n.tier === undefined).map(n => n.id)
      )
      nodes = nodes.filter(n => allowed.has(n.id))
      edges = edges.filter(e => allowed.has(e.from) && allowed.has(e.to))
    }

    // Filtre par type de relation
    edges = edges.filter(e => {
      const t = relTypeOf(e)
      return relsOn[t] !== false
    })

    setCounts({ nodes: nodes.length, edges: edges.length })

    // ─── Préparation des nœuds : couleur, taille, label aéré ──
    const visNodes = new DataSet(nodes.map(n => {
      const isHub = n.shape === 'diamond' || n.id?.toString().startsWith('tier_')
      const color = isHub ? '#cbd5e1' : (TIER_COLORS[n.tier] || n.color || '#94a3b8')
      const cleanLabel = (n.label || n.id || '').toString()
      return {
        id:    n.id,
        label: cleanLabel.length > 22 ? cleanLabel.slice(0, 20) + '…' : cleanLabel,
        title: n.title,
        color: { background: color, border: color, highlight: { background: '#ffffff', border: color } },
        size:  isHub ? 32 : 18,
        shape: isHub ? 'diamond' : 'dot',
        font:  {
          color: '#0f172a',
          size: isHub ? 16 : 13,
          face: 'Inter, system-ui, sans-serif',
          strokeWidth: 4,
          strokeColor: '#ffffff',
          bold: { size: isHub ? 17 : 14, color: '#0f172a' },
        },
        borderWidth: isHub ? 3 : 2,
      }
    }))

    // ─── Préparation des arêtes ──
    const visEdges = new DataSet(edges.map((e, i) => {
      const t = relTypeOf(e)
      const meta = REL_TYPES.find(r => r.key === t) || REL_TYPES[0]
      return {
        id:     `e${i}`,
        from:   e.from,
        to:     e.to,
        title:  e.title || t,
        color:  { color: meta.color, opacity: 0.45, highlight: meta.color },
        dashes: meta.dashes,
        arrows: { to: { enabled: true, scaleFactor: 0.4, type: 'arrow' } },
        width:  meta.dashes ? 0.7 : 1.3,
        smooth: { type: 'continuous', roundness: 0.15 },
      }
    }))

    // ─── Options : physics adoucies, on fige après stabilization ──
    const N = nodes.length
    const options = {
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -120,        // plus négatif = plus de répulsion
          centralGravity:        0.008,
          springLength:          200,         // arêtes plus longues = nœuds plus écartés
          springConstant:        0.04,
          damping:               0.55,
          avoidOverlap:          1.0,
        },
        stabilization: { iterations: Math.min(400, 80 + N * 4), fit: true, updateInterval: 25 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: false,
        zoomView: true,
        dragNodes: true,
        hideEdgesOnDrag: true,
        selectConnectedEdges: false,
      },
      nodes:   { borderWidthSelected: 4, shadow: { enabled: false } },
      edges:   {
        selectionWidth:    1.6,
        hoverWidth:        0.8,
        smooth:            { type: 'continuous', roundness: 0.15 },
        scaling:           { min: 0.5, max: 2 },
      },
      layout: { improvedLayout: false, randomSeed: 42 },
    }

    // ─── Build / rebuild ──
    if (networkRef.current) networkRef.current.destroy()
    networkRef.current = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options)

    // Stabilization done → on fige la physique pour figer la lecture
    networkRef.current.once('stabilizationIterationsDone', () => {
      networkRef.current?.setOptions({ physics: { enabled: false } })
    })

    // Sélection
    networkRef.current.on('selectNode', (e) => {
      const id = e.nodes[0]
      const node = nodes.find(n => n.id === id)
      setSelected(node || null)
    })
    networkRef.current.on('deselectNode', () => setSelected(null))
  }, [data, filterTier, relsOn])

  // ─── Toolbar handlers
  const handleZoomIn  = () => networkRef.current?.moveTo({ scale: networkRef.current.getScale() * 1.3 })
  const handleZoomOut = () => networkRef.current?.moveTo({ scale: networkRef.current.getScale() / 1.3 })
  const handleFit     = () => networkRef.current?.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } })
  const togglePhysics = () => {
    const cur = networkRef.current?.physics?.physicsEnabled
    networkRef.current?.setOptions({ physics: { enabled: !cur } })
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">

      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Share2 size={16} className="text-primary-600 dark:text-primary-400" />
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Graphe Neo4j</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {counts.nodes} nœuds · {counts.edges} relations affichées
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterTier}
            onChange={e => setFilterTier(+e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 min-w-[160px]"
          >
            <option value={0}>Tous les tiers</option>
            <option value={1}>Tier 1 — Fabricants</option>
            <option value={2}>Tier 2 — Assembleurs</option>
            <option value={3}>Tier 3 — Concurrents</option>
          </select>
          <button onClick={togglePhysics} className="text-xs px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200" title="Activer/figer la physique">
            ⚛ Physique
          </button>
          <button onClick={handleZoomIn}  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ZoomIn size={15} /></button>
          <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ZoomOut size={15} /></button>
          <button onClick={handleFit}     className="text-xs px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Fit</button>
          <button onClick={() => refetch()} className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium flex items-center gap-1">
            <RefreshCw size={12} /> Rafraîchir
          </button>
        </div>
      </div>

      {/* Filtres relation — toggle propre */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-400 mr-1">Relations :</span>
        {REL_TYPES.map(r => {
          const on = relsOn[r.key] !== false
          const n  = relCounts[r.key] || 0
          return (
            <button
              key={r.key}
              onClick={() => setRelsOn(prev => ({ ...prev, [r.key]: !on }))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                on
                  ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 line-through'
              }`}
              title={`${n} relations de ce type`}
            >
              {on ? <Eye size={11} /> : <EyeOff size={11} />}
              <span
                className="w-3 h-0.5"
                style={{ background: r.color, borderTop: r.dashes ? `1px dashed ${r.color}` : 'none' }}
              />
              {r.label}
              <span className="font-mono text-[10px] text-slate-500">({n})</span>
            </button>
          )
        })}
      </div>

      {/* Main graph area */}
      <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950">

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 z-10">
            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

        {/* Légende noeuds */}
        <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs shadow-md max-w-[230px]">
          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Légende couleurs</div>
          {NODE_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1 text-slate-600 dark:text-slate-400">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
              <span className="truncate">{label}</span>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 Clique un nœud pour le détail.<br/>
            Active/désactive les relations en haut pour aérer.
          </div>
        </div>

        {/* Panneau détail noeud */}
        {selected && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute top-3 right-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xl max-w-sm text-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selected.label}</span>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-base leading-none">×</button>
            </div>
            <div
              className="text-slate-600 dark:text-slate-400 leading-relaxed max-h-80 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: selected.title || '' }}
            />
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && counts.nodes === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <Share2 size={48} className="mb-4 opacity-20" />
            <p className="font-semibold">Graphe vide</p>
            <p className="text-sm mt-1">Lancez le pipeline pour peupler le graphe Neo4j</p>
          </div>
        )}
      </div>
    </div>
  )
}
