import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ShieldCheck, UserCheck, Clock, Trash2, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const ROLE_META = {
  admin:    { label: 'Admin',    icon: ShieldCheck, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  employee: { label: 'Employee', icon: UserCheck,   cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  pending:  { label: 'Pending',  icon: Clock,       cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700' },
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/auth/users')
      setUsers(r.data.users || [])
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const setRole = async (id, role) => {
    try {
      await api.put(`/auth/users/${id}/role`, { role })
      toast.success(`Role updated → ${role}`)
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed')
    }
  }

  const remove = async (id, email) => {
    if (!confirm(`Delete account ${email}?`)) return
    try {
      await api.delete(`/auth/users/${id}`)
      toast.success('User deleted')
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white flex items-center gap-2"><Users size={22} /> User Management</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Approve pending signups and manage roles.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-sm hover:bg-ink-50 dark:hover:bg-ink-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-ink-900 rounded-2xl border border-ink-200 dark:border-ink-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <span className="text-sm text-ink-500">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 text-primary-600 dark:text-primary-400 mb-4">
              <Users size={28} />
            </div>
            <h3 className="font-bold text-ink-900 dark:text-white">No users yet</h3>
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Once people sign up, they will appear here for you to approve.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-ink-800/50 dark:to-ink-800/30 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400 border-b border-ink-200 dark:border-ink-800">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {users.map((u, i) => {
                  const meta = ROLE_META[u.role] || ROLE_META.pending
                  const Icon = meta.icon
                  const isMe = u.id === me?.id
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-gradient-to-r hover:from-primary-50/40 hover:to-transparent dark:hover:from-primary-900/10 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full grid place-items-center font-bold text-white text-sm bg-gradient-to-br from-primary-500 to-accent-500 shadow-sm shrink-0">
                            {(u.fullname || u.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <div className="font-semibold text-ink-900 dark:text-white">{u.fullname || u.username}</div>
                            {isMe && <div className="text-[10px] uppercase tracking-wider text-primary-600 dark:text-primary-400 font-bold">You</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-ink-600 dark:text-ink-400 font-mono text-xs">{u.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${meta.cls}`}>
                          <Icon size={12} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role}
                            disabled={isMe}
                            onChange={e => setRole(u.id, e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 font-semibold text-ink-700 dark:text-ink-200 disabled:opacity-50 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => remove(u.id, u.email)}
                            disabled={isMe}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
