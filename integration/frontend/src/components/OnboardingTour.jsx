import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Boxes, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function OnboardingTour() {
  const { hasSeenOnboarding, completeOnboarding } = useAppStore()
  const [step, setStep] = useState(0)

  const steps = [
    {
      icon: Boxes,
      title: 'Bienvenue sur le Portail d\'Intégration',
      description: 'Accédez aux 3 systèmes de Smart Brain Technologie depuis une interface unifiée.'
    },
    {
      icon: LayoutDashboard,
      title: 'Tableau de bord centralisé',
      description: 'Surveillez l\'état de tous les services et consultez les statistiques en temps réel.'
    }
  ]

  if (hasSeenOnboarding) return null

  const current = steps[step]
  const Icon = current.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-ink-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
        >
          <button
            onClick={completeOnboarding}
            className="absolute top-4 right-4 text-ink-400 hover:text-ink-600"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700
                        flex items-center justify-center mb-6 shadow-lg">
            <Icon size={32} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold text-ink-900 dark:text-white text-center mb-3">
            {current.title}
          </h2>

          <p className="text-ink-600 dark:text-ink-300 text-center mb-8">
            {current.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? 'w-8 bg-primary-600'
                      : 'w-1.5 bg-ink-200 dark:bg-ink-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1)
                } else {
                  completeOnboarding()
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700
                       text-white font-medium flex items-center gap-2 transition-colors"
            >
              {step < steps.length - 1 ? 'Suivant' : 'Commencer'}
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
