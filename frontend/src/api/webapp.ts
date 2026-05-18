import type { WbApp } from '@/types/webapp'

// localStorage key per bot
const key = (botId: string) => `wb_app_${botId}`

export const webappApi = {
  load: async (botId: string): Promise<WbApp | null> => {
    try {
      const raw = localStorage.getItem(key(botId))
      return raw ? (JSON.parse(raw) as WbApp) : null
    } catch {
      return null
    }
  },

  save: async (app: WbApp): Promise<void> => {
    localStorage.setItem(key(app.botId), JSON.stringify(app))
  },

  delete: async (botId: string): Promise<void> => {
    localStorage.removeItem(key(botId))
  },
}

// When backend is ready, replace with:
// import { apiClient } from './client'
// load:  apiClient.get(`/webapps/${botId}`)
// save:  apiClient.put(`/webapps/${app.id}`, app)
