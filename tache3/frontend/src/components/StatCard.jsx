import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import clsx from 'clsx'

const CONFIG = {
  blue:   { accent: 'border-t-4 border-primary-500', icon: 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400', value: 'text-primary-700 dark:text-primary-300', shadow: 'shadow-primary-100 dark:shadow-primary-900/20' },
  green:  { accent: 'border-t-4 border-emerald-500', icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300', shadow: 'shadow-emerald-100 dark:shadow-emerald-900/20' },
  amber:  { accent: 'border-t-4 border-amber-500',   icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',         value: 'text-amber-700 dark:text-amber-300',   shadow: 'shadow-amber-100 dark:shadow-amber-900/20' },
  red:    { accent: 'border-t-4 border-red-500',     icon: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',                 value: 'text-red-700 dark:text-red-300',       shadow: 'shadow-red-100 dark:shadow-red-900/20' },
  purple: { accent: 'border-t-4 border-violet-500',  icon: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400',     value: 'text-violet-700 dark:text-violet-300', shadow: 'shadow-violet-100 dark:shadow-violet-900/20' },
}

function AnimatedNumber({ target }) {
  const count    = useMotionValue(0)
  const rounded  = useTransform(count, v => Math.round(v))

  useEffect(() => {
    if (target == null || isNaN(target)) return
    const controls = animate(count, target, { duration: 0.9, ease: 'easeOut' })
    return controls.stop
  }, [target])

  if (target == null) return <span>—</span>

  return <motion.span>{rounded}</motion.span>
}

export default function StatCard({ icon: Icon, value, label, color = 'blue', delay = 0 }) {
  const cfg = CONFIG[color] || CONFIG.blue

  return (
    <motion.div
      className={clsx('card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-md', cfg.accent, cfg.shadow)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', cfg.icon)}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className={clsx('text-2xl sm:text-3xl font-black leading-none', cfg.value)}>
          <AnimatedNumber target={typeof value === 'number' ? value : null} />
          {typeof value !== 'number' && (value ?? '—')}
        </div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider truncate">
          {label}
        </div>
      </div>
    </motion.div>
  )
}
