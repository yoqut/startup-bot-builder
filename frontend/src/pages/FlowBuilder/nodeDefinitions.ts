import {
  Terminal, MessageSquare, Image, FileText, BarChart2,
  Keyboard, GitBranch, Globe, Brain, Square, Mic,
  Volume2, Play, Clock, Variable, Zap, Antenna,
  Trash2, Send, Briefcase, MousePointer,
} from 'lucide-react'
import type { FlowChatType } from '@/types/flow'

export type NodeCategory = 'trigger' | 'message' | 'logic' | 'advanced' | 'end'

export interface NodeDef {
  type:        string
  label:       string
  labelKey:    string          // i18n key: builder.nodes.<key>
  descKey:     string          // i18n key: builder.nodes.<key>_desc
  icon:        React.ElementType
  category:    NodeCategory
  accent:      string
  chatTypes:   FlowChatType[]  // which chat types show this node
  tags:        string[]        // for search
  nodeWidth?:  number          // override default 240px
}

// ── Accent hex → Tailwind classes ─────────────────────────────────────────────
export const ACCENT_CLS: Record<string, { bg: string; icon: string; border: string }> = {
  '#27ae60': { bg: 'bg-node-green/10',  icon: 'text-node-green',   border: 'border-node-green/30'  },
  '#22c55e': { bg: 'bg-node-green/10',  icon: 'text-node-green',   border: 'border-node-green/30'  },
  '#2481cc': { bg: 'bg-tg-accent/10',   icon: 'text-tg-accent',    border: 'border-tg-accent/30'   },
  '#f39c12': { bg: 'bg-node-amber/10',  icon: 'text-node-amber',   border: 'border-node-amber/30'  },
  '#e67e22': { bg: 'bg-node-orange/10', icon: 'text-node-orange',  border: 'border-node-orange/30' },
  '#4a6278': { bg: 'bg-node-steel/10',  icon: 'text-node-steel',   border: 'border-node-steel/30'  },
  '#00bcd4': { bg: 'bg-node-teal/10',   icon: 'text-node-teal',    border: 'border-node-teal/30'   },
  '#e91e8c': { bg: 'bg-node-pink/10',   icon: 'text-node-pink',    border: 'border-node-pink/30'   },
  '#8e44ad': { bg: 'bg-node-purple/10', icon: 'text-node-purple',  border: 'border-node-purple/30' },
  '#9b59b6': { bg: 'bg-node-grape/10',  icon: 'text-node-grape',   border: 'border-node-grape/30'  },
  '#e53935': { bg: 'bg-node-red/10',    icon: 'text-node-red',     border: 'border-node-red/30'    },
  '#8b5cf6': { bg: 'bg-node-violet/10', icon: 'text-node-violet',  border: 'border-node-violet/30' },
  '#6366f1': { bg: 'bg-node-indigo/10', icon: 'text-node-indigo',  border: 'border-node-indigo/30' },
  '#f97316': { bg: 'bg-orange-500/10',  icon: 'text-orange-500',   border: 'border-orange-500/30'  },
}

const ALL: FlowChatType[] = ['user', 'group', 'channel', 'business']
const NO_CHANNEL: FlowChatType[] = ['user', 'group', 'business']

