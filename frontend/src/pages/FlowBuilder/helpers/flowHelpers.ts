import type { Node, Edge } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type { FlowChatType } from '@/types/flow'
import {
  StartNode, CommandNode, HandlerNode, MessageNode, ButtonNode,
  InputNode, ConditionNode, DelayNode, ApiCallNode, AiNode,
  SetVariableNode, EndNode, StickyNoteNode, AutoDeleteNode, SendToNode,
  BusinessHandlerNode,
} from '@/components/flow/nodes/CustomNode'
import { CustomEdge } from '@/components/flow/edges/CustomEdge'
import { User, Users, Radio, Briefcase } from 'lucide-react'

export const edgeTypes = {
  custom: CustomEdge,
}

export const nodeTypes = {
  start:            StartNode,
  command:          CommandNode,
  handler:          HandlerNode,
  message:          MessageNode,
  button:           ButtonNode,
  input:            InputNode,
  condition:        ConditionNode,
  delay:            DelayNode,
  api_call:         ApiCallNode,
  ai:               AiNode,
  set_variable:     SetVariableNode,
  auto_delete:      AutoDeleteNode,
  send_to:          SendToNode,
  business_handler: BusinessHandlerNode,
  end:              EndNode,
  sticky:           StickyNoteNode,
}

export const CHAT_TABS: { key: FlowChatType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'user',     label: 'User',     icon: User,      color: 'text-blue-400'   },
  { key: 'group',    label: 'Guruh',    icon: Users,     color: 'text-green-400'  },
  { key: 'channel',  label: 'Channel',  icon: Radio,     color: 'text-orange-400' },
  { key: 'business', label: 'Business', icon: Briefcase, color: 'text-indigo-400' },
]

export const QUICK_ADD_NODES = [
  { type: 'message',      label: 'Xabar',           color: 'text-blue-400' },
  { type: 'button',       label: 'Tugmalar',         color: 'text-indigo-400' },
  { type: 'input',        label: 'Kiritish',         color: 'text-yellow-400' },
  { type: 'condition',    label: 'Shart',            color: 'text-orange-400' },
  { type: 'delay',        label: 'Kutish',           color: 'text-slate-400' },
  { type: 'auto_delete',  label: "Xabar o'chirish",  color: 'text-rose-400' },
  { type: 'send_to',      label: 'ID ga yuborish',   color: 'text-teal-400' },
  { type: 'set_variable', label: "O'zgaruvchi",      color: 'text-purple-400' },
  { type: 'api_call',     label: 'API Call',         color: 'text-cyan-400' },
  { type: 'ai',           label: 'AI',               color: 'text-pink-400' },
  { type: 'end',          label: 'Tugash',           color: 'text-red-400' },
]

export function edgeColor(handle: string | null | undefined): string {
  if (handle === 'true')        return '#10b981'
  if (handle === 'false')       return '#ef4444'
  if (handle?.startsWith('btn_')) return '#3b82f6'
  return '#475569'
}

export function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
): Edge {
  const color = edgeColor(sourceHandle)
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle ?? undefined,
    type: 'custom',
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
  }
}

export interface ValidationError {
  nodeId: string
  severity: 'error' | 'warning'
  message: string
}

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = []
  const sourceSet = new Set(edges.map(e => e.source))
  const targetSet = new Set(edges.map(e => e.target))

  for (const node of nodes) {
    const cfg  = (node.data.config as Record<string, unknown>) || {}
    const type = ((node.data.nodeType as string) || node.type || '')

    if (type === 'sticky') continue

    const hasOut = sourceSet.has(node.id)
    const hasIn  = targetSet.has(node.id)

    if (['handler', 'command', 'start'].includes(type) && !hasOut)
      errors.push({ nodeId: node.id, severity: 'error', message: "Trigger hech narsaga ulanmagan" })

    if (type === 'message' && !cfg.text && cfg.message_type === 'text')
      errors.push({ nodeId: node.id, severity: 'warning', message: "Xabar matni bo'sh" })

    if (type === 'input' && !cfg.variable_name)
      errors.push({ nodeId: node.id, severity: 'error', message: "O'zgaruvchi nomi kiritilmagan" })

    if (type === 'condition') {
      const out = edges.filter(e => e.source === node.id)
      if (!out.some(e => e.sourceHandle === 'true') || !out.some(e => e.sourceHandle === 'false'))
        errors.push({ nodeId: node.id, severity: 'warning', message: "Shart to'liq ulanmagan (true/false kerak)" })
    }

    if (!['handler', 'command', 'start', 'sticky'].includes(type) && !hasIn)
      errors.push({ nodeId: node.id, severity: 'warning', message: "Hech narsa bu nodega ulanmagan" })
  }

  return errors
}

export function makeConfig(type: string, subtype = ''): Record<string, unknown> {
  switch (type) {
    case 'handler':          return { trigger: subtype || 'any', conditions: [], condition_mode: 'any', commands: ['/start'], save_as: '' }
    case 'business_handler': return { trigger: subtype || 'any', sender_type: 'customer', conditions: [], condition_mode: 'any', commands: ['/start'], save_as: '', connection_filter: '' }
    case 'command':      return { command: subtype || '/start', description: '' }
    case 'button':       return { text: '', buttons: [], button_layout: 'inline' }
    case 'message':      return { message_type: 'text', text: '', buttons: [], button_layout: 'inline' }
    case 'input':        return { prompt: '', variable_name: '', validation: 'text' }
    case 'condition':    return { variable: '', operator: 'equals', value: '' }
    case 'delay':        return { seconds: 3, typing_action: true }
    case 'api_call':     return { method: 'GET', url: '', response_variable: 'api_result' }
    case 'ai':           return { model: 'claude-opus-4-7', system_prompt: '', response_variable: 'ai_reply' }
    case 'set_variable': return { assignments: [{ variable: '', value: '' }] }
    case 'auto_delete':  return { seconds: 10, message_id_var: 'last_message_id' }
    case 'send_to':      return { chat_id: '', message_type: 'text', text: '', parse_mode: 'HTML' }
    case 'sticky':       return { text: '', color: 'yellow' }
    default:             return {}
  }
}

export function serializeNodes(nodes: Node[]) {
  return nodes.map(n => ({
    id:         n.id,
    type:       (n.type || n.data.nodeType) as any,
    label:      n.data.label as string,
    position_x: n.position.x,
    position_y: n.position.y,
    config:     (n.data.config as any) || {},
  }))
}

export function serializeEdges(edges: Edge[]) {
  return edges.map(e => ({
    id:             e.id,
    source_node_id: e.source,
    target_node_id: e.target,
    label:          (e.label as string) || null,
    condition_key:  e.sourceHandle || null,
  }))
}
