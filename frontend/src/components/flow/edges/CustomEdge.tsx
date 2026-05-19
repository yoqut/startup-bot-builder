import { useState } from 'react'
import {
  EdgeLabelRenderer, getSmoothStepPath, useReactFlow,
  type EdgeProps, Position,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { edgeColor } from '@/pages/FlowBuilder/helpers/flowHelpers'

function edgeLabel(handle: string | null | undefined): string | null {
  if (handle === 'true')          return 'HA'
  if (handle === 'false')         return "YO'Q"
  if (handle?.startsWith('btn_')) return `${parseInt(handle.replace('btn_', '')) + 1}-btn`
  return null
}

// Small clean arrowhead drawn at the target endpoint
function Arrowhead({ x, y, position, color, active }: {
  x: number; y: number; position: Position; color: string; active: boolean
}) {
  const s = 6
  let points: string
  switch (position) {
    case Position.Top:    points = `${x},${y} ${x - s * .65},${y - s} ${x + s * .65},${y - s}`; break
    case Position.Bottom: points = `${x},${y} ${x - s * .65},${y + s} ${x + s * .65},${y + s}`; break
    case Position.Left:   points = `${x},${y} ${x + s},${y - s * .65} ${x + s},${y + s * .65}`; break
    default:              points = `${x},${y} ${x - s},${y - s * .65} ${x - s},${y + s * .65}`; break
  }
  return (
    <polygon
      points={points}
      fill={color}
      opacity={active ? 1 : 0.65}
      style={{ pointerEvents: 'none', transition: 'opacity 0.15s' }}
    />
  )
}

// Draggable endpoint dot — purely visual hint for reconnect
function EndpointDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <circle
      cx={x} cy={y} r={3.5}
      fill="#17212b"
      stroke={color}
      strokeWidth={1.5}
      style={{ pointerEvents: 'none' }}
    />
  )
}

export function CustomEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  sourceHandleId, selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const { setEdges } = useReactFlow()

  const color = edgeColor(sourceHandleId)
  const label = edgeLabel(sourceHandleId)
  const active = !!(selected || hovered)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 14,
  })

  function deleteEdge(e: React.MouseEvent) {
    e.stopPropagation()
    setEdges(eds => eds.filter(ed => ed.id !== id))
  }

  const btnY = label ? labelY - 20 : labelY

  return (
    <>
      {/* Transparent 24px hit area for easy hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Glow behind — only when active */}
      {active && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeOpacity={0.14}
          style={{ filter: 'blur(5px)', pointerEvents: 'none' }}
        />
      )}

      {/* Main stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeOpacity={active ? 1 : 0.5}
        style={{ transition: 'stroke-width 0.15s, stroke-opacity 0.15s', pointerEvents: 'none' }}
      />

      {/* Animated flow dashes — always on, faster when active */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={active ? 1.5 : 1}
        strokeOpacity={active ? 0.5 : 0.18}
        strokeDasharray="5 14"
        style={{
          animation: `edgeFlow ${active ? '0.55s' : '1.8s'} linear infinite`,
          pointerEvents: 'none',
          transition: 'stroke-opacity 0.2s',
        }}
      />

      {/* Custom arrowhead — replaces React Flow's default triangle */}
      <Arrowhead
        x={targetX} y={targetY}
        position={targetPosition}
        color={color}
        active={active}
      />

      {/* Endpoint drag-hint dots — visible on hover to show reconnect affordance */}
      {active && (
        <>
          <EndpointDot x={sourceX} y={sourceY} color={color} />
          <EndpointDot x={targetX} y={targetY} color={color} />
        </>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${btnY}px)`,
            pointerEvents: 'all',
          }}
          className="absolute nodrag nopan flex flex-col items-center gap-[4px]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Delete button — only visible on hover/select */}
          {active && (
            <button
              onClick={deleteEdge}
              className="w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-120 hover:scale-110"
              style={{
                background: '#13202c',
                border: `1px solid ${color}50`,
                color: '#7d9ab5',
                boxShadow: `0 0 6px ${color}28`,
              }}
              title="Bog'lanishni o'chirish"
            >
              <X size={9} />
            </button>
          )}

          {/* Semantic label pill (HA / YO'Q / N-btn) */}
          {label && (
            <div
              className="px-[7px] py-[2px] rounded-[7px] text-[9px] font-bold leading-none border select-none"
              style={{
                background: `${color}18`,
                borderColor: `${color}40`,
                color,
                opacity: active ? 1 : 0.65,
                transition: 'opacity 0.15s',
              }}
            >
              {label}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
