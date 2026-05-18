export type Complexity = 'simple' | 'medium' | 'advanced'

export interface Template {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: string | null
  complexity: Complexity | null
  price_stars: number
  is_published: boolean
  is_featured: boolean
  uses_count: number
  avg_rating: number
  review_count: number
  node_count: number
  preview_url: string | null
  created_at: string
  is_unlocked: boolean
  is_own: boolean
}

export interface TemplateReview {
  id: string
  user_id: string
  template_id: string
  rating: number
  comment: string | null
  reviewer_name: string | null
  created_at: string
}

export interface TemplateDetail extends Template {
  reviews: TemplateReview[]
  flow_data: {
    nodes: Array<{
      id: string
      type: string
      label: string | null
      config: Record<string, unknown>
      position?: { x: number; y: number }
    }>
    edges: Array<{
      source: string
      target: string
      condition_key: string | null
    }>
  } | null
}

export interface Payment {
  id: string
  template_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'refunded'
  payload: string
  created_at: string
  completed_at: string | null
}

export interface UseTemplateResult {
  bot_id: string
  flow_id: string
}

export const CATEGORIES = [
  'E-commerce', 'Support', 'Booking', 'FAQ', 'Quiz', 'Loyalty', 'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const COMPLEXITY_META: Record<Complexity, { color: string }> = {
  simple:   { color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  medium:   { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  advanced: { color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}
