import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { useAuthStore } from '../../stores/authStore'

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// Read directly from Zustand in-memory state — always synchronously current,
// no localStorage flush timing issues.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(apiClient(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()

      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      })

      setTokens(data.access_token, data.refresh_token)

      refreshQueue.forEach(cb => cb(data.access_token))
      refreshQueue = []

      original.headers.Authorization = `Bearer ${data.access_token}`
      return apiClient(original)
    } catch {
      useAuthStore.getState().logout()
      window.location.href = '/auth'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
