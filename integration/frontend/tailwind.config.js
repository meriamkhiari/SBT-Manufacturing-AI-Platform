/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      borderRadius: { '2xl': '1rem' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(15, 23, 42, 0.08)',
        ring: '0 0 0 4px rgba(59, 130, 246, 0.15)',
        // per-task glow halos — used around the iframe in Task pages
        'glow-task1': '0 0 80px -10px rgba(37, 99, 235, 0.55), 0 0 0 1px rgba(37, 99, 235, 0.15)',
        'glow-task2': '0 0 80px -10px rgba(8, 145, 178, 0.55),  0 0 0 1px rgba(8, 145, 178, 0.15)',
        'glow-task3': '0 0 80px -10px rgba(202, 138, 4, 0.45),  0 0 0 1px rgba(30, 58, 95, 0.25)',
      },
      keyframes: {
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':       { backgroundPosition: '100% 50%' },
        },
        'fade-up': {
          '0%':  { opacity: 0, transform: 'translateY(8px)' },
          '100%':{ opacity: 1, transform: 'translateY(0)'   },
        },
      },
      animation: {
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'fade-up':      'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
