import type { NodeProps } from '@xyflow/react'
import {
  NodeShell, Pill, Preview, TgBubble, FlowHint,
  InlineButtonList, ReplyKeyboard, CallbackHint,
  MSG_ICONS, MSG_LABELS, METHOD_CLS,
  Antenna, Terminal, ImgIcon as Image, Volume2, Mic, FileText,
  MsgSquare as MessageSquare, Trash2, Send, Briefcase,
} from './NodeShell'
import { MapPin, Phone, Zap } from 'lucide-react'

// ── Shared badge components ────────────────────────────────────────────────────

function TypeBadge({ icon: Icon, label, colorClass, bgClass, borderClass }: {
  icon?: React.ElementType; label: string
  colorClass: string; bgClass: string; borderClass: string
}) {
  return (
    <span className={`inline-flex items-center gap-[3px] px-[5px] py-[1.5px] rounded-[4px] border text-[9px] font-semibold leading-none ${colorClass} ${bgClass} ${borderClass}`}>
      {Icon && <Icon size={8} color="currentColor" />}
      {label}
    </span>
  )
}

// ── Trigger nodes ──────────────────────────────────────────────────────────────

export function CommandNode({ data, selected }: NodeProps) {
  const cfg  = (data.config as Record<string, unknown>) || {}
  const cmd  = (cfg.command as string) || '/start'
  const desc = (cfg.description as string) || ''
  return (
    <NodeShell nodeType="command" selected={!!selected} noIn>
      <div className="font-mono text-[#4cd137] font-bold text-[13px]">{cmd}</div>
      {desc
        ? <div className="text-tg-muted text-[10px] mt-[3px]">{desc}</div>
        : <div className="text-tg-muted/40 text-[10px] mt-[3px] italic">Tavsif yo'q</div>
      }
    </NodeShell>
  )
}

export function StartNode({ data, selected }: NodeProps) {
  const cfg  = (data.config as Record<string, unknown>) || {}
  const desc = (cfg.description as string) || 'Bot ishga tushganda'
  return (
    <NodeShell nodeType="start" selected={!!selected} noIn>
      <div className="font-mono text-[#4cd137] font-bold text-[13px]">/start</div>
      <div className="text-tg-muted text-[10px] mt-[3px]">{desc}</div>
    </NodeShell>
  )
}

export function HandlerNode({ data, selected }: NodeProps) {
  const cfg        = (data.config as Record<string, unknown>) || {}
  const trigger    = (cfg.trigger as string) || 'any'
  const conditions = (cfg.conditions as { type: string; value?: string }[]) || []
  const commands   = (cfg.commands as string[]) || []
  const saveAs     = (cfg.save_as as string) || ''

  const TRIGGER_LABEL: Record<string, string> = {
    any: 'Har qanday', text: 'Matn', command: 'Command',
    photo: 'Rasm', video: 'Video', audio: 'Audio', voice: 'Ovoz',
    document: 'Hujjat', sticker: 'Sticker', location: 'Joylashuv', contact: 'Kontakt',
  }
  const TRIGGER_ICON: Record<string, React.ElementType> = {
    text: MessageSquare, command: Terminal, photo: Image, video: Zap,
    audio: Volume2, voice: Mic, document: FileText,
    location: MapPin, contact: Phone, any: Antenna,
  }
  const TIcon = TRIGGER_ICON[trigger] || Antenna

  const badge = (
    <TypeBadge
      icon={TIcon} label={TRIGGER_LABEL[trigger] || trigger}
      colorClass="text-node-violet" bgClass="bg-node-violet/10" borderClass="border-node-violet/20"
    />
  )

  return (
    <NodeShell nodeType="handler" selected={!!selected} noIn badge={badge}>
      {trigger === 'command' && (
        commands.length > 0 ? (
          <div className="flex flex-wrap gap-[3px]">
            {commands.slice(0, 4).map((cmd, i) => (
              <span key={i} className="font-mono text-[10px] text-node-green bg-node-green/10 border border-node-green/20 rounded-[5px] px-[6px] py-[1px]">{cmd}</span>
            ))}
            {commands.length > 4 && <span className="text-[10px] text-tg-muted">+{commands.length - 4}</span>}
          </div>
        ) : <FlowHint label="Barcha commandlar" />
      )}
      {trigger === 'text' && (
        conditions.length > 0 ? (
          <div className="flex flex-col gap-[3px]">
            {conditions.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-[5px] bg-tg-accent/10 border border-tg-accent/20 rounded-[6px] px-[7px] py-[3px]">
                <span className="text-[9px] text-tg-accent uppercase font-bold shrink-0">{c.type}</span>
                {c.value && <span className="text-[10px] text-tg-label truncate">{Array.isArray(c.value) ? (c.value as string[]).join(', ') : String(c.value)}</span>}
              </div>
            ))}
            {conditions.length > 3 && <div className="text-[10px] text-tg-muted mt-0.5">+{conditions.length - 3} ta shart</div>}
          </div>
        ) : <FlowHint label="Barcha matnlar" />
      )}
      {!['command', 'text'].includes(trigger) && (
        <FlowHint label={trigger === 'any' ? 'Har qanday xabar' : `${TRIGGER_LABEL[trigger] || trigger} kelganda`} />
      )}
      {saveAs && <div className="mt-[6px]"><Pill label={`→ {{${saveAs}}}`} colorClass="text-tg-accent" bgClass="bg-tg-accent/10" borderClass="border-tg-accent/20" /></div>}
    </NodeShell>
  )
}

