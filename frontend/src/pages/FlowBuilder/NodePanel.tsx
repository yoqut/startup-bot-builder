import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Node } from '@xyflow/react'

interface Props {
  node: Node
  onClose: () => void
  onUpdate: (config: Record<string, unknown>) => void
  chatType?: string
  fullWidth?: boolean
}

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  const el = e.currentTarget
  requestAnimationFrame(() => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-tg-label mb-[6px]">
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Command panel ────────────────────────────────────────────────────────────
function CommandPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Command">
        <input
          value={(cfg.command as string) || '/start'}
          onChange={(e) => set('command', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="/start"
        />
      </Field>
      <Field label="Tavsif (ixtiyoriy)">
        <input
          value={(cfg.description as string) || ''}
          onChange={(e) => set('description', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="Botni ishga tushirish"
        />
      </Field>
    </div>
  )
}

// ── Message panel ────────────────────────────────────────────────────────────
const MSG_TYPES = [
  { value: 'text', label: 'Matn' },
  { value: 'photo', label: 'Rasm (Photo)' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'voice', label: 'Voice' },
  { value: 'document', label: 'Hujjat (Document)' },
  { value: 'poll', label: "So'rovnoma (Poll)" },
]

// ── Handler panel ─────────────────────────────────────────────────────────────

const TRIGGERS_PRIVATE = [
  { value: 'any',      label: '🔔 Har qanday xabar' },
  { value: 'text',     label: '💬 Matn (text)' },
  { value: 'command',  label: '⚡ Command (/start, /help…)' },
  { value: 'photo',    label: '🖼️ Rasm (photo)' },
  { value: 'video',    label: '🎬 Video' },
  { value: 'audio',    label: '🎵 Audio' },
  { value: 'voice',    label: '🎤 Ovoz xabari (voice)' },
  { value: 'document', label: '📄 Hujjat (document)' },
  { value: 'sticker',  label: '😄 Sticker' },
  { value: 'location', label: '📍 Joylashuv (location)' },
  { value: 'contact',  label: '👤 Kontakt (contact)' },
]

const TRIGGERS_GROUP = [
  ...TRIGGERS_PRIVATE,
  { value: 'join_request', label: "Guruhga qo'shilish (new member)" },
  { value: 'left_member',  label: 'Guruhdan chiqish (left member)' },
]

const TRIGGERS_CHANNEL = [
  { value: 'any',      label: 'Har qanday post' },
  { value: 'text',     label: 'Matn post' },
  { value: 'photo',    label: 'Rasm post' },
  { value: 'video',    label: 'Video post' },
  { value: 'audio',    label: 'Audio post' },
  { value: 'document', label: 'Hujjat post' },
]

const COND_TYPES = [
  { value: 'any',        label: "Har qanday (wildcart)" },
  { value: 'exact',      label: "Aniq mos (exact)" },
  { value: 'contains',   label: "O'z ichiga oladi" },
  { value: 'starts_with',label: "Boshlanadi" },
  { value: 'ends_with',  label: "Tugaydi" },
  { value: 'in_list',    label: "Ro'yxatdan biri" },
  { value: 'regex',      label: "Regex" },
]

type Condition = { type: string; value: string }

function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none cursor-pointer p-1 flex shrink-0 text-tg-muted hover:text-node-red transition-colors duration-150"
    >
      <Trash2 size={13} />
    </button>
  )
}

function HandlerPanel({ cfg, set, pageChatType }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void; setMany?: (u: Record<string, unknown>) => void; pageChatType?: string }) {
  const trigger   = (cfg.trigger as string) || 'any'
  const conditions = (cfg.conditions as Condition[]) || []
  const mode      = (cfg.condition_mode as string) || 'any'
  const saveAs    = (cfg.save_as as string) || ''

  const triggerList =
    pageChatType === 'channel' ? TRIGGERS_CHANNEL :
    pageChatType === 'group'   ? TRIGGERS_GROUP :
    TRIGGERS_PRIVATE

  // Command trigger
  const commands = (cfg.commands as string[]) || ['/start']
  const updateCommand = (i: number, val: string) => {
    const next = [...commands]; next[i] = val; set('commands', next)
  }
  const addCommand    = () => set('commands', [...commands, ''])
  const removeCommand = (i: number) => set('commands', commands.filter((_, idx) => idx !== i))

  // Text conditions
  const addCond    = () => set('conditions', [...conditions, { type: 'any', value: '' }])
  const removeCond = (i: number) => set('conditions', conditions.filter((_, idx) => idx !== i))
  const updateCond = (i: number, key: string, val: string) => {
    const next = [...conditions]; next[i] = { ...next[i], [key]: val }; set('conditions', next)
  }

  return (
    <div className="flex flex-col gap-[14px]">

      {/* Trigger type */}
      <Field label="Trigger turi">
        <select
          value={trigger}
          onChange={(e) => set('trigger', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          {triggerList.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      {/* Command list */}
      {trigger === 'command' && (
        <div>
          <label className="block text-xs font-medium text-tg-label mb-2">
            Commandlar
          </label>
          <div className="flex flex-col gap-[6px]">
            {commands.map((cmd, i) => (
              <div key={i} className="flex items-center gap-[6px]">
                <span className="text-tg-label text-xs font-mono shrink-0">/</span>
                <input
                  value={cmd.startsWith('/') ? cmd.slice(1) : cmd}
                  onChange={(e) => updateCommand(i, '/' + e.target.value.replace(/^\//, ''))}
                  className="tg-input font-mono text-node-green text-xs py-[6px] px-[10px] flex-1"
                  onFocus={handleFocus}
                  placeholder="start"
                />
                {commands.length > 1 && (
                  <TrashBtn onClick={() => removeCommand(i)} />
                )}
              </div>
            ))}
            <button
              onClick={addCommand}
              className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
            >
              <Plus size={12} /> Command qo'shish
            </button>
          </div>
        </div>
      )}

      {/* Text conditions */}
      {trigger === 'text' && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-tg-label">Shartlar</label>
            <select
              value={mode}
              onChange={(e) => set('condition_mode', e.target.value)}
              className="bg-tg-input border border-tg-border rounded-md py-[3px] px-2 text-[11px] text-tg-text outline-none cursor-pointer"
              onFocus={handleFocus}
            >
              <option value="any">Birontasi (OR)</option>
              <option value="all">Hammasi (AND)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            {conditions.map((c, i) => (
              <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
                <div className="flex items-center gap-[6px]">
                  <select
                    value={c.type}
                    onChange={(e) => updateCond(i, 'type', e.target.value)}
                    className="tg-input tg-select flex-1 py-[6px] px-[10px] text-xs"
                    onFocus={handleFocus}
                  >
                    {COND_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <TrashBtn onClick={() => removeCond(i)} />
                </div>
                {c.type !== 'any' && (
                  <input
                    value={c.value}
                    onChange={(e) => updateCond(i, 'value', e.target.value)}
                    className="tg-input py-[6px] px-[10px] text-xs"
                    onFocus={handleFocus}
                    placeholder={c.type === 'in_list' ? "ha, yo'q, bor" : c.type === 'regex' ? '^salom' : 'qiymat'}
                  />
                )}
              </div>
            ))}
            <button
              onClick={addCond}
              className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
            >
              <Plus size={12} /> {"Shart qo'shish"}
            </button>
          </div>
        </>
      )}

      {/* join_request / left_member info */}
      {(trigger === 'join_request' || trigger === 'left_member') && (
        <div className="bg-tg-input rounded-[10px] px-[14px] py-[10px] text-xs text-tg-label leading-[1.5]">
          {trigger === 'join_request'
            ? "Foydalanuvchi guruhga qo'shilganda ishlaydi"
            : "Foydalanuvchi guruhdan chiqqanda ishlaydi"}
        </div>
      )}

      <Field label="Matnni o'zgaruvchiga saqlash">
        <input
          value={saveAs}
          onChange={(e) => set('save_as', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="user_input"
        />
        <p className="mt-[5px] text-[11px] text-tg-muted">{"{{user_input}} sifatida keyingi nodelarda ishlatiladi"}</p>
      </Field>
    </div>
  )
}

// ── Auto Delete panel ─────────────────────────────────────────────────────────
function AutoDeletePanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="bg-tg-input border border-tg-border rounded-[10px] px-[14px] py-[10px] text-xs text-tg-label leading-[1.5]">
        Oldingi xabar yuborilgandan keyin N soniya o'tib uni o'chiradi.<br/>
        <span className="text-node-amber">MessageNode</span> avtomatik <code className="text-xs">last_message_id</code> saqlaydi.
      </div>
      <Field label="Qaysi xabarni o'chirish (o'zgaruvchi nomi)">
        <input
          value={(cfg.message_id_var as string) || 'last_message_id'}
          onChange={e => set('message_id_var', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="last_message_id"
        />
      </Field>
      <Field label="Necha soniyadan keyin o'chirish">
        <input
          type="number" min={1} max={86400}
          value={(cfg.seconds as number) || 10}
          onChange={e => set('seconds', Number(e.target.value))}
          className="tg-input"
          onFocus={handleFocus}
        />
      </Field>
      <Field label="Chat ID (ixtiyoriy, bo'sh = joriy chat)">
        <input
          value={(cfg.chat_id_override as string) || ''}
          onChange={e => set('chat_id_override', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="{{chat_id}} yoki raqam"
        />
      </Field>
    </div>
  )
}

// ── Send To panel ─────────────────────────────────────────────────────────────
function SendToPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const msgType = (cfg.message_type as string) || 'text'
  const isMedia = ['photo', 'video', 'audio', 'document'].includes(msgType)

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="bg-tg-input rounded-[10px] px-[14px] py-[10px] text-xs text-tg-label leading-[1.5]">
        Istalgan user, guruh yoki kanalga ID orqali xabar yuboradi.
      </div>
      <Field label="Chat ID (user/guruh/kanal)">
        <input
          value={(cfg.chat_id as string) || ''}
          onChange={e => set('chat_id', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="123456789 yoki {{user_id}}"
        />
        <p className="mt-[5px] text-[11px] text-tg-muted">O'zgaruvchi ham ishlatsa bo'ladi: {"{{chat_id}}"}</p>
      </Field>
      <Field label="Xabar turi">
        <select
          value={msgType}
          onChange={e => set('message_type', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option value="text">Matn</option>
          <option value="photo">Rasm</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="document">Hujjat</option>
        </select>
      </Field>
      {msgType === 'text' && (
        <>
          <Field label="Xabar matni">
            <textarea
              rows={4}
              value={(cfg.text as string) || ''}
              onChange={e => set('text', e.target.value)}
              className="tg-input tg-textarea"
              onFocus={handleFocus}
              placeholder={"Salom {{user_name}}!"}
            />
          </Field>
          <Field label="Parse Mode">
            <select
              value={(cfg.parse_mode as string) || 'HTML'}
              onChange={e => set('parse_mode', e.target.value)}
              className="tg-input tg-select"
              onFocus={handleFocus}
            >
              <option value="HTML">HTML</option>
              <option value="Markdown">Markdown</option>
            </select>
          </Field>
        </>
      )}
      {isMedia && (
        <>
          <Field label="Fayl URL">
            <input
              value={(cfg.file_url as string) || ''}
              onChange={e => set('file_url', e.target.value)}
              className="tg-input"
              onFocus={handleFocus}
              placeholder="https://example.com/file.jpg"
            />
          </Field>
          <Field label="Caption (ixtiyoriy)">
            <input
              value={(cfg.caption as string) || ''}
              onChange={e => set('caption', e.target.value)}
              className="tg-input"
              onFocus={handleFocus}
              placeholder="Rasm tavsifi"
            />
          </Field>
        </>
      )}
    </div>
  )
}

// ── Business Handler panel ────────────────────────────────────────────────────
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

function BusinessHandlerPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const trigger = (cfg.trigger as string) || (cfg.event as string) || 'any'
  const conditions = (cfg.conditions as Condition[]) || []
  const mode = (cfg.condition_mode as string) || 'any'
  const saveAs = (cfg.save_as as string) || ''
  const commands = (cfg.commands as string[]) || ['/start']

  const updateCommand = (i: number, val: string) => {
    const next = [...commands]; next[i] = val; set('commands', next)
  }
  const addCommand    = () => set('commands', [...commands, ''])
  const removeCommand = (i: number) => set('commands', commands.filter((_, idx) => idx !== i))

  const addCond    = () => set('conditions', [...conditions, { type: 'any', value: '' }])
  const removeCond = (i: number) => set('conditions', conditions.filter((_, idx) => idx !== i))
  const updateCond = (i: number, key: string, val: string) => {
    const next = [...conditions]; next[i] = { ...next[i], [key]: val }; set('conditions', next)
  }

  const isConnectionEvent = trigger === 'connected' || trigger === 'disconnected'

  return (
    <div className="flex flex-col gap-[14px]">

      <Field label="Trigger turi">
        <select
          value={trigger}
          onChange={e => set('trigger', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          {TRIGGERS_BUSINESS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      {trigger === 'command' && (
        <div>
          <label className="block text-xs font-medium text-tg-label mb-2">
            Commandlar
          </label>
          <div className="flex flex-col gap-[6px]">
            {commands.map((cmd, i) => (
              <div key={i} className="flex items-center gap-[6px]">
                <span className="text-tg-label text-xs font-mono shrink-0">/</span>
                <input
                  value={cmd.startsWith('/') ? cmd.slice(1) : cmd}
                  onChange={e => updateCommand(i, '/' + e.target.value.replace(/^\//, ''))}
                  className="tg-input font-mono text-node-green text-xs py-[6px] px-[10px] flex-1"
                  onFocus={handleFocus}
                  placeholder="start"
                />
                {commands.length > 1 && (
                  <TrashBtn onClick={() => removeCommand(i)} />
                )}
              </div>
            ))}
            <button
              onClick={addCommand}
              className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
            >
              <Plus size={12} /> Command qo'shish
            </button>
          </div>
        </div>
      )}

      {trigger === 'text' && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-tg-label">Shartlar</label>
            <select
              value={mode}
              onChange={e => set('condition_mode', e.target.value)}
              className="bg-tg-input border border-tg-border rounded-md py-[3px] px-2 text-[11px] text-tg-text outline-none cursor-pointer"
              onFocus={handleFocus}
            >
              <option value="any">Birontasi (OR)</option>
              <option value="all">Hammasi (AND)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            {conditions.map((c, i) => (
              <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
                <div className="flex items-center gap-[6px]">
                  <select
                    value={c.type}
                    onChange={e => updateCond(i, 'type', e.target.value)}
                    className="tg-input tg-select flex-1 py-[6px] px-[10px] text-xs"
                    onFocus={handleFocus}
                  >
                    {COND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <TrashBtn onClick={() => removeCond(i)} />
                </div>
                {c.type !== 'any' && (
                  <input
                    value={c.value}
                    onChange={e => updateCond(i, 'value', e.target.value)}
                    className="tg-input py-[6px] px-[10px] text-xs"
                    onFocus={handleFocus}
                    placeholder={c.type === 'in_list' ? "ha, yo'q, bor" : c.type === 'regex' ? '^salom' : 'qiymat'}
                  />
                )}
              </div>
            ))}
            <button
              onClick={addCond}
              className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
            >
              <Plus size={12} /> {"Shart qo'shish"}
            </button>
          </div>
        </>
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
          <input
            value={(cfg.connection_filter as string) || ''}
            onChange={e => set('connection_filter', e.target.value)}
            className="tg-input"
            onFocus={handleFocus}
            placeholder="Aniq bir Business ulanish uchun"
          />
          <p className="mt-[5px] text-[11px] text-tg-muted">Bo'sh = barcha Business ulanishlar</p>
        </Field>
      )}

      <Field label="Matnni o'zgaruvchiga saqlash">
        <input
          value={saveAs}
          onChange={e => set('save_as', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="user_input"
        />
        <p className="mt-[5px] text-[11px] text-tg-muted">{"{{business_connection_id}} avtomatik saqlanadi"}</p>
      </Field>
    </div>
  )
}

// ── Button list (shared inline/reply) ─────────────────────────────────────────

type BtnItem = { label: string; action: string; value: string; target_node_id?: string }

const INLINE_ACTIONS = [
  { value: 'node',    label: 'Node (edge bilan)' },
  { value: 'url',     label: 'URL ochish' },
  { value: 'web_app', label: 'Web App' },
]

const REPLY_ACTIONS = [
  { value: 'text',             label: "Oddiy matn" },
  { value: 'request_location', label: "Joylashuvni so'rash" },
  { value: 'request_contact',  label: "Kontaktni so'rash" },
  { value: 'web_app',          label: "Web App" },
]

function ButtonList({ buttons, layout, onChange }: {
  buttons: BtnItem[]
  layout: string
  onChange: (b: BtnItem[]) => void
}) {
  const actions = layout === 'reply' ? REPLY_ACTIONS : INLINE_ACTIONS
  const defaultAction = layout === 'reply' ? 'text' : 'node'

  const add = () => onChange([...buttons, { label: 'Tugma', action: defaultAction, value: '' }])
  const remove = (i: number) => onChange(buttons.filter((_, idx) => idx !== i))
  const update = (i: number, key: string, val: string) => {
    const next = [...buttons]
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }

  const needsValue = (action: string) => ['url', 'web_app'].includes(action)

  return (
    <div className="flex flex-col gap-2">
      {buttons.map((btn, i) => (
        <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
          <div className="flex items-center gap-[6px]">
            <input
              value={btn.label}
              onChange={(e) => update(i, 'label', e.target.value)}
              className="tg-input flex-1 py-[6px] px-[10px] text-xs"
              onFocus={handleFocus}
              placeholder="Tugma matni"
            />
            <TrashBtn onClick={() => remove(i)} />
          </div>
          <select
            value={btn.action || defaultAction}
            onChange={(e) => update(i, 'action', e.target.value)}
            className="tg-input tg-select py-[6px] px-[10px] text-xs"
            onFocus={handleFocus}
          >
            {actions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          {needsValue(btn.action) && (
            <input
              value={btn.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              className="tg-input py-[6px] px-[10px] text-xs"
              onFocus={handleFocus}
              placeholder={btn.action === 'web_app' ? 'https://your-app.com' : 'https://example.com'}
            />
          )}
          {btn.action === 'node' && (
            <p className="m-0 text-[10px] text-tg-muted">{"Canvas'da edge tortib ulang"}</p>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
      >
        <Plus size={13} /> {"Tugma qo'shish"}
      </button>
    </div>
  )
}

function MessagePanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const msgType = (cfg.message_type as string) || 'text'
  const buttons = (cfg.buttons as BtnItem[]) || []
  const isMedia = ['photo', 'video', 'audio', 'voice', 'document'].includes(msgType)
  const isPoll = msgType === 'poll'

  const pollOptions = (cfg.poll_options as string[]) || ['', '']

  const updatePollOption = (i: number, val: string) => {
    const next = [...pollOptions]
    next[i] = val
    set('poll_options', next)
  }
  const addPollOption = () => set('poll_options', [...pollOptions, ''])
  const removePollOption = (i: number) => set('poll_options', pollOptions.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Xabar turi">
        <select
          value={msgType}
          onChange={(e) => set('message_type', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          {MSG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      {!isPoll && !['voice'].includes(msgType) && (
        <Field label={isMedia ? 'Caption (ixtiyoriy)' : 'Matn'}>
          <textarea
            value={(cfg.text as string) || ''}
            onChange={(e) => set('text', e.target.value)}
            rows={4}
            className="tg-input tg-textarea"
            onFocus={handleFocus}
            placeholder={isMedia ? 'Rasm tavsifi...' : "Xabar matni...\n{{user_name}} kabi o'zgaruvchilar ishlatiladi"}
          />
        </Field>
      )}

      {!isPoll && (
        <Field label="Parse Mode">
          <select
            value={(cfg.parse_mode as string) || 'HTML'}
            onChange={(e) => set('parse_mode', e.target.value)}
            className="tg-input tg-select"
            onFocus={handleFocus}
          >
            <option value="HTML">HTML</option>
            <option value="Markdown">Markdown</option>
          </select>
        </Field>
      )}

      {isMedia && (
        <Field label="Fayl URL">
          <input
            value={(cfg.file_url as string) || ''}
            onChange={(e) => set('file_url', e.target.value)}
            className="tg-input"
            onFocus={handleFocus}
            placeholder="https://example.com/image.jpg"
          />
        </Field>
      )}

      {isPoll && (
        <>
          <Field label="Savol">
            <input
              value={(cfg.poll_question as string) || ''}
              onChange={(e) => set('poll_question', e.target.value)}
              className="tg-input"
              onFocus={handleFocus}
              placeholder="Qaysi variant yaxshiroq?"
            />
          </Field>
          <Field label="Variantlar">
            <div className="flex flex-col gap-[6px]">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-[6px]">
                  <input
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    className="tg-input flex-1"
                    onFocus={handleFocus}
                    placeholder={`Variant ${i + 1}`}
                  />
                  {pollOptions.length > 2 && (
                    <TrashBtn onClick={() => removePollOption(i)} />
                  )}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button
                  onClick={addPollOption}
                  className="bg-transparent border-none cursor-pointer text-tg-accent text-[13px] font-medium flex items-center gap-1 py-1 px-0"
                >
                  <Plus size={12} /> {"Variant qo'shish"}
                </button>
              )}
            </div>
          </Field>
          <Field label="Poll turi">
            <select
              value={(cfg.poll_type as string) || 'regular'}
              onChange={(e) => set('poll_type', e.target.value)}
              className="tg-input tg-select"
              onFocus={handleFocus}
            >
              <option value="regular">Regular (ko'p javob)</option>
              <option value="quiz">Quiz (to'g'ri javob)</option>
            </select>
          </Field>
        </>
      )}

      {!isPoll && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-tg-label">Tugmalar (ixtiyoriy)</label>
          </div>
          {buttons.length > 0 && (
            <>
              <Field label="Keyboard turi">
                <select
                  value={(cfg.button_layout as string) || 'inline'}
                  onChange={(e) => set('button_layout', e.target.value)}
                  className="tg-input tg-select mb-2"
                  onFocus={handleFocus}
                >
                  <option value="inline">Inline keyboard</option>
                  <option value="reply">Reply keyboard</option>
                </select>
              </Field>
              {((cfg.button_layout as string) || 'inline') === 'inline' && (
                <Field label="Tugma bosilganda">
                  <select
                    value={(cfg.on_callback as string) || 'edit'}
                    onChange={(e) => set('on_callback', e.target.value)}
                    className="tg-input tg-select mb-2"
                    onFocus={handleFocus}
                  >
                    <option value="edit">Xabarni tahrirlash (edit) — tavsiya</option>
                    <option value="send">Yangi xabar yuborish (send)</option>
                  </select>
                </Field>
              )}
            </>
          )}
          <ButtonList
            buttons={buttons}
            layout={(cfg.button_layout as string) || 'inline'}
            onChange={(b) => set('buttons', b)}
          />
        </div>
      )}
    </div>
  )
}

// ── Button panel ─────────────────────────────────────────────────────────────
function ButtonPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const layout = (cfg.button_layout as string) || 'inline'
  const buttons = (cfg.buttons as BtnItem[]) || []

  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Xabar (ixtiyoriy)">
        <textarea
          value={(cfg.text as string) || ''}
          onChange={(e) => set('text', e.target.value)}
          rows={3}
          className="tg-input tg-textarea"
          onFocus={handleFocus}
          placeholder="Variant tanlang:"
        />
      </Field>
      <Field label="Keyboard turi">
        <select
          value={layout}
          onChange={(e) => set('button_layout', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option value="inline">Inline keyboard</option>
          <option value="reply">Reply keyboard</option>
        </select>
      </Field>
      {layout === 'inline' && (
        <Field label="Tugma bosilganda">
          <select
            value={(cfg.on_callback as string) || 'edit'}
            onChange={(e) => set('on_callback', e.target.value)}
            className="tg-input tg-select"
            onFocus={handleFocus}
          >
            <option value="edit">Xabarni tahrirlash (edit) — tavsiya</option>
            <option value="send">Yangi xabar yuborish (send)</option>
          </select>
        </Field>
      )}
      <Field label="Tugmalar">
        <ButtonList buttons={buttons} layout={layout} onChange={(b) => set('buttons', b)} />
      </Field>
    </div>
  )
}

// ── Input panel ──────────────────────────────────────────────────────────────
function InputPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Savol">
        <input
          value={(cfg.prompt as string) || ''}
          onChange={(e) => set('prompt', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="Ismingizni kiriting:"
        />
      </Field>
      <div>
        <label className="flex items-center gap-1 text-xs font-medium text-tg-label mb-[6px]">
          O'zgaruvchi nomi
          <span title="Foydalanuvchi javobi shu nomda saqlanadi. Keyinchalik {{nom}} ko'rinishida ishlatiladi." className="w-4 h-4 rounded-full bg-tg-input border border-tg-darkborder flex items-center justify-center text-tg-muted text-[9px] cursor-help shrink-0">ℹ</span>
        </label>
        <input
          value={(cfg.variable_name as string) || ''}
          onChange={(e) => set('variable_name', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="user_name"
        />
      </div>
      <Field label="Validatsiya">
        <select
          value={(cfg.validation as string) || 'text'}
          onChange={(e) => set('validation', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option value="text">Matn</option>
          <option value="number">Raqam</option>
          <option value="phone">Telefon</option>
          <option value="email">Email</option>
        </select>
      </Field>
      <Field label="Xato xabar">
        <input
          value={(cfg.error_message as string) || ''}
          onChange={(e) => set('error_message', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="Iltimos qayta kiriting"
        />
      </Field>
    </div>
  )
}

// ── Condition panel ──────────────────────────────────────────────────────────
function ConditionPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="O'zgaruvchi">
        <input
          value={(cfg.variable as string) || ''}
          onChange={(e) => set('variable', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="user_name"
        />
      </Field>
      <Field label="Operator">
        <select
          value={(cfg.operator as string) || 'equals'}
          onChange={(e) => set('operator', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option value="equals">= Teng</option>
          <option value="not_equals">≠ Teng emas</option>
          <option value="contains">∋ O'z ichiga oladi</option>
          <option value="greater_than">&gt; Katta</option>
          <option value="less_than">&lt; Kichik</option>
          <option value="is_empty">∅ Bo'sh</option>
        </select>
      </Field>
      <Field label="Qiymat">
        <input
          value={(cfg.value as string) || ''}
          onChange={(e) => set('value', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
        />
      </Field>
      <div className="bg-tg-input rounded-[10px] px-[14px] py-[10px]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-node-green font-bold">✓ True</span>
          <span className="text-tg-muted">→ yuqori chiqish</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-[6px]">
          <span className="text-node-red font-bold">✗ False</span>
          <span className="text-tg-muted">→ quyi chiqish</span>
        </div>
        <p className="mt-2 text-[11px] text-tg-muted">Edgeni tortib ulang</p>
      </div>
    </div>
  )
}

// ── API Call panel ───────────────────────────────────────────────────────────
function ApiCallPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="URL">
        <input
          value={(cfg.url as string) || ''}
          onChange={(e) => set('url', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="https://api.example.com/data"
        />
      </Field>
      <Field label="Method">
        <select
          value={(cfg.method as string) || 'GET'}
          onChange={(e) => set('method', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
        </select>
      </Field>
      <Field label="Headers (JSON)">
        <textarea
          value={typeof cfg.headers === 'object' ? JSON.stringify(cfg.headers, null, 2) : ''}
          onChange={(e) => { try { set('headers', JSON.parse(e.target.value)) } catch {} }}
          rows={3}
          className="tg-input tg-textarea font-mono text-xs"
          onFocus={handleFocus}
          placeholder='{"Authorization": "Bearer {{token}}"}'
        />
      </Field>
      <Field label="Body (JSON)">
        <textarea
          value={typeof cfg.body === 'object' ? JSON.stringify(cfg.body, null, 2) : ''}
          onChange={(e) => { try { set('body', JSON.parse(e.target.value)) } catch {} }}
          rows={3}
          className="tg-input tg-textarea font-mono text-xs"
          onFocus={handleFocus}
          placeholder='{"name": "{{user_name}}"}'
        />
      </Field>
      <Field label="Natija o'zgaruvchisi">
        <input
          value={(cfg.response_variable as string) || 'api_result'}
          onChange={(e) => set('response_variable', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
        />
      </Field>
    </div>
  )
}

// ── AI panel ─────────────────────────────────────────────────────────────────
function AiPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="System Prompt">
        <textarea
          value={(cfg.system_prompt as string) || ''}
          onChange={(e) => set('system_prompt', e.target.value)}
          rows={4}
          className="tg-input tg-textarea"
          onFocus={handleFocus}
          placeholder="Sen yordamchi assistantsan..."
        />
      </Field>
      <Field label="Model">
        <select
          value={(cfg.model as string) || 'gpt-4o-mini'}
          onChange={(e) => set('model', e.target.value)}
          className="tg-input tg-select"
          onFocus={handleFocus}
        >
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
        </select>
      </Field>
      <Field label="API Key">
        <input
          type="password"
          value={(cfg.api_key as string) || ''}
          onChange={(e) => set('api_key', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
          placeholder="sk-..."
        />
      </Field>
      <Field label="Natija o'zgaruvchisi">
        <input
          value={(cfg.response_variable as string) || 'ai_answer'}
          onChange={(e) => set('response_variable', e.target.value)}
          className="tg-input"
          onFocus={handleFocus}
        />
      </Field>
    </div>
  )
}

// ── Delay panel ───────────────────────────────────────────────────────────────
function DelayPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Kutish vaqti (soniya)">
        <input
          type="number"
          min={1} max={300}
          value={(cfg.seconds as number) || 3}
          onChange={(e) => set('seconds', Number(e.target.value))}
          className="tg-input"
          onFocus={handleFocus}
        />
      </Field>
      <label className="flex items-center gap-[10px] cursor-pointer">
        <input
          type="checkbox"
          checked={cfg.typing_action !== false}
          onChange={(e) => set('typing_action', e.target.checked)}
          className="size-4 cursor-pointer"
          style={{ accentColor: '#2481cc' }}
        />
        <span className="text-sm text-tg-text">Typing… ko'rsatish</span>
      </label>
    </div>
  )
}

// ── Set Variable panel ────────────────────────────────────────────────────────
function SetVariablePanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const assignments = (cfg.assignments as { variable: string; value: string }[]) || [{ variable: '', value: '' }]

  const update = (i: number, key: string, val: string) => {
    const next = [...assignments]
    next[i] = { ...next[i], [key]: val }
    set('assignments', next)
  }
  const add = () => set('assignments', [...assignments, { variable: '', value: '' }])
  const remove = (i: number) => set('assignments', assignments.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-2">
      {assignments.map((a, i) => (
        <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
          <input
            value={a.variable}
            onChange={(e) => update(i, 'variable', e.target.value)}
            className="tg-input font-mono text-node-amber text-xs py-[6px] px-[10px]"
            onFocus={handleFocus}
            placeholder="o'zgaruvchi_nomi"
          />
          <div className="flex gap-[6px]">
            <input
              value={a.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              className="tg-input flex-1 py-[6px] px-[10px] text-xs"
              onFocus={handleFocus}
              placeholder="qiymat yoki {{boshqa}}"
            />
            {assignments.length > 1 && (
              <TrashBtn onClick={() => remove(i)} />
            )}
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
      >
        <Plus size={12} /> {"Qo'shish"}
      </button>
    </div>
  )
}

// ── Node type label ───────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  handler:      'Handler (Trigger)',
  command:      'Command',
  start:        'Start — /start',
  message:      'Xabar yuborish',
  button:       'Tugmalar',
  input:        'Kiritish (User input)',
  condition:    'Shart — If/Else',
  delay:        'Kutish',
  set_variable: "O'zgaruvchi",
  api_call:     'API Call',
  ai:           'AI Node',
  auto_delete:  "Xabarni o'chirish",
  send_to:          'ID ga xabar yuborish',
  business_handler: 'Business Chat Handler',
  end:              'Tugash',
  sticky:       'Eslatma (Sticky Note)',
}

// ── Sticky Note panel ─────────────────────────────────────────────────────────
function StickyPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const COLORS = [
    { value: 'yellow', label: 'Sariq',  hex: '#facc15' },
    { value: 'blue',   label: "Ko'k",   hex: '#60a5fa' },
    { value: 'green',  label: 'Yashil', hex: '#4ade80' },
    { value: 'pink',   label: 'Pushti', hex: '#f472b6' },
  ]
  return (
    <div className="flex flex-col gap-[14px]">
      <div>
        <label className="block text-xs font-medium text-tg-label mb-[6px]">Matn</label>
        <textarea
          rows={5}
          value={(cfg.text as string) || ''}
          onChange={e => set('text', e.target.value)}
          placeholder="Eslatma matni…"
          className="tg-input tg-textarea"
          onFocus={handleFocus}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-tg-label mb-2">Rang</label>
        <div className="flex gap-2">
          {COLORS.map(c => {
            const isSelected = (cfg.color || 'yellow') === c.value
            return (
              <button
                key={c.value}
                onClick={() => set('color', c.value)}
                title={c.label}
                style={{
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  background: c.hex,
                  border: isSelected ? '2px solid #fff' : '2px solid transparent',
                  opacity: isSelected ? 1 : 0.6,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s',
                  padding: 0,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NodePanel({ node, onClose, onUpdate, chatType, fullWidth }: Props) {
  const [cfg, setCfg] = useState<Record<string, unknown>>(
    (node.data.config as Record<string, unknown>) || {}
  )
  const nodeType = (node.type as string) || (node.data.nodeType as string)

  useEffect(() => {
    setCfg((node.data.config as Record<string, unknown>) || {})
  }, [node.id])

  const set = (key: string, value: unknown) => {
    const next = { ...cfg, [key]: value }
    setCfg(next)
    onUpdate(next)
  }

  const renderPanel = () => {
    switch (nodeType) {
      case 'handler':      return <HandlerPanel cfg={cfg} set={set} pageChatType={chatType} />
      case 'command':
      case 'start':        return <CommandPanel cfg={cfg} set={set} />
      case 'message':      return <MessagePanel cfg={cfg} set={set} />
      case 'button':       return <ButtonPanel cfg={cfg} set={set} />
      case 'input':        return <InputPanel cfg={cfg} set={set} />
      case 'condition':    return <ConditionPanel cfg={cfg} set={set} />
      case 'delay':        return <DelayPanel cfg={cfg} set={set} />
      case 'set_variable': return <SetVariablePanel cfg={cfg} set={set} />
      case 'api_call':     return <ApiCallPanel cfg={cfg} set={set} />
      case 'ai':           return <AiPanel cfg={cfg} set={set} />
      case 'auto_delete':  return <AutoDeletePanel cfg={cfg} set={set} />
      case 'send_to':          return <SendToPanel cfg={cfg} set={set} />
      case 'business_handler': return <BusinessHandlerPanel cfg={cfg} set={set} />
      case 'sticky':           return <StickyPanel cfg={cfg} set={set} />
      case 'end':          return (
        <p className="text-[13px] text-tg-label m-0">Bu node suhbatni yakunlaydi. Sozlamalar yo'q.</p>
      )
      default: return <p className="text-[13px] text-tg-label m-0">Sozlamalar mavjud emas.</p>
    }
  }

  return (
    <div className={fullWidth ? "w-full bg-tg-deep flex flex-col overflow-hidden" : "w-[280px] bg-tg-deep border-l border-tg-darkborder flex flex-col overflow-hidden"}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-tg-input shrink-0">
        <div>
          <h3 className="m-0 text-sm font-bold text-white">{TYPE_LABELS[nodeType] || nodeType}</h3>
        </div>
        <button
          onClick={onClose}
          className="bg-tg-card border border-tg-input rounded-lg size-[30px] flex items-center justify-center cursor-pointer text-tg-label hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto touch-scroll px-4 py-4 pb-safe flex flex-col gap-[14px]">
        {renderPanel()}
      </div>
    </div>
  )
}
