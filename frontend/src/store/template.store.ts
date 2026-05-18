import { create } from 'zustand'
import { templatesApi } from '@/api/templates'
import type { Template } from '@/types/template'

interface TemplateStore {
  // Marketplace
  templates: Template[]
  featured: Template[]
  loading: boolean
  category: string
  search: string

  // My templates
  myTemplates: Template[]
  myLoading: boolean

  // Actions
  setCategory: (cat: string) => void
  setSearch: (q: string) => void
  fetchMarketplace: () => Promise<void>
  fetchMyTemplates: () => Promise<void>
  markUnlocked: (templateId: string) => void
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  featured: [],
  loading: false,
  category: '',
  search: '',
  myTemplates: [],
  myLoading: false,

  setCategory: (cat) => {
    set({ category: cat })
    get().fetchMarketplace()
  },

  setSearch: (q) => {
    set({ search: q })
    get().fetchMarketplace()
  },

  fetchMarketplace: async () => {
    const { category, search } = get()
    set({ loading: true })
    try {
      const { data } = await templatesApi.list({
        category: category || undefined,
        search: search || undefined,
      })
      set({
        templates: data,
        featured: data.filter((t) => t.is_featured),
      })
    } catch {
      set({ templates: [], featured: [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchMyTemplates: async () => {
    set({ myLoading: true })
    try {
      const { data } = await templatesApi.my()
      set({ myTemplates: data })
    } catch {
      set({ myTemplates: [] })
    } finally {
      set({ myLoading: false })
    }
  },

  markUnlocked: (templateId) => {
    const update = (list: Template[]) =>
      list.map((t) => (t.id === templateId ? { ...t, is_unlocked: true } : t))
    set((s) => ({
      templates: update(s.templates),
      featured: update(s.featured),
      myTemplates: update(s.myTemplates),
    }))
  },
}))
