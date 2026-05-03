import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import Layout         from './components/Layout'
import Home           from './pages/Home'
import MapPage        from './pages/Map'
import Dashboard      from './pages/Dashboard'
import GraphPage      from './pages/Graph'
import Marketing      from './pages/Marketing'
import CommandPalette from './components/CommandPalette'
import OnboardingTour from './components/OnboardingTour'
import useStore       from './store/useStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function SplashScreen() {
  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center shadow-2xl shadow-black/30 mb-5">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
            <rect x="2" y="8" width="28" height="16" rx="2" fill="white" fillOpacity="0.15"/>
            <path d="M6 14h4M6 18h6M16 14h4M16 18h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="24" cy="10" r="4" fill="#60a5fa"/>
            <path d="M22 10l1.5 1.5L26 8.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 12V20M28 12V20" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
          </svg>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-white font-black text-4xl tracking-tight"
        >
          SBT
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-white/55 text-xs tracking-[0.3em] uppercase mt-1"
        >
          Intelligence
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-14 flex gap-2"
      >
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.1, repeat: Infinity, delay }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

function AppInner() {
  const [showSplash, setShowSplash] = useState(true)
  const isDark = useStore(s => s.isDark)

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800)
    return () => clearTimeout(t)
  }, [])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Raccourcis clavier globaux (nécessite d'être à l'intérieur de BrowserRouter)
  useKeyboardShortcuts()

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index              element={<Home />}      />
          <Route path="map"         element={<MapPage />}   />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="graph"       element={<GraphPage />} />
          <Route path="marketing"   element={<Marketing />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Palette de commandes globale (Ctrl+K) */}
      <CommandPalette />

      {/* Tour d'onboarding — affiché uniquement au premier lancement */}
      <OnboardingTour />

      {/* Toasts globaux */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
