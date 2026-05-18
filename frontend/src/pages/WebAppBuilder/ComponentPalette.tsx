import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import {
  Square, Columns2, RectangleHorizontal,
  Type, MousePointerClick, Image as ImageIcon,
  AlignVerticalSpaceAround, Minus, Tag, CircleUser,
  TextCursorInput, AlignLeft, Search,
} from 'lucide-react'
import { COMPONENT_REGISTRY, CATEGORIES } from './registry'
import { useWebAppStore } from '@/store/webapp.store'
import type { WbNodeType } from '@/types/webapp'

const ICON_MAP: Record<string, React.ElementType> = {
  Square, Columns2, RectangleHorizontal,
  Type, MousePointerClick, Image: ImageIcon,
  AlignVerticalSpaceAround, Minus, Tag, CircleUser,
  TextCursorInput, AlignLeft,
}

const COLORS: Partial<Record<WbNodeType, { bg: string; fg: string }>> = {
  box:      { bg: '#3b82f614', fg: '#3b82f6' },
  row:      { bg: '#8b5cf614', fg: '#8b5cf6' },
  card:     { bg: '#06b6d414', fg: '#06b6d4' },
  text:     { bg: '#10b98114', fg: '#10b981' },
  button:   { bg: '#f59e0b14', fg: '#f59e0b' },
  image:    { bg: '#ec489914', fg: '#ec4899' },
  spacer:   { bg: '#94a3b814', fg: '#94a3b8' },
  divider:  { bg: '#94a3b814', fg: '#94a3b8' },
  badge:    { bg: '#f9731614', fg: '#f97316' },
  avatar:   { bg: '#14b8a614', fg: '#14b8a6' },
  input:    { bg: '#6366f114', fg: '#6366f1' },
  textarea: { bg: '#a855f714', fg: '#a855f7' },
}

// ── Single draggable palette item ─────────────────────────────────────────────

function PaletteItem({ type, label, icon }: { type: WbNodeType; label: string; icon: string }) {
  const addNode = useWebAppStore((s) => s.addNode)
  const Icon    = ICON_MAP[icon] ?? Square
  const colors  = COLORS[type] ?? { bg: '#3b82f614', fg: '#3b82f6' }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `palette-${type}`,
    data: { source: 'palette', type },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => addNode(type)}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="
        flex flex-col items-center gap-[7px] pt-[14px] pb-[10px] px-2 rounded-2xl
        cursor-pointer select-none transition-all duration-150
        bg-tg-card border border-tg-darkborder
        hover:border-tg-border active:scale-[0.93] active:bg-tg-elevated
        touch-none
      "
    >
      <div
        className="size-11 rounded-[14px] flex items-center justify-center"
        style={{ background: colors.bg }}
      >
        <Icon size={22} style={{ color: colors.fg }} />
      </div>
      <span className="text-[11px] font-semibold text-tg-label leading-tight text-center select-none">
        {label}
      </span>
    </div>
  )
}

// ── DragGhost shown in DragOverlay ────────────────────────────────────────────

export function PaletteDragGhost({ type }: { type: WbNodeType }) {
  const def = COMPONENT_REGISTRY.find((d) => d.type === type)
  if (!def) return null
  const Icon = ICON_MAP[def.icon] ?? Square

  return (
    <div className="
      flex items-center gap-2 px-3 py-2 rounded-[10px]
      bg-tg-accent shadow-[0_8px_24px_rgba(36,129,204,0.45)]
      pointer-events-none select-none
    ">
      <Icon size={14} color="#fff" />
      <span className="text-[13px] font-semibold text-white">{def.label}</span>
    </div>
  )
}

// ── Main palette panel ────────────────────────────────────────────────────────

export default function ComponentPalette() {
  const [search,          setSearch]          = useState('')
  const [activeCategory,  setActiveCategory]  = useState<string>('all')

  const filtered = COMPONENT_REGISTRY.filter((d) => {
    const matchSearch = !search || d.label.toLowerCase().includes(search.toLowerCase())
    const matchCat    = activeCategory === 'all' || d.category === activeCategory
    return matchSearch && matchCat
  })

  return (
    <div className="flex flex-col h-full bg-tg-bg overflow-hidden">

      {/* Search */}
      <div className="px-3 pt-[10px] pb-[8px] shrink-0">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-[11px] top-1/2 -translate-y-1/2 pointer-events-none"
            color="#4a6278"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="tg-input pl-[32px] py-[9px] text-[13px] rounded-xl"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-[6px] px-3 pb-[10px] shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[{ key: 'all', label: 'Barchasi' }, ...CATEGORIES].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`
              shrink-0 h-7 px-[12px] rounded-full text-[11px] font-semibold
              cursor-pointer border-none transition-all duration-150 whitespace-nowrap
              ${activeCategory === key
                ? 'bg-tg-accent text-white shadow-[0_2px_10px_rgba(36,129,204,0.4)]'
                : 'bg-tg-card text-tg-muted hover:text-white'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <p className="text-center text-tg-muted text-xs mt-10">Hech narsa topilmadi</p>
        ) : (
          <div className="grid grid-cols-3 gap-[8px]">
            {filtered.map((def) => (
              <PaletteItem key={def.type} type={def.type} label={def.label} icon={def.icon} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
