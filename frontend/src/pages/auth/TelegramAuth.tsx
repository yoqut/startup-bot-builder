/**
 * Auth page — Telegram WebApp authentication.
 * In production, this page only runs inside Telegram WebApp.
 * Reads initData from window.Telegram.WebApp, sends to backend.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { apiClient } from '../../lib/api/client'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: { user?: { id: number; first_name: string } }
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
      }
    }
  }
}

export function TelegramAuth() {
  const navigate = useNavigate()
  const { setTokens, setUser, isAuthenticated } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
      return
    }

    const tg = window.Telegram?.WebApp
    if (!tg) {
      // Dev mode: auto-login with dev token
      authenticateDev()
      return
    }

    tg.ready()
    tg.expand()
    tg.setHeaderColor('#09090b')

    const initData = tg.initData
    if (!initData) {
      setStatus('error')
      setErrorMsg('Invalid Telegram session')
      return
    }

    authenticate(initData)
  }, [])

  async function authenticateDev() {
    try {
      // Dev mode: use dev endpoint that creates a test user
      const { data } = await apiClient.post('/auth/dev-login', {})
      setTokens(data.access_token, data.refresh_token)
      setUser(data.user)
      setStatus('success')
      setTimeout(() => navigate('/dashboard', { replace: true }), 600)
    } catch {
      setStatus('error')
      setErrorMsg('Dev login failed — make sure backend is running at localhost:8000')
    }
  }

  async function authenticate(initData: string) {
    try {
      const { data } = await apiClient.post('/auth/telegram', { init_data: initData })
      const accessToken: string = data.access_token

      // Set tokens before fetching user
      setTokens(accessToken, data.refresh_token)

      // Pass token directly — localStorage may not be synced yet at this point
      const { data: user } = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setUser(user)

      setStatus('success')
      setTimeout(() => navigate('/dashboard', { replace: true }), 800)
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg('Authentication failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          animate={status === 'loading' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500
            flex items-center justify-center text-2xl"
        >
          ⚡
        </motion.div>

        {status === 'loading' && (
          <>
            <h1 className="text-white text-xl font-semibold mb-2">Signing you in…</h1>
            <p className="text-white/40 text-sm">Verifying your Telegram identity</p>
          </>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-white text-xl font-semibold mb-2">Welcome back! ✓</h1>
            <p className="text-white/40 text-sm">Redirecting to dashboard…</p>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-white text-xl font-semibold mb-2">Authentication Failed</h1>
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
