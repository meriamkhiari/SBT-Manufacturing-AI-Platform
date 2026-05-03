import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export default function RouteProgress() {
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsLoading(true)
    setProgress(0)
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 100)

    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 300)
    }, 400)

    return () => {
      clearInterval(timer)
      clearTimeout(completeTimer)
    }
  }, [location.pathname])

  return (
    <AnimatePresence>
      {isLoading && progress < 100 && (
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
