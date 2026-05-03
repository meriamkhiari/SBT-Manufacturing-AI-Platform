import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 72

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY,      setPullY]      = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pulling = pullY > 0

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (startY.current === null) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && window.scrollY === 0) {
      setPullY(Math.min(diff * 0.45, THRESHOLD + 16))
    }
  }

  const handleTouchEnd = async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true)
      setPullY(THRESHOLD)
      await onRefresh?.()
      setRefreshing(false)
    }
    startY.current = null
    setPullY(0)
  }

  const progress = Math.min(pullY / THRESHOLD, 1)
  const showIndicator = pulling || refreshing

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Indicateur pull */}
      <div
        className="absolute left-0 right-0 flex justify-center items-end z-10 overflow-hidden pointer-events-none"
        style={{ height: showIndicator ? (refreshing ? THRESHOLD : pullY) : 0, top: 0, transition: pulling ? 'none' : 'height 0.3s ease' }}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-md transition-colors ${
          progress >= 1 ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-primary-500'
        }`}>
          <motion.div
            style={{ rotate: refreshing ? 0 : progress * 360 }}
            animate={refreshing ? { rotate: 360 } : {}}
            transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
          >
            <RefreshCw size={18} />
          </motion.div>
        </div>
      </div>

      {/* Contenu décalé pendant le pull */}
      <div style={{
        transform: showIndicator ? `translateY(${refreshing ? THRESHOLD : pullY}px)` : 'none',
        transition: pulling ? 'none' : 'transform 0.3s ease',
      }}>
        {children}
      </div>
    </div>
  )
}
