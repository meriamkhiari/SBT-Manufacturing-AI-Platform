import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Lock, User, Loader2, Eye, EyeOff, ArrowRight, Clock, Check, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

export default function Signup() {
  const { signup } = useAuth()
  const { theme, toggle } = useTheme()
  const nav        = useNavigate()
  const [form,    setForm]    = useState({ fullname: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [terms,   setTerms]   = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [done,    setDone]    = useState(false)

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Password strength
  const strength = scorePassword(form.password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] || ''
  const strengthColor = ['bg-slate-200', 'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-500'][strength] || 'bg-slate-200'

  const submit = async (e) => {
    e.preventDefault()
    if (!terms)                          return toast.error('Please accept the Terms and Conditions')
    if (form.password !== form.confirm)  return toast.error('Passwords do not match')
    if (form.password.length < 6)        return toast.error('Password must be at least 6 characters')

    setBusy(true)
    try {
      await signup({
        email:    form.email,
        username: form.email,
        password: form.password,
        fullname: form.fullname,
      })
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Account created" subtitle="Your SBT Portal account is awaiting administrator approval.">
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

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 mb-6 ring-4 ring-amber-50 dark:ring-amber-900/20">
            <Clock size={36} />
          </div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Awaiting approval</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
            An administrator will review and assign you a role (employee or admin) before you can access the workspace.
          </p>
          <button
            onClick={() => nav('/login')}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
          >
            Back to sign in
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join the SBT industrial intelligence platform.">
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

      <form onSubmit={submit} className="space-y-4">
        <Field icon={User} label="Full name" value={form.fullname} onChange={upd('fullname')} placeholder="Jane Doe" required autoFocus />
        <Field icon={Mail} label="E-mail address" type="email" value={form.email} onChange={upd('email')} placeholder="you@company.com" required />

        <div>
          <Field
            icon={Lock}
            label="Password"
            type={showPwd ? 'text' : 'password'}
            value={form.password}
            onChange={upd('password')}
            placeholder="At least 6 characters"
            required
            right={
              <button type="button" onClick={() => setShowPwd(s => !s)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-slate-200 dark:bg-ink-800'}`} />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 w-12 text-right">{strengthLabel}</span>
            </div>
          )}
        </div>

        <Field
          icon={Lock}
          label="Confirm password"
          type={showPwd ? 'text' : 'password'}
          value={form.confirm}
          onChange={upd('confirm')}
          placeholder="Repeat your password"
          required
          right={
            form.confirm && form.confirm === form.password ? (
              <span className="text-emerald-500"><Check size={16} /></span>
            ) : null
          }
        />

        <label className="flex items-start gap-2 text-sm cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={terms}
            onChange={e => setTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
          />
          <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
            By signing up, I agree with{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Terms &amp; Conditions</a>
          </span>
        </label>

        <div className="flex gap-3 pt-2">
          <motion.button
            type="submit"
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className="group relative flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-3 rounded-2xl shadow-xl shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/20 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" aria-hidden="true" />
            {busy ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            <span>{busy ? 'Creating…' : 'Sign Up'}</span>
          </motion.button>

          <Link
            to="/login"
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-ink-900 hover:bg-slate-50 dark:hover:bg-ink-800 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-2xl border-2 border-slate-200 dark:border-ink-700 transition-all"
          >
            Sign In
          </Link>
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

function scorePassword(pwd) {
  if (!pwd) return 0
  let s = 0
  if (pwd.length >= 6)              s++
  if (pwd.length >= 10)             s++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) s++
  return Math.min(s, 4)
}
