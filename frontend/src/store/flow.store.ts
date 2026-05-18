import { create } from 'zustand'
import type { Flow, FlowNode, FlowEdge } from '@/types/flow'
import { flowsApi } from '@/api/flows'

interface FlowState {
  flows: Flow[]
  currentFlow: Flow | null
  isDirty: boolean
  fetchFlows: (botId: string) => Promise<void>
  loadFlow: (id: string) => Promise<void>
  loadCanvas: (botId: string, chatType: string) => Promise<void>
  saveFlow: () => Promise<void>
  publishFlow: () => Promise<void>
  updateNodes: (nodes: FlowNode[]) => void
  updateEdges: (edges: FlowEdge[]) => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  currentFlow: null,
  isDirty: false,

  fetchFlows: async (botId) => {
    const res = await flowsApi.list(botId)
    set({ flows: res.data })
  },

  loadFlow: async (id) => {
    const res = await flowsApi.get(id)
    set({ currentFlow: res.data, isDirty: false })
  },

  loadCanvas: async (botId, chatType) => {
    const res = await flowsApi.canvas(botId, chatType)
    set({ currentFlow: res.data, isDirty: false })
  },

  saveFlow: async () => {
    const { currentFlow } = get()
    if (!currentFlow) return
    const res = await flowsApi.save(currentFlow.id, {
      name: currentFlow.name,
      nodes: currentFlow.nodes,
      edges: currentFlow.edges,
    })
    set({ currentFlow: res.data, isDirty: false })
  },

  publishFlow: async () => {
    const { currentFlow } = get()
    if (!currentFlow) return
    await flowsApi.publish(currentFlow.id)
    set((s) => ({
      currentFlow: s.currentFlow ? { ...s.currentFlow, is_published: true } : null,
    }))
  },

  updateNodes: (nodes) =>
    set((s) => ({
      currentFlow: s.currentFlow ? { ...s.currentFlow, nodes } : null,
      isDirty: true,
    })),

  updateEdges: (edges) =>
    set((s) => ({
      currentFlow: s.currentFlow ? { ...s.currentFlow, edges } : null,
      isDirty: true,
    })),
}))
