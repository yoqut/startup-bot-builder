import { create } from 'zustand'
import type { Bot } from '@/types/bot'
import { botsApi } from '@/api/bots'

interface BotState {
  bots: Bot[]
  selectedBot: Bot | null
  isLoading: boolean
  fetchBots: () => Promise<void>
  createBot: (name: string, token: string) => Promise<Bot>
  deleteBot: (id: string) => Promise<void>
  activateBot: (id: string) => Promise<void>
  deactivateBot: (id: string) => Promise<void>
  selectBot: (bot: Bot | null) => void
}

export const useBotStore = create<BotState>((set, get) => ({
  bots: [],
  selectedBot: null,
  isLoading: false,

  fetchBots: async () => {
    const { bots } = get()
    // only show skeleton on first load (when list is empty)
    if (bots.length === 0) set({ isLoading: true })
    const res = await botsApi.list()
    set({ bots: res.data, isLoading: false })
  },

  createBot: async (name, token) => {
    const res = await botsApi.create(name, token)
    set((s) => ({ bots: [res.data, ...s.bots] }))
    return res.data
  },

  deleteBot: async (id) => {
    await botsApi.delete(id)
    set((s) => ({ bots: s.bots.filter((b) => b.id !== id) }))
  },

  activateBot: async (id) => {
    const res = await botsApi.activate(id)
    set((s) => ({ bots: s.bots.map((b) => (b.id === id ? res.data : b)) }))
  },

  deactivateBot: async (id) => {
    const res = await botsApi.deactivate(id)
    set((s) => ({ bots: s.bots.map((b) => (b.id === id ? res.data : b)) }))
  },

  selectBot: (bot) => set({ selectedBot: bot }),
}))
