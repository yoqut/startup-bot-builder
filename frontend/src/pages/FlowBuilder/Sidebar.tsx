import { useState } from 'react'
import {
  MessageSquare, Keyboard, GitBranch,
  Globe, Brain, Square, Clock, Variable,
  Antenna, Trash2, Send,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react'
import type { FlowChatType } from '@/types/flow'

type NodeDef = { type: string; subtype: string; label: string; icon: React.ElementType; accent: string; desc: string }

const TRIGGERS: Record<FlowChatType, NodeDef[]> = {
  user:     [{ type: 'handler',          subtype: '', label: 'Handler', icon: Antenna,      accent: '#8b5cf6', desc: 'Trigger turini sozla' }],
  group:    [{ type: 'handler',          subtype: '', label: 'Handler', icon: Antenna,      accent: '#22c55e', desc: 'Trigger turini sozla' }],
  channel:  [{ type: 'handler',          subtype: '', label: 'Handler', icon: Antenna,      accent: '#f97316', desc: 'Trigger turini sozla' }],
  business: [{ type: 'business_handler', subtype: '', label: 'Handler', icon: Antenna,      accent: '#6366f1', desc: 'Trigger turini sozla' }],
}

const RESPONSE_NODES: NodeDef[] = [
  { type: 'message',   subtype: 'text', label: 'Xabar',          icon: MessageSquare, accent: '#2481cc', desc: 'Matn, media, tugmalar' },
  { type: 'input',     subtype: '',     label: 'Kiritish',        icon: Keyboard,      accent: '#f39c12', desc: 'Foydalanuvchi javob beradi' },
  { type: 'send_to',   subtype: '',     label: 'ID ga yuborish',  icon: Send,          accent: '#00bcd4', desc: 'User/guruh/kanal ID ga xabar' },
]

const LOGIC_NODES: NodeDef[] = [
  { type: 'condition',    subtype: '', label: 'Shart',            icon: GitBranch, accent: '#e67e22', desc: 'If / Else shartlash' },
  { type: 'delay',        subtype: '', label: 'Kutish',           icon: Clock,     accent: '#7d9ab5', desc: 'N soniya kutib turish' },
  { type: 'auto_delete',  subtype: '', label: "Xabarni o'chirish",icon: Trash2,    accent: '#e53935', desc: "N soniyadan keyin o'chir" },
  { type: 'set_variable', subtype: '', label: "O'zgaruvchi",      icon: Variable,  accent: '#9b59b6', desc: "Qiymat saqlash/o'zgartirish" },
  { type: 'api_call',     subtype: '', label: 'API Call',         icon: Globe,     accent: '#00bcd4', desc: "HTTP so'rov yuborish" },
  { type: 'ai',           subtype: '', label: 'AI',               icon: Brain,     accent: '#e91e8c', desc: 'AI orqali javob' },
]

const END_NODE: NodeDef = { type: 'end', subtype: '', label: 'Tugash', icon: Square, accent: '#e53935', desc: 'Suhbatni yakunlash' }

const TRIGGER_ACCENTS: Record<FlowChatType, string> = {
  user: '#8b5cf6', group: '#22c55e', channel: '#f97316', business: '#6366f1',
}

const ACCENT: Record<string, { bg: string; icon: string; border: string }> = {
  '#8b5cf6': { bg: 'bg-node-violet/10', icon: 'text-node-violet', border: 'border-node-violet/30' },
  '#22c55e': { bg: 'bg-node-green/10',  icon: 'text-node-green',  border: 'border-node-green/30'  },
  '#6366f1': { bg: 'bg-node-indigo/10', icon: 'text-node-indigo', border: 'border-node-indigo/30' },
  '#f97316': { bg: 'bg-orange-500/10',  icon: 'text-orange-500',  border: 'border-orange-500/30'  },
  '#2481cc': { bg: 'bg-tg-accent/10',   icon: 'text-tg-accent',   border: 'border-tg-accent/30'   },
  '#8e44ad': { bg: 'bg-node-purple/10', icon: 'text-node-purple', border: 'border-node-purple/30' },
  '#f39c12': { bg: 'bg-node-amber/10',  icon: 'text-node-amber',  border: 'border-node-amber/30'  },
  '#e67e22': { bg: 'bg-node-orange/10', icon: 'text-node-orange', border: 'border-node-orange/30' },
  '#7d9ab5': { bg: 'bg-node-steel/10',  icon: 'text-node-steel',  border: 'border-node-steel/30'  },
  '#e53935': { bg: 'bg-node-red/10',    icon: 'text-node-red',    border: 'border-node-red/30'    },
  '#9b59b6': { bg: 'bg-node-grape/10',  icon: 'text-node-grape',  border: 'border-node-grape/30'  },
  '#00bcd4': { bg: 'bg-node-teal/10',   icon: 'text-node-teal',   border: 'border-node-teal/30'   },
  '#e91e8c': { bg: 'bg-node-pink/10',   icon: 'text-node-pink',   border: 'border-node-pink/30'   },
}

const SECTION_COLOR: Record<string, string> = {
  '#8b5cf6': 'text-node-violet',
  '#22c55e': 'text-node-green',
  '#6366f1': 'text-node-indigo',
  '#f97316': 'text-orange-500',
  '#2481cc': 'text-tg-accent',
  '#e67e22': 'text-node-orange',
  '#e53935': 'text-node-red',
}

interface Props {
  onAddNode: (type: string, subtype: string) => void
  chatType?: FlowChatType
  sheet?: boolean
}

export default function Sidebar({ onAddNode, chatType = 'user', sheet = false }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState({ trigger: true, response: true, logic: true, end: true })
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }))

  function handleDragStart(e: React.DragEvent, type: string, subtype: string) {
    e.dataTransfer.setData('nodeType', `${type}:${subtype}`)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const triggerColor = TRIGGER_ACCENTS[chatType]
  const allNodes = [...TRIGGERS[chatType], ...RESPONSE_NODES, ...LOGIC_NODES, END_NODE]

  if (sheet) {
    return (
      <div className="px-3 pt-2 pb-6">
        <Section label="TRIGGER" colorClass={SECTION_COLOR[triggerColor] ?? 'text-tg-accent'} />
        <Grid nodes={TRIGGERS[chatType]} onAdd={onAddNode} />

        <Section label="JAVOB" colorClass="text-tg-accent" />
        <Grid nodes={RESPONSE_NODES} onAdd={onAddNode} />

        <Section label="MANTIQ" colorClass="text-node-orange" />
        <Grid nodes={LOGIC_NODES} onAdd={onAddNode} />

        <Section label="TUGASH" colorClass="text-node-red" />
        <Grid nodes={[END_NODE]} onAdd={onAddNode} />
      </div>
    )
  }

  // ── Desktop sidebar ────────────────────────────────────────────────────────
  return (
    <aside
      className="relative bg-tg-deep border-r border-tg-darkborder flex flex-col shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 44 : 200 }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Kengaytirish' : 'Yig\'ish'}
        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-tg-input border border-tg-darkborder flex items-center justify-center text-tg-muted hover:text-white hover:bg-tg-elevated transition-colors duration-150 shrink-0"
      >
        {collapsed
          ? <ChevronRight size={11} strokeWidth={2.5} />
          : <ChevronLeft  size={11} strokeWidth={2.5} />
        }
      </button>

      {/* ── Collapsed: faqat ikonlar ── */}
      {collapsed ? (
        <div className="flex flex-col items-center pt-10 pb-2 gap-1 overflow-y-auto">
          {allNodes.map(n => {
            const Icon = n.icon
            return (
              <button
                key={`${n.type}-${n.subtype}`}
                draggable
                onDragStart={e => handleDragStart(e, n.type, n.subtype)}
                onClick={() => onAddNode(n.type, n.subtype)}
                title={n.label}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center cursor-grab border border-transparent hover:border-tg-darkborder hover:bg-[#1a2736] transition-colors duration-120"
              >
                <div className={`${ACCENT[n.accent]?.bg ?? 'bg-tg-card'} w-6 h-6 rounded-[7px] flex items-center justify-center`}>
                  <div className={ACCENT[n.accent]?.icon ?? 'text-tg-label'}>
                    <Icon size={12} color="currentColor" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Expanded: to'liq ro'yxat ── */
        <div className="flex flex-col overflow-y-auto h-full">
          <div className="px-3 pt-[10px] pb-2 border-b border-tg-darkborder shrink-0 pr-8">
            <p className="text-[10px] font-bold text-tg-muted uppercase tracking-[0.1em] m-0">Node Panel</p>
            <p className="text-[10px] text-tg-elevated mt-[3px] mb-0">Bosib yoki sudrab qo'shing</p>
          </div>

          <CollapsibleSection label="Trigger" colorClass={SECTION_COLOR[triggerColor] ?? 'text-tg-accent'} open={openSections.trigger} onToggle={() => toggleSection('trigger')} first>
            {TRIGGERS[chatType].map(n => (
              <SidebarRow key={n.type} n={n} onAdd={onAddNode} onDragStart={handleDragStart} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection label="Javob" colorClass="text-tg-accent" open={openSections.response} onToggle={() => toggleSection('response')}>
            {RESPONSE_NODES.map(n => (
              <SidebarRow key={n.type} n={n} onAdd={onAddNode} onDragStart={handleDragStart} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection label="Mantiq" colorClass="text-node-orange" open={openSections.logic} onToggle={() => toggleSection('logic')}>
            {LOGIC_NODES.map(n => (
              <SidebarRow key={n.type} n={n} onAdd={onAddNode} onDragStart={handleDragStart} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection label="Tugash" colorClass="text-node-red" open={openSections.end} onToggle={() => toggleSection('end')}>
            <SidebarRow n={END_NODE} onAdd={onAddNode} onDragStart={handleDragStart} />
          </CollapsibleSection>
        </div>
      )}
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <div className="pt-[14px] pb-[6px]">
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
        return (
          <button
            key={`${n.type}-${n.subtype}`}
            onClick={() => onAdd(n.type, n.subtype)}
            className="flex flex-col items-start bg-tg-card border border-tg-input rounded-[14px] p-3 cursor-pointer gap-2 active:bg-tg-elevated transition-all duration-150 text-left"
          >
            <div className={`w-9 h-9 rounded-[10px] ${ACCENT[n.accent]?.bg ?? 'bg-tg-card'} border ${ACCENT[n.accent]?.border ?? 'border-tg-border'} flex items-center justify-center shrink-0`}>
              <div className={ACCENT[n.accent]?.icon ?? 'text-tg-label'}>
                <Icon size={16} color="currentColor" />
              </div>
            </div>
            <div className="min-w-0 w-full">
              <div className="text-[13px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                {n.label}
              </div>
              <div className="text-[10px] text-tg-label mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {n.desc}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function CollapsibleSection({ label, colorClass, open, onToggle, children, first }: {
  label: string; colorClass: string; open: boolean; onToggle: () => void; children: React.ReactNode; first?: boolean
}) {
  return (
    <div className={first ? '' : 'border-t border-tg-darkborder'}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-[10px] pt-[7px] pb-[5px] bg-transparent border-none cursor-pointer"
      >
        <p className={`m-0 text-[9px] font-extrabold uppercase tracking-[0.12em] ${colorClass}`}>{label}</p>
        <ChevronDown size={10} className={`text-tg-muted transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  )
}

function SidebarRow({ n, onAdd, onDragStart }: {
  n: NodeDef
  onAdd: (t: string, s: string) => void
  onDragStart: (e: React.DragEvent, t: string, s: string) => void
}) {
  const Icon = n.icon
  return (
    <button
      draggable
      onDragStart={e => onDragStart(e, n.type, n.subtype)}
      onClick={() => onAdd(n.type, n.subtype)}
      className="w-full flex items-center gap-2 px-[10px] py-[5px] bg-transparent border-none cursor-grab text-left transition-[background] duration-[120ms] hover:bg-[#1a2736]"
    >
      <div className={`w-6 h-6 rounded-[7px] ${ACCENT[n.accent]?.bg ?? 'bg-tg-card'} flex items-center justify-center shrink-0`}>
        <div className={ACCENT[n.accent]?.icon ?? 'text-tg-label'}>
          <Icon size={12} color="currentColor" />
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-tg-text whitespace-nowrap overflow-hidden text-ellipsis">
          {n.label}
        </div>
        <div className="text-[9px] text-tg-muted whitespace-nowrap overflow-hidden text-ellipsis">
          {n.desc}
        </div>
      </div>
    </button>
  )
}
