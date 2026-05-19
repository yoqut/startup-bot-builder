import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Search, X, Clock } from 'lucide-react'
import type { FlowChatType } from '@/types/flow'
import {
  NODE_REGISTRY, NODES_BY_CATEGORY, ACCENT_CLS,
  type NodeDef, type NodeCategory,
} from './nodeDefinitions'

const MAX_RECENT = 5

const CATEGORY_META: Record<NodeCategory, { label: string; colorClass: string }> = {
  trigger:  { label: 'Trigger',   colorClass: 'text-node-violet' },
  message:  { label: 'Xabar',     colorClass: 'text-tg-accent'   },
  logic:    { label: 'Mantiq',    colorClass: 'text-node-orange'  },
  advanced: { label: 'Advanced',  colorClass: 'text-node-teal'    },
  end:      { label: 'Tugash',    colorClass: 'text-node-red'     },
}

const CATEGORY_ORDER: NodeCategory[] = ['trigger', 'message', 'logic', 'advanced', 'end']

function useRecentNodes() {
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fb_recent_nodes') || '[]') } catch { return [] }
  })
  const addRecent = useCallback((type: string) => {
    setRecent(prev => {
      const next = [type, ...prev.filter(t => t !== type)].slice(0, MAX_RECENT)
      localStorage.setItem('fb_recent_nodes', JSON.stringify(next))
      return next
    })
  }, [])
  return { recent, addRecent }
}

interface Props {
  onAddNode: (type: string, subtype: string) => void
  chatType?: FlowChatType
  sheet?: boolean
}

