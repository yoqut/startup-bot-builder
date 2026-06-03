import {
  Antenna, MessageSquare, Terminal, Image, Video,
  Music, Mic, FileText, MapPin, User, Link, Link2Off,
} from 'lucide-react'
import { Field, handleFocus } from './shared'
import CommandList from './CommandList'
import TextConditions, { type Condition } from './TextConditions'

const TRIGGERS = [
  { value: 'any',          label: 'Har qanday', icon: Antenna,       color: '#8b5cf6' },
  { value: 'text',         label: 'Matn',       icon: MessageSquare, color: '#2481cc' },
  { value: 'command',      label: 'Command',    icon: Terminal,      color: '#27ae60' },
  { value: 'photo',        label: 'Rasm',       icon: Image,         color: '#e67e22' },
  { value: 'video',        label: 'Video',      icon: Video,         color: '#e91e8c' },
  { value: 'audio',        label: 'Audio',      icon: Music,         color: '#00bcd4' },
  { value: 'voice',        label: 'Ovoz',       icon: Mic,           color: '#f39c12' },
  { value: 'document',     label: 'Hujjat',     icon: FileText,      color: '#7d9ab5' },
  { value: 'location',     label: 'Joylashuv',  icon: MapPin,        color: '#e53935' },
  { value: 'contact',      label: 'Kontakt',    icon: User,          color: '#9b59b6' },
  { value: 'connected',    label: 'Ulandi',     icon: Link,          color: '#6366f1' },
  { value: 'disconnected', label: 'Uzildi',     icon: Link2Off,      color: '#6366f1' },
]

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 -mx-3 px-3 py-[6px] bg-tg-elevated/60 border-y border-tg-darkborder">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-tg-muted">{label}</span>
    </div>
  )
}

function TriggerCard({
  value, label, icon: Icon, color, selected, onClick,
}: {
  value: string; label: string; icon: React.ElementType
  color: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-[5px] rounded-[10px] py-[9px] px-[6px] border cursor-pointer transition-all duration-120 w-full',
        selected
          ? 'border-transparent text-white'
          : 'bg-tg-elevated border-tg-input text-tg-muted hover:border-tg-border hover:text-tg-label',
      ].join(' ')}
      style={selected ? {
        background: `${color}18`,
        borderColor: `${color}55`,
        boxShadow: `0 0 0 1px ${color}30`,
      } : {}}
    >
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={selected
          ? { background: `${color}25`, color }
          : { background: 'transparent', color: 'currentColor' }
        }
      >
        <Icon size={14} color="currentColor" />
      </div>
      <span
        className={`text-[10px] font-semibold leading-none ${selected ? 'text-white' : 'text-tg-muted'}`}
        style={selected ? { color } : {}}
      >
        {label}
      </span>
    </button>
  )
}

interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
}

export default function BusinessHandlerPanel({ cfg, set }: Props) {
  // Backward compat: cfg.trigger (string) → cfg.triggers (string[])
  const triggers: string[] = Array.isArray(cfg.triggers)
    ? (cfg.triggers as string[])
    : [(cfg.trigger as string) || (cfg.event as string) || 'any']

  const conditions = (cfg.conditions as Condition[]) || []
  const mode       = (cfg.condition_mode as string) || 'any'
  const saveAs     = (cfg.save_as as string) || ''
  const commands   = (cfg.commands as string[]) || ['/start']

  function toggle(value: string) {
    if (triggers.includes(value)) {
      const next = triggers.filter(t => t !== value)
      set('triggers', next.length ? next : ['any'])
    } else {
      set('triggers', [...triggers, value])
    }
  }

  const hasText     = triggers.includes('text')
  const hasCommand  = triggers.includes('command')
  const hasConnect  = triggers.includes('connected') || triggers.includes('disconnected')

  return (
    <div className="flex flex-col gap-0 -mx-3">

      <SectionLabel label="Trigger turi (bir yoki bir nechta)" />
      <div className="px-3 py-3">
        <div className="grid grid-cols-4 gap-[6px]">
          {TRIGGERS.map(t => (
            <TriggerCard
              key={t.value}
              {...t}
              selected={triggers.includes(t.value)}
              onClick={() => toggle(t.value)}
            />
          ))}
        </div>

        {hasConnect && (
          <div className="mt-3 bg-node-indigo/10 border border-node-indigo/20 rounded-[10px] px-[12px] py-[9px] text-[11px] text-node-indigo/80 leading-[1.5]">
            {triggers.includes('connected') && !triggers.includes('disconnected') &&
              "Business foydalanuvchi botingizni ulab qo'yganida ishlaydi."}
            {triggers.includes('disconnected') && !triggers.includes('connected') &&
              "Business foydalanuvchi botni o'chirib qo'yganida ishlaydi."}
            {triggers.includes('connected') && triggers.includes('disconnected') &&
              "Business bot ulanganda ham, uzilganda ham ishlaydi."}
            <br />
            <span className="text-node-indigo/50">Telegram → Sozlamalar → Business → Chatbotlar</span>
          </div>
        )}
      </div>

      {hasCommand && (
        <>
          <SectionLabel label="Commandlar" />
          <div className="px-3 py-3">
            <CommandList commands={commands} onChange={v => set('commands', v)} />
          </div>
        </>
      )}

      {hasText && (
        <>
          <SectionLabel label="Matn shartlari" />
          <div className="px-3 py-3">
            <TextConditions
              conditions={conditions}
              mode={mode}
              onChange={v => set('conditions', v)}
              onModeChange={v => set('condition_mode', v)}
            />
          </div>
        </>
      )}

      <SectionLabel label="Saqlash" />
      <div className="px-3 py-3">
        <Field label="Xabarni o'zgaruvchiga saqlash">
          <input
            value={saveAs}
            onChange={e => set('save_as', e.target.value)}
            className="tg-input"
            onFocus={handleFocus}
            placeholder="user_input"
          />
          {saveAs ? (
            <p className="mt-[5px] text-[11px] text-tg-muted leading-[1.4]">
              <span className="font-mono text-tg-accent bg-tg-accent/10 px-[4px] py-[1px] rounded-[4px]">{`{{${saveAs}}}`}</span>
              {" sifatida keyingi nodelarda ishlatiladi"}
            </p>
          ) : (
            <p className="mt-[5px] text-[11px] text-tg-muted/60">
              {"{{business_connection_id}} avtomatik saqlanadi"}
            </p>
          )}
        </Field>

        {!hasConnect && (
          <Field label="Connection ID filter (ixtiyoriy)">
            <input
              value={(cfg.connection_filter as string) || ''}
              onChange={e => set('connection_filter', e.target.value)}
              className="tg-input mt-3"
              onFocus={handleFocus}
              placeholder="Aniq bir Business ulanish uchun"
            />
            <p className="mt-[5px] text-[11px] text-tg-muted">Bo'sh = barcha Business ulanishlar</p>
          </Field>
        )}
      </div>

    </div>
  )
}
