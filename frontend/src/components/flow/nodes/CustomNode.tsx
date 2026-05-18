import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Terminal, MessageSquare, Image, FileText, BarChart2,
  MousePointer, Keyboard, GitBranch, Globe, Brain,
  Square, Mic, Volume2, Play, Clock, Variable, Zap,
  Antenna, MapPin, Phone, Link, Trash2, Send, Briefcase,
} from 'lucide-react'

// ── Node type accent colors ───────────────────────────────────────────────────
const ACCENT_HEX: Record<string, string> = {
  command:          '#27ae60',
  start:            '#27ae60',
  message:          '#2481cc',
  input:            '#f39c12',
  condition:        '#e67e22',
  delay:            '#4a6278',
  api_call:         '#00bcd4',
  ai:               '#e91e8c',
  set_variable:     '#8e44ad',
  end:              '#e53935',
  handler:          '#2481cc',
  auto_delete:      '#e53935',
  send_to:          '#00bcd4',
  business_handler: '#8e44ad',
}

// Tailwind class maps keyed by hex accent
const ACCENT_CLS: Record<string, { bg: string; icon: string; border: string; text: string; ring: string }> = {
  '#27ae60': { bg: 'bg-node-green/10',   icon: 'text-node-green',   border: 'border-node-green/30',   text: 'text-node-green',   ring: 'ring-node-green/20'   },
  '#2481cc': { bg: 'bg-tg-accent/10',    icon: 'text-tg-accent',    border: 'border-tg-accent/30',    text: 'text-tg-accent',    ring: 'ring-tg-accent/20'    },
  '#f39c12': { bg: 'bg-node-amber/10',   icon: 'text-node-amber',   border: 'border-node-amber/30',   text: 'text-node-amber',   ring: 'ring-node-amber/20'   },
  '#e67e22': { bg: 'bg-node-orange/10',  icon: 'text-node-orange',  border: 'border-node-orange/30',  text: 'text-node-orange',  ring: 'ring-node-orange/20'  },
  '#4a6278': { bg: 'bg-node-steel/10',   icon: 'text-node-steel',   border: 'border-node-steel/30',   text: 'text-node-steel',   ring: 'ring-node-steel/20'   },
  '#00bcd4': { bg: 'bg-node-teal/10',    icon: 'text-node-teal',    border: 'border-node-teal/30',    text: 'text-node-teal',    ring: 'ring-node-teal/20'    },
  '#e91e8c': { bg: 'bg-node-pink/10',    icon: 'text-node-pink',    border: 'border-node-pink/30',    text: 'text-node-pink',    ring: 'ring-node-pink/20'    },
  '#8e44ad': { bg: 'bg-node-purple/10',  icon: 'text-node-purple',  border: 'border-node-purple/30',  text: 'text-node-purple',  ring: 'ring-node-purple/20'  },
  '#e53935': { bg: 'bg-node-red/10',     icon: 'text-node-red',     border: 'border-node-red/30',     text: 'text-node-red',     ring: 'ring-node-red/20'     },
}

const META: Record<string, { icon: React.ElementType; label: string }> = {
  command:          { icon: Terminal,      label: 'Command'        },
  start:            { icon: Play,          label: '/start'         },
  message:          { icon: MessageSquare, label: 'Xabar'          },
  input:            { icon: Keyboard,      label: 'Kiritish'       },
  condition:        { icon: GitBranch,     label: 'Shart'          },
  delay:            { icon: Clock,         label: 'Kutish'         },
  api_call:         { icon: Globe,         label: 'API Call'       },
  ai:               { icon: Brain,         label: 'AI Node'        },
  set_variable:     { icon: Variable,      label: "O'zgaruvchi"    },
  end:              { icon: Square,        label: 'Tugash'         },
  handler:          { icon: Antenna,       label: 'Handler'        },
  auto_delete:      { icon: Trash2,        label: "O'chirish"      },
  send_to:          { icon: Send,          label: 'ID ga yuborish' },
  business_handler: { icon: Briefcase,     label: 'Business Chat'  },
}

