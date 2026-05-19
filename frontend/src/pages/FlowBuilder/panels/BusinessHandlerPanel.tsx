import { Field, handleFocus } from './shared'
import CommandList from './CommandList'
import TextConditions, { type Condition } from './TextConditions'

const TRIGGERS_BUSINESS = [
  { value: 'any',          label: 'Har qanday xabar' },
  { value: 'text',         label: 'Matn (text)' },
  { value: 'command',      label: 'Command (/start, /help…)' },
  { value: 'photo',        label: 'Rasm (photo)' },
  { value: 'video',        label: 'Video' },
  { value: 'audio',        label: 'Audio' },
  { value: 'voice',        label: 'Ovoz xabari (voice)' },
  { value: 'document',     label: 'Hujjat (document)' },
  { value: 'location',     label: 'Joylashuv (location)' },
  { value: 'contact',      label: 'Kontakt (contact)' },
  { value: 'connected',    label: 'Business ulandi' },
  { value: 'disconnected', label: 'Business uzildi' },
]

interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
}

export default function BusinessHandlerPanel({ cfg, set }: Props) {
  const trigger    = (cfg.trigger as string) || (cfg.event as string) || 'any'
  const conditions = (cfg.conditions as Condition[]) || []
  const mode       = (cfg.condition_mode as string) || 'any'
  const saveAs     = (cfg.save_as as string) || ''
  const commands   = (cfg.commands as string[]) || ['/start']

  const isConnectionEvent = trigger === 'connected' || trigger === 'disconnected'

  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Trigger turi">
        <select value={trigger} onChange={e => set('trigger', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          {TRIGGERS_BUSINESS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      {trigger === 'command' && (
        <CommandList commands={commands} onChange={v => set('commands', v)} />
      )}

      {trigger === 'text' && (
        <TextConditions
          conditions={conditions}
          mode={mode}
          onChange={v => set('conditions', v)}
          onModeChange={v => set('condition_mode', v)}
        />
      )}

      {isConnectionEvent && (
        <div className="bg-node-indigo/10 border border-node-indigo/20 rounded-[10px] px-[14px] py-3 text-xs text-node-indigo/80 leading-[1.5]">
          {trigger === 'connected'
            ? "Business foydalanuvchi botingizni ulab qo'yganida ishlaydi."
            : "Business foydalanuvchi botni o'chirib qo'yganida ishlaydi."}
          <br />
          <span className="text-node-indigo/50">Telegram → Sozlamalar → Business → Chatbotlar</span>
        </div>
      )}

      {!isConnectionEvent && (
        <Field label="Connection ID filter (ixtiyoriy)">
          <input value={(cfg.connection_filter as string) || ''} onChange={e => set('connection_filter', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Aniq bir Business ulanish uchun" />
          <p className="mt-[5px] text-[11px] text-tg-muted">Bo'sh = barcha Business ulanishlar</p>
        </Field>
      )}

      <Field label="Matnni o'zgaruvchiga saqlash">
        <input value={saveAs} onChange={e => set('save_as', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="user_input" />
        <p className="mt-[5px] text-[11px] text-tg-muted">{"{{business_connection_id}} avtomatik saqlanadi"}</p>
      </Field>
    </div>
  )
}
