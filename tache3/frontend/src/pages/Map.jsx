import { useState, useCallback, useRef } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, X, Search, Zap, MapPin, Building2, Plus, Minus, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { useCompanies } from '../hooks/useApi'

// World topojson from CDN (react-simple-maps default)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// Country name mapping from topojson NAME_LONG / NAME field
const COUNTRY_NAME_MAP = {
  'France': 'France', 'Italy': 'Italie', 'Spain': 'Espagne',
  'Germany': 'Allemagne', 'Morocco': 'Maroc', 'Tunisia': 'Tunisie',
  'Romania': 'Roumanie', 'Bulgaria': 'Bulgarie', 'Belgium': 'Belgique',
  'Switzerland': 'Suisse', 'Portugal': 'Portugal', 'Poland': 'Pologne',
  'United Kingdom': 'Royaume-Uni', 'Netherlands': 'Pays-Bas',
  'Austria': 'Autriche', 'Turkey': 'Turquie', 'China': 'Chine',
  'United States of America': 'États-Unis', 'Algeria': 'Algérie',
  'Libya': 'Libye', 'Egypt': 'Égypte',
}

const COUNTRY_COLORS = {
  'France': '#2563eb', 'Italie': '#16a34a', 'Espagne': '#d97706',
  'Allemagne': '#dc2626', 'Maroc': '#7c3aed', 'Tunisie': '#0891b2',
  'Roumanie': '#be185d', 'Bulgarie': '#92400e',
}

