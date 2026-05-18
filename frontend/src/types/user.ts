export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'superadmin' | 'user'
  plan_id: number | null
  is_active: boolean
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}
