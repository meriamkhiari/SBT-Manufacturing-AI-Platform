import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/AuthContext'

export default function LoginModern() {
  const { login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await login(email, password)
      toast.success(`Welcome back, ${u.fullname || u.email}`)
      const dest = loc.state?.from || '/'
      nav(dest, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-12 flex-col justify-between relative overflow-hidden"
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M7 8h4M7 12h6" />
                <circle cx="17" cy="9" r="2.2" fill="currentColor" stroke="none" opacity=".5" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-black text-white">SBT Vision</div>
              <div className="text-xs font-semibold text-blue-100 tracking-widest uppercase">Smart Brain Technologie</div>
            </div>
          </div>

          <h1 className="text-5xl font-black text-white mb-6 leading-tight">
            Industrial Intelligence<br />Platform
          </h1>
          <p className="text-xl text-blue-100 leading-relaxed max-w-md">
            Advanced AI-powered quality control and connector management system for modern manufacturing.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <Feature icon="🔍" text="Real-time defect detection with AI vision" />
          <Feature icon="⚡" text="Automated quality control pipeline" />
          <Feature icon="📊" text="Comprehensive analytics dashboard" />
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 grid place-items-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M7 8h4M7 12h6" />
                <circle cx="17" cy="9" r="2.2" fill="currentColor" stroke="none" opacity=".5" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                SBT Vision
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">
              Welcome back
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Sign in to access your industrial workspace
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-5">
            <InputField
              icon={Mail}
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@sbt.com"
              required
              autoFocus
            />

            <InputField
              icon={Lock}
              label="Password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                <span className="text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => toast('Contact your administrator to reset your password.', { icon: 'ℹ️' })}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline transition-all"
              >
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
              {busy ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              <span className="relative">{busy ? 'Signing in…' : 'Sign in'}</span>
              {!busy && (
                <ArrowRight
                  size={18}
                  className="relative transition-transform group-hover:translate-x-1"
                />
              )}
            </motion.button>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-neutral-50 dark:bg-neutral-950 px-3 text-neutral-400 font-semibold">
                  or
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
              New to SBT?{' '}
              <Link
                to="/signup"
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all"
              >
                Create your account
              </Link>
            </p>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="font-bold text-neutral-900 dark:text-neutral-200 mb-1">
                    Demo Credentials
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Admin:</span>{' '}
                      <code className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 font-mono text-xs">
                        admin@sbt.com
                      </code>
                      {' / '}
                      <code className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 font-mono text-xs">
                        admin123
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-neutral-400">
            <p>© 2026 Smart Brain Technologie. All rights reserved.</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function InputField({ icon: Icon, label, rightIcon, ...inputProps }) {
  const [focused, setFocused] = useState(false)

  return (
    <div>
      <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-xl border-2 transition-all bg-white dark:bg-neutral-900 ${
          focused
            ? 'border-blue-500 shadow-lg shadow-blue-500/10'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        <Icon
          size={18}
          className={`absolute left-4 transition-colors ${
            focused ? 'text-blue-500' : 'text-neutral-400'
          }`}
        />
        <input
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-12 pr-12 py-3 bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
        />
        {rightIcon && <div className="absolute right-4">{rightIcon}</div>}
      </div>
    </div>
  )
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-white">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}