export function BusinessHandlerNode({ data, selected }: NodeProps) {
  const cfg        = (data.config as Record<string, unknown>) || {}
  const event      = (cfg.event as string) || 'message'
  const saveAs     = (cfg.save_as as string) || ''
  const connFilter = (cfg.connection_filter as string) || ''
  const EVENT_LABEL: Record<string, string> = {
    message: 'Xabar keldi', connected: 'Ulandi', disconnected: 'Uzildi', any: 'Har qanday',
  }

  const badge = (
    <TypeBadge
      icon={Briefcase} label={EVENT_LABEL[event] || event}
      colorClass="text-node-indigo" bgClass="bg-node-indigo/10" borderClass="border-node-indigo/20"
    />
  )

  return (
    <NodeShell nodeType="business_handler" selected={!!selected} noIn badge={badge}>
      {connFilter
        ? <div className="text-[10px] text-node-purple bg-node-purple/10 rounded-[6px] px-[7px] py-[2px] truncate">Filter: {connFilter.slice(0, 20)}</div>
        : <FlowHint label="Barcha ulanishlar" />
      }
      {saveAs && <div className="mt-1"><Pill label={`→ {{${saveAs}}}`} colorClass="text-node-purple" bgClass="bg-node-purple/10" borderClass="border-node-purple/20" /></div>}
    </NodeShell>
  )
}

// ── Message nodes ──────────────────────────────────────────────────────────────

export function MessageNode({ data, selected }: NodeProps) {
  const cfg        = (data.config as Record<string, unknown>) || {}
  const msgType    = (cfg.message_type as string) || 'text'
  const text       = (cfg.text as string) || ''
  const buttons    = (cfg.buttons as { label: string; action?: string }[]) || []
  const layout     = (cfg.button_layout as string) || 'inline'
  const onCallback = (cfg.on_callback as string) || 'edit'
  const MIcon      = MSG_ICONS[msgType] || MessageSquare

  const badge = (
    <TypeBadge
      icon={MIcon} label={MSG_LABELS[msgType] || msgType}
      colorClass="text-tg-muted" bgClass="bg-tg-input" borderClass="border-tg-darkborder"
    />
  )

  return (
    <NodeShell nodeType="message" selected={!!selected} wide badge={badge}>
      <div className="flex flex-col gap-[6px]">
        <TgBubble msgType={msgType} text={text} cfg={cfg} />
        {buttons.length > 0 && layout === 'inline' && (
          <><InlineButtonList buttons={buttons} /><CallbackHint onCallback={onCallback} /></>
        )}
        {buttons.length > 0 && layout === 'reply' && <ReplyKeyboard buttons={buttons} />}
        {buttons.length === 0 && <FlowHint />}
      </div>
    </NodeShell>
  )
}

export function ButtonNode({ data, selected }: NodeProps) {
  const cfg        = (data.config as Record<string, unknown>) || {}
  const layout     = (cfg.button_layout as string) || 'inline'
  const buttons    = (cfg.buttons as { label: string; action?: string }[]) || []
  const text       = (cfg.text as string) || ''
  const onCallback = (cfg.on_callback as string) || 'edit'

  const badge = (
    <TypeBadge
      label={layout === 'reply' ? 'Reply' : 'Inline'}
      colorClass={layout === 'reply' ? 'text-node-green' : 'text-tg-accent'}
      bgClass={layout === 'reply' ? 'bg-node-green/10' : 'bg-tg-accent/10'}
      borderClass={layout === 'reply' ? 'border-node-green/20' : 'border-tg-accent/20'}
    />
  )

  return (
    <NodeShell nodeType="button" selected={!!selected} wide badge={badge}>
      <div className="flex flex-col gap-[6px]">
        {text && <TgBubble msgType="text" text={text} cfg={cfg} />}
        {layout === 'inline' && buttons.length > 0 && (
          <><InlineButtonList buttons={buttons} /><CallbackHint onCallback={onCallback} /></>
        )}
        {layout === 'reply'  && buttons.length > 0 && <ReplyKeyboard buttons={buttons} />}
        {buttons.length === 0 && <FlowHint label="Tugma yo'q" />}
      </div>
    </NodeShell>
  )
}

