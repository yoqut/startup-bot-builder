import { handleFocus, TrashBtn, AddDashBtn } from './shared'

export type Condition = { type: string; value: string }

export const COND_TYPES = [
  { value: 'any',         label: "Har qanday (wildcart)" },
  { value: 'exact',       label: "Aniq mos (exact)" },
  { value: 'contains',    label: "O'z ichiga oladi" },
  { value: 'starts_with', label: "Boshlanadi" },
  { value: 'ends_with',   label: "Tugaydi" },
  { value: 'in_list',     label: "Ro'yxatdan biri" },
  { value: 'regex',       label: "Regex" },
]

interface Props {
  conditions: Condition[]
  mode: string
  onChange: (conditions: Condition[]) => void
  onModeChange: (mode: string) => void
}

export default function TextConditions({ conditions, mode, onChange, onModeChange }: Props) {
  const add    = () => onChange([...conditions, { type: 'any', value: '' }])
  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i))
  const update = (i: number, key: string, val: string) => {
    const next = [...conditions]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-tg-label">Shartlar</label>
        <select
          value={mode}
          onChange={e => onModeChange(e.target.value)}
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
                onChange={e => update(i, 'type', e.target.value)}
                className="tg-input tg-select flex-1 py-[6px] px-[10px] text-xs"
                onFocus={handleFocus}
              >
                {COND_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <TrashBtn onClick={() => remove(i)} />
            </div>
            {c.type !== 'any' && (
              <input
                value={c.value}
                onChange={e => update(i, 'value', e.target.value)}
                className="tg-input py-[6px] px-[10px] text-xs"
                onFocus={handleFocus}
                placeholder={c.type === 'in_list' ? "ha, yo'q, bor" : c.type === 'regex' ? '^salom' : 'qiymat'}
              />
            )}
          </div>
        ))}
        <AddDashBtn onClick={add} label="Shart qo'shish" />
      </div>
    </>
  )
}
