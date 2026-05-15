import {
  Zap, MessageSquare, GitBranch, Clock, Globe,
  Bot, Database, Shuffle, RefreshCw, BarChart2,
  type LucideIcon,
} from 'lucide-react'

export type NodeCategory = 'trigger' | 'message' | 'logic' | 'ai' | 'data' | 'analytics'

export type NodeTypeMeta = {
  icon: LucideIcon
  category: NodeCategory
  label: string
  description: string
  color: string
  defaultConfig: Record<string, unknown>
}

export const NODE_TYPE_META: Record<string, NodeTypeMeta> = {
  trigger: {
    icon: Zap,
    category: 'trigger',
    color: '#8b5cf6',
    label: 'Trigger',
    description: 'Start flow on any Telegram event',
    defaultConfig: {
      contexts: {
        user:     { enabled: true,  events: [] },
        group:    { enabled: false, events: [] },
        channel:  { enabled: false, events: [] },
        business: { enabled: false, events: [] },
      },
      filters: [],
    },
  },
  message: {
    icon: MessageSquare,
    category: 'message',
    color: '#3b82f6',
    label: 'Message',
    description: 'Send any content — text, media, buttons',
    defaultConfig: { content_type: 'text', text: '', parse_mode: 'HTML', keyboard_type: 'none', inline_buttons: [], reply_buttons: [] },
  },
  condition: {
    icon: GitBranch,
    category: 'logic',
    color: '#f59e0b',
    label: 'Condition',
    description: 'Branch based on any condition',
    defaultConfig: { field: '', operator: 'eq', value: '' },
  },
  delay: {
    icon: Clock,
    category: 'logic',
    color: '#f59e0b',
    label: 'Delay',
    description: 'Pause execution for a duration',
    defaultConfig: { amount: 1, unit: 'seconds' },
  },
  http_request: {
    icon: Globe,
    category: 'logic',
    color: '#6366f1',
    label: 'HTTP Request',
    description: 'Call any external API',
    defaultConfig: { method: 'GET', url: '', output_variable: 'response', headers: {} },
  },
  ai_reply: {
    icon: Bot,
    category: 'ai',
    color: '#10b981',
    label: 'AI Reply',
    description: 'Generate response with AI',
    defaultConfig: { model: 'gpt-4o-mini', system_prompt: '', max_tokens: 500, temperature: 0.7 },
  },
  variable: {
    icon: Database,
    category: 'data',
    color: '#f43f5e',
    label: 'Variable',
    description: 'Set, get, or update a variable',
    defaultConfig: { action: 'set', key: '', value: '' },
  },
  split: {
    icon: Shuffle,
    category: 'logic',
    color: '#f59e0b',
    label: 'A/B Split',
    description: 'Split traffic randomly',
    defaultConfig: { branches: [{ label: 'A', weight: 50 }, { label: 'B', weight: 50 }] },
  },
  loop: {
    icon: RefreshCw,
    category: 'logic',
    color: '#f59e0b',
    label: 'Loop',
    description: 'Iterate over a list variable',
    defaultConfig: { list_variable: '', item_variable: 'item', max_iterations: 10 },
  },
  track_event: {
    icon: BarChart2,
    category: 'analytics',
    color: '#0ea5e9',
    label: 'Track Event',
    description: 'Log analytics event',
    defaultConfig: { event_name: '', properties: {} },
  },
}

export function getNodeMeta(nodeType: string): NodeTypeMeta {
  return NODE_TYPE_META[nodeType] ?? NODE_TYPE_META.message
}

export function getNodeCategory(nodeType: string): NodeCategory {
  return NODE_TYPE_META[nodeType]?.category ?? 'message'
}

export const NODE_CATEGORIES: { id: NodeCategory; label: string; color: string }[] = [
  { id: 'trigger',   label: 'Triggers',   color: '#8b5cf6' },
  { id: 'message',   label: 'Messages',   color: '#3b82f6' },
  { id: 'logic',     label: 'Logic',      color: '#f59e0b' },
  { id: 'ai',        label: 'AI',         color: '#10b981' },
  { id: 'data',      label: 'Data',       color: '#f43f5e' },
  { id: 'analytics', label: 'Analytics',  color: '#0ea5e9' },
]

// Chat context types
export type TriggerContext = 'user' | 'group' | 'channel' | 'business'

export const TRIGGER_CONTEXTS: { id: TriggerContext; label: string; icon: string; color: string; description: string }[] = [
  { id: 'user',     label: 'User',     icon: '👤', color: '#3b82f6', description: 'Private chats' },
  { id: 'group',    label: 'Group',    icon: '👥', color: '#8b5cf6', description: 'Groups & supergroups' },
  { id: 'channel',  label: 'Channel',  icon: '📢', color: '#f59e0b', description: 'Telegram channels' },
  { id: 'business', label: 'Business', icon: '💼', color: '#10b981', description: 'Business accounts' },
]

