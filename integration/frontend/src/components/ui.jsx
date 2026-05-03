import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

export function Button({ variant = 'primary', loading, children, className = '', ...rest }) {
  const v = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost' }[variant]
  return (
    <button className={cx(v, className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Card({ children, className = '', as: As = 'div', ...rest }) {
  return (
    <As className={cx('card p-6', className)} {...rest}>
      {children}
    </As>
  )
}

export function Badge({ tone = 'neutral', children, className = '' }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
    online:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    offline: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    warn:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    info:    'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    accent:  'bg-accent-500/15 text-accent-600 dark:text-accent-400',
  }
  return <span className={cx('badge', tones[tone], className)}>{children}</span>
}

export function StatusDot({ state }) {
  const c = {
    online:  'bg-emerald-500',
    offline: 'bg-rose-500',
    degraded:'bg-amber-500',
  }[state] || 'bg-ink-400'
  return <span className={cx('inline-block w-2.5 h-2.5 rounded-full pulse-dot', c)} />
}

export function Skeleton({ className = '' }) {
  return <div className={cx('animate-pulse rounded-xl bg-ink-200 dark:bg-ink-800', className)} />
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="card p-10 text-center">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/40
                        flex items-center justify-center text-primary-600 dark:text-primary-300 mb-4">
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
      {message && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
