import {
  Antenna, MessageSquare, Terminal, Image, Video,
  Music, Mic, FileText, Smile, MapPin, User, Users, Radio,
} from 'lucide-react'
import { Field, handleFocus } from './shared'
import CommandList from './CommandList'
import TextConditions, { type Condition } from './TextConditions'

// ── Trigger type definitions ───────────────────────────────────────────────────
const TRIGGERS_PRIVATE = [
  { value: 'any',      label: 'Har qanday', icon: Antenna,      color: '#8b5cf6' },
  { value: 'text',     label: 'Matn',       icon: MessageSquare, color: '#2481cc' },
  { value: 'command',  label: 'Command',    icon: Terminal,      color: '#27ae60' },
  { value: 'photo',    label: 'Rasm',       icon: Image,         color: '#e67e22' },
  { value: 'video',    label: 'Video',      icon: Video,         color: '#e91e8c' },
  { value: 'audio',    label: 'Audio',      icon: Music,         color: '#00bcd4' },
  { value: 'voice',    label: 'Ovoz',       icon: Mic,           color: '#f39c12' },
  { value: 'document', label: 'Hujjat',     icon: FileText,      color: '#7d9ab5' },
  { value: 'sticker',  label: 'Sticker',    icon: Smile,         color: '#f39c12' },
  { value: 'location', label: 'Joylashuv', icon: MapPin,        color: '#e53935' },
  { value: 'contact',  label: 'Kontakt',   icon: User,          color: '#9b59b6' },
] as const

const TRIGGERS_GROUP = [
  ...TRIGGERS_PRIVATE,
  { value: 'join_request', label: "Qo'shilish", icon: Users, color: '#22c55e' },
  { value: 'left_member',  label: 'Chiqish',    icon: Users, color: '#e53935' },
] as const

const TRIGGERS_CHANNEL = [
  { value: 'any',      label: 'Har qanday', icon: Radio,    color: '#f97316' },
  { value: 'text',     label: 'Matn',       icon: MessageSquare, color: '#2481cc' },
  { value: 'photo',    label: 'Rasm',       icon: Image,    color: '#e67e22' },
  { value: 'video',    label: 'Video',      icon: Video,    color: '#e91e8c' },
  { value: 'audio',    label: 'Audio',      icon: Music,    color: '#00bcd4' },
  { value: 'document', label: 'Hujjat',     icon: FileText, color: '#7d9ab5' },
] as const

// ── Section divider ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 -mx-3 px-3 py-[6px] bg-tg-elevated/60 border-y border-tg-darkborder">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-tg-muted">{label}</span>
    </div>
  )
}

// ── Visual trigger card ────────────────────────────────────────────────────────
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
      <span className={`text-[10px] font-semibold leading-none ${selected ? 'text-white' : 'text-tg-muted'}`}
        style={selected ? { color } : {}}>
        {label}
      </span>
    </button>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────
interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
  pageChatType?: string
}

export default function HandlerPanel({ cfg, set, pageChatType }: Props) {
  const trigger    = (cfg.trigger as string) || 'any'
  const conditions = (cfg.conditions as Condition[]) || []
  const mode       = (cfg.condition_mode as string) || 'any'
  const saveAs     = (cfg.save_as as string) || ''
  const commands   = (cfg.commands as string[]) || ['/start']

  const triggerList =
    pageChatType === 'channel' ? TRIGGERS_CHANNEL :
    pageChatType === 'group'   ? TRIGGERS_GROUP :
    TRIGGERS_PRIVATE

  const selected = triggerList.find(t => t.value === trigger)

  return (
    <div className="flex flex-col gap-0 -mx-3">

      {/* ── Section: Trigger turi ── */}
      <SectionLabel label="Trigger turi" />
      <div className="px-3 py-3">
        <div className="grid grid-cols-4 gap-[6px]">
          {triggerList.map(t => (
            <TriggerCard
              key={t.value}
              {...t}
              selected={trigger === t.value}
              onClick={() => set('trigger', t.value)}
            />
          ))}
        </div>

        {/* Join/leave info banner */}
        {(trigger === 'join_request' || trigger === 'left_member') && (
          <div className="mt-3 bg-tg-input rounded-[10px] px-[12px] py-[9px] text-[11px] text-tg-label leading-[1.5]">
            {trigger === 'join_request'
              ? "Foydalanuvchi guruhga qo'shilganda ishlaydi"
              : "Foydalanuvchi guruhdan chiqqanda ishlaydi"}
          </div>
        )}
      </div>

      {/* ── Section: Command list (only when trigger=command) ── */}
      {trigger === 'command' && (
        <>
          <SectionLabel label="Commandlar" />
          <div className="px-3 py-3">
            <CommandList commands={commands} onChange={v => set('commands', v)} />
          </div>
        </>
      )}

      {/* ── Section: Text conditions (only when trigger=text) ── */}
      {trigger === 'text' && (
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

      {/* ── Section: Save variable ── */}
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
              {selected?.value !== 'any' ? `${selected?.label} xabarini saqlash uchun nom bering` : "Foydalanuvchi xabarini saqlash uchun nom bering"}
            </p>
          )}
        </Field>
      </div>

    </div>
  )
}
