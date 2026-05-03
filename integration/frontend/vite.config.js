import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,          // expose on LAN — accessible from phone via 192.168.x.x:3000
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
