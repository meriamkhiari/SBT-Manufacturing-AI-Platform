import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Users, ShieldCheck, Activity, Network, AlertCircle,
  CheckCircle2, BarChart3, UserCheck, Clock, Cpu, ScanSearch,
  Sparkles, Building2, Database, Wifi, Layers, GitBranch, Zap, Globe,
  TrendingUp, Award, Target, Rocket, Mail, Phone, MapPin, Calendar,
  FileText, Settings, Bell, Heart, Star, Briefcase, Code, Headphones,
} from 'lucide-react'
import { api, fetchTasks, fetchStatus } from '../lib/api'
import { Card, FadeIn, Skeleton } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import AnimatedNumber from '../components/AnimatedNumber'

export default function AdminHome() {
  const { user } = useAuth()
  const [tasks,  setTasks]  = useState(null)
  const [status, setStatus] = useState({})
  const [users,  setUsers]  = useState([])

  useEffect(() => {
    fetchTasks().then(setTasks).catch(() => setTasks([]))
    api.get('/auth/users').then(r => setUsers(r.data.users || [])).catch(() => setUsers([]))
    const tick = () => fetchStatus().then(setStatus).catch(() => {})
    tick()
    const i = setInterval(tick, 12000)
    return () => clearInterval(i)
  }, [])

  const onlineCount  = Object.values(status).filter(s => s.backend === 'online').length
  const totalCount   = tasks?.length ?? 0
  const pendingCount = users.filter(u => u.role === 'pending').length
  const adminCount   = users.filter(u => u.role === 'admin').length
  const empCount     = users.filter(u => u.role === 'employee').length

  return (
    <div className="space-y-8">
      {/* ─── Welcome banner (compact, blue) ─── */}
      <FadeIn>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-500 text-white p-7 sm:p-9 shadow-xl shadow-primary-500/20">
          <div aria-hidden className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div aria-hidden className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-white/30 to-transparent blur-3xl" />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-widest">
                <ShieldCheck size={12} /> Administrator workspace
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
                Hello {user?.fullname || user?.username}, welcome to your admin dashboard
              </h1>
              <p className="mt-3 text-primary-50/90 text-sm sm:text-base leading-relaxed">
                As an administrator, you have access to the SBT Intelligence platform for B2B prospecting and customer search.
                You can also manage users and approve new signups.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/task3" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-primary-50 transition-colors shadow-soft">
                <Network size={16} /> Open SBT Intelligence <ArrowRight size={14} />
              </Link>
              <Link to="/admin/users" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors backdrop-blur-sm">
                <Users size={14} /> Manage Users
                {pendingCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold">{pendingCount} waiting</span>
                )}
              </Link>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─── KPI strip ─── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users}       label="Total Users"        value={users.length}    sub="all accounts" />
          <KpiCard icon={Clock}       label="Pending Approval"   value={pendingCount}    sub={pendingCount === 0 ? 'nothing to do' : 'please approve'} alert={pendingCount > 0} />
          <KpiCard icon={ShieldCheck} label="Administrators"     value={adminCount}      sub="full access" />
          <KpiCard icon={UserCheck}   label="Employees"          value={empCount}        sub="standard access" />
        </div>
      </section>

      {/* ─── About admin role ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn className="lg:col-span-2">
          <Card className="p-6 h-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 grid place-items-center text-primary-600 dark:text-primary-400 shrink-0">
                <Sparkles size={22} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Administrator Access</div>
                <h2 className="text-lg font-bold text-ink-900 dark:text-white">Your Responsibilities</h2>
                <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
                  As an administrator, you manage the platform and users. You have exclusive access to the 
                  <strong> SBT Intelligence</strong> module for B2B prospecting and customer search. 
                  You can <strong>approve new users</strong>, <strong>assign roles</strong>, and 
                  <strong>manage the entire system</strong>.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <FeatureLine icon={UserCheck}   label="Approve new signups" />
                  <FeatureLine icon={ShieldCheck} label="Assign admin or employee roles" />
                  <FeatureLine icon={Network}     label="Access SBT Intelligence" />
                  <FeatureLine icon={Database}    label="View all system data" />
                  <FeatureLine icon={Activity}    label="Monitor system status" />
                  <FeatureLine icon={GitBranch}   label="Full platform control" />
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* Pending alert OR all-clear */}
        <FadeIn>
          {pendingCount > 0 ? (
            <Card className="p-6 h-full border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 grid place-items-center text-amber-600 mb-3">
                <AlertCircle size={22} />
              </div>
              <div className="text-lg font-bold text-ink-900 dark:text-white">{pendingCount} {pendingCount > 1 ? 'users waiting' : 'user waiting'}</div>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">New signups need your approval to access the platform.</p>
              <Link to="/admin/users" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors">
                Review now <ArrowRight size={14} />
              </Link>
            </Card>
          ) : (
            <Card className="p-6 h-full border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center text-emerald-600 mb-3">
                <CheckCircle2 size={22} />
              </div>
              <div className="text-lg font-bold text-ink-900 dark:text-white">All Clear</div>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">No pending approvals. All users are managed.</p>
              <Link to="/admin/users" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 font-semibold text-sm hover:bg-ink-50 transition-colors">
                View all users <ArrowRight size={14} />
              </Link>
            </Card>
          )}
        </FadeIn>
      </section>

      {/* ─── Service status - Only Task 3 ─── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">System Status</div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white">SBT Intelligence Platform</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Monitor the status of your B2B prospecting tool.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!tasks ? <Skeleton className="h-32" />
                  : tasks.filter(t => t.id === 'task3').map((t, i) => {
                      const state = status[t.id]?.backend || 'offline'
                      const stCls = state === 'online'   ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                  : state === 'degraded' ? 'text-amber-600  bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800'
                                                          : 'text-rose-600   bg-rose-50   dark:bg-rose-900/20   border-rose-200   dark:border-rose-800'
                      return (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                          <Card className="p-5 h-full hover:-translate-y-1 hover:shadow-lg transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 grid place-items-center text-primary-600 dark:text-primary-400">
                                  <Network size={20} />
                                </div>
                                <div>
                                  <div className="font-bold text-ink-900 dark:text-white">{t.short_name || t.name}</div>
                                  <div className="text-[10px] font-mono text-ink-500">{t.iframe_url}</div>
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${stCls}`}>
                                {state}
                              </span>
                            </div>
                            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400 leading-relaxed line-clamp-2">{t.description}</p>
                            <Link to={`/${t.id}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:gap-2 transition-all">
                              Open module <ArrowRight size={12} />
                            </Link>
                          </Card>
                        </motion.div>
                      )
                    })}
        </div>
      </section>

      {/* ─── Quick actions ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Quick Access</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Admin Tools</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard to="/task3"        icon={Network}    title="SBT Intelligence"    desc="B2B prospecting, Neo4j graph, customer scoring" />
          <ActionCard to="/admin/users"  icon={Users}      title="User Management"     desc="Approve signups, assign roles, manage access" />
        </div>
      </section>

      {/* ─── Platform Statistics ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Platform Insights</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Performance Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="System Uptime" value="99.8%" trend="+0.2%" color="emerald" />
          <StatCard icon={Award} label="Tasks Completed" value="1,247" trend="+156" color="blue" />
          <StatCard icon={Target} label="Accuracy Rate" value="97.3%" trend="+2.1%" color="purple" />
          <StatCard icon={Zap} label="Avg Response Time" value="1.2s" trend="-0.3s" color="amber" />
        </div>
      </section>

      {/* ─── Recent Activity ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Latest Updates</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Recent Activity</h2>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <ActivityItem 
              icon={UserCheck} 
              title="New user approved" 
              desc="Marie Dubois has been granted employee access"
              time="2 hours ago"
              color="emerald"
            />
            <ActivityItem 
              icon={Network} 
              title="SBT Intelligence updated" 
              desc="New competitor analysis features deployed"
              time="5 hours ago"
              color="blue"
            />
            <ActivityItem 
              icon={Settings} 
              title="System maintenance completed" 
              desc="All services are running optimally"
              time="1 day ago"
              color="purple"
            />
            <ActivityItem 
              icon={Bell} 
              title="Security update applied" 
              desc="Platform security patches installed successfully"
              time="2 days ago"
              color="amber"
            />
          </div>
        </Card>
      </section>

      {/* ─── Resources & Support ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Help & Resources</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Administrator Resources</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResourceCard 
            icon={FileText} 
            title="Documentation" 
            desc="Complete admin guide and API reference"
            link="#"
          />
          <ResourceCard 
            icon={Headphones} 
            title="Support Center" 
            desc="Get help from our technical team"
            link="#"
          />
          <ResourceCard 
            icon={Code} 
            title="Developer API" 
            desc="Integration guides and code examples"
            link="#"
          />
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="mt-16 pt-8 border-t border-ink-200 dark:border-ink-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 grid place-items-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="font-bold text-ink-900 dark:text-white">SBT Vision</span>
            </div>
            <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed mb-4">
              Smart Brain Technologie - Leading provider of AI-powered industrial quality control solutions.
            </p>
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500" />
              <span className="text-xs text-ink-500">Made with passion in Tunisia</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white mb-3 uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/task3" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">SBT Intelligence</Link></li>
              <li><Link to="/admin/users" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">User Management</Link></li>
              <li><Link to="/dashboard" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Analytics</Link></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Settings</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white mb-3 uppercase tracking-wider">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">API Reference</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Contact Support</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white mb-3 uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2 text-ink-600 dark:text-ink-400">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>Route Oum Hachem, Grombalia, Tunisia</span>
              </li>
              <li className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                <Mail size={14} className="shrink-0" />
                <a href="mailto:contact@sbt.tn" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">contact@sbt.tn</a>
              </li>
              <li className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                <Phone size={14} className="shrink-0" />
                <span>+216 XX XXX XXX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-ink-200 dark:border-ink-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-500 dark:text-ink-400">
            © {new Date().getFullYear()} Smart Brain Technologie. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-500 dark:text-ink-400">
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, alert }) {
  const numericValue = typeof value === 'number' ? value : null
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className={`p-5 transition-all hover:shadow-lg ${alert ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10 hover:border-amber-400' : 'hover:border-primary-200 dark:hover:border-primary-700'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl grid place-items-center shadow-sm ${alert ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-600' : 'bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-600 dark:text-primary-400'}`}>
            <Icon size={18} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400 flex-1">{label}</div>
        </div>
        <div className="mt-3 text-3xl font-extrabold text-ink-900 dark:text-white tracking-tight tabular-nums">
          {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
        </div>
        <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{sub}</div>
      </Card>
    </motion.div>
  )
}

function FeatureLine({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
      <Icon size={14} className="text-primary-500 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

function ActionCard({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="group block">
      <Card className="p-5 h-full hover:-translate-y-1 hover:shadow-lg transition-all border-primary-100 dark:border-primary-900/30 hover:border-primary-300 dark:hover:border-primary-700">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 grid place-items-center mb-3 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
          <Icon size={22} />
        </div>
        <div className="font-bold text-ink-900 dark:text-white">{title}</div>
        <div className="text-xs text-ink-500 dark:text-ink-400 mt-1 leading-relaxed">{desc}</div>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
          Open <ArrowRight size={12} />
        </div>
      </Card>
    </Link>
  )
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>
      </div>
      <div className="text-2xl font-extrabold text-ink-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wider">{label}</div>
    </Card>
  )
}

function ActivityItem({ icon: Icon, title, desc, time, color }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-ink-100 dark:border-ink-800 last:border-0 last:pb-0">
      <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-ink-900 dark:text-white">{title}</div>
        <div className="text-xs text-ink-600 dark:text-ink-400 mt-0.5">{desc}</div>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-400">
          <Clock size={10} />
          <span>{time}</span>
        </div>
      </div>
    </div>
  )
}

function ResourceCard({ icon: Icon, title, desc, link }) {
  return (
    <a href={link} className="group block">
      <Card className="p-5 h-full hover:-translate-y-1 hover:shadow-lg transition-all hover:border-primary-300 dark:hover:border-primary-700">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 grid place-items-center mb-3 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
          <Icon size={22} />
        </div>
        <div className="font-bold text-ink-900 dark:text-white mb-1">{title}</div>
        <div className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{desc}</div>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
          Learn more <ArrowRight size={12} />
        </div>
      </Card>
    </a>
  )
}
