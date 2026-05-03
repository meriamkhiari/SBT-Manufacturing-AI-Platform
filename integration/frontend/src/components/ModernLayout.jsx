import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Upload,
  Search,
  Eye,
  Target,
  History,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

export default function ModernLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard', color: 'blue' },
    { path: '/task1', icon: Upload, label: 'Connector Intake', color: 'cyan' },
    { path: '/task2', icon: Eye, label: 'Quality Vision', color: 'purple' },
    { path: '/task3', icon: Target, label: 'Market Intelligence', color: 'emerald' },
    { path: '/history', icon: History, label: 'System History', color: 'slate' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 transition-colors">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/85 dark:bg-ink-900/85 backdrop-blur-xl border-b border-ink-200 dark:border-ink-800">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 grid place-items-center shadow-lg shadow-blue-500/30">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M7 8h4M7 12h6" />
                  <circle cx="17" cy="9" r="2.2" fill="currentColor" stroke="none" opacity=".5" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  SBT Vision
                </div>
                <div className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
                  Smart Brain Technologie
                </div>
              </div>
            </Link>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-500" />
              ) : (
                <Moon size={20} className="text-ink-600" />
              )}
            </button>

            {/* User Menu */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 grid place-items-center text-white text-xs font-bold">
                {user?.fullname?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-semibold text-ink-900 dark:text-white">
                {user?.fullname || user?.email}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-16 left-0 bottom-0 w-64 z-40 bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-ink-800 overflow-y-auto"
          >
            <div className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                        : 'text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-950">
              <div className="text-xs text-ink-500 text-center">
                <p className="font-semibold">SBT Vision Platform</p>
                <p className="mt-1">© 2026 Smart Brain Technologie</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        {/* Page Header */}
        {(title || subtitle) && (
          <div className="bg-white dark:bg-ink-900 border-b border-ink-200 dark:border-ink-800">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {title && (
                <h1 className="text-3xl font-black text-ink-900 dark:text-white mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-ink-600 dark:text-ink-400">{subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
