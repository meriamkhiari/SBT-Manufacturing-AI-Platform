import clsx from 'clsx'
import { motion } from 'framer-motion'

export default function StatCard({ icon: Icon, label, value, sub, tone = 'primary', delay = 0 }) {
  const TONES = {
    primary: 'from-primary-100 to-primary-50  text-primary-700 dark:from-primary-900/30 dark:to-primary-900/10 dark:text-primary-300',
    rose:    'from-rose-100   to-rose-50     text-rose-700    dark:from-rose-900/30   dark:to-rose-900/10   dark:text-rose-300',
    amber:   'from-amber-100  to-amber-50    text-amber-700   dark:from-amber-900/30  dark:to-amber-900/10  dark:text-amber-300',
    emerald: 'from-emerald-100 to-emerald-50 text-emerald-700 dark:from-emerald-900/30 dark:to-emerald-900/10 dark:text-emerald-300',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.25 }}
      className="card p-4 sm:p-5 flex items-center gap-4"
    >
      <div className={clsx('w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br', TONES[tone])}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</div>
        <div className="text-xl sm:text-2xl font-bold text-ink-900 dark:text-white tabular-nums">{value}</div>
        {sub && <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  )
}
