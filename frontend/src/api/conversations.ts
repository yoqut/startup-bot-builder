import { apiClient } from './client'

export interface BotUserItem {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  language_code: string | null
  tags: string[]
  first_seen_at: string | null
  last_seen_at: string | null
}

export interface ConversationMessage {
  id: string
  direction: 'in' | 'out'
  message_type: string
  content: string | null
  media_url: string | null
  created_at: string
}

export const conversationsApi = {
  listUsers: (bot_id: string, search = '', limit = 50, offset = 0) =>
    apiClient.get<{ total: number; items: BotUserItem[] }>('/conversations/users', {
      params: { bot_id, search, limit, offset },
    }),
  listMessages: (bot_id: string, telegram_id: number, limit = 100) =>
    apiClient.get<ConversationMessage[]>('/conversations/messages', {
      params: { bot_id, telegram_id, limit },
    }),
}