export default function MapPage() {
  const navigate = useNavigate()
  const selectedCountry = useStore(s => s.selectedCountry)
  const setCountry      = useStore(s => s.setCountry)
  const clearCountry    = useStore(s => s.clearCountry)
  const selectedSector  = useStore(s => s.selectedSector)

  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [tooltipPos, setTooltipPos]         = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                     = useState(1)
  const [position, setPosition]             = useState({ coordinates: [0, 20], zoom: 1 })

  const handleMoveEnd = useCallback((pos) => setPosition(pos), [])
  const zoomIn  = () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 6) }))
  const zoomOut = () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 0.8) }))
  const zoomReset = () => setPosition({ coordinates: [0, 20], zoom: 1 })

  const { data: companiesData } = useCompanies(
    selectedCountry ? { country: selectedCountry, limit: 200 } : {}
  )
  const companies = companiesData?.companies || []

  // Count per country
  const countPerCountry = companies.reduce((acc, c) => {
    if (c.country) acc[c.country] = (acc[c.country] || 0) + 1
    return acc
  }, {})

  const handleCountryClick = useCallback((geo) => {
    const name = geo.properties.NAME || geo.properties.name || ''
    const mapped = COUNTRY_NAME_MAP[name] || name
    if (mapped === selectedCountry) {
      clearCountry()
    } else {
      setCountry(mapped)
    }
  }, [selectedCountry, setCountry, clearCountry])

  const handleMouseMove = useCallback((e) => {
    setTooltipPos({ x: e.clientX + 12, y: e.clientY - 40 })
  }, [])

  const getFill = (geo) => {
    const name   = geo.properties.NAME || geo.properties.name || ''
    const mapped = COUNTRY_NAME_MAP[name] || name
    if (mapped === selectedCountry) return '#2563eb'
    if (countPerCountry[mapped]) return '#10b981'
    if (COUNTRY_COLORS[mapped]) return COUNTRY_COLORS[mapped] + '66'
    return '#cbd5e1'
  }

  return (
    <div className="h-[calc(100vh-112px)] md:h-[calc(100vh-56px)] flex flex-col bg-slate-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={16} className="text-primary-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-white">Carte mondiale</span>
          <span className="hidden sm:inline text-xs text-slate-400">— Cliquez pour filtrer</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCountry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-primary-600 text-white px-2.5 py-1.5 rounded-full text-xs font-semibold"
            >
              <MapPin size={11} />
              {selectedCountry}
              {countPerCountry[selectedCountry] != null && (
                <span className="bg-white/20 px-1.5 rounded-full text-xs">
                  {countPerCountry[selectedCountry]} ent.
                </span>
              )}
              <button onClick={clearCountry} className="hover:text-white/60 transition-colors ml-1">
                <X size={11} />
              </button>
            </motion.div>
          )}
          {selectedCountry && (
            <button
              onClick={() => navigate('/', { state: { autoSearch: true } })}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Search size={12} /> <span className="hidden sm:inline">Rechercher en </span>{selectedCountry}
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden" onMouseMove={handleMouseMove}>
        <ComposableMap
          projection="geoNaturalEarth1"
          style={{ width: '100%', height: '100%' }}
          projectionConfig={{ scale: 160 }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={0.8}
            maxZoom={6}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name   = geo.properties.NAME || geo.properties.name || ''
                  const mapped = COUNTRY_NAME_MAP[name] || name
                  const isSelected = mapped === selectedCountry
                  const hasData    = !!countPerCountry[mapped]

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleCountryClick(geo)}
                      onMouseEnter={() => setHoveredCountry({ name: mapped, count: countPerCountry[mapped] })}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        default: {
                          fill:   getFill(geo),
                          stroke: '#1e293b',
                          strokeWidth: 0.4,
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'fill 0.15s ease',
                        },
                        hover: {
                          fill:   isSelected ? '#1d4ed8' : hasData ? '#059669' : '#475569',
                          stroke: '#1e293b',
                          strokeWidth: 0.6,
                          outline: 'none',
                          cursor: 'pointer',
                        },
                        pressed: {
                          fill: '#1e40af',
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredCountry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50 bg-slate-900 border border-slate-700 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl pointer-events-none"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="font-bold text-sm">{hoveredCountry.name}</div>
              {hoveredCountry.count != null && (
                <div className="text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Building2 size={10} /> {hoveredCountry.count} entreprise(s)
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend — desktop only */}
        <div className="hidden sm:block absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
          <div className="font-semibold text-white mb-2">Légende</div>
          {[
            ['bg-primary-600', 'Sélectionné'],
            ['bg-emerald-500', 'Données dispo'],
            ['bg-slate-500',   'Aucune donnée'],
          ].map(([bg, label]) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <button
            onClick={zoomIn}
            className="w-9 h-9 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 active:scale-95 text-white rounded-xl border border-slate-600 flex items-center justify-center transition-all shadow-md"
            title="Zoom +"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={zoomOut}
            className="w-9 h-9 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 active:scale-95 text-white rounded-xl border border-slate-600 flex items-center justify-center transition-all shadow-md"
            title="Zoom −"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={zoomReset}
            className="w-9 h-9 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 active:scale-95 text-white rounded-xl border border-slate-600 flex items-center justify-center transition-all shadow-md"
            title="Réinitialiser"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Quick-select chips (always visible) */}
        <div className="absolute bottom-3 left-0 right-0 px-3 pointer-events-none">
          <div className="flex gap-1.5 overflow-x-auto pb-1 pointer-events-auto" style={{ scrollbarWidth: 'none' }}>
            {['France','Italie','Espagne','Allemagne','Maroc','Tunisie','Roumanie','Belgique','Suisse','Portugal'].map(c => (
              <button
                key={c}
                onClick={() => selectedCountry === c ? clearCountry() : setCountry(c)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all active:scale-95 shadow-sm ${
                  selectedCountry === c
                    ? 'bg-primary-600 border-primary-500 text-white'
                    : 'bg-slate-800/90 backdrop-blur-sm border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: company summary for selected country */}
      {selectedCountry && companies.length > 0 && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="shrink-0 bg-slate-800 border-t border-slate-700 px-4 py-3"
        >
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold text-sm">
                {companies.length} entreprises en {selectedCountry}
              </span>
              <div className="flex gap-3 text-xs text-slate-400">
                {[1,2,3].map(t => {
                  const count = companies.filter(c => c.tier === t).length
                  return count > 0 && (
                    <span key={t}>T{t}: <strong className="text-white">{count}</strong></span>
                  )
                })}
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              Voir dashboard <Zap size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
