import { useEffect, useRef, useState } from 'react'
import { ExternalLink, RefreshCw, Maximize2, ServerCrash } from 'lucide-react'
import { Button, Skeleton } from './ui'

export default function IframePanel({ src, title, online }) {
  const ref = useRef(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => { setLoading(true); setHasLoaded(false) }, [reloadKey, src])

  // Sticky-online: if the iframe loaded once, ignore transient offline blips.
  const showOffline = online === false && !hasLoaded

  const reload = () => setReloadKey(k => k + 1)
  const openTab = () => window.open(src, '_blank', 'noopener')
  // Cache-buster: change on every mount + on every reload click.
  const bustedSrc = src + (src.includes('?') ? '&' : '?') + '_=' + reloadKey + '_' + Date.now()
  const fullscreen = () => ref.current?.requestFullscreen?.()

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-ink-800
                      bg-ink-50/60 dark:bg-ink-900/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <code className="ml-3 text-xs text-ink-500 dark:text-ink-400 truncate">{src}</code>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={reload} className="!px-2 !py-1.5">
            <RefreshCw size={14} />
          </Button>
          <Button variant="ghost" onClick={fullscreen} className="!px-2 !py-1.5">
            <Maximize2 size={14} />
          </Button>
          <Button variant="ghost" onClick={openTab} className="!px-2 !py-1.5">
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>

      <div className="relative bg-white dark:bg-ink-950"
           style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
        {showOffline ? (
          <OfflineState src={src} onRetry={reload} />
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 p-6 space-y-3">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}
            <iframe
              key={reloadKey}
              ref={ref}
              src={bustedSrc}
              title={title}
              onLoad={() => { setLoading(false); setHasLoaded(true) }}
              className="w-full h-full border-0"
            />
          </>
        )}
      </div>
    </div>
  )
}

function OfflineState({ src, onRetry }) {
  const port = (() => { try { return new URL(src).port } catch { return '?' } })()
  return (
    <div className="absolute inset-0 grid place-items-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30
                        grid place-items-center text-rose-600 dark:text-rose-300 mb-4">
          <ServerCrash size={26} />
        </div>
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
          Service offline
        </h3>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          Nothing is listening on <code className="font-mono">{src}</code>.
          Start the upstream task to load its UI and database here.
        </p>
        <pre className="mt-4 text-left text-xs font-mono bg-ink-100 dark:bg-ink-900
                        text-ink-700 dark:text-ink-200 rounded-xl p-3 overflow-x-auto">
{`# from the project root
cd tache?  &&  python app.py    # listens on :${port}`}
        </pre>
        <Button variant="primary" onClick={onRetry} className="mt-5">
          <RefreshCw size={14} /> Retry
        </Button>
      </div>
    </div>
  )
}
