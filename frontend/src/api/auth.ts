import { apiClient } from './client'
import type { AuthTokens, User } from '@/types/user'

export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    apiClient.post<AuthTokens>('/auth/register', { email, password, full_name }),

  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>('/auth/login', { email, password }),

  refresh: (refresh_token: string) =>
    apiClient.post<AuthTokens>('/auth/refresh', { refresh_token }),

  me: () => apiClient.get<User>('/auth/me'),

  telegramWidget: (data: Record<string, string | number>) =>
    apiClient.post<AuthTokens>('/auth/telegram-widget', data),

  telegramWebApp: (init_data: string) =>
    apiClient.post<AuthTokens>('/auth/telegram-webapp', { init_data }),
}