export default function Sidebar({ onAddNode, chatType = 'user', sheet = false }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [openSections, setOpenSections] = useState<Record<NodeCategory, boolean>>({
    trigger: true, message: true, logic: true, advanced: false, end: true,
  })
  const { recent, addRecent } = useRecentNodes()

  const byCategory = useMemo(() => NODES_BY_CATEGORY(chatType), [chatType])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return NODE_REGISTRY.filter(n =>
      n.chatTypes.includes(chatType) &&
      (n.label.toLowerCase().includes(q) || n.tags.some(t => t.includes(q)))
    )
  }, [query, chatType])

  const recentNodes = useMemo(() =>
    recent.flatMap(type => {
      const def = NODE_REGISTRY.find(n => n.type === type && n.chatTypes.includes(chatType))
      return def ? [def] : []
    }),
    [recent, chatType]
  )

  function handleDragStart(e: React.DragEvent, type: string, subtype = '') {
    e.dataTransfer.setData('nodeType', `${type}:${subtype}`)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleAdd(type: string, subtype = '') {
    addRecent(type)
    onAddNode(type, subtype)
  }

  function toggleSection(key: NodeCategory) {
    setOpenSections(s => ({ ...s, [key]: !s[key] }))
  }

  const allNodes = useMemo(() =>
    NODE_REGISTRY.filter(n => n.chatTypes.includes(chatType)),
    [chatType]
  )

  // ── Sheet (mobile) ────────────────────────────────────────────────────────────
  if (sheet) {
    return (
      <div className="px-3 pt-2 pb-6">
        <SearchBar query={query} onChange={setQuery} />

        {query.trim() ? (
          <>
            <SectionLabel label="Natijalar" colorClass="text-tg-label" />
            {searchResults && searchResults.length > 0
              ? <Grid nodes={searchResults} onAdd={handleAdd} />
              : <EmptySearch />}
          </>
        ) : (
          <>
            {recentNodes.length > 0 && (
              <>
                <SectionLabel label="Oxirgi" colorClass="text-tg-muted" icon={Clock} />
                <Grid nodes={recentNodes} onAdd={handleAdd} />
              </>
            )}
            {CATEGORY_ORDER.map(cat => {
              const nodes = byCategory[cat]
              if (!nodes.length) return null
              const meta = CATEGORY_META[cat]
              return (
                <div key={cat}>
                  <SectionLabel label={meta.label} colorClass={meta.colorClass} />
                  <Grid nodes={nodes} onAdd={handleAdd} />
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  // ── Desktop sidebar ────────────────────────────────────────────────────────────
  return (
    <aside
      className="relative bg-tg-deep border-r border-tg-darkborder flex flex-col shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 44 : 204 }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Kengaytirish' : "Yig'ish"}
        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-tg-input border border-tg-darkborder flex items-center justify-center text-tg-muted hover:text-white hover:bg-tg-elevated transition-colors duration-150 shrink-0"
      >
        {collapsed
          ? <ChevronRight size={11} strokeWidth={2.5} />
          : <ChevronLeft  size={11} strokeWidth={2.5} />
        }
      </button>

      {/* ── Collapsed: icon rail ─────────────────────────────────────────────── */}
      {collapsed ? (
        <div className="flex flex-col items-center pt-10 pb-2 gap-1 overflow-y-auto">
          {allNodes.map(n => {
            const Icon = n.icon
            const cls = ACCENT_CLS[n.accent]
            return (
              <button
                key={n.type}
                draggable
                onDragStart={e => handleDragStart(e, n.type)}
                onClick={() => handleAdd(n.type)}
                title={n.label}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-grab border border-transparent hover:border-tg-darkborder hover:bg-[#1a2736] transition-colors duration-120"
              >
                <div className={`${cls?.bg ?? 'bg-tg-card'} w-6 h-6 rounded-[7px] flex items-center justify-center`}>
                  <span className={cls?.icon ?? 'text-tg-label'}>
                    <Icon size={12} color="currentColor" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Expanded ────────────────────────────────────────────────────────── */
        <div className="flex flex-col overflow-y-auto h-full">
          {/* Header */}
          <div className="px-3 pt-[10px] pb-2 border-b border-tg-darkborder shrink-0 pr-8">
            <p className="text-[10px] font-bold text-tg-muted uppercase tracking-[0.1em] m-0">Node Panel</p>
            <p className="text-[10px] text-tg-muted mt-[3px] mb-0">Bosib yoki sudrab qo'shing</p>
          </div>

          {/* Search */}
          <div className="px-2 pt-2 pb-1 shrink-0">
            <SearchBar query={query} onChange={setQuery} compact />
          </div>

          {/* Search results */}
          {query.trim() ? (
            <div className="flex flex-col overflow-y-auto flex-1">
              {searchResults && searchResults.length > 0
                ? searchResults.map(n => (
                    <NodeRow key={n.type} n={n} onAdd={handleAdd} onDragStart={handleDragStart} />
                  ))
                : <EmptySearch compact />
              }
            </div>
          ) : (
            <div className="flex flex-col overflow-y-auto flex-1">
              {/* Recent nodes */}
              {recentNodes.length > 0 && (
                <div className="border-b border-tg-darkborder">
                  <div className="flex items-center gap-1 px-[10px] pt-[7px] pb-[4px]">
                    <Clock size={8} className="text-tg-muted" />
                    <p className="m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-tg-muted">Oxirgi</p>
                  </div>
                  <div className="pb-1">
                    {recentNodes.map(n => (
                      <NodeRow key={n.type} n={n} onAdd={handleAdd} onDragStart={handleDragStart} />
                    ))}
                  </div>
                </div>
              )}

              {/* Category sections */}
              {CATEGORY_ORDER.map((cat, i) => {
                const nodes = byCategory[cat]
                if (!nodes.length) return null
                const meta = CATEGORY_META[cat]
                const isOpen = openSections[cat]
                return (
                  <div key={cat} className={i > 0 || recentNodes.length > 0 ? 'border-t border-tg-darkborder' : ''}>
                    <button
                      onClick={() => toggleSection(cat)}
                      className="w-full flex items-center justify-between px-[10px] pt-[7px] pb-[5px] bg-transparent border-none cursor-pointer"
                    >
                      <p className={`m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] ${meta.colorClass}`}>
                        {meta.label}
                      </p>
                      <ChevronDown
                        size={10}
                        className={`text-tg-muted transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-1">
                        {nodes.map(n => (
                          <NodeRow key={n.type} n={n} onAdd={handleAdd} onDragStart={handleDragStart} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SearchBar({ query, onChange, compact }: {
  query: string; onChange: (v: string) => void; compact?: boolean
}) {
  return (
    <div className={`relative flex items-center ${compact ? '' : 'mb-1'}`}>
      <Search size={11} className="absolute left-2.5 text-tg-muted pointer-events-none" />
      <input
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Qidirish..."
        className="w-full bg-tg-input border border-tg-darkborder rounded-[8px] pl-7 pr-6 py-[5px] text-[11px] text-white placeholder:text-tg-muted outline-none focus:border-tg-accent/50 transition-colors"
        style={{ fontSize: 12 }}
      />
      {query && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 text-tg-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

function SectionLabel({ label, colorClass, icon: Icon }: {
  label: string; colorClass: string; icon?: React.ElementType
}) {
  return (
    <div className="pt-[14px] pb-[6px] flex items-center gap-1">
      {Icon && <Icon size={9} className={colorClass} />}
      <p className={`m-0 text-[10px] font-extrabold uppercase tracking-[0.1em] ${colorClass}`}>
        {label}
      </p>
    </div>
  )
}

function Grid({ nodes, onAdd }: { nodes: NodeDef[]; onAdd: (t: string, s: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {nodes.map(n => {
        const Icon = n.icon
        const cls = ACCENT_CLS[n.accent]
        return (
          <button
            key={n.type}
            onClick={() => onAdd(n.type, '')}
            className="flex flex-col items-start bg-tg-card border border-tg-input rounded-[14px] p-3 cursor-pointer gap-2 active:bg-tg-elevated transition-all duration-150 text-left"
          >
            <div className={`w-9 h-9 rounded-[10px] ${cls?.bg ?? 'bg-tg-card'} border ${cls?.border ?? 'border-tg-border'} flex items-center justify-center shrink-0`}>
              <span className={cls?.icon ?? 'text-tg-label'}>
                <Icon size={16} color="currentColor" />
              </span>
            </div>
            <div className="min-w-0 w-full">
              <div className="text-[13px] font-semibold text-white truncate">{n.label}</div>
              <div className="text-[10px] text-tg-label mt-0.5 truncate">{n.tags[0]}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function NodeRow({ n, onAdd, onDragStart }: {
  n: NodeDef
  onAdd: (t: string, s: string) => void
  onDragStart: (e: React.DragEvent, t: string, s?: string) => void
}) {
  const Icon = n.icon
  const cls = ACCENT_CLS[n.accent]
  return (
    <button
      draggable
      onDragStart={e => onDragStart(e, n.type)}
      onClick={() => onAdd(n.type, '')}
      className="w-full flex items-center gap-2 px-[10px] py-[5px] bg-transparent border-none cursor-grab text-left transition-[background] duration-[120ms] hover:bg-[#1a2736]"
    >
      <div className={`w-6 h-6 rounded-[7px] ${cls?.bg ?? 'bg-tg-card'} flex items-center justify-center shrink-0`}>
        <span className={cls?.icon ?? 'text-tg-label'}>
          <Icon size={12} color="currentColor" />
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-tg-text truncate">{n.label}</div>
        <div className="text-[10px] text-tg-muted truncate">{n.tags.slice(0, 2).join(', ')}</div>
      </div>
    </button>
  )
}

function EmptySearch({ compact }: { compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-10'}`}>
      <p className="text-[11px] text-tg-muted m-0">Hech narsa topilmadi</p>
    </div>
  )
}
