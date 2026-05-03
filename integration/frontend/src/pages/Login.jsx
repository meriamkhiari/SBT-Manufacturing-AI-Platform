import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

export default function Login() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const nav       = useNavigate()
  const loc       = useLocation()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy,     setBusy]     = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u    = await login(email, password)
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
    <AuthLayout title="Sign in to your account" subtitle="Enter your credentials to access the SBT industrial workspace.">
      {/* Theme Toggle Button */}
      <motion.button
        type="button"
        onClick={toggle}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl bg-white dark:bg-ink-900 border-2 border-slate-200 dark:border-ink-700 hover:border-slate-300 dark:hover:border-ink-600 text-slate-600 dark:text-slate-300 transition-all shadow-lg hover:shadow-xl"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      <form onSubmit={submit} className="space-y-5">
        <Field
          icon={Mail}
          label="E-mail address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
          placeholder="you@sbt.com"
        />

        <Field
          icon={Lock}
          label="Password"
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          right={
            <button type="button" onClick={() => setShowPwd(s => !s)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            />
            <span className="text-slate-600 dark:text-slate-400">Remember me</span>
          </label>
          <button type="button" onClick={() => toast('Contact your administrator to reset your password.', { icon: 'ℹ️' })} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Forgot password?
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.98 }}
          className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 rounded-2xl shadow-xl shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
        >
          <span className="absolute inset-0 bg-white/20 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" aria-hidden="true" />
          {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          <span>{busy ? 'Signing in…' : 'Sign in'}</span>
          {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
        </motion.button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-ink-800" /></div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider"><span className="bg-white dark:bg-ink-950 px-3 text-slate-400">or</span></div>
        </div>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          New to SBT?{' '}
          <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
            Create your account
          </Link>
        </p>

        <div className="mt-6 px-4 py-3 rounded-xl bg-slate-50 dark:bg-ink-900/50 border border-slate-200 dark:border-ink-800 text-xs text-slate-500 dark:text-slate-400 text-center">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Demo admin:</span>{' '}
          <code className="font-mono text-slate-700 dark:text-slate-200">admin@sbt.com</code>
          {' / '}
          <code className="font-mono text-slate-700 dark:text-slate-200">admin123</code>
        </div>
      </form>
    </AuthLayout>
  )
}

function Field({ icon: Icon, label, right, ...inputProps }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em] mb-2">{label}</label>
      <div className={`relative flex items-center rounded-2xl border-2 transition-all bg-white dark:bg-ink-900 ${
        focused
          ? 'border-blue-500 shadow-lg shadow-blue-500/10'
          : 'border-slate-200 dark:border-ink-800 hover:border-slate-300 dark:hover:border-ink-700'
      }`}>
        <Icon size={16} className={`absolute left-4 transition-colors ${focused ? 'text-blue-500' : 'text-slate-400'}`} />
        <input
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          className="w-full pl-11 pr-11 py-3 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
        {right && <div className="absolute right-3">{right}</div>}
      </div>
    </div>
  )
}
