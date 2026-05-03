import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from './components/Navbar'
import UploadTab from './components/UploadTab'
import SamplesTab from './components/SamplesTab'
import SplashScreen from './components/SplashScreen'
import BackToTop from './components/BackToTop'
import CommandPalette from './components/CommandPalette'
import OnboardingTour from './components/OnboardingTour'
import RouteProgress from './components/RouteProgress'
import { useAppStore } from './store/useAppStore'

const queryClient = new QueryClient()

export default function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [splash, setSplash] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { darkMode, setAnalyzing } = useAppStore()

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleTabChange = (tab) => {
    setIsLoading(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsLoading(false)
    }, 300)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-white dark:bg-ink-950 transition-colors">
        <AnimatePresence>
          {splash && <SplashScreen onComplete={() => setSplash(false)} />}
        </AnimatePresence>

        <RouteProgress isLoading={isLoading} />

        <Navbar onOpenCommandPalette={() => setCommandOpen(true)} />

        <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'upload', label: 'Téléverser' },
              { id: 'samples', label: 'Échantillons' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'upload' && <UploadTab onAnalyzingChange={setAnalyzing} />}
              {activeTab === 'samples' && <SamplesTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        <BackToTop />
        <CommandPalette
          isOpen={commandOpen}
          onClose={() => setCommandOpen(false)}
          onNavigate={handleTabChange}
        />
        <OnboardingTour />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            className: 'dark:bg-ink-800 dark:text-white',
            style: {
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'Inter,sans-serif'
            }
          }}
        />
      </div>
    </QueryClientProvider>
  )
}
