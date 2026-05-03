import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function RouteProgressBar() {
  const location          = useLocation()
  const [visible, setVisible] = useState(false)
  const [width,   setWidth]   = useState(0)

  useEffect(() => {
    setVisible(true)
    setWidth(20)

    const t1 = setTimeout(() => setWidth(60),  80)
    const t2 = setTimeout(() => setWidth(85),  200)
    const t3 = setTimeout(() => setWidth(100), 380)
    const t4 = setTimeout(() => setVisible(false), 560)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [location.pathname])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 z-[500] h-[3px] rounded-r-full"
          style={{
            width: `${width}%`,
            transition: 'width 0.25s ease',
            background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)',
            boxShadow: '0 0 8px rgba(99,102,241,0.7)',
          }}
        />
      )}
    </AnimatePresence>
  )
}
