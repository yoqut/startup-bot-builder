import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useTelegramViewport } from '@/hooks/useTelegramViewport'
import AppLayout from '@/components/layout/AppLayout'
import Toaster from '@/components/shared/Toaster'
import ConfirmModal from '@/components/shared/ConfirmModal'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/Dashboard'
import BotsPage from '@/pages/Bots'
import FlowBuilderPage from '@/pages/FlowBuilder'
import AnalyticsPage from '@/pages/Analytics'
import BroadcastPage from '@/pages/Broadcast'
import SettingsPage from '@/pages/Settings'
import ConversationsPage from '@/pages/Conversations'
import BusinessPage from '@/pages/Business'
import WebAppBuilderPage from '@/pages/WebAppBuilder'
import TemplatesPage from '@/pages/Templates'
import OnboardingPage, { ONBOARDING_DONE_KEY } from '@/pages/Onboarding'
import AdminLayout from '@/pages/Admin'
import AdminDashboard from '@/pages/Admin/Dashboard'
import AdminUsers from '@/pages/Admin/Users'
import AdminBots from '@/pages/Admin/Bots'
import AdminPlans from '@/pages/Admin/Plans'
import AdminSettings from '@/pages/Admin/Settings'

// Telegram WebApp detected by mere presence of the WebApp object
const tgWebApp = () => (window as any).Telegram?.WebApp
const inTgWebApp = !!tgWebApp()

// Module-level flag — unlike useRef, survives React StrictMode's remount cycle
let _appInitialized = false

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem(ONBOARDING_DONE_KEY)) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  useTelegramViewport()
  const { fetchMe, loginTelegramWebApp, isLoading } = useAuthStore()

  // tgStatus: 'idle' | 'pending' | 'done' | 'error'
  const [tgStatus, setTgStatus] = useState<'idle' | 'pending' | 'done' | 'error'>(
    () => (inTgWebApp && !localStorage.getItem('access_token') ? 'pending' : 'idle')
  )
  const [tgError, setTgError] = useState('')

  const doTgLogin = () => {
    const initData = tgWebApp()?.initData
    if (!initData) {
      setTgError('Telegram initData topilmadi. Ilovani qayta oching.')
      setTgStatus('error')
      return
    }
    setTgStatus('pending')
    setTgError('')
    loginTelegramWebApp(initData)
      .then(() => setTgStatus('done'))
      .catch((err: any) => {
        const detail = err?.response?.data?.detail ?? err?.message ?? 'Noma\'lum xato'
        setTgError(detail)
        setTgStatus('error')
      })
  }

  // Guard against React StrictMode double-invocation of effects.
  useEffect(() => {
    if (_appInitialized) return
    _appInitialized = true

    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe()
    } else if (inTgWebApp) {
      doTgLogin()
    }
  }, [])

  // While fetching existing session
  if (isLoading) return <Spinner />

  // Inside Telegram — never fall through to email/password form
  if (inTgWebApp && !useAuthStore.getState().user) {
    if (tgStatus === 'pending') return <Spinner />
    if (tgStatus === 'error') return <TgErrorScreen error={tgError} onRetry={doTgLogin} />
    // 'done' or 'idle' with no user yet — show spinner briefly
    if (tgStatus !== 'done') return <Spinner />
  }

  return (
    <>
      <Toaster />
      <ConfirmModal />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />

        <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users"    element={<AdminUsers />} />
          <Route path="bots"     element={<AdminBots />} />
          <Route path="plans"    element={<AdminPlans />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/" element={<RequireAuth><OnboardingGuard><AppLayout /></OnboardingGuard></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="bots"                    element={<BotsPage />} />
          <Route path="bots/:botId/flows"       element={<FlowBuilderPage />} />
          <Route path="bots/:botId/webapp"      element={<WebAppBuilderPage />} />
          <Route path="analytics"               element={<AnalyticsPage />} />
          <Route path="broadcast"               element={<BroadcastPage />} />
          <Route path="conversations"           element={<ConversationsPage />} />
          <Route path="business"                element={<BusinessPage />} />
          <Route path="templates"               element={<TemplatesPage />} />
          <Route path="settings"                element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-tg-bg gap-4">
      <div className="size-11 rounded-full border-[3px] border-tg-accent/30 border-t-tg-accent animate-spin" />
      <p className="text-tg-label text-sm m-0">Yuklanmoqda…</p>
    </div>
  )
}

function TgErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-tg-bg gap-4 p-6">
      <div className="size-[52px] rounded-[14px] bg-red-500/10 border border-red-500/25 flex items-center justify-center text-2xl">⚠</div>
      <p className="text-white text-[15px] font-semibold m-0 text-center">
        Kirishda xatolik
      </p>
      <p className="text-tg-label text-[13px] m-0 text-center leading-relaxed">
        {error}
      </p>
      <button
        onClick={onRetry}
        className="bg-tg-accent border-0 rounded-xl py-3 px-7 text-white text-sm font-semibold cursor-pointer mt-1"
      >
        Qayta urinish
      </button>
    </div>
  )
}
