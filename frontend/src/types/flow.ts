export type NodeType =
  | 'start' | 'command' | 'message' | 'button' | 'input'
  | 'condition' | 'delay' | 'set_variable'
  | 'api_call' | 'ai' | 'media' | 'catalog' | 'end'

export interface FlowNode {
  id: string
  type: NodeType
  label: string | null
  position_x: number
  position_y: number
  config: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source_node_id: string
  target_node_id: string
  label: string | null
  condition_key: string | null
}

export type FlowChatType = 'user' | 'group' | 'channel' | 'business'

export interface Flow {
  id: string
  bot_id: string
  name: string
  chat_type: FlowChatType
  is_published: boolean
  version: number
  nodes: FlowNode[]
  edges: FlowEdge[]
  created_at: string
  updated_at: string | null
}
