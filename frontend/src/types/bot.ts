export interface Bot {
  id: string
  name: string
  username: string | null
  is_active: boolean
  is_for_sale: boolean
  sale_price: number | null
  webhook_url: string | null
  created_at: string
}

export interface BotStats {
  total_users: number
  active_users_7d: number
  total_messages: number
}
