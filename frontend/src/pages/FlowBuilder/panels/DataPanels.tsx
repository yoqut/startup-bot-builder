import { Field, handleFocus, TrashBtn, AddDashBtn } from './shared'

// ── CommandPanel ──────────────────────────────────────────────────────────────
export function CommandPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Command">
        <input value={(cfg.command as string) || '/start'} onChange={e => set('command', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="/start" />
      </Field>
      <Field label="Tavsif (ixtiyoriy)">
        <input value={(cfg.description as string) || ''} onChange={e => set('description', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Botni ishga tushirish" />
      </Field>
    </div>
  )
}

// ── InputPanel ────────────────────────────────────────────────────────────────
export function InputPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Savol">
        <input value={(cfg.prompt as string) || ''} onChange={e => set('prompt', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Ismingizni kiriting:" />
      </Field>
      <div>
        <label className="flex items-center gap-1 text-xs font-medium text-tg-label mb-[6px]">
          O'zgaruvchi nomi
          <span title="Foydalanuvchi javobi shu nomda saqlanadi. Keyinchalik {{nom}} ko'rinishida ishlatiladi." className="w-4 h-4 rounded-full bg-tg-input border border-tg-darkborder flex items-center justify-center text-tg-muted text-[9px] cursor-help shrink-0">ℹ</span>
        </label>
        <input value={(cfg.variable_name as string) || ''} onChange={e => set('variable_name', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="user_name" />
      </div>
      <Field label="Validatsiya">
        <select value={(cfg.validation as string) || 'text'} onChange={e => set('validation', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option value="text">Matn</option>
          <option value="number">Raqam</option>
          <option value="phone">Telefon</option>
          <option value="email">Email</option>
        </select>
      </Field>
      <Field label="Xato xabar">
        <input value={(cfg.error_message as string) || ''} onChange={e => set('error_message', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Iltimos qayta kiriting" />
      </Field>
    </div>
  )
}

// ── ConditionPanel ────────────────────────────────────────────────────────────
export function ConditionPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="O'zgaruvchi">
        <input value={(cfg.variable as string) || ''} onChange={e => set('variable', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="user_name" />
      </Field>
      <Field label="Operator">
        <select value={(cfg.operator as string) || 'equals'} onChange={e => set('operator', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option value="equals">= Teng</option>
          <option value="not_equals">≠ Teng emas</option>
          <option value="contains">∋ O'z ichiga oladi</option>
          <option value="greater_than">&gt; Katta</option>
          <option value="less_than">&lt; Kichik</option>
          <option value="is_empty">∅ Bo'sh</option>
        </select>
      </Field>
      <Field label="Qiymat">
        <input value={(cfg.value as string) || ''} onChange={e => set('value', e.target.value)} className="tg-input" onFocus={handleFocus} />
      </Field>
      <div className="bg-tg-input rounded-[10px] px-[14px] py-[10px]">
        <div className="flex items-center gap-2 text-xs"><span className="text-node-green font-bold">✓ True</span><span className="text-tg-muted">→ yuqori chiqish</span></div>
        <div className="flex items-center gap-2 text-xs mt-[6px]"><span className="text-node-red font-bold">✗ False</span><span className="text-tg-muted">→ quyi chiqish</span></div>
        <p className="mt-2 text-[11px] text-tg-muted">Edgeni tortib ulang</p>
      </div>
    </div>
  )
}

// ── ApiCallPanel ──────────────────────────────────────────────────────────────
export function ApiCallPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="URL">
        <input value={(cfg.url as string) || ''} onChange={e => set('url', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="https://api.example.com/data" />
      </Field>
      <Field label="Method">
        <select value={(cfg.method as string) || 'GET'} onChange={e => set('method', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
        </select>
      </Field>
      <Field label="Headers (JSON)">
        <textarea value={typeof cfg.headers === 'object' ? JSON.stringify(cfg.headers, null, 2) : ''} onChange={e => { try { set('headers', JSON.parse(e.target.value)) } catch {} }} rows={3} className="tg-input tg-textarea font-mono text-xs" onFocus={handleFocus} placeholder='{"Authorization": "Bearer {{token}}"}' />
      </Field>
      <Field label="Body (JSON)">
        <textarea value={typeof cfg.body === 'object' ? JSON.stringify(cfg.body, null, 2) : ''} onChange={e => { try { set('body', JSON.parse(e.target.value)) } catch {} }} rows={3} className="tg-input tg-textarea font-mono text-xs" onFocus={handleFocus} placeholder='{"name": "{{user_name}}"}' />
      </Field>
      <Field label="Natija o'zgaruvchisi">
        <input value={(cfg.response_variable as string) || 'api_result'} onChange={e => set('response_variable', e.target.value)} className="tg-input" onFocus={handleFocus} />
      </Field>
    </div>
  )
}

// ── AiPanel ───────────────────────────────────────────────────────────────────
export function AiPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="System Prompt">
        <textarea value={(cfg.system_prompt as string) || ''} onChange={e => set('system_prompt', e.target.value)} rows={4} className="tg-input tg-textarea" onFocus={handleFocus} placeholder="Sen yordamchi assistantsan..." />
      </Field>
      <Field label="Model">
        <select value={(cfg.model as string) || 'gpt-4o-mini'} onChange={e => set('model', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
        </select>
      </Field>
      <Field label="API Key">
        <input type="password" value={(cfg.api_key as string) || ''} onChange={e => set('api_key', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="sk-..." />
      </Field>
      <Field label="Natija o'zgaruvchisi">
        <input value={(cfg.response_variable as string) || 'ai_answer'} onChange={e => set('response_variable', e.target.value)} className="tg-input" onFocus={handleFocus} />
      </Field>
    </div>
  )
}

// ── DelayPanel ────────────────────────────────────────────────────────────────
export function DelayPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Kutish vaqti (soniya)">
        <input type="number" min={1} max={300} value={(cfg.seconds as number) || 3} onChange={e => set('seconds', Number(e.target.value))} className="tg-input" onFocus={handleFocus} />
      </Field>
      <label className="flex items-center gap-[10px] cursor-pointer">
        <input type="checkbox" checked={cfg.typing_action !== false} onChange={e => set('typing_action', e.target.checked)} className="size-4 cursor-pointer" style={{ accentColor: '#2481cc' }} />
        <span className="text-sm text-tg-text">Typing… ko'rsatish</span>
      </label>
    </div>
  )
}

// ── SetVariablePanel ──────────────────────────────────────────────────────────
export function SetVariablePanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const assignments = (cfg.assignments as { variable: string; value: string }[]) || [{ variable: '', value: '' }]

  const update = (i: number, key: string, val: string) => {
    const next = [...assignments]; next[i] = { ...next[i], [key]: val }; set('assignments', next)
  }
  const add    = () => set('assignments', [...assignments, { variable: '', value: '' }])
  const remove = (i: number) => set('assignments', assignments.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-2">
      {assignments.map((a, i) => (
        <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
          <input value={a.variable} onChange={e => update(i, 'variable', e.target.value)} className="tg-input font-mono text-node-amber text-xs py-[6px] px-[10px]" onFocus={handleFocus} placeholder="o'zgaruvchi_nomi" />
          <div className="flex gap-[6px]">
            <input value={a.value} onChange={e => update(i, 'value', e.target.value)} className="tg-input flex-1 py-[6px] px-[10px] text-xs" onFocus={handleFocus} placeholder="qiymat yoki {{boshqa}}" />
            {assignments.length > 1 && <TrashBtn onClick={() => remove(i)} />}
          </div>
        </div>
      ))}
      <AddDashBtn onClick={add} label="Qo'shish" />
    </div>
  )
}

// ── AutoDeletePanel ───────────────────────────────────────────────────────────
export function AutoDeletePanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="bg-tg-input border border-tg-border rounded-[10px] px-[14px] py-[10px] text-xs text-tg-label leading-[1.5]">
        Oldingi xabar yuborilgandan keyin N soniya o'tib uni o'chiradi.<br/>
        <span className="text-node-amber">MessageNode</span> avtomatik <code className="text-xs">last_message_id</code> saqlaydi.
      </div>
      <Field label="Qaysi xabarni o'chirish (o'zgaruvchi nomi)">
        <input value={(cfg.message_id_var as string) || 'last_message_id'} onChange={e => set('message_id_var', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="last_message_id" />
      </Field>
      <Field label="Necha soniyadan keyin o'chirish">
        <input type="number" min={1} max={86400} value={(cfg.seconds as number) || 10} onChange={e => set('seconds', Number(e.target.value))} className="tg-input" onFocus={handleFocus} />
      </Field>
      <Field label="Chat ID (ixtiyoriy, bo'sh = joriy chat)">
        <input value={(cfg.chat_id_override as string) || ''} onChange={e => set('chat_id_override', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="{{chat_id}} yoki raqam" />
      </Field>
    </div>
  )
}

// ── SendToPanel ───────────────────────────────────────────────────────────────
export function SendToPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const msgType = (cfg.message_type as string) || 'text'
  const isMedia = ['photo', 'video', 'audio', 'document'].includes(msgType)

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="bg-tg-input rounded-[10px] px-[14px] py-[10px] text-xs text-tg-label leading-[1.5]">
        Istalgan user, guruh yoki kanalga ID orqali xabar yuboradi.
      </div>
      <Field label="Chat ID (user/guruh/kanal)">
        <input value={(cfg.chat_id as string) || ''} onChange={e => set('chat_id', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="123456789 yoki {{user_id}}" />
        <p className="mt-[5px] text-[11px] text-tg-muted">O'zgaruvchi ham ishlatsa bo'ladi: {"{{chat_id}}"}</p>
      </Field>
      <Field label="Xabar turi">
        <select value={msgType} onChange={e => set('message_type', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option value="text">Matn</option><option value="photo">Rasm</option><option value="video">Video</option>
          <option value="audio">Audio</option><option value="document">Hujjat</option>
        </select>
      </Field>
      {msgType === 'text' && (
        <>
          <Field label="Xabar matni">
            <textarea rows={4} value={(cfg.text as string) || ''} onChange={e => set('text', e.target.value)} className="tg-input tg-textarea" onFocus={handleFocus} placeholder={"Salom {{user_name}}!"} />
          </Field>
          <Field label="Parse Mode">
            <select value={(cfg.parse_mode as string) || 'HTML'} onChange={e => set('parse_mode', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
              <option value="HTML">HTML</option><option value="Markdown">Markdown</option>
            </select>
          </Field>
        </>
      )}
      {isMedia && (
        <>
          <Field label="Fayl URL">
            <input value={(cfg.file_url as string) || ''} onChange={e => set('file_url', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="https://example.com/file.jpg" />
          </Field>
          <Field label="Caption (ixtiyoriy)">
            <input value={(cfg.caption as string) || ''} onChange={e => set('caption', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Rasm tavsifi" />
          </Field>
        </>
      )}
    </div>
  )
}

// ── StickyPanel ───────────────────────────────────────────────────────────────
const STICKY_COLORS = [
  { value: 'yellow', label: 'Sariq',  hex: '#facc15' },
  { value: 'blue',   label: "Ko'k",   hex: '#60a5fa' },
  { value: 'green',  label: 'Yashil', hex: '#4ade80' },
  { value: 'pink',   label: 'Pushti', hex: '#f472b6' },
]

export function StickyPanel({ cfg, set }: { cfg: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <div>
        <label className="block text-xs font-medium text-tg-label mb-[6px]">Matn</label>
        <textarea rows={5} value={(cfg.text as string) || ''} onChange={e => set('text', e.target.value)} placeholder="Eslatma matni…" className="tg-input tg-textarea" onFocus={handleFocus} />
      </div>
      <div>
        <label className="block text-xs font-medium text-tg-label mb-2">Rang</label>
        <div className="flex gap-2">
          {STICKY_COLORS.map(c => {
            const isSelected = (cfg.color || 'yellow') === c.value
            return (
              <button key={c.value} onClick={() => set('color', c.value)} title={c.label} style={{ borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', background: c.hex, border: isSelected ? '2px solid #fff' : '2px solid transparent', opacity: isSelected ? 1 : 0.6, transform: isSelected ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s', padding: 0 }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}
