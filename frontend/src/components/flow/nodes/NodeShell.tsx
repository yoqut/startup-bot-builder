import { Handle, Position } from '@xyflow/react'
import { Globe, Link, MapPin, Phone, Antenna, MessageSquare, Terminal, Image as ImgIcon, Volume2, Mic, FileText, Trash2, Send, Briefcase, ArrowRight } from 'lucide-react'
import {
  ACCENT_HEX, ACCENT_CLS, META, MSG_ICONS, MSG_LABELS,
} from '@/pages/FlowBuilder/nodeDefinitions'

export { ACCENT_HEX, ACCENT_CLS, META, MSG_ICONS, MSG_LABELS }

export const METHOD_CLS: Record<string, { text: string; bg: string }> = {
  GET:    { text: 'text-node-green',  bg: 'bg-node-green/10'  },
  POST:   { text: 'text-tg-accent',   bg: 'bg-tg-accent/10'   },
  PUT:    { text: 'text-node-amber',  bg: 'bg-node-amber/10'  },
  PATCH:  { text: 'text-node-orange', bg: 'bg-node-orange/10' },
  DELETE: { text: 'text-node-red',    bg: 'bg-node-red/10'    },
}

// ── Handles ────────────────────────────────────────────────────────────────────

export function InHandle() {
  return (
    <Handle
      type="target"
      position={Position.Top}
      className="flow-handle flow-handle-in !rounded-full"
      style={{
        width: 20, height: 20,
        top: -10,
        zIndex: 10,
        background: 'rgba(36,129,204,0.08)',
        border: '1.5px solid #3d6080',
        boxShadow: '0 0 6px rgba(36,129,204,0.15), 0 6px 12px rgba(36,129,204,0.08)',
        cursor: 'crosshair',
      }}
    />
  )
}

export function OutHandle({ id, left }: { id?: string; left?: string }) {
  const color   = id === 'true' ? '#22c55e' : id === 'false' ? '#e53935' : '#2481cc'
  const variant = id === 'true' ? 'green'   : id === 'false' ? 'red'     : 'blue'
  return (
    <Handle
      type="source"
      position={Position.Bottom}
      id={id}
      className={`flow-handle flow-handle-out flow-out-${variant} !rounded-full`}
      style={{
        width: 20, height: 20,
        bottom: -10,
        zIndex: 10,
        background: `${color}14`,
        border: `1.5px solid ${color}`,
        boxShadow: `0 0 8px ${color}30, 0 -6px 12px ${color}10`,
        cursor: 'crosshair',
        ...(left ? { left } : {}),
      }}
    />
  )
}

// ── NodeShell ──────────────────────────────────────────────────────────────────
export type NodeExecState = 'idle' | 'executing' | 'success' | 'error' | 'warning'

