import React, { memo } from 'react'
import type { WbNode, WbPage, WbStyle } from '@/types/webapp'
import { useShallow } from 'zustand/react/shallow'
import { useWebAppStore } from '@/store/webapp.store'
import { COMPONENT_DEFAULTS } from './registry'

// ── Style conversion ───────────────────────────────────────────────────────────

function px(v: number | string): string {
  return typeof v === 'number' ? `${v}px` : v
}

function spacing(v: number | number[]): string {
  if (Array.isArray(v)) return v.map((n) => `${n}px`).join(' ')
  return `${v}px`
}

function toCSS(s: WbStyle): React.CSSProperties {
  return {
    width:           s.width !== undefined ? px(s.width) : undefined,
    height:          s.height !== undefined ? px(s.height) : undefined,
    minHeight:       s.minHeight !== undefined ? `${s.minHeight}px` : undefined,
    maxWidth:        s.maxWidth !== undefined ? `${s.maxWidth}px` : undefined,
    flex:            s.flex,
    padding:         s.padding !== undefined ? spacing(s.padding) : undefined,
    margin:          s.margin !== undefined ? spacing(s.margin) : undefined,
    backgroundColor: s.bg,
    color:           s.color,
    fontSize:        s.fontSize ? `${s.fontSize}px` : undefined,
    fontWeight:      s.fontWeight,
    lineHeight:      s.lineHeight,
    textAlign:       s.textAlign,
    letterSpacing:   s.letterSpacing ? `${s.letterSpacing}px` : undefined,
    borderRadius:    s.borderRadius !== undefined
                       ? Array.isArray(s.borderRadius) ? spacing(s.borderRadius) : `${s.borderRadius}px`
                       : undefined,
    border:          s.border,
    boxShadow:       s.shadow,
    opacity:         s.opacity,
    overflow:        s.overflow,
    display:         s.display,
    flexDirection:   s.flexDir,
    gap:             s.gap !== undefined ? `${s.gap}px` : undefined,
    alignItems:      s.align,
    justifyContent:  s.justify,
    flexWrap:        s.wrap,
    position:        s.position,
    top:             s.top !== undefined ? `${s.top}px` : undefined,
    bottom:          s.bottom !== undefined ? `${s.bottom}px` : undefined,
    left:            s.left !== undefined ? `${s.left}px` : undefined,
    right:           s.right !== undefined ? `${s.right}px` : undefined,
    zIndex:          s.zIndex,
    backdropFilter:  s.backdropFilter,
    cursor:          s.cursor,
    transition:      s.transition,
    objectFit:       s.objectFit as React.CSSProperties['objectFit'],
    boxSizing:       'border-box',
  }
}

// ── Individual components ──────────────────────────────────────────────────────

function NodeText({ node }: { node: WbNode }) {
  const Tag = ((node.props.tag as string) || 'p') as React.ElementType
  return (
    <Tag style={{ ...toCSS(node.style), margin: 0 }}>
      {(node.props.content as string) || 'Matn'}
    </Tag>
  )
}

