import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative w-10 h-10 grid place-items-center rounded-xl
                 bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700
                 text-ink-700 dark:text-ink-200 transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
