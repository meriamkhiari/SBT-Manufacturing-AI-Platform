import { motion } from 'framer-motion'
import { Microscope } from 'lucide-react'

export default function SplashScreen({ onComplete }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 1.3 }}
      onAnimationComplete={onComplete}
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="w-24 h-24 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm
                          flex items-center justify-center shadow-2xl">
            <Microscope size={48} className="text-white" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-3xl font-bold text-white mb-2"
        >
          QualityVision
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-primary-100 text-sm"
        >
          Analyse intelligente de qualité
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-8 flex gap-1.5 justify-center"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