const MSG_ICONS: Record<string, React.ElementType> = {
  text: MessageSquare, photo: Image, video: Zap,
  audio: Volume2, voice: Mic, document: FileText, poll: BarChart2,
}
const MSG_LABELS: Record<string, string> = {
  text: 'Matn', photo: 'Rasm', video: 'Video',
  audio: 'Audio', voice: 'Ovoz', document: 'Hujjat', poll: "So'rovnoma",
}

// Method color pills
const METHOD_CLS: Record<string, { text: string; bg: string }> = {
  GET:    { text: 'text-node-green',  bg: 'bg-node-green/10'  },
  POST:   { text: 'text-tg-accent',   bg: 'bg-tg-accent/10'   },
  PUT:    { text: 'text-node-amber',  bg: 'bg-node-amber/10'  },
  PATCH:  { text: 'text-node-orange', bg: 'bg-node-orange/10' },
  DELETE: { text: 'text-node-red',    bg: 'bg-node-red/10'    },
}

// ── Handles ───────────────────────────────────────────────────────────────────
function InHandle() {
  return (
    <Handle
      type="target"
      position={Position.Top}
      className="!w-[10px] !h-[10px] !bg-tg-accent !border-2 !border-tg-bg !rounded-full"
    />
  )
}
function OutHandle({ id, left }: { id?: string; left?: string }) {
  return (
    <Handle
      type="source"
      position={Position.Bottom}
      id={id}
      className="!w-[10px] !h-[10px] !bg-tg-accent !border-2 !border-tg-bg !rounded-full"
      style={left ? { left } : undefined}
    />
  )
}

