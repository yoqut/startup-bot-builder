import { apiClient } from './client'
import type { Flow, FlowNode, FlowEdge } from '@/types/flow'

export const flowsApi = {
  list: (botId: string, chatType?: string) =>
    apiClient.get<Flow[]>(`/flows/bot/${botId}`, { params: chatType ? { chat_type: chatType } : {} }),
  /** Get or create the canvas flow for a specific chat_type (user/group/channel/business) */
  canvas: (botId: string, chatType: string) =>
    apiClient.get<Flow>(`/flows/bot/${botId}/canvas/${chatType}`),
  create: (botId: string, name = 'Main Flow', chatType = 'user') =>
    apiClient.post<Flow>(`/flows/bot/${botId}`, { name, chat_type: chatType }),
  get: (id: string) => apiClient.get<Flow>(`/flows/${id}`),
  save: (id: string, data: { name?: string; nodes: FlowNode[]; edges: FlowEdge[] }) =>
    apiClient.put<Flow>(`/flows/${id}`, data),
  publish: (id: string) => apiClient.post<Flow>(`/flows/${id}/publish`),
  delete: (id: string) => apiClient.delete(`/flows/${id}`),
}
