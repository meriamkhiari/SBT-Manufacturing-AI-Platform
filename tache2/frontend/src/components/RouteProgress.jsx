import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function RouteProgress({ isLoading }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isLoading) {
      setProgress(0)
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 200)
      return () => clearInterval(timer)
    } else {
      setProgress(100)
      const timer = setTimeout(() => setProgress(0), 400)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <AnimatePresence>
      {progress > 0 && progress < 100 && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 h-1 bg-gradient-to-r from-primary-600 to-accent-600
                   origin-left z-50 shadow-lg"
          style={{ width: '100%' }}
        />
      )}
    </AnimatePresence>
  )
}