// ── NodeShell ─────────────────────────────────────────────────────────────────
function NodeShell({
  nodeType, selected, children, noIn = false, noOut = false, outCount = 1, wide = false,
}: {
  nodeType: string; selected: boolean; children: React.ReactNode
  noIn?: boolean; noOut?: boolean; outCount?: number; wide?: boolean
}) {
  const m = META[nodeType] || META.message
  const accentHex = ACCENT_HEX[nodeType] || '#2481cc'
  const cls = ACCENT_CLS[accentHex]
  const Icon = m.icon

  return (
    <div
      className={[
        'relative bg-tg-card rounded-[14px] overflow-hidden transition-[border-color,box-shadow,transform] duration-150',
        wide ? 'min-w-[260px] max-w-[300px]' : 'min-w-[210px] max-w-[260px]',
        selected
          ? `border ${cls?.border ?? 'border-tg-border'}`
          : 'border border-tg-input shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
      ].join(' ')}
      style={{
        borderLeft: `3px solid ${accentHex}`,
        ...(selected ? { boxShadow: '0 0 0 2px #2AABEE, 0 2px 8px rgba(0,0,0,0.3)' } : {}),
      }}
    >
      {!noIn && <InHandle />}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-[10px] bg-tg-elevated border-b border-tg-input">
        <div className={`w-[26px] h-[26px] rounded-[7px] ${cls?.bg ?? 'bg-tg-card'} flex items-center justify-center shrink-0`}>
          <div className={cls?.icon ?? 'text-tg-label'}>
            <Icon size={13} color="currentColor" />
          </div>
        </div>
        <span className="text-[12px] font-semibold text-white tracking-[0.2px]">{m.label}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-[10px] text-[11px] text-tg-label">
        {children}
      </div>

      {!noOut && outCount === 1 && <OutHandle />}
      {!noOut && outCount === 2 && (
        <>
          <OutHandle id="true"  left="28%" />
          <OutHandle id="false" left="72%" />
        </>
      )}
    </div>
  )
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
function Pill({ label, colorClass = 'text-tg-label', bgClass = 'bg-tg-elevated', borderClass = 'border-tg-label/20' }: {
  label: string
  colorClass?: string
  bgClass?: string
  borderClass?: string
}) {
  return (
    <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[6px] text-[10px] font-medium border ${colorClass} ${bgClass} ${borderClass}`}>
      {label}
    </span>
  )
}

function Preview({ text, max = 80 }: { text: string; max?: number }) {
  if (!text) return <span className="text-tg-muted italic text-[11px]">Bo'sh…</span>
  const trimmed = text.length > max ? text.slice(0, max) + '…' : text
  const parts = trimmed.split(/({{[^}]+}})/g)
  return (
    <span className="text-tg-label leading-[1.5] text-[11px]">
      {parts.map((p, i) =>
        p.startsWith('{{') && p.endsWith('}}')
          ? <span key={i} className="inline-flex items-center px-[5px] py-[1px] rounded-[4px] text-[9px] font-mono font-semibold bg-tg-accent/12 border border-tg-accent/25 text-tg-accent mx-[1px]">{p}</span>
          : p
      )}
    </span>
  )
}

// ── Telegram bubble ───────────────────────────────────────────────────────────
function TgBubble({ msgType, text, cfg }: { msgType: string; text: string; cfg: Record<string, unknown> }) {
  const MIcon = MSG_ICONS[msgType] || MessageSquare
  if (msgType === 'poll') {
    return (
      <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2">
        <div className="text-[10px] text-tg-accent font-semibold mb-[3px]">📊 Poll</div>
        <div className="text-[11px] text-white leading-[1.4]">
          {(cfg.poll_question as string) || <span className="opacity-40 italic">Savol yo'q</span>}
        </div>
        <div className="text-[9px] text-white/30 mt-[3px]">
          {((cfg.poll_options as string[]) || []).length} variant
        </div>
      </div>
    )
  }
  if (['photo', 'video', 'audio', 'voice', 'document'].includes(msgType)) {
    return (
      <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2 flex items-center gap-2">
        <div className="w-[34px] h-[34px] rounded-[8px] bg-tg-accent/20 flex items-center justify-center shrink-0">
          <div className="text-tg-accent">
            <MIcon size={15} color="currentColor" />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-white">{MSG_LABELS[msgType]}</div>
          {text && <div className="text-[9px] text-white/40 overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">{text.slice(0,40)}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2">
      <p className="text-[11px] text-white leading-[1.5] m-0 break-words whitespace-pre-wrap">
        {text ? (text.length > 160 ? text.slice(0,160)+'…' : text) : <span className="opacity-30 italic">Matn yo'q…</span>}
      </p>
    </div>
  )
}

// ── InlineButton row ──────────────────────────────────────────────────────────
function InlineBtn({ btn, index }: { btn: { label: string; action?: string }; index: number }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-center bg-[#1e3a5f] border border-tg-accent/30 rounded-[10px] h-[26px] px-2 gap-1">
        {btn.action === 'url' && (
          <div className="text-tg-accent"><Link size={9} color="currentColor" /></div>
        )}
        {btn.action === 'web_app' && (
          <div className="text-tg-accent"><Globe size={9} color="currentColor" /></div>
        )}
        <span className="text-[10px] text-[#7db8e8] overflow-hidden text-ellipsis whitespace-nowrap font-medium">{btn.label || '…'}</span>
      </div>
      {(!btn.action || btn.action === 'node') && (
        <Handle
          type="source"
          position={Position.Right}
          id={`btn_${index}`}
          className="!absolute !right-[-6px] !top-1/2 !-translate-y-1/2 !w-[10px] !h-[10px] !bg-tg-accent !border-2 !border-tg-bg !rounded-full"
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// NODE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export function CommandNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const cmd = (cfg.command as string) || '/start'
  const desc = (cfg.description as string) || ''
  return (
    <NodeShell nodeType="command" selected={!!selected} noIn>
      <div className="font-mono text-[#4cd137] font-bold text-[13px]">{cmd}</div>
      {desc
        ? <div className="text-tg-muted text-[10px] mt-[3px]">{desc}</div>
        : <div className="text-tg-muted text-[10px] mt-[3px] italic">Tavsif yo'q</div>
      }
    </NodeShell>
  )
}

export function StartNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const desc = (cfg.description as string) || 'Bot ishga tushganda'
  return (
    <NodeShell nodeType="start" selected={!!selected} noIn>
      <div className="font-mono text-[#4cd137] font-bold text-[13px]">/start</div>
      <div className="text-tg-muted text-[10px] mt-[3px]">{desc}</div>
    </NodeShell>
  )
}

export function MessageNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const msgType = (cfg.message_type as string) || 'text'
  const text = (cfg.text as string) || ''
  const buttons = (cfg.buttons as { label: string; action?: string }[]) || []
  const layout = (cfg.button_layout as string) || 'inline'
  const onCallback = (cfg.on_callback as string) || 'edit'
  const MIcon = MSG_ICONS[msgType] || MessageSquare

  return (
    <div
      className={[
        'relative min-w-[230px] max-w-[280px] bg-tg-card rounded-[14px] overflow-hidden',
        'transition-[border-color,box-shadow,transform] duration-150',
        selected
          ? 'border border-tg-accent'
          : 'border border-tg-input shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
      ].join(' ')}
      style={{
        borderLeft: '3px solid #2481cc',
        ...(selected ? { boxShadow: '0 0 0 2px #2AABEE, 0 2px 8px rgba(0,0,0,0.3)' } : {}),
      }}
    >
      <InHandle />
      <div className="flex items-center gap-2 px-3 py-[10px] bg-tg-elevated border-b border-tg-input">
        <div className="w-[26px] h-[26px] rounded-[7px] bg-tg-accent/15 flex items-center justify-center shrink-0">
          <div className="text-tg-accent"><MessageSquare size={13} color="currentColor" /></div>
        </div>
        <span className="text-[12px] font-semibold text-white">Xabar</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="text-tg-muted"><MIcon size={10} color="currentColor" /></div>
          <span className="text-[10px] text-tg-muted">{MSG_LABELS[msgType] || msgType}</span>
        </div>
      </div>

      <div className="px-3 py-[10px] flex flex-col gap-[6px]">
        <TgBubble msgType={msgType} text={text} cfg={cfg} />

        {buttons.length > 0 && layout === 'inline' && (
          <div className="flex flex-col gap-1">
            {buttons.slice(0,5).map((btn, i) => <InlineBtn key={i} btn={btn} index={i} />)}
            {buttons.length > 5 && <div className="text-[9px] text-tg-muted text-center">+{buttons.length-5} ta</div>}
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-[5px] h-[5px] rounded-full ${onCallback === 'edit' ? 'bg-node-amber' : 'bg-node-green'}`} />
              <span className={`text-[9px] ${onCallback === 'edit' ? 'text-node-amber/60' : 'text-node-green/60'}`}>
                {onCallback === 'edit' ? 'Bosilganda tahrirlaydi' : 'Bosilganda yangi xabar'}
              </span>
            </div>
          </div>
        )}

        {buttons.length > 0 && layout === 'reply' && (
          <div className="bg-tg-elevated rounded-[10px] border border-tg-input p-2">
            <div className="text-[8px] text-tg-muted uppercase tracking-[0.5px] mb-[5px]">Reply keyboard</div>
            <div className="grid grid-cols-2 gap-1">
              {buttons.slice(0,4).map((btn, i) => (
                <div key={i} className="bg-tg-card rounded-[7px] px-[6px] py-1 text-center">
                  <span className="text-[10px] text-tg-label overflow-hidden text-ellipsis whitespace-nowrap block">{btn.label || '…'}</span>
                </div>
              ))}
            </div>
            {buttons.length > 4 && <div className="text-[9px] text-tg-muted text-center mt-[3px]">+{buttons.length-4} ta</div>}
          </div>
        )}

        {buttons.length === 0 && <div className="text-[9px] text-tg-muted text-center">Tugma yo'q — keyingiga o'tadi</div>}
      </div>

      {buttons.length === 0 && <OutHandle />}
    </div>
  )
}

