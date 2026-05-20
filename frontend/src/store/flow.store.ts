import { create } from 'zustand'
import type { Flow, FlowNode, FlowEdge } from '@/types/flow'
import { flowsApi } from '@/api/flows'

interface FlowState {
  flows: Flow[]
  currentFlow: Flow | null
  isDirty: boolean
  isLoading: boolean
  error: string | null
  fetchFlows: (botId: string) => Promise<void>
  loadFlow: (id: string) => Promise<void>
  loadCanvas: (botId: string, chatType: string) => Promise<void>
  saveFlow: () => Promise<void>
  publishFlow: () => Promise<void>
  updateNodes: (nodes: FlowNode[]) => void
  updateEdges: (edges: FlowEdge[]) => void
  clearError: () => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  currentFlow: null,
  isDirty: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchFlows: async (botId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await flowsApi.list(botId)
      set({ flows: res.data })
    } catch (err: any) {
      set({ error: err?.response?.data?.detail ?? err?.message ?? 'Failed to load flows' })
    } finally {
      set({ isLoading: false })
    }
  },

  loadFlow: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await flowsApi.get(id)
      set({ currentFlow: res.data, isDirty: false })
    } catch (err: any) {
      set({ error: err?.response?.data?.detail ?? err?.message ?? 'Failed to load flow' })
    } finally {
      set({ isLoading: false })
    }
  },

  loadCanvas: async (botId, chatType) => {
    set({ isLoading: true, error: null })
    try {
      const res = await flowsApi.canvas(botId, chatType)
      set({ currentFlow: res.data, isDirty: false })
    } catch (err: any) {
      set({ error: err?.response?.data?.detail ?? err?.message ?? 'Failed to load canvas' })
    } finally {
      set({ isLoading: false })
    }
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
