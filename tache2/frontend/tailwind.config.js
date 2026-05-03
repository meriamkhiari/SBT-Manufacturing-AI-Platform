/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a',
        },
        accent: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e',
        },
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      animation: {
        'shimmer':   'shimmer 3s linear infinite',
        'fade-up':   'fadeUp 0.4s ease-out both',
        'pulse-soft':'pulseSoft 2s ease-in-out infinite',
        'slide-in':  'slideIn 0.3s ease-out both',
      },
      keyframes: {
        shimmer:    { '0%':{transform:'translateX(-100%)'}, '100%':{transform:'translateX(100%)'} },
        fadeUp:     { '0%':{opacity:0,transform:'translateY(8px)'}, '100%':{opacity:1,transform:'translateY(0)'} },
        pulseSoft:  { '0%,100%':{opacity:1}, '50%':{opacity:.6} },
        slideIn:    { '0%':{opacity:0,transform:'translateX(-20px)'}, '100%':{opacity:1,transform:'translateX(0)'} },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0,0,0,0.08)',
        'glass': '0 8px 32px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
