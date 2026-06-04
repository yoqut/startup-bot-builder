import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// ── Tunnel URLs ────────────────────────────────────────────────────────────────
// Update these when tunnels restart. Frontend tunnel goes in allowedHosts,
// backend tunnel goes in proxy target.
const FRONTEND_HOST = 'easter-thin-preceding-frog.trycloudflare.com'
const BACKEND_URL = 'https://promo-recommend-segments-serious.trycloudflare.com'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [FRONTEND_HOST, 'localhost', "127.0.0.1", "0.0.0.0"],
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: true,
      },
      '/webhook': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
