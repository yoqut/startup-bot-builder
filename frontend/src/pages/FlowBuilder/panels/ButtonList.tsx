import { handleFocus, TrashBtn, AddDashBtn } from './shared'

export type BtnItem = { label: string; action: string; value: string; target_node_id?: string }

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

interface Props {
  buttons: BtnItem[]
  layout: string
  onChange: (b: BtnItem[]) => void
}

export default function ButtonList({ buttons, layout, onChange }: Props) {
  const actions       = layout === 'reply' ? REPLY_ACTIONS : INLINE_ACTIONS
  const defaultAction = layout === 'reply' ? 'text' : 'node'

  const add    = () => onChange([...buttons, { label: 'Tugma', action: defaultAction, value: '' }])
  const remove = (i: number) => onChange(buttons.filter((_, idx) => idx !== i))
  const update = (i: number, key: string, val: string) => {
    const next = [...buttons]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }

  const needsValue = (action: string) => ['url', 'web_app'].includes(action)

  return (
    <div className="flex flex-col gap-2">
      {buttons.map((btn, i) => (
        <div key={i} className="bg-tg-input rounded-[10px] px-3 py-[10px] flex flex-col gap-2">
          <div className="flex items-center gap-[6px]">
            <input
              value={btn.label}
              onChange={e => update(i, 'label', e.target.value)}
              className="tg-input flex-1 py-[6px] px-[10px] text-xs"
              onFocus={handleFocus}
              placeholder="Tugma matni"
            />
            <TrashBtn onClick={() => remove(i)} />
          </div>
          <select
            value={btn.action || defaultAction}
            onChange={e => update(i, 'action', e.target.value)}
            className="tg-input tg-select py-[6px] px-[10px] text-xs"
            onFocus={handleFocus}
          >
            {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          {needsValue(btn.action) && (
            <input
              value={btn.value}
              onChange={e => update(i, 'value', e.target.value)}
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
      <AddDashBtn onClick={add} label="Tugma qo'shish" iconSize={13} />
    </div>
  )
}
