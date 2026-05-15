import React from 'react'
import { NODE_TYPE_META, NODE_CATEGORIES, type NodeCategory } from '../nodes/nodeTypeMeta'
import { cn } from '../../../lib/utils'

export function NodeSidebar() {
  const groupedByCategory = NODE_CATEGORIES.map(cat => ({
    ...cat,
    nodes: Object.entries(NODE_TYPE_META).filter(([, m]) => m.category === cat.id),
  })).filter(cat => cat.nodes.length > 0)

  return (
    <div className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full shrink-0">
      <div className="px-4 py-3 border-b border-neutral-800">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Nodes</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {groupedByCategory.map(({ id, label, color, nodes }) => (
          <div key={id} className="mb-3">
            <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color }}>
              {label}
            </p>
            <div className="space-y-0.5 px-2">
              {nodes.map(([nodeType, meta]) => (
                <DraggableNode key={nodeType} nodeType={nodeType} meta={meta} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-neutral-800">
        <p className="text-[10px] text-white/20 text-center">Drag nodes onto canvas</p>
      </div>
    </div>
  )
}

function DraggableNode({ nodeType, meta }: { nodeType: string; meta: typeof NODE_TYPE_META[string] }) {
  const Icon = meta.icon

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/botbuilder-node', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing',
        'hover:bg-white/5 transition-colors group select-none border border-transparent',
        'hover:border-white/8',
      )}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${meta.color}22` }}
      >
        <Icon size={13} style={{ color: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/75 group-hover:text-white/95 transition-colors truncate">
          {meta.label}
        </p>
        <p className="text-[10px] text-white/25 truncate leading-tight">{meta.description}</p>
      </div>
    </div>
  )
}
