import { apiClient } from './client'

export interface Broadcast {
  id: string
  bot_id: string
  message: string | null
  media_url: string | null
  media_type: string | null
  target_tags: string[]
  status: 'draft' | 'queued' | 'running' | 'done' | 'failed'
  sent_count: number
  fail_count: number
  scheduled_at: string | null
  created_at: string
}

export interface BroadcastCreate {
  bot_id: string
  message: string
  media_url?: string
  media_type?: string
  target_tags?: string[]
}

export const broadcastApi = {
  list: (bot_id: string) => apiClient.get<Broadcast[]>('/broadcasts/', { params: { bot_id } }),
  create: (data: BroadcastCreate) => apiClient.post<Broadcast>('/broadcasts/', data),
  get: (id: string) => apiClient.get<Broadcast>(`/broadcasts/${id}`),
  delete: (id: string) => apiClient.delete(`/broadcasts/${id}`),
}
