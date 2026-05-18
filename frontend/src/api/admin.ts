import { apiClient } from './client'

export interface AdminStats {
  total_users: number
  total_bots: number
  total_bot_users: number
  total_events: number
  new_users_today: number
  new_bots_today: number
  active_bots: number
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  plan_id: number | null
  plan_name: string | null
  bot_count: number
  created_at: string
}

export interface AdminBot {
  id: string
  name: string
  username: string | null
  is_active: boolean
  owner_email: string
  owner_id: string
  flow_count: number
  user_count: number
  created_at: string
}

export interface Plan {
  id: number
  name: string
  price: number
  max_bots: number
  max_webapps: number
  max_bot_users: number
  has_ads: boolean
  multi_lang: boolean
  webhook_access: boolean
  ai_nodes: boolean
  marketplace: boolean
  crm_access: boolean
  erp_access: boolean
  user_count: number
}

export interface Setting {
  key: string
  value: string | null
  description: string | null
}

export const adminApi = {
  stats: ()                              => apiClient.get<AdminStats>('/admin/stats'),
  users: ()                              => apiClient.get<AdminUser[]>('/admin/users'),
  patchUser: (id: string, data: object) => apiClient.patch<AdminUser>(`/admin/users/${id}`, data),
  deleteUser: (id: string)              => apiClient.delete(`/admin/users/${id}`),
  bots: ()                              => apiClient.get<AdminBot[]>('/admin/bots'),
  toggleBot: (id: string)              => apiClient.patch<{ id: string; is_active: boolean }>(`/admin/bots/${id}/toggle`, {}),
  deleteBot: (id: string)              => apiClient.delete(`/admin/bots/${id}`),
  plans: ()                             => apiClient.get<Plan[]>('/admin/plans'),
  createPlan: (data: object)            => apiClient.post<Plan>('/admin/plans', data),
  updatePlan: (id: number, data: object)=> apiClient.patch<Plan>(`/admin/plans/${id}`, data),
  deletePlan: (id: number)             => apiClient.delete(`/admin/plans/${id}`),
  settings: ()                          => apiClient.get<Setting[]>('/admin/settings'),
  updateSetting: (key: string, value: string) => apiClient.patch<Setting>(`/admin/settings/${key}`, { value }),
}