// ── Registry ──────────────────────────────────────────────────────────────────
export const NODE_REGISTRY: NodeDef[] = [
  // Triggers
  {
    type: 'handler', label: 'Handler', labelKey: 'handler', descKey: 'handler_desc',
    icon: Antenna, category: 'trigger', accent: '#8b5cf6',
    chatTypes: ['user', 'group', 'channel'], tags: ['trigger', 'handler', 'event', 'start'],
  },
  {
    type: 'business_handler', label: 'Business Handler', labelKey: 'business_handler', descKey: 'business_handler_desc',
    icon: Briefcase, category: 'trigger', accent: '#6366f1',
    chatTypes: ['business'], tags: ['trigger', 'business', 'handler'],
  },
  {
    type: 'command', label: 'Command', labelKey: 'command', descKey: 'command_desc',
    icon: Terminal, category: 'trigger', accent: '#27ae60',
    chatTypes: ALL, tags: ['command', 'slash', 'trigger', '/start'],
  },
  {
    type: 'start', label: '/start', labelKey: 'start', descKey: 'start_desc',
    icon: Play, category: 'trigger', accent: '#27ae60',
    chatTypes: ALL, tags: ['start', 'trigger', '/start'],
  },

  // Message
  {
    type: 'message', label: 'Xabar', labelKey: 'message', descKey: 'message_desc',
    icon: MessageSquare, category: 'message', accent: '#2481cc', nodeWidth: 260,
    chatTypes: ALL, tags: ['message', 'xabar', 'text', 'photo', 'video', 'media', 'button'],
  },
  {
    type: 'button', label: 'Tugmalar', labelKey: 'button', descKey: 'button_desc',
    icon: MousePointer, category: 'message', accent: '#8e44ad',
    chatTypes: ALL, tags: ['button', 'tugma', 'keyboard', 'inline', 'reply'],
  },
  {
    type: 'input', label: 'Kiritish', labelKey: 'input', descKey: 'input_desc',
    icon: Keyboard, category: 'message', accent: '#f39c12',
    chatTypes: NO_CHANNEL, tags: ['input', 'kiritish', 'user input', 'prompt', 'javob'],
  },
  {
    type: 'send_to', label: "ID ga yuborish", labelKey: 'send_to', descKey: 'send_to_desc',
    icon: Send, category: 'message', accent: '#00bcd4',
    chatTypes: ALL, tags: ['send', 'yuborish', 'chat_id', 'forward'],
  },

  // Logic
  {
    type: 'condition', label: 'Shart', labelKey: 'condition', descKey: 'condition_desc',
    icon: GitBranch, category: 'logic', accent: '#e67e22', nodeWidth: 280,
    chatTypes: ALL, tags: ['condition', 'shart', 'if', 'else', 'branch', 'check'],
  },
  {
    type: 'delay', label: 'Kutish', labelKey: 'delay', descKey: 'delay_desc',
    icon: Clock, category: 'logic', accent: '#4a6278',
    chatTypes: ALL, tags: ['delay', 'kutish', 'wait', 'timer', 'sleep'],
  },
  {
    type: 'set_variable', label: "O'zgaruvchi", labelKey: 'set_variable', descKey: 'set_variable_desc',
    icon: Variable, category: 'logic', accent: '#9b59b6',
    chatTypes: ALL, tags: ["o'zgaruvchi", 'variable', 'set', 'store', 'save'],
  },
  {
    type: 'auto_delete', label: "Xabarni o'chirish", labelKey: 'auto_delete', descKey: 'auto_delete_desc',
    icon: Trash2, category: 'logic', accent: '#e53935',
    chatTypes: NO_CHANNEL, tags: ['delete', 'auto', "o'chirish", 'remove', 'message'],
  },

  // Advanced
  {
    type: 'api_call', label: 'API Call', labelKey: 'api_call', descKey: 'api_call_desc',
    icon: Globe, category: 'advanced', accent: '#00bcd4', nodeWidth: 280,
    chatTypes: ALL, tags: ['api', 'http', 'request', 'webhook', 'get', 'post', 'fetch'],
  },
  {
    type: 'ai', label: 'AI', labelKey: 'ai', descKey: 'ai_desc',
    icon: Brain, category: 'advanced', accent: '#e91e8c',
    chatTypes: ALL, tags: ['ai', 'gpt', 'llm', 'smart', 'generate', 'openai'],
  },

  // End
  {
    type: 'end', label: 'Tugash', labelKey: 'end', descKey: 'end_desc',
    icon: Square, category: 'end', accent: '#e53935',
    chatTypes: ALL, tags: ['end', 'tugash', 'finish', 'stop', 'complete'],
  },
]

// ── Derived lookups (backward-compatible exports) ─────────────────────────────

export const NODE_MAP: Record<string, NodeDef> = Object.fromEntries(
  NODE_REGISTRY.map(n => [n.type, n])
)

/** NodeShell.tsx ACCENT_HEX replacement */
export const ACCENT_HEX: Record<string, string> = Object.fromEntries(
  NODE_REGISTRY.map(n => [n.type, n.accent])
)

/** NodeShell.tsx META replacement */
export const META: Record<string, { icon: React.ElementType; label: string }> = Object.fromEntries(
  NODE_REGISTRY.map(n => [n.type, { icon: n.icon, label: n.label }])
)

/** panels/shared.tsx TYPE_LABELS replacement */
export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NODE_REGISTRY.map(n => [n.type, n.label])
)

/** Sidebar node groups */
export const NODES_BY_CATEGORY = (chatType: FlowChatType): Record<NodeCategory, NodeDef[]> => {
  const filtered = NODE_REGISTRY.filter(n => n.chatTypes.includes(chatType))
  return {
    trigger:  filtered.filter(n => n.category === 'trigger'),
    message:  filtered.filter(n => n.category === 'message'),
    logic:    filtered.filter(n => n.category === 'logic'),
    advanced: filtered.filter(n => n.category === 'advanced'),
    end:      filtered.filter(n => n.category === 'end'),
  }
}

/** MSG icons/labels (message sub-types) */
export const MSG_ICONS: Record<string, React.ElementType> = {
  text: MessageSquare, photo: Image, video: Zap,
  audio: Volume2, voice: Mic, document: FileText, poll: BarChart2,
}
export const MSG_LABELS: Record<string, string> = {
  text: 'Matn', photo: 'Rasm', video: 'Video',
  audio: 'Audio', voice: 'Ovoz', document: 'Hujjat', poll: "So'rovnoma",
}
