import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// ── Tunnel URLs ────────────────────────────────────────────────────────────────
// Update these when tunnels restart. Frontend tunnel goes in allowedHosts,
// backend tunnel goes in proxy target.
const FRONTEND_HOST = 'bookmarks-murray-bras-convert.trycloudflare.com'
const BACKEND_URL   = 'https://practitioner-infectious-meant-awards.trycloudflare.com'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 3000,
    allowedHosts: [FRONTEND_HOST, 'localhost'],
    proxy: {
      '/api': {
        target:       BACKEND_URL,
        changeOrigin: true,
        secure:       true,
      },
      '/webhook': {
        target:       BACKEND_URL,
        changeOrigin: true,
        secure:       true,
      },
    },
  },
})
