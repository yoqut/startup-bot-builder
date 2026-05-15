import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { useBuilderStore, type NodeData } from '../../../stores/builderStore'
import { getNodeMeta, getNodeCategory, TRIGGER_EVENTS } from './nodeTypeMeta'

type ExecutionStatus = 'idle' | 'active' | 'done' | 'error'

function useNodeExecutionStatus(nodeId: string): ExecutionStatus {
  const { executingNodeIds, completedNodeIds, errorNodeIds, isExecutionMode } = useBuilderStore()
  if (!isExecutionMode) return 'idle'
  if (executingNodeIds.has(nodeId)) return 'active'
  if (errorNodeIds.has(nodeId)) return 'error'
  if (completedNodeIds.has(nodeId)) return 'done'
  return 'idle'
}

const categoryBg: Record<string, string> = {
  trigger:   'from-violet-500/15 to-purple-500/15 border-violet-500/35',
  message:   'from-blue-500/15 to-cyan-500/15 border-blue-500/35',
  logic:     'from-amber-500/15 to-orange-500/15 border-amber-500/35',
  ai:        'from-emerald-500/15 to-teal-500/15 border-emerald-500/35',
  data:      'from-rose-500/15 to-pink-500/15 border-rose-500/35',
  analytics: 'from-sky-500/15 to-blue-500/15 border-sky-500/35',
}

const statusRings: Record<ExecutionStatus, string> = {
  idle:   '',
  active: 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-neutral-950',
  done:   'ring-2 ring-emerald-400 ring-offset-1 ring-offset-neutral-950',
  error:  'ring-2 ring-red-500 ring-offset-1 ring-offset-neutral-950',
}

export const CustomNode = memo(({ id, data, selected }: NodeProps<NodeData>) => {
  const status = useNodeExecutionStatus(id)
  const category = getNodeCategory(data.nodeType)
  const meta = getNodeMeta(data.nodeType)
  const Icon = meta.icon
  const colorClass = categoryBg[category] ?? categoryBg.message

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'relative min-w-[190px] max-w-[240px] rounded-xl border bg-gradient-to-br backdrop-blur-sm',
        'transition-all duration-150 select-none overflow-visible',
        colorClass,
        selected && 'shadow-lg shadow-white/5 brightness-110',
        statusRings[status],
      )}
    >
      <AnimatePresence>
        {status === 'active' && (
          <motion.div
            key="pulse"
            className="absolute inset-0 rounded-xl bg-yellow-400/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${meta.color}25` }}
        >
          <Icon size={14} style={{ color: meta.color }} />
        </div>
        <span className="text-xs font-semibold text-white/90 truncate flex-1">
          {data.label}
        </span>
        {status !== 'idle' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              status === 'active' && 'bg-yellow-400',
              status === 'done'   && 'bg-emerald-400',
              status === 'error'  && 'bg-red-500',
            )}
          />
        )}
      </div>

      {/* Preview */}
      <div className="px-3 py-2 min-h-[30px]">
        <NodePreview nodeType={data.nodeType} config={data.config} />
      </div>

      {/* Handles */}
      {category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3.5 !h-3.5 !border-2 !border-white/50 !bg-neutral-800 hover:!border-violet-400 hover:!bg-violet-900/50"
        />
      )}

      {data.nodeType === 'condition' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true"
            style={{ left: '33%' }}
            className="!w-3.5 !h-3.5 !border-2 !border-emerald-400/80 !bg-neutral-800" />
          <Handle type="source" position={Position.Bottom} id="false"
            style={{ left: '67%' }}
            className="!w-3.5 !h-3.5 !border-2 !border-red-400/80 !bg-neutral-800" />
        </>
      ) : data.nodeType === 'split' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="a"
            style={{ left: '33%' }}
            className="!w-3.5 !h-3.5 !border-2 !border-blue-400/80 !bg-neutral-800" />
          <Handle type="source" position={Position.Bottom} id="b"
            style={{ left: '67%' }}
            className="!w-3.5 !h-3.5 !border-2 !border-violet-400/80 !bg-neutral-800" />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3.5 !h-3.5 !border-2 !border-white/50 !bg-neutral-800 hover:!border-violet-400 hover:!bg-violet-900/50"
        />
      )}
    </motion.div>
  )
})

