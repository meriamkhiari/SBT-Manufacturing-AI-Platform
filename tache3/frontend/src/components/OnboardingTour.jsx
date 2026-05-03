import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles, Globe, MessageCircle, LayoutDashboard, Languages, Scale } from 'lucide-react'
import useStore from '../store/useStore'

const STEPS = [
  {
    icon:  Sparkles,
    color: 'blue',
    title: 'Bienvenue sur SBT Intelligence',
    desc:  'Votre plateforme de prospection B2B alimentée par l\'IA, conçue pour Smart Brain Technologie. Découvrez, analysez et contactez vos meilleurs prospects industriels.',
  },
  {
    icon:  LayoutDashboard,
    color: 'emerald',
    title: 'Dashboard Prospects',
    desc:  'Consultez, filtrez et triez vos entreprises cibles. Cliquez sur une ligne pour voir le détail complet, générer un email IA personnalisé ou ajouter aux favoris ⭐',
  },
  {
    icon:  Scale,
    color: 'violet',
    title: 'Comparaison d\'entreprises',
    desc:  'Utilisez le bouton ⚖ dans le tableau pour sélectionner jusqu\'à 2 entreprises et les comparer côte à côte (scores, contacts, recommandation XAI).',
  },
  {
    icon:  Globe,
    color: 'amber',
    title: 'Carte & Graphe interactifs',
    desc:  'Visualisez vos prospects sur une carte mondiale géolocalisée et explorez les relations entre entreprises via le graphe Neo4j interactif.',
  },
  {
    icon:  Languages,
    color: 'rose',
    title: 'Interface multilingue',
    desc:  'Changez la langue de toute l\'interface depuis le sélecteur de langue en haut à droite. 23 langues disponibles pour votre équipe internationale.',
  },
  {
    icon:  MessageCircle,
    color: 'primary',
    title: 'Chatbot SBT IA',
    desc:  'Le cercle bleu en bas à droite est votre assistant IA. Posez-lui des questions sur SBT, ses services, équipements, ou comment contacter l\'entreprise — dans votre langue.',
  },
]

const COLORS = {
  primary: {
    bg:   'from-primary-500/10 to-primary-600/5 dark:from-primary-900/40 dark:to-primary-800/20',
    icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300',
    btn:  'bg-primary-600 hover:bg-primary-700 text-white',
    dot:  'bg-primary-500',
  },
  blue: {
    bg:   'from-blue-500/10 to-blue-600/5 dark:from-blue-900/40 dark:to-blue-800/20',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    btn:  'bg-blue-600 hover:bg-blue-700 text-white',
    dot:  'bg-blue-500',
  },
  emerald: {
    bg:   'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-900/40 dark:to-emerald-800/20',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
    btn:  'bg-emerald-600 hover:bg-emerald-700 text-white',
    dot:  'bg-emerald-500',
  },
  amber: {
    bg:   'from-amber-500/10 to-amber-600/5 dark:from-amber-900/40 dark:to-amber-800/20',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
    btn:  'bg-amber-600 hover:bg-amber-700 text-white',
    dot:  'bg-amber-500',
  },
  violet: {
    bg:   'from-violet-500/10 to-violet-600/5 dark:from-violet-900/40 dark:to-violet-800/20',
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300',
    btn:  'bg-violet-600 hover:bg-violet-700 text-white',
    dot:  'bg-violet-500',
  },
  rose: {
    bg:   'from-rose-500/10 to-rose-600/5 dark:from-rose-900/40 dark:to-rose-800/20',
    icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300',
    btn:  'bg-rose-600 hover:bg-rose-700 text-white',
    dot:  'bg-rose-500',
  },
}

export default function OnboardingTour() {
  const hasSeenTour  = useStore(s => s.hasSeenTour)
  const markTourSeen = useStore(s => s.markTourSeen)
  const [step, setStep] = useState(0)

  if (hasSeenTour) return null

  const current = STEPS[step]
  const c       = COLORS[current.color]
  const Icon    = current.icon
  const isLast  = step === STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0,   y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`relative w-full max-w-md bg-gradient-to-br ${c.bg} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700`}
          >
            {/* Skip */}
            <button
              onClick={markTourSeen}
              title="Passer le tutoriel"
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors z-10"
            >
              <X size={12} />
            </button>

            {/* Step counter */}
            <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
              {step + 1} / {STEPS.length}
            </div>

            {/* Content */}
            <div className="px-8 pt-12 pb-6 text-center">
              {/* Icon */}
              <div className={`w-18 h-18 w-[72px] h-[72px] rounded-2xl mx-auto flex items-center justify-center mb-5 ${c.icon}`}>
                <Icon size={32} />
              </div>

              {/* Text */}
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-3 leading-tight">
                {current.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {current.desc}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 pb-3">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? `w-6 h-2 ${c.dot}`
                      : 'w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex items-center gap-3">
              {step > 0 ? (
                <button
                  onClick={() => setStep(v => v - 1)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <ChevronLeft size={14} /> Précédent
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => isLast ? markTourSeen() : setStep(v => v + 1)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${c.btn}`}
              >
                {isLast ? '🚀 C\'est parti !' : 'Suivant'}
                {!isLast && <ChevronRight size={14} />}
              </button>

              {!isLast && (
                <button
                  onClick={markTourSeen}
                  className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors whitespace-nowrap"
                >
                  Passer
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
