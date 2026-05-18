import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request: JWT token qo'sh ──────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: token refresh va error normalization ────────────────────────────
let _refreshing: Promise<string> | null = null

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean }

    // Telegram WebApp kontekstida auth endpoint 401 lari → to'g'ridan redirect emas
    const isAuthEndpoint = original?.url?.includes('/auth/')

    if (
      error.response?.status === 401 &&
      !original?._retried &&
      !isAuthEndpoint
    ) {
      original._retried = true
      const refresh = localStorage.getItem('refresh_token')

      if (!refresh) {
        _redirectToLogin()
        return Promise.reject(error)
      }

      // Bir nechta parallel so'rov bo'lsa — bitta refresh qil
      if (!_refreshing) {
        _refreshing = axios
          .post<{ access_token: string }>('/api/v1/auth/refresh', {
            refresh_token: refresh,
          })
          .then((res) => {
            localStorage.setItem('access_token', res.data.access_token)
            return res.data.access_token
          })
          .catch((err) => {
            localStorage.clear()
            _redirectToLogin()
            return Promise.reject(err)
          })
          .finally(() => {
            _refreshing = null
          })
      }

      try {
        const newToken = await _refreshing
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient.request(original)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

function _redirectToLogin() {
  // Telegram WebApp ichida login redirect kerak emas
  const inTelegram = !!(window as any).Telegram?.WebApp
  if (!inTelegram) {
    window.location.href = '/login'
  }
}
