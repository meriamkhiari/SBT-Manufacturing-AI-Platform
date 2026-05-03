import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500 },
          success: { style: { background: '#059669', color: '#fff' } },
          error:   { style: { background: '#dc2626', color: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
)
