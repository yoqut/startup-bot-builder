import { useState } from 'react'
import { ChevronRight, Eye, EyeOff, Lock, Unlock } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useWebAppStore } from '@/store/webapp.store'
import { COMPONENT_DEFAULTS } from './registry'
import type { WbNode, WbPage } from '@/types/webapp'

interface LayerItemProps {
  nodeId: string
  nodes: Record<string, WbNode>
  depth: number
}

function LayerItem({ nodeId, nodes, depth }: LayerItemProps) {
  const [expanded, setExpanded] = useState(true)
  const { selectedNodeId, selectNode, updateNodeMeta } = useWebAppStore(useShallow((s) => ({
    selectedNodeId: s.selectedNodeId,
    selectNode:     s.selectNode,
    updateNodeMeta: s.updateNodeMeta,
  })))

  const node = nodes[nodeId]
  if (!node) return null

  const def = COMPONENT_DEFAULTS[node.type]
  const hasChildren = node.children.length > 0
  const isSelected = selectedNodeId === nodeId
  const isHidden = !!node.meta?.hidden
  const isLocked = !!node.meta?.locked
  const name = node.meta?.name || def?.label || node.type

  return (
    <div>
      <div
        onClick={() => selectNode(nodeId)}
        className={`
          flex items-center gap-[5px] py-[6px] pr-2 rounded-lg cursor-pointer
          transition-all duration-100 group
          ${isSelected ? 'bg-tg-accent/15 text-tg-accent' : 'text-tg-text hover:bg-tg-card'}
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
          className={`
            size-4 flex items-center justify-center rounded border-none
            bg-transparent cursor-pointer text-current transition-all shrink-0
            ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
        >
          <ChevronRight
            size={11}
            className={`transition-transform duration-150 ${expanded && hasChildren ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Label */}
        <span className="flex-1 text-[12px] font-medium truncate min-w-0">{name}</span>

        {/* Actions (shown on hover or selected) */}
        <div className={`flex gap-1 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateNodeMeta(nodeId, { hidden: !isHidden })
            }}
            className="size-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-current opacity-60 hover:opacity-100"
          >
            {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateNodeMeta(nodeId, { locked: !isLocked })
            }}
            className="size-5 bg-transparent border-none cursor-pointer flex items-center justify-center text-current opacity-60 hover:opacity-100"
          >
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((childId) => (
            <LayerItem
              key={childId}
              nodeId={childId}
              nodes={nodes}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LayerTree() {
  const page = useWebAppStore((s) => s.getCurrentPage()) as WbPage | null

  if (!page) return null

  return (
    <div className="flex flex-col h-full bg-tg-bg overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-tg-darkborder shrink-0">
        <p className="text-[11px] font-semibold text-tg-muted uppercase tracking-wider m-0">
          Qatlamlar
        </p>
      </div>
      <div className="flex-1 overflow-y-auto touch-scroll px-1 py-1">
        <LayerItem
          nodeId={page.rootNodeId}
          nodes={page.nodes}
          depth={0}
        />
      </div>
    </div>
  )
}