function NodeButton({ node }: { node: WbNode }) {
  const variant = (node.props.variant as string) || 'primary'
  const size    = (node.props.size as string) || 'md'
  const full    = !!node.props.fullWidth

  const variantStyle: Record<string, React.CSSProperties> = {
    primary:   { background: '#2481cc', color: '#fff', border: 'none' },
    secondary: { background: '#242f3d', color: '#c8d8e8', border: '1px solid #253545' },
    ghost:     { background: 'transparent', color: '#2481cc', border: '1px solid #2481cc' },
    danger:    { background: '#e53935', color: '#fff', border: 'none' },
  }
  const sizeStyle: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 14px', fontSize: '12px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '13px 28px', fontSize: '16px' },
  }

  return (
    <button
      style={{
        ...toCSS(node.style),
        ...variantStyle[variant],
        ...sizeStyle[size],
        width: full ? '100%' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {(node.props.label as string) || 'Tugma'}
    </button>
  )
}

function NodeImage({ node }: { node: WbNode }) {
  const src = (node.props.src as string) || ''
  const alt = (node.props.alt as string) || ''

  if (!src) {
    return (
      <div style={{ ...toCSS(node.style), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#4a6278', fontSize: 12 }}>Rasm URL kiriting</span>
      </div>
    )
  }
  return <img src={src} alt={alt} style={toCSS(node.style)} />
}

function NodeInput({ node }: { node: WbNode }) {
  const label = (node.props.label as string) || ''
  const placeholder = (node.props.placeholder as string) || 'Kiriting...'
  const type = (node.props.type as string) || 'text'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label style={{ fontSize: 12, color: '#7d9ab5', fontWeight: 500 }}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        readOnly
        style={{ ...toCSS(node.style), outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  )
}

function NodeTextarea({ node }: { node: WbNode }) {
  const label = (node.props.label as string) || ''
  const placeholder = (node.props.placeholder as string) || 'Kiriting...'
  const rows = (node.props.rows as number) || 4

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && <label style={{ fontSize: 12, color: '#7d9ab5', fontWeight: 500 }}>{label}</label>}
      <textarea
        placeholder={placeholder}
        rows={rows}
        readOnly
        style={{ ...toCSS(node.style), outline: 'none', resize: 'none', fontFamily: 'inherit' }}
      />
    </div>
  )
}

function NodeBadge({ node }: { node: WbNode }) {
  const color = (node.props.color as string) || '#2481cc'
  return (
    <span
      style={{
        ...toCSS(node.style),
        backgroundColor: `${color}20`,
        color,
        border: `1px solid ${color}40`,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {(node.props.label as string) || 'Badge'}
    </span>
  )
}

function NodeAvatar({ node }: { node: WbNode }) {
  const src      = (node.props.src as string) || ''
  const initials = (node.props.initials as string) || 'A'
  const size     = (node.props.size as number) || 40

  const base: React.CSSProperties = {
    ...toCSS(node.style),
    width: size,
    height: size,
    minWidth: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.38,
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
  }

  if (src) return <img src={src} alt={initials} style={base} />
  return <div style={base}>{initials.slice(0, 2).toUpperCase()}</div>
}

// ── Node renderer ──────────────────────────────────────────────────────────────

interface RenderNodeProps {
  nodeId: string
  nodes: Record<string, WbNode>
  isEditing: boolean
  depth?: number
}

export const RenderNode = memo(function RenderNode({
  nodeId,
  nodes,
  isEditing,
  depth = 0,
}: RenderNodeProps) {
  const { selectedNodeId, hoveredNodeId, selectNode, setHovered } = useWebAppStore(useShallow((s) => ({
    selectedNodeId: s.selectedNodeId,
    hoveredNodeId:  s.hoveredNodeId,
    selectNode:     s.selectNode,
    setHovered:     s.setHovered,
  })))

  const node = nodes[nodeId]
  if (!node || depth > 40) return null
  if (node.meta?.hidden && !isEditing) return null

  const isSelected = isEditing && selectedNodeId === nodeId
  const isHovered  = isEditing && hoveredNodeId  === nodeId && !isSelected

  const def = COMPONENT_DEFAULTS[node.type]
  const canHaveChildren = def?.canHaveChildren ?? false

  const editorOverlay: React.CSSProperties = isEditing ? {
    outline: isSelected
      ? '2px solid #2481cc'
      : isHovered
      ? '1px dashed rgba(36,129,204,0.6)'
      : 'none',
    outlineOffset: isSelected ? -2 : -1,
    cursor: 'pointer',
    userSelect: 'none',
  } : {}

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) return
    e.stopPropagation()
    selectNode(nodeId)
  }
  const handleMouseEnter = () => { if (isEditing) setHovered(nodeId) }
  const handleMouseLeave = () => { if (isEditing) setHovered(null) }

  // ── Container types ────────────────────────────────────────────────────────
  if (canHaveChildren || node.type === 'screen') {
    const isEmpty = node.children.length === 0

    return (
      <div
        style={{ ...toCSS(node.style), ...editorOverlay, position: 'relative' }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isEmpty && isEditing && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 11, color: '#4a6278' }}>
              {node.type === 'screen' ? 'Komponent qo\'shing →' : 'Bo\'sh'}
            </span>
          </div>
        )}
        {node.children.map((childId) => (
          <RenderNode
            key={childId}
            nodeId={childId}
            nodes={nodes}
            isEditing={isEditing}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  // ── Leaf types ─────────────────────────────────────────────────────────────
  const wrapStyle: React.CSSProperties = {
    ...editorOverlay,
    display: ['text', 'button', 'badge', 'avatar'].includes(node.type) ? 'contents' : 'block',
  }

  const leaf = (() => {
    switch (node.type) {
      case 'text':     return <NodeText node={node} />
      case 'button':   return <NodeButton node={node} />
      case 'image':    return <NodeImage node={node} />
      case 'input':    return <NodeInput node={node} />
      case 'textarea': return <NodeTextarea node={node} />
      case 'badge':    return <NodeBadge node={node} />
      case 'avatar':   return <NodeAvatar node={node} />
      case 'spacer':
        return <div style={{ ...toCSS(node.style) }} />
      case 'divider':
        return <hr style={{ ...toCSS(node.style), border: 'none' }} />
      default:
        return <div style={toCSS(node.style)} />
    }
  })()

  return (
    <div style={wrapStyle} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {leaf}
    </div>
  )
})

// ── Page renderer ──────────────────────────────────────────────────────────────

interface RenderEngineProps {
  page: WbPage
  isEditing?: boolean
}

export const RenderEngine = memo(function RenderEngine({ page, isEditing = false }: RenderEngineProps) {
  const selectNode = useWebAppStore((s) => s.selectNode)

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isEditing) return
    if (e.target === e.currentTarget) selectNode(null)
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        background: page.bgColor ?? 'transparent',
        overflow: 'auto',
      }}
      onClick={handleCanvasClick}
    >
      <RenderNode
        nodeId={page.rootNodeId}
        nodes={page.nodes}
        isEditing={isEditing}
        depth={0}
      />
    </div>
  )
})
