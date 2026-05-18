import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff } from 'lucide-react'

const MANAGER_BOT_USERNAME = 'YoqutConstructor_bot'
const FRONTEND_URL = 'https://ce8f-213-230-71-129.ngrok-free.app'

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void
  }
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, loginTelegram } = useAuthStore()
  const navigate = useNavigate()
  const tgWidgetRef = useRef<HTMLDivElement>(null)

  // Telegram widget for non-WebApp (desktop browser) login
  useEffect(() => {
    if (!tgWidgetRef.current) return
    window.onTelegramAuth = async (user) => {
      setError('')
      setLoading(true)
      try {
        await loginTelegram(user)
        navigate('/')
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Telegram orqali kirishda xatolik')
        setLoading(false)
      }
    }
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', MANAGER_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-auth-url', `${FRONTEND_URL}/login`)
    script.async = true
    tgWidgetRef.current.appendChild(script)
    return () => { delete window.onTelegramAuth }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, fullName || undefined)
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-tg-bg p-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-tg-accent flex items-center justify-center mx-auto mb-[14px]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
          </div>
          <h1 className="m-0 mb-1 text-[22px] font-bold text-white">BotBuilder</h1>
          <p className="m-0 text-[13px] text-tg-label">
            {isRegister ? "Yangi hisob yarating" : "Hisobingizga kiring"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-tg-card rounded-2xl p-5">

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-[14px] py-[10px] text-[#ef5350] text-[13px] mb-4 leading-relaxed">
              {error}
            </div>
          )}

          {/* Telegram widget (only in browser, not WebApp) */}
          <div className="mb-[18px]">
            <div ref={tgWidgetRef} className="flex justify-center min-h-12" />
            <div className="flex items-center gap-[10px] mt-[14px]">
              <div className="flex-1 h-px bg-tg-input" />
              <span className="text-[11px] text-tg-muted">yoki email bilan</span>
              <div className="flex-1 h-px bg-tg-input" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {isRegister && (
              <div>
                <label className="block text-xs text-tg-label mb-1.5">Ism</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="tg-input focus:border-tg-accent" placeholder="To'liq ismingiz"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-tg-label mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="tg-input focus:border-tg-accent" placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-xs text-tg-label mb-1.5">Parol</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="tg-input focus:border-tg-accent pr-[42px]" placeholder="••••••••"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-tg-muted p-0.5"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className={`w-full border-none rounded-[10px] py-3 text-sm font-semibold mt-1 transition-all duration-150 ${
                loading
                  ? 'bg-tg-elevated text-tg-label cursor-not-allowed'
                  : 'bg-tg-accent text-white cursor-pointer'
              }`}
            >
              {loading ? 'Yuklanmoqda...' : isRegister ? "Ro'yxatdan o'tish" : 'Kirish'}
            </button>
          </form>

          <p className="text-center text-xs text-tg-muted mt-4 mb-0">
            {isRegister ? 'Hisobingiz bormi?' : "Hisobingiz yo'qmi?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="bg-transparent border-none cursor-pointer text-tg-accent text-xs font-semibold p-0"
            >
              {isRegister ? 'Kirish' : "Ro'yxatdan o'tish"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
