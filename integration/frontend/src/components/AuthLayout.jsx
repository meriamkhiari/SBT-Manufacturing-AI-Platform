import { motion } from 'framer-motion'
import { Cpu, ScanSearch, Network, Sparkles } from 'lucide-react'

/**
 * Premium split-panel auth layout — branded gradient on the left,
 * form on the right. Inspired by Stripe / Notion / Linear sign-in.
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-stretch bg-slate-100 dark:bg-ink-950">
      {/* ── Left brand panel ────────────────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex relative w-[42%] xl:w-[38%] flex-col justify-between p-12 text-white overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500"
      >
        {/* Decorative wave (right edge curve like the Spacer mockup) */}
        <svg
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          className="absolute top-0 right-0 h-full w-24 text-white dark:text-ink-950"
          aria-hidden="true"
        >
          <path
            d="M0,0 Q60,200 20,400 T0,800 L100,800 L100,0 Z"
            fill="currentColor"
            opacity="0.97"
          />
        </svg>
        <svg
          viewBox="0 0 100 800"
          preserveAspectRatio="none"
          className="absolute top-0 right-6 h-full w-24 text-white/20"
          aria-hidden="true"
        >
          <path d="M0,0 Q60,200 20,400 T0,800 L100,800 L100,0 Z" fill="currentColor" />
        </svg>

        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl" />

        {/* Top — brand */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm grid place-items-center shadow-2xl shadow-blue-900/40 ring-1 ring-white/30">
              <Sparkles size={22} />
            </div>
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.25em] text-blue-100/80 font-semibold">Welcome to</div>
              <div className="text-2xl font-extrabold tracking-tight">SBT Portal</div>
            </div>
          </div>
          <p className="text-blue-100/90 text-sm max-w-xs leading-relaxed">
            Smart Brain Technologie — industrial intelligence platform for quality control,
            visual inspection and B2B prospecting.
          </p>
        </div>

        {/* Middle — feature pills */}
        <div className="relative z-10 space-y-3 max-w-xs">
          <Pill icon={Cpu}        title="SBT Vision"       desc="Connector quality control" />
          <Pill icon={ScanSearch} title="QualityVision A2A" desc="Visual defect detection" />
          <Pill icon={Network}    title="SBT Intelligence"  desc="B2B prospecting graph" />
        </div>

        {/* Bottom — credit */}
        <div className="relative z-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-blue-100/70">
          <span><span className="font-bold text-white">Token Thieves</span> · 2026</span>
          <span>v 2.0</span>
        </div>
      </motion.aside>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 relative">
        {/* Mobile background gradient (since the side panel is hidden on small screens) */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="relative w-full max-w-md"
        >
          {/* Mobile-only mini brand */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 grid place-items-center text-white shadow-lg shadow-blue-500/40">
              <Sparkles size={18} />
            </div>
            <span className="font-extrabold text-ink-900 dark:text-white text-lg">SBT Portal</span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">{subtitle}</p>
            )}
          </div>

          {children}
        </motion.div>
      </main>
    </div>
  )
}

function Pill({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-blue-900/20">
      <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[11px] text-blue-100/80">{desc}</div>
      </div>
    </div>
  )
}
