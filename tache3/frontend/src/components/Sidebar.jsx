import { NavLink } from 'react-router-dom'
import { Globe, Share2, Megaphone } from 'lucide-react'
import clsx from 'clsx'

/**
 * Side navigation for SBT Intelligence (tâche 3).
 * Shows the secondary tools (Map, Graph, Marketing) so the top navbar
 * stays focused on primary actions (Home, Dashboard).
 * Visible only on md+ screens — mobile uses BottomNav.
 */
const SIDE_LINKS = [
  { to: '/map',       icon: Globe,     label: 'Map',       desc: 'Geographic view of leads' },
  { to: '/graph',     icon: Share2,    label: 'Graph',     desc: 'Relationship network' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing', desc: 'Outreach & campaigns' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex sticky top-14 h-[calc(100vh-3.5rem)] w-56 lg:w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-5 z-30">
      <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tools</div>
      <nav className="space-y-1">
        {SIDE_LINKS.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )
            }
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="leading-tight">
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</div>
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        <div className="font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider mb-1">Tip</div>
        Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Ctrl+K</kbd> to search any page.
      </div>
    </aside>
  )
}