export function ButtonNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const layout = (cfg.button_layout as string) || 'inline'
  const buttons = (cfg.buttons as { label: string; action?: string }[]) || []
  const text = (cfg.text as string) || ''
  const onCallback = (cfg.on_callback as string) || 'edit'

  return (
    <div
      className={[
        'relative min-w-[230px] max-w-[280px] bg-tg-card rounded-[14px] overflow-hidden',
        'transition-[border-color,box-shadow,transform] duration-150',
        selected
          ? 'border border-node-purple'
          : 'border border-tg-input shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
      ].join(' ')}
      style={{
        borderLeft: '3px solid #8e44ad',
        ...(selected ? { boxShadow: '0 0 0 2px #2AABEE, 0 2px 8px rgba(0,0,0,0.3)' } : {}),
      }}
    >
      <InHandle />
      <div className="flex items-center gap-2 px-3 py-[10px] bg-tg-elevated border-b border-tg-input">
        <div className="w-[26px] h-[26px] rounded-[7px] bg-node-purple/15 flex items-center justify-center shrink-0">
          <div className="text-node-purple"><MousePointer size={13} color="currentColor" /></div>
        </div>
        <span className="text-[12px] font-semibold text-white">Tugmalar</span>
        <div className="ml-auto">
          <span className={`text-[10px] px-[6px] py-[2px] rounded-[5px] font-medium ${layout === 'reply' ? 'text-node-green bg-node-green/10' : 'text-tg-accent bg-tg-accent/10'}`}>
            {layout === 'reply' ? 'Reply' : 'Inline'}
          </span>
        </div>
      </div>

      <div className="px-3 py-[10px] flex flex-col gap-[6px]">
        {text && <TgBubble msgType="text" text={text} cfg={cfg} />}

        {layout === 'inline' && (
          <div className="flex flex-col gap-1">
            {buttons.slice(0,5).map((btn, i) => <InlineBtn key={i} btn={btn} index={i} />)}
            {buttons.length > 5 && <div className="text-[9px] text-tg-muted text-center">+{buttons.length-5} ta</div>}
            {buttons.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-[5px] h-[5px] rounded-full ${onCallback === 'edit' ? 'bg-node-amber' : 'bg-node-green'}`} />
                <span className={`text-[9px] ${onCallback === 'edit' ? 'text-node-amber/60' : 'text-node-green/60'}`}>
                  {onCallback === 'edit' ? 'Bosilganda tahrirlaydi' : 'Bosilganda yangi xabar'}
                </span>
              </div>
            )}
          </div>
        )}

        {layout === 'reply' && (
          <div className="bg-tg-elevated rounded-[10px] border border-tg-input p-2">
            <div className="text-[8px] text-tg-muted uppercase tracking-[0.5px] mb-[5px]">Reply keyboard</div>
            <div className="grid grid-cols-2 gap-1">
              {buttons.slice(0,4).map((btn, i) => (
                <div key={i} className="bg-tg-card rounded-[7px] px-[6px] py-1 text-center">
                  <span className="text-[10px] text-tg-label overflow-hidden text-ellipsis whitespace-nowrap block">{btn.label || '…'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {buttons.length === 0 && <div className="text-[9px] text-tg-muted text-center">Tugma yo'q</div>}
      </div>
    </div>
  )
}

export function InputNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const prompt = (cfg.prompt as string) || ''
  const varName = (cfg.variable_name as string) || ''
  const validation = (cfg.validation as string) || 'text'
  return (
    <NodeShell nodeType="input" selected={!!selected}>
      <Preview text={prompt} max={60} />
      <div className="flex gap-1 mt-[6px] flex-wrap">
        {varName && <Pill label={`{{${varName}}}`} colorClass="text-node-amber" bgClass="bg-node-amber/10" borderClass="border-node-amber/20" />}
        <Pill label={validation} />
      </div>
    </NodeShell>
  )
}

export function ConditionNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const variable = (cfg.variable as string) || '?'
  const operator = (cfg.operator as string) || 'equals'
  const value = (cfg.value as string) || ''
  const opLabel: Record<string, string> = { equals:'=', not_equals:'≠', contains:'∋', greater_than:'>', less_than:'<', is_empty:'∅' }

  return (
    <NodeShell nodeType="condition" selected={!!selected} outCount={2}>
      <div className="font-mono text-[11px] text-node-orange bg-node-orange/10 border border-node-orange/20 rounded-[8px] px-[9px] py-[6px]">
        {`{{${variable}}} ${opLabel[operator] || operator} "${value}"`}
      </div>
      <div className="flex justify-between text-[10px] mt-2 px-[2px]">
        <span className="text-node-green font-semibold">✓ True</span>
        <span className="text-node-red font-semibold">✗ False</span>
      </div>
    </NodeShell>
  )
}

export function DelayNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const seconds = (cfg.seconds as number) || 3
  const typing = cfg.typing_action !== false
  return (
    <NodeShell nodeType="delay" selected={!!selected}>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold text-white">{seconds}</span>
        <span className="text-tg-muted text-[11px]">soniya</span>
      </div>
      {typing && (
        <div className="text-[10px] text-tg-muted mt-1">● typing… ko'rsatiladi</div>
      )}
    </NodeShell>
  )
}

export function ApiCallNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const method = (cfg.method as string) || 'GET'
  const url = (cfg.url as string) || ''
  const respVar = (cfg.response_variable as string) || ''
  const mCls = METHOD_CLS[method] || { text: 'text-tg-label', bg: 'bg-tg-elevated' }

  return (
    <NodeShell nodeType="api_call" selected={!!selected} wide>
      <div className="flex items-center gap-[6px] mb-[5px]">
        <Pill label={method} colorClass={mCls.text} bgClass={mCls.bg} borderClass={`${mCls.text}/20`} />
        <span className="text-[10px] text-tg-muted font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          {url || 'URL kiritilmagan'}
        </span>
      </div>
      {respVar && <Pill label={`→ {{${respVar}}}`} colorClass="text-node-teal" bgClass="bg-node-teal/10" borderClass="border-node-teal/20" />}
    </NodeShell>
  )
}

export function AiNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const model = (cfg.model as string) || 'claude-opus-4-7'
  const prompt = (cfg.system_prompt as string) || ''
  const respVar = (cfg.response_variable as string) || ''
  return (
    <NodeShell nodeType="ai" selected={!!selected}>
      <Pill label={model} colorClass="text-node-pink" bgClass="bg-node-pink/10" borderClass="border-node-pink/20" />
      {prompt && <div className="text-[10px] text-tg-muted mt-[5px] overflow-hidden text-ellipsis whitespace-nowrap">{prompt.slice(0,55)}{prompt.length>55?'…':''}</div>}
      {respVar && <div className="mt-1"><Pill label={`→ {{${respVar}}}`} colorClass="text-node-pink" bgClass="bg-node-pink/10" borderClass="border-node-pink/20" /></div>}
    </NodeShell>
  )
}

export function SetVariableNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const assignments = (cfg.assignments as { variable: string; value: string }[]) || []
  return (
    <NodeShell nodeType="set_variable" selected={!!selected}>
      {assignments.length === 0
        ? <span className="text-tg-muted italic text-[11px]">Hech narsa belgilanmagan</span>
        : assignments.slice(0,3).map((a, i) => (
          <div key={i} className="font-mono text-[11px] text-node-purple mb-0.5">
            <span className="text-tg-muted">{'{{'}</span>
            {a.variable}
            <span className="text-tg-muted">{'}}'}</span>
            <span className="text-tg-muted mx-1">←</span>
            <span className="text-[#c39bd3]">{a.value || '…'}</span>
          </div>
        ))
      }
      {assignments.length > 3 && <div className="text-[10px] text-tg-muted mt-0.5">+{assignments.length-3} ta</div>}
    </NodeShell>
  )
}

export function HandlerNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const trigger = (cfg.trigger as string) || 'any'
  const conditions = (cfg.conditions as { type: string; value?: string }[]) || []
  const commands = (cfg.commands as string[]) || []
  const saveAs = (cfg.save_as as string) || ''

  const TRIGGER_LABEL: Record<string, string> = {
    any:'Har qanday', text:'Matn', command:'Command', photo:'Rasm', video:'Video',
    audio:'Audio', voice:'Ovoz', document:'Hujjat', sticker:'Sticker', location:'Joylashuv', contact:'Kontakt',
  }
  const TRIGGER_ICON: Record<string, React.ElementType> = {
    text:MessageSquare, command:Terminal, photo:Image, video:Zap, audio:Volume2,
    voice:Mic, document:FileText, location:MapPin, contact:Phone, any:Antenna,
  }
  const TIcon = TRIGGER_ICON[trigger] || Antenna

  return (
    <NodeShell nodeType="handler" selected={!!selected} noIn>
      <div className="flex items-center gap-[5px] mb-[6px]">
        <div className="text-tg-accent"><TIcon size={11} color="currentColor" /></div>
        <span className="text-[#7db8e8] font-semibold text-[11px]">{TRIGGER_LABEL[trigger] || trigger}</span>
      </div>

      {trigger === 'command' && (
        commands.length > 0 ? (
          <div className="flex flex-wrap gap-[3px]">
            {commands.slice(0,4).map((cmd, i) => (
              <span key={i} className="font-mono text-[10px] text-node-green bg-node-green/10 border border-node-green/20 rounded-[5px] px-[6px] py-[1px]">{cmd}</span>
            ))}
            {commands.length > 4 && <span className="text-[10px] text-tg-muted">+{commands.length-4}</span>}
          </div>
        ) : <div className="text-[10px] text-tg-muted italic">Barcha commandlar</div>
      )}

      {trigger === 'text' && (
        conditions.length > 0 ? (
          <div className="flex flex-col gap-[3px]">
            {conditions.slice(0,3).map((c, i) => (
              <div key={i} className="flex items-center gap-[5px] bg-tg-accent/10 border border-tg-accent/20 rounded-[6px] px-[7px] py-[3px]">
                <span className="text-[9px] text-tg-accent uppercase font-bold shrink-0">{c.type}</span>
                {c.value && <span className="text-[10px] text-tg-label overflow-hidden text-ellipsis whitespace-nowrap">{Array.isArray(c.value) ? (c.value as string[]).join(', ') : String(c.value)}</span>}
              </div>
            ))}
            {conditions.length > 3 && <div className="text-[10px] text-tg-muted">+{conditions.length-3} ta shart</div>}
          </div>
        ) : <div className="text-[10px] text-tg-muted italic">Barcha matnlar</div>
      )}

      {!['command','text'].includes(trigger) && (
        <div className="text-[10px] text-tg-muted italic">
          {trigger === 'any' ? 'Har qanday xabar' : `${TRIGGER_LABEL[trigger]} kelganda`}
        </div>
      )}

      {saveAs && <div className="mt-[6px]"><Pill label={`→ {{${saveAs}}}`} colorClass="text-tg-accent" bgClass="bg-tg-accent/10" borderClass="border-tg-accent/20" /></div>}
    </NodeShell>
  )
}

export function EndNode({ selected }: NodeProps) {
  return (
    <NodeShell nodeType="end" selected={!!selected} noOut>
      <div className="text-center py-[2px]">
        <div className="text-[11px] text-node-red font-medium">Flow tugadi</div>
        <div className="text-[10px] text-tg-muted mt-0.5">Conversation yakunlandi</div>
      </div>
    </NodeShell>
  )
}

export function AutoDeleteNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const seconds = (cfg.seconds as number) || 10
  const msgVar = (cfg.message_id_var as string) || 'last_message_id'
  return (
    <NodeShell nodeType="auto_delete" selected={!!selected}>
      <div className="flex items-center gap-[5px]">
        <div className="text-node-red"><Trash2 size={11} color="currentColor" /></div>
        <span className="text-[11px] text-tg-label">
          <span className="font-mono text-[#e58080]">{`{{${msgVar}}}`}</span>{' '}ni {seconds}s keyin o'chir
        </span>
      </div>
    </NodeShell>
  )
}

export function SendToNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const chatId = (cfg.chat_id as string) || '—'
  const msgType = (cfg.message_type as string) || 'text'
  const text = (cfg.text as string) || ''
  return (
    <NodeShell nodeType="send_to" selected={!!selected}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-[5px]">
          <div className="text-node-teal"><Send size={11} color="currentColor" /></div>
          <span className="text-[10px] text-tg-muted">Chat:</span>
          <span className="text-[11px] font-mono text-node-teal overflow-hidden text-ellipsis whitespace-nowrap max-w-[110px]">{chatId}</span>
        </div>
        {msgType === 'text' && text && <div className="text-[10px] text-tg-muted overflow-hidden text-ellipsis whitespace-nowrap pl-4">{text.slice(0,40)}</div>}
        {msgType !== 'text' && <Pill label={msgType} colorClass="text-node-teal" bgClass="bg-node-teal/10" borderClass="border-node-teal/20" />}
      </div>
    </NodeShell>
  )
}

export function BusinessHandlerNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const event = (cfg.event as string) || 'message'
  const saveAs = (cfg.save_as as string) || ''
  const connFilter = (cfg.connection_filter as string) || ''
  const EVENT_LABEL: Record<string, string> = { message:'Xabar keldi', connected:'Ulandi', disconnected:'Uzildi', any:'Har qanday' }

  return (
    <NodeShell nodeType="business_handler" selected={!!selected} noIn>
      <div className="flex items-center gap-[5px] mb-[5px]">
        <div className="text-node-purple"><Briefcase size={11} color="currentColor" /></div>
        <span className="text-[#c39bd3] font-semibold text-[11px]">{EVENT_LABEL[event] || event}</span>
      </div>
      {connFilter && (
        <div className="text-[10px] text-node-purple bg-node-purple/10 rounded-[6px] px-[7px] py-[2px] overflow-hidden text-ellipsis whitespace-nowrap mb-[3px]">
          Filter: {connFilter.slice(0,16)}…
        </div>
      )}
      {saveAs && <div className="mt-1"><Pill label={`→ {{${saveAs}}}`} colorClass="text-node-purple" bgClass="bg-node-purple/10" borderClass="border-node-purple/20" /></div>}
    </NodeShell>
  )
}

export function StickyNoteNode({ data, selected }: NodeProps) {
  const cfg = (data.config as Record<string, unknown>) || {}
  const text = (cfg.text as string) || ''
  const color = (cfg.color as string) || 'yellow'
  const COLORS: Record<string, { bg: string; border: string; text: string; emptyText: string }> = {
    yellow: { bg: 'bg-node-amber/10',  border: 'border-node-amber/30',  text: 'text-[#f5d57f]',  emptyText: 'text-[#f5d57f]/40'  },
    blue:   { bg: 'bg-tg-accent/10',   border: 'border-tg-accent/30',   text: 'text-[#7db8e8]',  emptyText: 'text-[#7db8e8]/40'  },
    green:  { bg: 'bg-node-green/10',  border: 'border-node-green/30',  text: 'text-[#90ee90]',  emptyText: 'text-[#90ee90]/40'  },
    pink:   { bg: 'bg-node-pink/10',   border: 'border-node-pink/30',   text: 'text-[#f8a8d0]',  emptyText: 'text-[#f8a8d0]/40'  },
  }
  const c = COLORS[color] || COLORS.yellow
  return (
    <div className={[
      'relative min-w-[160px] max-w-[260px] rounded-[12px] p-3 border',
      'transition-[box-shadow] duration-150',
      c.bg, c.border,
      selected ? `ring-2 ${c.border}` : '',
    ].join(' ')}>
      <p className={[
        'text-[11px] leading-[1.6] whitespace-pre-wrap break-words min-h-[40px] m-0',
        text ? c.text : `${c.emptyText} italic`,
      ].join(' ')}>
        {text || 'Eslatma…'}
      </p>
    </div>
  )
}