export function NodeShell({
  nodeType, selected, children,
  noIn = false, noOut = false, outCount = 1, wide = false,
  execState = 'idle', errorMessage, collapsed = false, onDoubleClick,
  badge,
}: {
  nodeType: string; selected: boolean; children: React.ReactNode
  noIn?: boolean; noOut?: boolean; outCount?: number; wide?: boolean
  execState?: NodeExecState; errorMessage?: string
  collapsed?: boolean; onDoubleClick?: () => void
  badge?: React.ReactNode
}) {
  const m         = META[nodeType] || META.message
  const accentHex = ACCENT_HEX[nodeType] || '#2481cc'
  const cls       = ACCENT_CLS[accentHex]
  const Icon      = m.icon

  const execBorder =
    execState === 'executing' ? '#2481cc' :
    execState === 'success'   ? '#22c55e' :
    execState === 'error'     ? '#ef4444' :
    execState === 'warning'   ? '#f59e0b' : undefined

  const execShadow =
    execState === 'executing' ? '0 0 0 2px rgba(36,129,204,0.5), 0 0 12px rgba(36,129,204,0.25)' :
    execState === 'success'   ? '0 0 0 2px rgba(34,197,94,0.5)' :
    execState === 'error'     ? '0 0 0 2px rgba(239,68,68,0.5)'  : undefined

  const selectedShadow = `0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${accentHex}22`

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={[
        'relative rounded-[14px] transition-[box-shadow,transform] duration-150',
        'border border-tg-input node-shell',
        wide ? 'min-w-[260px] max-w-[300px]' : 'min-w-[220px] max-w-[270px]',
        selected ? 'bg-tg-elevated node-shell-selected' : 'bg-tg-card hover:-translate-y-[1px]',
        execState === 'executing' ? 'animate-node-pulse' : '',
        noIn  ? 'node-shell-no-in'  : '',
        noOut ? 'node-shell-no-out' : '',
      ].join(' ')}
      style={{
        borderLeft: `3px solid ${execBorder ?? accentHex}`,
        boxShadow: execShadow ?? (selected ? selectedShadow : '0 2px 10px rgba(0,0,0,0.35)'),
        '--node-accent': accentHex,
      } as React.CSSProperties}
    >
      {!noIn && <InHandle />}

      {/* Inner content wrapper — own overflow-hidden so gradients clip to rounded corners
          while handles (z-index:10) can overlap the node edges for seamless visual connection.
          rounded-[13px] = 14px outer radius minus 1px border, so corners align perfectly. */}
      <div className={['rounded-[13px] overflow-hidden', selected ? 'bg-tg-elevated' : 'bg-tg-card'].join(' ')}>
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2.5 px-3 py-[9px] border-b border-tg-input transition-colors duration-150"
          style={{
            background: selected
              ? `linear-gradient(135deg, ${accentHex}22 0%, #2e3f52 55%)`
              : `linear-gradient(135deg, ${accentHex}12 0%, #2b3a4a 55%)`,
          }}
        >
          {/* Icon 32×32 */}
          <div className={`w-8 h-8 rounded-[9px] ${cls?.bg ?? 'bg-tg-card'} border ${cls?.border ?? 'border-tg-border'} flex items-center justify-center shrink-0`}>
            <div className={cls?.icon ?? 'text-tg-label'}>
              <Icon size={15} color="currentColor" />
            </div>
          </div>

          {/* Title column — badge sits below, never crowds the title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[13px] font-semibold text-white tracking-[0.1px] truncate">
                {m.label}
              </span>
              {/* Exec state — right of title */}
              <div className="shrink-0 flex items-center gap-1">
                {execState === 'executing' && (
                  <span className="flex items-center gap-1 text-[9px] text-tg-accent font-semibold">
                    <span className="w-[5px] h-[5px] rounded-full bg-tg-accent animate-pulse" />
                    Run
                  </span>
                )}
                {execState === 'success' && <span className="text-[10px] text-node-green font-bold">✓</span>}
                {execState === 'error'   && <span className="text-[10px] text-node-red font-bold">✗</span>}
                {collapsed && <span className="text-[9px] text-tg-muted">▸</span>}
              </div>
            </div>
            {/* Badge sub-row */}
            {badge && <div className="mt-[3px]">{badge}</div>}
          </div>
        </div>

        {/* ── Body ── */}
        {!collapsed && (
          <div className="px-3 py-[10px] text-[11px] text-tg-label">{children}</div>
        )}

        {/* ── Inline error strip ── */}
        {errorMessage && !collapsed && (
          <div className="flex items-center gap-1.5 px-3 py-[6px] bg-node-red/10 border-t border-node-red/20">
            <span className="text-[9px] text-node-red leading-none">⚠</span>
            <span className="text-[10px] text-node-red leading-[1.3]">{errorMessage}</span>
          </div>
        )}
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

// ── Atoms ──────────────────────────────────────────────────────────────────────

export function Pill({ label, colorClass = 'text-tg-label', bgClass = 'bg-tg-elevated', borderClass = 'border-tg-label/20' }: {
  label: string; colorClass?: string; bgClass?: string; borderClass?: string
}) {
  return (
    <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[6px] text-[10px] font-medium border ${colorClass} ${bgClass} ${borderClass}`}>
      {label}
    </span>
  )
}

export function Preview({ text, max = 80 }: { text: string; max?: number }) {
  if (!text) return <span className="text-tg-muted/50 italic text-[11px]">Bo'sh…</span>
  const trimmed = text.length > max ? text.slice(0, max) + '…' : text
  const parts   = trimmed.split(/({{[^}]+}})/g)
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

// Flow-forward hint (replaces "Tugma yo'q — keyingiga o'tadi")
export function FlowHint({ label = "Keyingiga o'tadi" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-[5px] px-2 text-[9px] text-tg-muted/50 border border-dashed border-tg-muted/15 rounded-[7px]">
      <ArrowRight size={9} />
      <span>{label}</span>
    </div>
  )
}

export function TgBubble({ msgType, text, cfg }: { msgType: string; text: string; cfg: Record<string, unknown> }) {
  const MIcon = MSG_ICONS[msgType] || MessageSquare
  if (msgType === 'poll') {
    return (
      <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2">
        <div className="text-[10px] text-tg-accent font-semibold mb-[3px]">📊 Poll</div>
        <div className="text-[11px] text-white leading-[1.4]">{(cfg.poll_question as string) || <span className="opacity-40 italic">Savol yo'q</span>}</div>
        <div className="text-[9px] text-white/30 mt-[3px]">{((cfg.poll_options as string[]) || []).length} variant</div>
      </div>
    )
  }
  if (['photo', 'video', 'audio', 'voice', 'document'].includes(msgType)) {
    return (
      <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2 flex items-center gap-2">
        <div className="w-[34px] h-[34px] rounded-[8px] bg-tg-accent/20 flex items-center justify-center shrink-0">
          <div className="text-tg-accent"><MIcon size={15} color="currentColor" /></div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-white">{MSG_LABELS[msgType]}</div>
          {text && <div className="text-[9px] text-white/40 overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">{text.slice(0, 40)}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="bg-tg-input rounded-[14px_14px_14px_4px] px-[10px] py-2">
      <p className="text-[11px] text-white leading-[1.5] m-0 break-words whitespace-pre-wrap">
        {text ? (text.length > 160 ? text.slice(0, 160) + '…' : text) : <span className="opacity-30 italic">Matn yo'q…</span>}
      </p>
    </div>
  )
}

export function InlineBtn({ btn, index }: { btn: { label: string; action?: string }; index: number }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-center bg-[#1e3a5f] border border-tg-accent/30 rounded-[10px] h-[26px] px-2 gap-1">
        {btn.action === 'url'     && <div className="text-tg-accent"><Link  size={9} color="currentColor" /></div>}
        {btn.action === 'web_app' && <div className="text-tg-accent"><Globe size={9} color="currentColor" /></div>}
        <span className="text-[10px] text-[#7db8e8] overflow-hidden text-ellipsis whitespace-nowrap font-medium">{btn.label || '…'}</span>
      </div>
      {(!btn.action || btn.action === 'node') && (
        <Handle type="source" position={Position.Right} id={`btn_${index}`}
          className="!absolute !right-[-6px] !top-1/2 !-translate-y-1/2 !w-3 !h-3 !rounded-full"
          style={{ background: '#2481cc', border: '2.5px solid #13202c', boxShadow: '0 0 0 2px rgba(36,129,204,0.3)' }}
        />
      )}
    </div>
  )
}

export function InlineButtonList({ buttons, max = 5 }: { buttons: { label: string; action?: string }[]; max?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {buttons.slice(0, max).map((btn, i) => <InlineBtn key={i} btn={btn} index={i} />)}
      {buttons.length > max && <div className="text-[9px] text-tg-muted text-center">+{buttons.length - max} ta</div>}
    </div>
  )
}

export function ReplyKeyboard({ buttons, max = 4 }: { buttons: { label: string }[]; max?: number }) {
  return (
    <div className="bg-tg-elevated rounded-[10px] border border-tg-input p-2">
      <div className="text-[8px] text-tg-muted uppercase tracking-[0.5px] mb-[5px]">Reply keyboard</div>
      <div className="grid grid-cols-2 gap-1">
        {buttons.slice(0, max).map((btn, i) => (
          <div key={i} className="bg-tg-card rounded-[7px] px-[6px] py-1 text-center">
            <span className="text-[10px] text-tg-label overflow-hidden text-ellipsis whitespace-nowrap block">{btn.label || '…'}</span>
          </div>
        ))}
      </div>
      {buttons.length > max && <div className="text-[9px] text-tg-muted text-center mt-[3px]">+{buttons.length - max} ta</div>}
    </div>
  )
}

export function CallbackHint({ onCallback }: { onCallback: string }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className={`w-[5px] h-[5px] rounded-full ${onCallback === 'edit' ? 'bg-node-amber' : 'bg-node-green'}`} />
      <span className={`text-[9px] ${onCallback === 'edit' ? 'text-node-amber/60' : 'text-node-green/60'}`}>
        {onCallback === 'edit' ? 'Bosilganda tahrirlaydi' : 'Bosilganda yangi xabar'}
      </span>
    </div>
  )
}

export { MapPin, Phone, Antenna, MessageSquare as MsgSquare, Terminal, ImgIcon, Volume2, Mic, FileText, Trash2, Send, Briefcase }
