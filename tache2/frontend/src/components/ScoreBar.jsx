import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function ScoreBar({ value = 0, label, severity = 'low', className = '', showPercentage = false }) {
  const pct = Math.round(value * 100)
  const TONE = {
    high:   'from-rose-500    to-rose-400    dark:from-rose-600    dark:to-rose-500',
    medium: 'from-amber-500   to-amber-400   dark:from-amber-600   dark:to-amber-500',
    low:    'from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500',
  }[severity] || 'from-primary-500 to-primary-400 dark:from-primary-600 dark:to-primary-500'

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-ink-500 dark:text-ink-400 font-medium">{label}</span>
          <span className="font-mono font-bold text-ink-700 dark:text-ink-200">{pct}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={clsx('h-full rounded-full bg-gradient-to-r', TONE)}
        />
        {showPercentage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">
              {pct}%
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
