import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X, Zap } from 'lucide-react'
import type { TemplateDetail } from '@/types/template'

// ── Simple read-only node ──────────────────────────────────────────────────────
const NODE_TYPE_ICONS: Record<string, string> = {
  start: '▶', handler: '⚡', command: '/', message: '💬',
  button: '🔘', input: '📝', condition: '◆', delay: '⏱',
  set_variable: '📦', api_call: '🌐', ai: '🤖', media: '🖼',
  catalog: '📋', end: '⏹',
}

function PreviewNode({ data }: { data: { type: string; label?: string; config?: Record<string, unknown> } }) {
  const icon = NODE_TYPE_ICONS[data.type] ?? '📌'
  const label = data.label || (data.config?.text as string) || data.type

  return (
    <div
      className="bg-tg-card border border-tg-input rounded-[12px] px-3 py-2 min-w-[110px] max-w-[160px] shadow-md"
      style={{ fontSize: 11 }}
    >
      <div className="text-tg-muted text-[9px] uppercase tracking-wide mb-0.5 flex items-center gap-1">
        <span>{icon}</span>
        <span>{data.type}</span>
      </div>
      <div className="text-white font-medium leading-tight line-clamp-2" style={{ fontSize: 11 }}>
        {String(label).slice(0, 60)}
      </div>
    </div>
  )
}

const nodeTypes = { default: PreviewNode }

type FlowNode = NonNullable<TemplateDetail['flow_data']>['nodes'][number]
type FlowEdge = NonNullable<TemplateDetail['flow_data']>['edges'][number]

// ── Auto-layout helper ─────────────────────────────────────────────────────────
function autoLayout(rawNodes: FlowNode[]) {
  const COLS = 3
  const COL_W = 220
  const ROW_H = 130

  return rawNodes.map((n: FlowNode, i: number) => ({
    id: n.id,
    type: 'default',
    position: n.position ?? { x: (i % COLS) * COL_W, y: Math.floor(i / COLS) * ROW_H },
    data: { type: n.type, label: n.label, config: n.config },
  }))
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  template: TemplateDetail
  onClose: () => void
  onUse: () => void
}

export default function TemplatePreviewFlow({ template, onClose, onUse }: Props) {
  const { t } = useTranslation()

  const rfNodes = useMemo(() => {
    if (!template.flow_data?.nodes) return []
    return autoLayout(template.flow_data.nodes)
  }, [template.flow_data])

  const rfEdges = useMemo(() => {
    if (!template.flow_data?.edges) return []
    return template.flow_data.edges.map((e: FlowEdge, i: number) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.condition_key || undefined,
      style: { stroke: '#2481cc', strokeWidth: 1.5 },
      labelStyle: { fill: '#7d9ab5', fontSize: 9 },
    }))
  }, [template.flow_data])

  const [nodes, , onNodesChange] = useNodesState(rfNodes)
  const [edges, , onEdgesChange] = useEdgesState(rfEdges)

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-tg-bg border-b border-tg-darkborder shrink-0">
        <div>
          <p className="text-[11px] text-tg-muted m-0">{t('templates.preview_flow.readonly')}</p>
          <h3 className="text-[15px] font-bold text-white m-0">{template.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUse}
            className="flex items-center gap-1.5 bg-tg-accent border-none rounded-xl px-4 py-2 text-white text-[13px] font-semibold cursor-pointer"
          >
            <Zap size={13} />
            {t('templates.preview_flow.use_cta')}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-tg-card border border-tg-input flex items-center justify-center text-tg-muted hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {rfNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-tg-muted text-[14px]">
            Flow ma'lumotlari mavjud emas
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: 'var(--color-tg-bg, #17212b)' }}
          >
            <MiniMap
              style={{ background: 'var(--color-tg-card, #1e2b38)' }}
              nodeColor="#2481cc"
              maskColor="rgba(0,0,0,0.4)"
            />
            <Controls showInteractive={false} />
            <Background variant={BackgroundVariant.Dots} color="#2c3e50" gap={20} size={1} />
          </ReactFlow>
        )}
      </div>
    </div>
  )
}
