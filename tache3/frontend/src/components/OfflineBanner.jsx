import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [online, setOnline]                   = useState(navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3000)
    }
    const onOffline = () => { setOnline(false); setJustReconnected(false) }

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const show = !online || justReconnected

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{ y: -40,    opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed top-14 left-0 right-0 z-[150] flex items-center justify-center gap-2 py-2 text-sm font-semibold shadow-md ${
            online
              ? 'bg-emerald-500 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {online
            ? <><Wifi size={15} /> Connexion rétablie ✓</>
            : <><WifiOff size={15} /> Hors ligne — vérifiez le serveur backend</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  )
}
