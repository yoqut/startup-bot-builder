import { useState } from 'react'
import { ChevronUp, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-tg-label mb-1">{children}</label>
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-tg-darkborder last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-[10px] bg-transparent border-none text-[11px] font-semibold text-tg-muted uppercase tracking-wider cursor-pointer text-left"
      >
        {title}
        <ChevronUp size={13} className={`transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="px-4 pb-4 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

export function TField({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean
}) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="tg-input tg-textarea text-[13px]" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="tg-input text-[13px]" />
      )}
    </div>
  )
}

export function NField({ label, value, onChange, min, max }: {
  label: string; value: number | undefined; onChange: (v: number) => void
  min?: number; max?: number
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="number" value={value ?? ''} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className="tg-input text-[13px]" />
    </div>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-tg-border bg-transparent cursor-pointer p-0.5" />
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff" className="tg-input flex-1 text-[13px] font-mono" />
      </div>
    </div>
  )
}

export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="tg-input tg-select text-[13px]">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-tg-text">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full border-none cursor-pointer transition-all duration-200 relative flex items-center ${value ? 'bg-tg-accent' : 'bg-tg-elevated'}`}
      >
        <span className={`size-[18px] rounded-full bg-white shadow-sm absolute transition-all duration-200 ${value ? 'left-[calc(100%-22px)]' : 'left-[3px]'}`} />
      </button>
    </div>
  )
}

function LinkedGridField({ label, value, onChange, slots }: {
  label: string; value: number | number[] | undefined
  onChange: (v: number | number[]) => void; slots: string[]
}) {
  const arr = Array.isArray(value) ? value : [value ?? 0, value ?? 0, value ?? 0, value ?? 0]
  const [linked, setLinked] = useState(true)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>{label}</Label>
        <button
          onClick={() => setLinked((v) => !v)}
          className={`text-[10px] px-2 py-0.5 rounded border-none cursor-pointer ${linked ? 'bg-tg-accent text-white' : 'bg-tg-card text-tg-label'}`}
        >
          {linked ? 'Linked' : 'Custom'}
        </button>
      </div>
      {linked ? (
        <input type="number" value={arr[0]} min={0} onChange={(e) => onChange(Number(e.target.value))} className="tg-input text-[13px]" />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {slots.map((slot, i) => (
            <div key={slot}>
              <p className="text-[10px] text-tg-muted mb-0.5 m-0">{slot}</p>
              <input
                type="number"
                value={arr[i]}
                min={0}
                onChange={(e) => {
                  const next = [...arr]
                  next[i] = Number(e.target.value)
                  onChange(next)
                }}
                className="tg-input text-[13px]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PADDING_SLOTS = ['Yuqori', "O'ng", 'Pastki', 'Chap']
const RADIUS_SLOTS  = ['TL', 'TR', 'BR', 'BL']

export function PaddingField({ label, value, onChange }: {
  label: string; value: number | number[] | undefined; onChange: (v: number | number[]) => void
}) {
  return <LinkedGridField label={label} value={value} onChange={onChange} slots={PADDING_SLOTS} />
}

export function BorderRadiusField({ value, onChange }: {
  value: number | number[] | undefined; onChange: (v: number | number[]) => void
}) {
  return <LinkedGridField label="Burchak radiusi" value={value} onChange={onChange} slots={RADIUS_SLOTS} />
}

export function TextAlignField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const opts = [
    { v: 'left',   icon: AlignLeft },
    { v: 'center', icon: AlignCenter },
    { v: 'right',  icon: AlignRight },
  ] as const

  return (
    <div>
      <Label>Hizalash</Label>
      <div className="flex gap-1">
        {opts.map(({ v, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 h-9 rounded-[8px] flex items-center justify-center border-none cursor-pointer transition-all ${value === v ? 'bg-tg-accent text-white' : 'bg-tg-card text-tg-muted hover:bg-tg-elevated'}`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}