CustomNode.displayName = 'CustomNode'


function NodePreview({ nodeType, config }: { nodeType: string; config: Record<string, unknown> }) {
  switch (nodeType) {
    case 'trigger': {
      const contexts = config.contexts as Record<string, { enabled: boolean; events: string[] }> | undefined
      const filters = (config.filters as unknown[]) ?? []

      // Count active contexts and total events
      const activeContexts = contexts
        ? Object.entries(contexts).filter(([, v]) => v.enabled)
        : []
      const totalEvents = activeContexts.reduce((sum, [, v]) => sum + (v.events?.length ?? 0), 0)

      const contextIcons: Record<string, string> = { user: '👤', group: '👥', channel: '📢', business: '💼' }
      const contextColors: Record<string, string> = { user: '#3b82f6', group: '#8b5cf6', channel: '#f59e0b', business: '#10b981' }

      if (activeContexts.length === 0) {
        return <p className="text-[11px] text-white/30">No context selected</p>
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            {activeContexts.map(([ctx]) => (
              <span key={ctx}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: `${contextColors[ctx]}20`, color: contextColors[ctx] }}>
                {contextIcons[ctx]} {ctx}
              </span>
            ))}
          </div>
          {totalEvents > 0 && (
            <p className="text-[10px] text-white/30">{totalEvents} event{totalEvents > 1 ? 's' : ''}{filters.length > 0 ? ` · ${filters.length} filter${filters.length > 1 ? 's' : ''}` : ''}</p>
          )}
        </div>
      )
    }
    case 'message': {
      const ct = (config.content_type as string) || 'text'
      const text = config.text as string | undefined
      const kb = config.keyboard_type as string | undefined
      return (
        <div>
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 capitalize mb-1">
            {ct}
          </span>
          {text && (
            <p className="text-[11px] text-white/50 truncate">
              "{text.slice(0, 38)}{text.length > 38 ? '…' : ''}"
            </p>
          )}
          {kb && kb !== 'none' && (
            <p className="text-[10px] text-white/30 mt-0.5">{kb} keyboard</p>
          )}
        </div>
      )
    }
    case 'condition': {
      const field = config.field as string | undefined
      const op = config.operator as string | undefined
      const val = config.value as string | undefined
      return (
        <p className="text-[11px] text-white/50 truncate">
          {field || '…'} {op} {val ?? ''}
        </p>
      )
    }
    case 'delay': {
      const amt = config.amount as number | undefined
      const unit = config.unit as string | undefined
      return <p className="text-[11px] text-white/50">{amt ?? '?'} {unit ?? 'seconds'}</p>
    }
    case 'http_request': {
      const method = (config.method as string) || 'GET'
      const url = config.url as string | undefined
      return (
        <p className="text-[11px] text-white/50 truncate">
          <span className="text-indigo-400 font-medium">{method}</span>{' '}
          {url ? url.replace(/^https?:\/\//, '').slice(0, 28) : 'No URL'}
        </p>
      )
    }
    case 'ai_reply': {
      const model = (config.model as string) || 'gpt-4o-mini'
      const prompt = config.system_prompt as string | undefined
      return (
        <div>
          <span className="text-[10px] text-emerald-400">{model}</span>
          {prompt && <p className="text-[11px] text-white/40 truncate mt-0.5">{prompt.slice(0, 35)}</p>}
        </div>
      )
    }
    case 'variable': {
      const action = (config.action as string) || 'set'
      const key = config.key as string | undefined
      return (
        <p className="text-[11px] text-white/50">
          <span className="capitalize text-rose-400">{action}</span> {key ? `{{${key}}}` : '…'}
        </p>
      )
    }
    case 'track_event': {
      return <p className="text-[11px] text-white/50 truncate">{(config.event_name as string) || 'unnamed event'}</p>
    }
    default:
      return null
  }
}