export function InputNode({ data, selected }: NodeProps) {
  const cfg        = (data.config as Record<string, unknown>) || {}
  const prompt     = (cfg.prompt as string) || ''
  const varName    = (cfg.variable_name as string) || ''
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

// ── Logic nodes ────────────────────────────────────────────────────────────────

export function ConditionNode({ data, selected }: NodeProps) {
  const cfg      = (data.config as Record<string, unknown>) || {}
  const variable = (cfg.variable as string) || '?'
  const operator = (cfg.operator as string) || 'equals'
  const value    = (cfg.value as string) || ''
  const opLabel: Record<string, string> = {
    equals: '=', not_equals: '≠', contains: '∋', greater_than: '>', less_than: '<', is_empty: '∅',
  }

  return (
    <NodeShell nodeType="condition" selected={!!selected} outCount={2}>
      <div className="font-mono text-[11px] text-node-orange bg-node-orange/10 border border-node-orange/20 rounded-[8px] px-[9px] py-[6px]">
        {`{{${variable}}} ${opLabel[operator] || operator} "${value}"`}
      </div>
      <div className="flex justify-between text-[10px] mt-2 px-[2px]">
        <span className="flex items-center gap-1 text-node-green font-semibold">
          <span className="w-[6px] h-[6px] rounded-full bg-node-green inline-block" />HA
        </span>
        <span className="flex items-center gap-1 text-node-red font-semibold">
          <span className="w-[6px] h-[6px] rounded-full bg-node-red inline-block" />YO'Q
        </span>
      </div>
    </NodeShell>
  )
}

export function DelayNode({ data, selected }: NodeProps) {
  const cfg     = (data.config as Record<string, unknown>) || {}
  const seconds = (cfg.seconds as number) || 3
  const typing  = cfg.typing_action !== false
  return (
    <NodeShell nodeType="delay" selected={!!selected}>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold text-white">{seconds}</span>
        <span className="text-tg-muted text-[11px]">soniya</span>
      </div>
      {typing && <div className="text-[10px] text-tg-muted/60 mt-1 flex items-center gap-1">
        <span className="w-[4px] h-[4px] rounded-full bg-tg-muted/40 inline-block" />
        typing… ko'rsatiladi
      </div>}
    </NodeShell>
  )
}

export function SetVariableNode({ data, selected }: NodeProps) {
  const cfg         = (data.config as Record<string, unknown>) || {}
  const assignments = (cfg.assignments as { variable: string; value: string }[]) || []
  return (
    <NodeShell nodeType="set_variable" selected={!!selected}>
      {assignments.length === 0
        ? <span className="text-tg-muted/50 italic text-[11px]">Hech narsa belgilanmagan</span>
        : assignments.slice(0, 3).map((a, i) => (
          <div key={i} className="font-mono text-[11px] text-node-grape mb-0.5">
            <span className="text-tg-muted">{'{{'}</span>{a.variable}<span className="text-tg-muted">{'}}'}</span>
            <span className="text-tg-muted mx-1">←</span>
            <span className="text-[#c39bd3]">{a.value || '…'}</span>
          </div>
        ))
      }
      {assignments.length > 3 && <div className="text-[10px] text-tg-muted mt-0.5">+{assignments.length - 3} ta</div>}
    </NodeShell>
  )
}

// ── Advanced nodes ─────────────────────────────────────────────────────────────

export function ApiCallNode({ data, selected }: NodeProps) {
  const cfg     = (data.config as Record<string, unknown>) || {}
  const method  = (cfg.method as string) || 'GET'
  const url     = (cfg.url as string) || ''
  const respVar = (cfg.response_variable as string) || ''
  const mCls    = METHOD_CLS[method] || { text: 'text-tg-label', bg: 'bg-tg-elevated' }

  const badge = (
    <TypeBadge
      label={method}
      colorClass={mCls.text} bgClass={mCls.bg} borderClass={`${mCls.text.replace('text-', 'border-')}/20`}
    />
  )

  return (
    <NodeShell nodeType="api_call" selected={!!selected} wide badge={badge}>
      <div className="text-[10px] text-tg-muted font-mono truncate mb-[5px]">{url || 'URL kiritilmagan…'}</div>
      {respVar && <Pill label={`→ {{${respVar}}}`} colorClass="text-node-teal" bgClass="bg-node-teal/10" borderClass="border-node-teal/20" />}
    </NodeShell>
  )
}

export function AiNode({ data, selected }: NodeProps) {
  const cfg     = (data.config as Record<string, unknown>) || {}
  const model   = (cfg.model as string) || 'claude-opus-4-7'
  const prompt  = (cfg.system_prompt as string) || ''
  const respVar = (cfg.response_variable as string) || ''

  const badge = (
    <TypeBadge
      label={model.includes('opus') ? 'Opus' : model.includes('sonnet') ? 'Sonnet' : 'AI'}
      colorClass="text-node-pink" bgClass="bg-node-pink/10" borderClass="border-node-pink/20"
    />
  )

  return (
    <NodeShell nodeType="ai" selected={!!selected} badge={badge}>
      {prompt
        ? <div className="text-[10px] text-tg-muted truncate">{prompt.slice(0, 55)}{prompt.length > 55 ? '…' : ''}</div>
        : <span className="text-tg-muted/50 italic text-[10px]">System prompt yo'q</span>
      }
      {respVar && <div className="mt-1"><Pill label={`→ {{${respVar}}}`} colorClass="text-node-pink" bgClass="bg-node-pink/10" borderClass="border-node-pink/20" /></div>}
    </NodeShell>
  )
}

// ── Other nodes ────────────────────────────────────────────────────────────────

export function AutoDeleteNode({ data, selected }: NodeProps) {
  const cfg     = (data.config as Record<string, unknown>) || {}
  const seconds = (cfg.seconds as number) || 10
  const msgVar  = (cfg.message_id_var as string) || 'last_message_id'
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
  const cfg     = (data.config as Record<string, unknown>) || {}
  const chatId  = (cfg.chat_id as string) || '—'
  const msgType = (cfg.message_type as string) || 'text'
  const text    = (cfg.text as string) || ''
  return (
    <NodeShell nodeType="send_to" selected={!!selected}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-[5px]">
          <div className="text-node-teal"><Send size={11} color="currentColor" /></div>
          <span className="text-[10px] text-tg-muted">Chat:</span>
          <span className="text-[11px] font-mono text-node-teal truncate max-w-[110px]">{chatId}</span>
        </div>
        {msgType === 'text' && text
          ? <div className="text-[10px] text-tg-muted truncate pl-4">{text.slice(0, 40)}</div>
          : msgType !== 'text' && <Pill label={msgType} colorClass="text-node-teal" bgClass="bg-node-teal/10" borderClass="border-node-teal/20" />
        }
      </div>
    </NodeShell>
  )
}

export function EndNode({ selected }: NodeProps) {
  return (
    <NodeShell nodeType="end" selected={!!selected} noOut>
      <div className="text-center py-[2px]">
        <div className="text-[11px] text-node-red font-semibold">Flow tugadi</div>
        <div className="text-[10px] text-tg-muted/60 mt-0.5">Conversation yakunlandi</div>
      </div>
    </NodeShell>
  )
}

export function StickyNoteNode({ data, selected }: NodeProps) {
  const cfg   = (data.config as Record<string, unknown>) || {}
  const text  = (cfg.text as string) || ''
  const color = (cfg.color as string) || 'yellow'
  const COLORS: Record<string, { bg: string; border: string; text: string; emptyText: string }> = {
    yellow: { bg: 'bg-node-amber/10', border: 'border-node-amber/30', text: 'text-[#f5d57f]',  emptyText: 'text-[#f5d57f]/30' },
    blue:   { bg: 'bg-tg-accent/10',  border: 'border-tg-accent/30',  text: 'text-[#7db8e8]',  emptyText: 'text-[#7db8e8]/30' },
    green:  { bg: 'bg-node-green/10', border: 'border-node-green/30', text: 'text-[#90ee90]',  emptyText: 'text-[#90ee90]/30' },
    pink:   { bg: 'bg-node-pink/10',  border: 'border-node-pink/30',  text: 'text-[#f8a8d0]',  emptyText: 'text-[#f8a8d0]/30' },
  }
  const c = COLORS[color] || COLORS.yellow
  return (
    <div className={[
      'relative min-w-[160px] max-w-[260px] rounded-[12px] p-3 border transition-[box-shadow] duration-150',
      c.bg, c.border, selected ? 'shadow-[0_0_0_1.5px_currentColor,0_4px_16px_rgba(0,0,0,0.4)]' : '',
    ].join(' ')}>
      <p className={['text-[11px] leading-[1.6] whitespace-pre-wrap break-words min-h-[40px] m-0', text ? c.text : `${c.emptyText} italic`].join(' ')}>
        {text || 'Eslatma…'}
      </p>
    </div>
  )
}
