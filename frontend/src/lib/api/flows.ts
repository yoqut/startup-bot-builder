import { apiClient } from './client'
import type { BuilderNode, BuilderEdge } from '../../stores/builderStore'
import type { Viewport } from 'reactflow'

export type FlowPayload = {
  name?: string
  nodes?: BuilderNode[]
  edges?: BuilderEdge[]
  viewport?: Viewport
}

export const flowsApi = {
  listFlows: (botId: string) =>
    apiClient.get(`/bots/${botId}/flows`).then(r => r.data),

  createFlow: (botId: string, data: { name: string; description?: string }) =>
    apiClient.post(`/bots/${botId}/flows`, data).then(r => r.data),

  getFlow: (botId: string, flowId: string) =>
    apiClient.get(`/bots/${botId}/flows/${flowId}`).then(r => r.data),

  updateFlow: (botId: string, flowId: string, data: FlowPayload) =>
    apiClient.put(`/bots/${botId}/flows/${flowId}`, data).then(r => r.data),

  deleteFlow: (botId: string, flowId: string) =>
    apiClient.delete(`/bots/${botId}/flows/${flowId}`).then(r => r.data),

  activateFlow: (botId: string, flowId: string) =>
    apiClient.post(`/bots/${botId}/flows/${flowId}/activate`).then(r => r.data),

  pauseFlow: (botId: string, flowId: string) =>
    apiClient.post(`/bots/${botId}/flows/${flowId}/pause`).then(r => r.data),

  getVersions: (botId: string, flowId: string) =>
    apiClient.get(`/bots/${botId}/flows/${flowId}/versions`).then(r => r.data),

  restoreVersion: (botId: string, flowId: string, versionId: string) =>
    apiClient.post(`/bots/${botId}/flows/${flowId}/versions/${versionId}/restore`).then(r => r.data),

  generateWithAI: (botId: string, description: string) =>
    apiClient.post(`/ai/generate-flow`, { bot_id: botId, description }).then(r => r.data),

  testFlow: (botId: string, flowId: string, testEvent: Record<string, unknown>) =>
    apiClient.post(`/bots/${botId}/flows/${flowId}/test`, { event: testEvent }).then(r => r.data),
}
