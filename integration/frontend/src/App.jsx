import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import Home from './pages/Home'
import Task1 from './pages/Task1'
import Task2 from './pages/Task2'
import Task3 from './pages/Task3'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminUsers from './pages/AdminUsers'
import SplashScreen from './components/SplashScreen'
import BackToTop from './components/BackToTop'
import ProtectedRoute from './components/ProtectedRoute'
import { ThemeProvider } from './lib/ThemeContext'
import { AuthProvider } from './lib/AuthContext'

export default function App() {
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ThemeProvider>
      <AnimatePresence>
        {splash && <SplashScreen onComplete={() => setSplash(false)} />}
      </AnimatePresence>

      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: '!bg-white dark:!bg-ink-900 !text-ink-900 dark:!text-white !rounded-xl !shadow-soft',
            }}
          />
          <Routes>
            {/* Public auth pages */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected app shell */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/"          element={<Home />} />
              <Route path="/task1"     element={<Task1 />} />
              <Route path="/task2"     element={<Task2 />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin-only */}
              <Route path="/task3"        element={<ProtectedRoute role="admin"><Task3 /></ProtectedRoute>} />
              <Route path="/admin/users"  element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
            </Route>
          </Routes>
          <BackToTop />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
