import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ChevronUp, ExternalLink, RefreshCw, Cpu, ScanSearch, Network,
} from 'lucide-react'
import { fetchTask, fetchStatus } from '../lib/api'
import { themeOf } from '../lib/taskThemes'
import { cx } from './ui'

const ICONS = { task1: Cpu, task2: ScanSearch, task3: Network }

/**
 * LOGIQUE SIMPLE ET OPTIMISTE :
 *  1. Iframe montée immédiatement dès qu'on a l'URL
 *  2. Timer de 5s : si onLoad ne fire pas → fallback offline
 *  3. Polling status pour l'indicateur du dock uniquement
 */
export default function TaskShell({ id }) {
  const theme = themeOf(id)
  const Icon  = ICONS[id] || Cpu
  const ref   = useRef(null)

  const [task, setTask]         = useState(null)
  const [status, setStatus]     = useState('checking')
  const [loaded, setLoaded]     = useState(false)
  const [offline, setOffline]   = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [dockOpen, setDockOpen] = useState(true)

  // Charge métadonnée tâche
  useEffect(() => {
    let alive = true
    fetchTask(id).then(t => alive && setTask(t)).catch(() => {})
    return () => { alive = false }
  }, [id])

  // Polling status pour indicateur dock
  useEffect(() => {
    let alive = true
    const tick = () =>
      fetchStatus()
        .then(s => alive && setStatus(s[id]?.backend ?? 'offline'))
        .catch(() => alive && setStatus('offline'))
    tick()
    const i = setInterval(tick, 8000)
    return () => { alive = false; clearInterval(i) }
  }, [id])

  // Reset à chaque reload
  useEffect(() => {
    setLoaded(false)
    setOffline(false)
  }, [reloadKey])

  // Timer 5s : si pas chargé → offline
  useEffect(() => {
    if (loaded || offline) return
    const timer = setTimeout(() => !loaded && setOffline(true), 5000)
    return () => clearTimeout(timer)
  }, [loaded, offline, reloadKey])

  const reload = () => setReloadKey(k => k + 1)

  if (!task) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white dark:bg-ink-950">
        <div className={cx('w-12 h-12 rounded-full border-2 border-transparent animate-spin border-t-current', theme.accentText)} />
      </div>
    )
  }

  // ── LAN-friendly URL: replace `localhost` / `127.0.0.1` by the current host
  //    so phones on the same Wi-Fi can reach the backend at 192.168.x.x:PORT.
  function toLanUrl(url) {
    if (!url) return url
    const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost'
    if (host === 'localhost' || host === '127.0.0.1') return url
    return url.replace(/(https?:\/\/)(localhost|127\.0\.0\.1)/g, '$1' + host)
  }
  const baseUrl = toLanUrl(task.iframe_url)
  const openTab = () => baseUrl && window.open(baseUrl, '_blank', 'noopener')
  const src     = baseUrl + (baseUrl.includes('?') ? '&' : '?') + '_=' + reloadKey

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-white dark:bg-ink-950"
    >
      {/* Iframe montée immédiatement */}
      <iframe
        key={reloadKey}
        ref={ref}
        src={src}
        title={task.name}
        onLoad={() => { setLoaded(true); setOffline(false) }}
        className="w-full h-full border-0 block"
        style={{ visibility: offline ? 'hidden' : 'visible' }}
        allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
      />

      {/* Loader pendant chargement */}
      {!loaded && !offline && (
        <div className="absolute inset-0 grid place-items-center bg-white dark:bg-ink-950 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className={cx(
              'w-14 h-14 rounded-2xl grid place-items-center text-white shadow-lg',
              'bg-gradient-to-br', theme.headerFrom, theme.headerTo,
            )}>
              <Icon size={26} />
            </div>
            <div className={cx('w-8 h-8 rounded-full border-2 border-transparent animate-spin border-t-current', theme.accentText)} />
            <span className="text-xs text-ink-500 dark:text-ink-400">{task.name}</span>
          </div>
        </div>
      )}

      {/* Fallback offline après 5s */}
      {offline && (
        <OfflineScreen src={baseUrl} onRetry={reload} theme={theme} name={task.name} />
      )}

      {/* Dock flottant */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <AnimatePresence mode="wait">
          {dockOpen ? (
            <motion.div
              key="dock"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-1 p-1.5
                         bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl
                         border border-ink-200/70 dark:border-ink-700/70
                         rounded-2xl shadow-2xl"
            >
              <Link to="/" title="Back to portal"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                           text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <ArrowLeft size={15} /> Portal
              </Link>

              <span className="w-px h-6 bg-ink-200 dark:bg-ink-700" />

              <div className={cx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold',
                status === 'online'   ? 'text-emerald-700 dark:text-emerald-300'
                : status === 'offline' ? 'text-rose-700 dark:text-rose-300'
                : 'text-amber-700 dark:text-amber-300',
              )}>
                <span className={cx(
                  'w-2 h-2 rounded-full',
                  status === 'online'  ? 'bg-emerald-500'
                  : status === 'offline' ? 'bg-rose-500'
                  : 'bg-amber-500',
                  status === 'checking' && 'animate-pulse',
                )} />
                <Icon size={13} className={theme.accentText} />
                <span className="text-ink-700 dark:text-ink-200">{task.name}</span>
              </div>

              <span className="w-px h-6 bg-ink-200 dark:bg-ink-700" />

              <button onClick={reload} title="Reload"
                className="grid place-items-center w-9 h-9 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <RefreshCw size={15} />
              </button>
              <button onClick={openTab} title="Open in new tab"
                className="grid place-items-center w-9 h-9 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <ExternalLink size={15} />
              </button>
              <button onClick={() => setDockOpen(false)} title="Hide dock"
                className="grid place-items-center w-9 h-9 rounded-xl text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors">
                <ChevronUp size={15} className="rotate-180" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="pill"
              onClick={() => setDockOpen(true)}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto grid place-items-center w-10 h-10 rounded-full
                         bg-white/90 dark:bg-ink-900/90 backdrop-blur-xl
                         border border-ink-200/70 dark:border-ink-700/70 shadow-2xl
                         text-ink-600 dark:text-ink-300 hover:bg-white dark:hover:bg-ink-800"
              title="Show dock"
            >
              <ChevronUp size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function OfflineScreen({ src, onRetry, theme, name }) {
  const port = (() => { try { return new URL(src).port } catch { return '?' } })()
  return (
    <div className="absolute inset-0 grid place-items-center p-8 bg-white dark:bg-ink-950">
      <div className="max-w-md text-center">
        <div className={cx(
          'mx-auto w-20 h-20 rounded-3xl grid place-items-center text-white mb-6 shadow-2xl',
          'bg-gradient-to-br', theme.headerFrom, theme.headerTo,
        )}>
          <RefreshCw size={32} />
        </div>
        <h3 className="text-2xl font-bold text-ink-900 dark:text-white">{name} ne répond pas</h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Aucune réponse de <code className="font-mono">{src}</code> après 5 s.
        </p>
        <pre className="mt-5 text-left text-xs font-mono bg-ink-100 dark:bg-ink-900
                        text-ink-700 dark:text-ink-200 rounded-xl p-4 overflow-x-auto">
{`# Vérifie que ce service tourne sur le port :${port}
# Pour tout démarrer d'un coup :
integration\\start_all.bat`}
        </pre>
        <button
          onClick={onRetry}
          className={cx(
            'mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg',
            'bg-gradient-to-r', theme.headerFrom, theme.headerTo,
            'hover:opacity-90 transition-opacity',
          )}
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    </div>
  )
}
