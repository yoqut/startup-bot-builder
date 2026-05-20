import { create } from 'zustand'
import type { User } from '@/types/user'
import { authApi } from '@/api/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, full_name?: string) => Promise<void>
  loginTelegram: (data: Record<string, string | number>) => Promise<void>
  loginTelegramWebApp: (initData: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

function extractErrorDetail(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as any).response
    return res?.data?.detail ?? res?.data?.message ?? `Server xatosi (${res?.status})`
  }
  if (err instanceof Error) return err.message
  return 'Noma\'lum xato'
}

function saveTokens(access_token: string, refresh_token: string) {
  localStorage.setItem('access_token', access_token)
  localStorage.setItem('refresh_token', refresh_token)
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: !!localStorage.getItem('access_token'),

  login: async (email, password) => {
    const res = await authApi.login(email, password)
    saveTokens(res.data.access_token, res.data.refresh_token)
    const me = await authApi.me()
    set({ user: me.data })
  },

  register: async (email, password, full_name) => {
    const res = await authApi.register(email, password, full_name)
    saveTokens(res.data.access_token, res.data.refresh_token)
    const me = await authApi.me()
    set({ user: me.data })
  },

  loginTelegram: async (data) => {
    const res = await authApi.telegramWidget(data)
    saveTokens(res.data.access_token, res.data.refresh_token)
    const me = await authApi.me()
    set({ user: me.data })
  },

  loginTelegramWebApp: async (initData) => {
    if (!initData) {
      throw new Error('Telegram initData topilmadi. Ilovani Telegram orqali oching.')
    }
    try {
      const res = await authApi.telegramWebApp(initData)
      saveTokens(res.data.access_token, res.data.refresh_token)
      const me = await authApi.me()
      set({ user: me.data })
    } catch (err) {
      const detail = extractErrorDetail(err)
      throw new Error(detail)
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null })
  },

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const me = await authApi.me()
      set({ user: me.data, isLoading: false })
    } catch (err: any) {
      const status: number | undefined = err?.response?.status
      if (!status || status === 401 || status === 403) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
      set({ user: null, isLoading: false })
    }
  },
}))