// Events per context
export const CONTEXT_EVENTS: Record<TriggerContext, { value: string; label: string; description?: string }[]> = {
  user: [
    { value: 'message',      label: 'Text message',       description: 'Any text in private chat' },
    { value: 'command',      label: '/Command',            description: 'Bot command like /start' },
    { value: 'callback',     label: 'Button callback',     description: 'Inline button tap' },
    { value: 'photo',        label: 'Photo',               description: 'Image sent' },
    { value: 'video',        label: 'Video',               description: 'Video sent' },
    { value: 'voice',        label: 'Voice',               description: 'Voice message' },
    { value: 'audio',        label: 'Audio',               description: 'Music file' },
    { value: 'document',     label: 'Document',            description: 'Any file' },
    { value: 'sticker',      label: 'Sticker',             description: 'Sticker sent' },
    { value: 'animation',    label: 'GIF / Animation',     description: 'Animated image' },
    { value: 'location',     label: 'Location',            description: 'Location shared' },
    { value: 'contact',      label: 'Contact',             description: 'Contact shared' },
    { value: 'reaction',     label: 'Reaction',            description: 'Emoji reaction' },
    { value: 'edited',       label: 'Edited message',      description: 'User edited a message' },
    { value: 'forwarded',    label: 'Forwarded message',   description: 'Forwarded from another chat' },
    { value: 'inline_query', label: 'Inline query',        description: '@bot query in any chat' },
    { value: 'scheduled',    label: 'Scheduled (cron)',    description: 'Time-based trigger' },
  ],
  group: [
    { value: 'message',      label: 'Text message',        description: 'Any text in group' },
    { value: 'command',      label: '/Command',             description: 'Bot command in group' },
    { value: 'callback',     label: 'Button callback',      description: 'Inline button tap' },
    { value: 'photo',        label: 'Photo',                description: 'Image sent to group' },
    { value: 'video',        label: 'Video' },
    { value: 'voice',        label: 'Voice' },
    { value: 'audio',        label: 'Audio' },
    { value: 'document',     label: 'Document' },
    { value: 'sticker',      label: 'Sticker' },
    { value: 'animation',    label: 'GIF / Animation' },
    { value: 'location',     label: 'Location' },
    { value: 'join',         label: 'Member joined',        description: 'New member in group' },
    { value: 'leave',        label: 'Member left',          description: 'Member removed/left' },
    { value: 'reaction',     label: 'Reaction',             description: 'Emoji reaction on message' },
    { value: 'edited',       label: 'Edited message',       description: 'Message edited in group' },
    { value: 'forwarded',    label: 'Forwarded message' },
    { value: 'pinned',       label: 'Message pinned',       description: 'Admin pinned a message' },
    { value: 'scheduled',    label: 'Scheduled (cron)' },
  ],
  channel: [
    { value: 'channel_post',        label: 'New post',              description: 'New post published' },
    { value: 'edited_channel_post', label: 'Edited post',           description: 'Existing post edited' },
    { value: 'callback',            label: 'Button callback',       description: 'Inline button in post tapped' },
    { value: 'reaction',            label: 'Reaction',              description: 'Emoji reaction on post' },
    { value: 'scheduled',           label: 'Scheduled (cron)' },
  ],
  business: [
    { value: 'business_message',    label: 'Business message',      description: 'Message from business account user' },
    { value: 'business_connection', label: 'New connection',        description: 'User connected their business account' },
    { value: 'edited_business',     label: 'Edited message',        description: 'Business message edited' },
    { value: 'deleted_business',    label: 'Deleted message',       description: 'Business message deleted' },
    { value: 'callback',            label: 'Button callback' },
    { value: 'scheduled',           label: 'Scheduled (cron)' },
  ],
}

// Flat list (for backwards compat / preview)
export const TRIGGER_EVENTS = Object.values(CONTEXT_EVENTS)
  .flat()
  .filter((e, i, arr) => arr.findIndex(x => x.value === e.value) === i)

export const FILTER_FIELDS = [
  { value: 'text',          label: 'Message text' },
  { value: 'command',       label: 'Command name' },
  { value: 'callback_data', label: 'Callback data' },
  { value: 'user.id',       label: 'User ID' },
  { value: 'user.username', label: 'Username' },
  { value: 'chat.type',     label: 'Chat type' },
  { value: 'media_type',    label: 'Media type' },
]

export const FILTER_OPERATORS = [
  { value: 'eq',           label: '= equals' },
  { value: 'ne',           label: '≠ not equals' },
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'starts_with',  label: 'starts with' },
  { value: 'ends_with',    label: 'ends with' },
  { value: 'regex',        label: 'regex match' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

export const MESSAGE_CONTENT_TYPES = [
  { value: 'text',        label: 'Text' },
  { value: 'photo',       label: 'Photo' },
  { value: 'video',       label: 'Video' },
  { value: 'animation',   label: 'GIF / Animation' },
  { value: 'voice',       label: 'Voice' },
  { value: 'audio',       label: 'Audio' },
  { value: 'document',    label: 'Document' },
  { value: 'sticker',     label: 'Sticker' },
  { value: 'location',    label: 'Location' },
  { value: 'contact',     label: 'Contact' },
  { value: 'poll',        label: 'Poll' },
  { value: 'media_group', label: 'Media group' },
]
