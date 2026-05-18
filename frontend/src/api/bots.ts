import { apiClient } from './client'
import type { Bot, BotStats } from '@/types/bot'

export const botsApi = {
  list: () => apiClient.get<Bot[]>('/bots/'),
  create: (name: string, token: string) => apiClient.post<Bot>('/bots/', { name, token }),
  get: (id: string) => apiClient.get<Bot>(`/bots/${id}`),
  update: (id: string, data: Partial<Bot>) => apiClient.patch<Bot>(`/bots/${id}`, data),
  delete: (id: string) => apiClient.delete(`/bots/${id}`),
  activate: (id: string) => apiClient.post<Bot>(`/bots/${id}/activate`),
  deactivate: (id: string) => apiClient.post<Bot>(`/bots/${id}/deactivate`),
  stats: (id: string) => apiClient.get<BotStats>(`/bots/${id}/stats`),
  duplicate: (id: string) => apiClient.post<Bot>(`/bots/${id}/duplicate`),
  verifyToken: (token: string) => apiClient.post<{ valid: boolean; bot_username: string }>('/bots/verify-token', { token }),
  autoCreate: (bot_name: string, bot_username: string) =>
    apiClient.post<Bot>('/bots/auto-create', { bot_name, bot_username }),
}
