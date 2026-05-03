import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Cpu, ScanSearch, Activity, Wifi, Sparkles, Target,
  Zap, ShieldCheck, Workflow, FileText, Eye, CheckCircle2,
  Clock, Layers, GitBranch, BookOpen, Lightbulb, TrendingUp,
  Award, Heart, Mail, Phone, MapPin, Building2, Headphones,
  Star, Users, BarChart3, Calendar,
} from 'lucide-react'
import { fetchTasks, fetchStatus } from '../lib/api'
import { Card, FadeIn, Skeleton } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import AnimatedNumber from '../components/AnimatedNumber'

export default function EmployeeHome() {
  const { user } = useAuth()
  const [tasks,  setTasks]  = useState(null)
  const [status, setStatus] = useState({})

  useEffect(() => {
    fetchTasks().then(setTasks).catch(() => setTasks([]))
    const tick = () => fetchStatus().then(setStatus).catch(() => {})
    tick()
    const i = setInterval(tick, 12000)
    return () => clearInterval(i)
  }, [])

  const allowedTasks = (tasks || []).filter(t => t.id !== 'task3')
  const onlineCount  = allowedTasks.filter(t => status[t.id]?.backend === 'online').length

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
                <Sparkles size={12} /> Employee workspace
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome {user?.fullname || user?.username}, ready to start your inspection?
              </h1>
              <p className="mt-3 text-primary-50/90 text-sm sm:text-base leading-relaxed">
                Two tools are ready for you. The first checks the wiring of electrical
                connectors. The second looks for defects on the painted boxes coming
                off the production line. Pick one below to begin.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/task1" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-primary-50 transition-colors shadow-soft">
                <Cpu size={16} /> Open SBT Vision <ArrowRight size={14} />
              </Link>
              <Link to="/task2" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors backdrop-blur-sm">
                <ScanSearch size={14} /> Open QualityVision
              </Link>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ─── KPI strip ─── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Layers}      label="Tools available"  value={allowedTasks.length || 2} sub="ready to use" />
          <KpiCard icon={Wifi}        label="Tools online"     value={`${onlineCount} / ${allowedTasks.length || 2}`} sub="up and running" />
          <KpiCard icon={Workflow}    label="Average check"    value="< 30 s"                   sub="per inspection" />
          <KpiCard icon={ShieldCheck} label="Your access"      value="Employee"                 sub="inspection tools" />
        </div>
      </section>

      {/* ─── Modules detailed ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Your tools</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Two simple tools to do your job</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 max-w-3xl">
            Each tool handles one type of check. Click the one you need, follow the
            steps on the screen, and you get a clear result in a few seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ModuleCard
            to="/task1"
            icon={Cpu}
            title="SBT Vision"
            tagline="Check the wiring of a connector"
            description="Upload a photo of the connector and the official wiring diagram (PDF). The tool tells you whether the wires are placed in the correct order and the right colours. Useful before sending a part to the next step."
            features={[
              { icon: FileText,     label: 'Reads the diagram from a PDF' },
              { icon: Eye,          label: 'Looks at the photo of the part' },
              { icon: CheckCircle2, label: 'Says if everything is correct' },
              { icon: Clock,        label: 'Keeps a history of every check' },
            ]}
            state={status.task1?.backend}
          />

          <ModuleCard
            to="/task2"
            icon={ScanSearch}
            title="QualityVision"
            tagline="Find defects on a painted box"
            description="Take a picture of a painted electrical box. The tool spots scratches, dents, dust marks or paint flaws and tells you what is wrong, where, and how serious it is. Useful for the final visual control."
            features={[
              { icon: Eye,       label: 'Spots visible defects' },
              { icon: Lightbulb, label: 'Explains what it sees' },
              { icon: Target,    label: 'Scratches, dents, paint, dust' },
              { icon: GitBranch, label: 'Step-by-step decision' },
            ]}
            state={status.task2?.backend}
          />
        </div>
      </section>

      {/* ─── How it works ─── */}
      <FadeIn>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">How it works</div>
            <h3 className="text-lg font-bold text-ink-900 dark:text-white">Three simple steps</h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              Both tools work the same way. You give it a picture or a document,
              the tool checks it for you, and you get a clear answer in seconds.
              No need to read manuals — the screens guide you.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Step n={1} title="Upload"  desc="Drag your photo or PDF into the page." />
              <Step n={2} title="Wait"    desc="The tool checks it for a few seconds." />
              <Step n={3} title="Read"    desc="See the result, save it, or move on." />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border-primary-200 dark:border-primary-800/50">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-ink-900 grid place-items-center text-primary-600 dark:text-primary-400 mb-3 shadow-soft">
              <BookOpen size={22} />
            </div>
            <h3 className="font-bold text-ink-900 dark:text-white">Need help?</h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              Each tool shows tips while you use it. If something is unclear,
              ask your administrator — they can answer your questions and
              give you more access if needed.
            </p>
          </Card>
        </section>
      </FadeIn>

      {/* ─── Your Performance ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Your Stats</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Performance This Month</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PerformanceCard icon={CheckCircle2} label="Inspections" value="87" color="emerald" />
          <PerformanceCard icon={TrendingUp} label="Accuracy" value="96.5%" color="blue" />
          <PerformanceCard icon={Zap} label="Avg Time" value="28s" color="purple" />
          <PerformanceCard icon={Award} label="Quality Score" value="A+" color="amber" />
        </div>
      </section>

      {/* ─── Tips & Best Practices ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Pro Tips</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Best Practices for Quality Control</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TipCard 
            icon={Lightbulb}
            title="Good Lighting is Key"
            desc="Ensure proper lighting when taking photos. Natural light or bright LED works best for accurate defect detection."
          />
          <TipCard 
            icon={Target}
            title="Center Your Subject"
            desc="Keep the connector or box centered in the frame. This helps the AI analyze the entire surface area."
          />
          <TipCard 
            icon={Eye}
            title="Check Image Quality"
            desc="Make sure photos are clear and in focus. Blurry images can lead to missed defects or false positives."
          />
          <TipCard 
            icon={FileText}
            title="Review Results Carefully"
            desc="Always double-check the AI's findings. Your expertise combined with AI creates the best results."
          />
        </div>
      </section>

      {/* ─── Recent Activity ─── */}
      <section>
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Recent Work</div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">Your Latest Inspections</h2>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <InspectionItem 
              tool="SBT Vision"
              result="Pass"
              time="15 minutes ago"
              details="Connector wiring verified - all correct"
            />
            <InspectionItem 
              tool="QualityVision"
              result="Minor Issues"
              time="1 hour ago"
              details="Small scratch detected on painted surface"
            />
            <InspectionItem 
              tool="SBT Vision"
              result="Pass"
              time="2 hours ago"
              details="PDF diagram matched perfectly"
            />
            <InspectionItem 
              tool="QualityVision"
              result="Pass"
              time="3 hours ago"
              details="No defects found - excellent quality"
            />
          </div>
        </Card>
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
              Empowering quality control professionals with AI-powered inspection tools for electrical manufacturing.
            </p>
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500" />
              <span className="text-xs text-ink-500">Built for excellence</span>
            </div>
          </div>

          {/* Your Tools */}
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white mb-3 uppercase tracking-wider">Your Tools</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/task1" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">SBT Vision</Link></li>
              <li><Link to="/task2" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">QualityVision</Link></li>
              <li><Link to="/dashboard" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Your Dashboard</Link></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">History</a></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h3 className="font-bold text-sm text-ink-900 dark:text-white mb-3 uppercase tracking-wider">Help & Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">User Guide</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Video Tutorials</a></li>
              <li><a href="#" className="text-ink-600 dark:text-ink-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">FAQs</a></li>
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
                <a href="mailto:support@sbt.tn" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">support@sbt.tn</a>
              </li>
              <li className="flex items-center gap-2 text-ink-600 dark:text-ink-400">
                <Headphones size={14} className="shrink-0" />
                <span>Technical Support Available</span>
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
            <span className="flex items-center gap-1">
              <Star size={10} className="text-amber-500" />
              Quality First
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub }) {
  // If value is a number, animate it. Otherwise show as-is (e.g. "2 / 3" or "Employee").
  const numericValue = typeof value === 'number' ? value : Number.isFinite(+value) && !String(value).includes('/') ? +value : null
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
      <Card className="p-5 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-700 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 grid place-items-center text-primary-600 dark:text-primary-400 shadow-sm">
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

function ModuleCard({ to, icon: Icon, title, tagline, description, features, state }) {
  const stateLabel = state === 'online' ? 'Online' : state === 'degraded' ? 'Degraded' : 'Offline'
  const stateCls   = state === 'online' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : state === 'degraded' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  return (
    <Card className="p-6 group hover:-translate-y-1 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 grid place-items-center text-primary-600 dark:text-primary-400 shrink-0">
            <Icon size={22} />
          </div>
          <div>
            <div className="font-bold text-ink-900 dark:text-white text-lg">{title}</div>
            <div className="text-xs text-primary-600 dark:text-primary-400 font-semibold">{tagline}</div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${stateCls}`}>
          {stateLabel}
        </span>
      </div>

      <p className="mt-4 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{description}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-400">
            <f.icon size={14} className="text-primary-500 shrink-0" />
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <Link to={to} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-colors group-hover:gap-3">
        Open {title} <ArrowRight size={14} />
      </Link>
    </Card>
  )
}

function Step({ n, title, desc }) {
  return (
    <div className="relative">
      <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 grid place-items-center font-bold text-primary-700 dark:text-primary-300 mb-2">
        {n}
      </div>
      <div className="font-bold text-sm text-ink-900 dark:text-white">{title}</div>
      <div className="text-xs text-ink-500 dark:text-ink-400 mt-1 leading-relaxed">{desc}</div>
    </div>
  )
}

function PerformanceCard({ icon: Icon, label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }
  return (
    <Card className="p-4">
      <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-extrabold text-ink-900 dark:text-white mb-1">{value}</div>
      <div className="text-xs text-ink-500 dark:text-ink-400 uppercase tracking-wider">{label}</div>
    </Card>
  )
}

function TipCard({ icon: Icon, title, desc }) {
  return (
    <Card className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 grid place-items-center shrink-0 text-primary-600 dark:text-primary-400">
          <Icon size={18} />
        </div>
        <div>
          <div className="font-bold text-sm text-ink-900 dark:text-white mb-1">{title}</div>
          <div className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">{desc}</div>
        </div>
      </div>
    </Card>
  )
}

function InspectionItem({ tool, result, time, details }) {
  const resultColor = result === 'Pass' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' 
                    : result === 'Minor Issues' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
  
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-ink-100 dark:border-ink-800 last:border-0 last:pb-0">
      <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 grid place-items-center shrink-0 text-primary-600 dark:text-primary-400">
        {tool === 'SBT Vision' ? <Cpu size={18} /> : <ScanSearch size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-ink-900 dark:text-white">{tool}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${resultColor}`}>
            {result}
          </span>
        </div>
        <div className="text-xs text-ink-600 dark:text-ink-400">{details}</div>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-400">
          <Clock size={10} />
          <span>{time}</span>
        </div>
      </div>
    </div>
  )
}
