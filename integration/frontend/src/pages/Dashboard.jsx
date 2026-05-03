import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { Activity, BarChart3, RefreshCw, Server } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchTasks, fetchStatus, fetchMetrics, fetchHealth } from '../lib/api'
import { Badge, Button, Card, FadeIn, PageHeader, Skeleton, StatusDot } from '../components/ui'

export default function Dashboard() {
  const [tasks, setTasks] = useState(null)
  const [status, setStatus] = useState({})
  const [metrics, setMetrics] = useState({})
  const [health, setHealth] = useState(null)
  const [reloading, setReloading] = useState(false)

  const refresh = async (silent = false) => {
    if (!silent) setReloading(true)
    try {
      const [t, s, m, h] = await Promise.all([
        fetchTasks(), fetchStatus(), fetchMetrics(), fetchHealth(),
      ])
      setTasks(t); setStatus(s); setMetrics(m); setHealth(h)
      if (!silent) toast.success('Dashboard refreshed')
    } catch {
      if (!silent) toast.error('Gateway unreachable')
    } finally {
      if (!silent) setReloading(false)
    }
  }

  useEffect(() => {
    refresh(true)
    const i = setInterval(() => refresh(true), 10000)
    return () => clearInterval(i)
  }, [])

  const onlineCount = Object.values(status).filter(s => s.backend === 'online').length
  const total = tasks?.length ?? 0

  return (
    <FadeIn>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of every integrated task and gateway health."
        actions={
          <Button onClick={() => refresh()} loading={reloading} variant="secondary">
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Server}    label="Gateway"  value={health ? 'online' : '—'}
              tone={health ? 'online' : 'offline'} />
        <Stat icon={Activity}  label="Online tasks"  value={`${onlineCount} / ${total}`} />
        <Stat icon={BarChart3} label="Total tasks"   value={total} />
        <Stat icon={Activity}  label="Version"       value={health?.version ?? '—'} mono />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-ink-900 dark:text-white mb-4">Service status</h3>
          {!tasks ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <ul className="divide-y divide-ink-200 dark:divide-ink-800">
              {tasks.map(t => {
                const Icon = Icons[t.icon] || Icons.Box
                const st = status[t.id]?.backend ?? 'checking'
                const tone = st === 'online' ? 'online' : st === 'offline' ? 'offline' : 'warn'
                return (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <Link to={`/${t.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <span className="w-9 h-9 rounded-xl grid place-items-center text-white"
                            style={{ background: t.color }}>
                        <Icon size={16} />
                      </span>
                      <div>
                        <div className="font-semibold text-ink-900 dark:text-white">{t.short_name}</div>
                        <div className="text-xs text-ink-500 dark:text-ink-400 font-mono">
                          {t.backend_url}
                        </div>
                      </div>
                    </Link>
                    <Badge tone={tone}><StatusDot state={st} /> {st}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-ink-900 dark:text-white mb-4">Aggregated metrics</h3>
          {!Object.keys(metrics).length ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(metrics).map(([tid, m]) => {
                const t = tasks?.find(x => x.id === tid)
                return (
                  <div key={tid}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-ink-800 dark:text-ink-100 text-sm">
                        {t?.short_name ?? tid}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(m).map(([k, v]) => (
                        <div key={k}
                             className="flex justify-between text-sm rounded-xl px-3 py-2
                                        bg-ink-50 dark:bg-ink-800/60">
                          <span className="text-ink-500 dark:text-ink-400 capitalize truncate">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-ink-900 dark:text-white">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </FadeIn>
  )
}

function Stat({ icon: Icon, label, value, tone, mono }) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <div className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wide">{label}</div>
        <div className={`text-xl font-bold text-ink-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40
                      grid place-items-center text-primary-600 dark:text-primary-300">
        <Icon size={18} />
      </div>
      {tone && <span className="sr-only">{tone}</span>}
    </Card>
  )
}
