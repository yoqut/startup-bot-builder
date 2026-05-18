import { useState } from 'react'
import {
  Trash2, ChevronUp, ChevronDown, Copy,
  AlignLeft, AlignCenter, AlignRight, Palette,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useWebAppStore } from '@/store/webapp.store'
import { COMPONENT_DEFAULTS } from './registry'
import type { WbStyle } from '@/types/webapp'

// ── Shared field components ───────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-tg-label mb-1">{children}</label>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-tg-darkborder last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between
          px-4 py-[10px] bg-transparent border-none
          text-[11px] font-semibold text-tg-muted uppercase tracking-wider
          cursor-pointer text-left
        "
      >
        {title}
        <ChevronUp size={13} className={`transition-transform duration-150 ${open ? '' : 'rotate-180'}`} />
      </button>
      {open && <div className="px-4 pb-4 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

function TField({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean
}) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="tg-input tg-textarea text-[13px]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="tg-input text-[13px]"
        />
      )}
    </div>
  )
}

function NField({ label, value, onChange, min, max }: {
  label: string; value: number | undefined; onChange: (v: number) => void
  min?: number; max?: number
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tg-input text-[13px]"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-tg-border bg-transparent cursor-pointer p-0.5"
        />
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          className="tg-input flex-1 text-[13px] font-mono"
        />
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
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

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-tg-text">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`
          w-10 h-6 rounded-full border-none cursor-pointer transition-all duration-200
          relative flex items-center
          ${value ? 'bg-tg-accent' : 'bg-tg-elevated'}
        `}
      >
        <span className={`
          size-[18px] rounded-full bg-white shadow-sm
          absolute transition-all duration-200
          ${value ? 'left-[calc(100%-22px)]' : 'left-[3px]'}
        `} />
      </button>
    </div>
  )
}

function PaddingField({ label, value, onChange }: {
  label: string; value: number | number[] | undefined; onChange: (v: number | number[]) => void
}) {
  const arr = Array.isArray(value) ? value : [value ?? 0, value ?? 0, value ?? 0, value ?? 0]
  const [linked, setLinked] = useState(true)

  const update = (i: number, v: number) => {
    if (linked) {
      onChange(v)
    } else {
      const next = [...arr]
      next[i] = v
      onChange(next)
    }
  }

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
        <input
          type="number"
          value={arr[0]}
          min={0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tg-input text-[13px]"
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {['Yuqori', 'O\'ng', 'Pastki', 'Chap'].map((side, i) => (
            <div key={side}>
              <p className="text-[10px] text-tg-muted mb-0.5 m-0">{side}</p>
              <input
                type="number"
                value={arr[i]}
                min={0}
                onChange={(e) => update(i, Number(e.target.value))}
                className="tg-input text-[13px]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BorderRadiusField({ value, onChange }: {
  value: number | number[] | undefined; onChange: (v: number | number[]) => void
}) {
  const arr = Array.isArray(value) ? value : [value ?? 0, value ?? 0, value ?? 0, value ?? 0]
  const [linked, setLinked] = useState(true)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Burchak radiusi</Label>
        <button
          onClick={() => setLinked((v) => !v)}
          className={`text-[10px] px-2 py-0.5 rounded border-none cursor-pointer ${linked ? 'bg-tg-accent text-white' : 'bg-tg-card text-tg-label'}`}
        >
          {linked ? 'Linked' : 'Custom'}
        </button>
      </div>
      {linked ? (
        <input
          type="number"
          value={arr[0]}
          min={0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tg-input text-[13px]"
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {['TL', 'TR', 'BR', 'BL'].map((c, i) => (
            <div key={c}>
              <p className="text-[10px] text-tg-muted mb-0.5 m-0">{c}</p>
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

// ── Text align picker ─────────────────────────────────────────────────────────

function TextAlignField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
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
            className={`
              flex-1 h-9 rounded-[8px] flex items-center justify-center border-none cursor-pointer transition-all
              ${value === v ? 'bg-tg-accent text-white' : 'bg-tg-card text-tg-muted hover:bg-tg-elevated'}
            `}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Style editor ──────────────────────────────────────────────────────────────

function StyleEditor({ nodeId }: { nodeId: string }) {
  const node = useWebAppStore((s) => s.getNode(nodeId))
  const updateStyle = useWebAppStore((s) => s.updateNodeStyle)

  if (!node) return null
  const s = node.style
  const upd = (patch: Partial<WbStyle>) => updateStyle(nodeId, patch)

  return (
    <div className="flex flex-col">
      <Section title="O'lcham">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Kenglik</Label>
            <input
              value={s.width ?? ''}
              onChange={(e) => upd({ width: e.target.value })}
              placeholder="100% / 200"
              className="tg-input text-[13px]"
            />
          </div>
          <div>
            <Label>Balandlik</Label>
            <input
              value={s.height ?? ''}
              onChange={(e) => upd({ height: e.target.value })}
              placeholder="auto / 100"
              className="tg-input text-[13px]"
            />
          </div>
        </div>
        {s.minHeight !== undefined && (
          <NField label="Min Balandlik" value={s.minHeight} onChange={(v) => upd({ minHeight: v })} min={0} />
        )}
      </Section>

      <Section title="Ranglar">
        <ColorField label="Fon rangi" value={s.bg} onChange={(v) => upd({ bg: v })} />
        <ColorField label="Matn rangi" value={s.color} onChange={(v) => upd({ color: v })} />
        {s.border !== undefined && (
          <TField label="Border" value={s.border ?? ''} onChange={(v) => upd({ border: v })} placeholder="1px solid #253545" />
        )}
      </Section>

      <Section title="Shrift">
        <div className="grid grid-cols-2 gap-2">
          <NField label="Hajm (px)" value={s.fontSize} onChange={(v) => upd({ fontSize: v })} min={8} max={72} />
          <div>
            <Label>Og'irlik</Label>
            <select
              value={s.fontWeight ?? 400}
              onChange={(e) => upd({ fontWeight: Number(e.target.value) as WbStyle['fontWeight'] })}
              className="tg-input tg-select text-[13px]"
            >
              {[300, 400, 500, 600, 700, 800].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>
        <TextAlignField value={s.textAlign} onChange={(v) => upd({ textAlign: v as WbStyle['textAlign'] })} />
        <NField label="Satr balandligi" value={s.lineHeight} onChange={(v) => upd({ lineHeight: v })} min={0.5} max={4} />
      </Section>

      <Section title="Masofa">
        <PaddingField label="Ichki masofa (padding)" value={s.padding} onChange={(v) => upd({ padding: v as any })} />
        <PaddingField label="Tashqi masofa (margin)" value={s.margin} onChange={(v) => upd({ margin: v as any })} />
        {s.gap !== undefined && (
          <NField label="Gap" value={s.gap} onChange={(v) => upd({ gap: v })} min={0} />
        )}
      </Section>

      <Section title="Burchaklar">
        <BorderRadiusField value={s.borderRadius} onChange={(v) => upd({ borderRadius: v as any })} />
        {s.shadow !== undefined && (
          <TField label="Shadow" value={s.shadow ?? ''} onChange={(v) => upd({ shadow: v })} placeholder="0 4px 12px rgba(0,0,0,0.3)" />
        )}
        <NField label="Shaffoflik (0-1)" value={s.opacity} onChange={(v) => upd({ opacity: v })} min={0} max={1} />
      </Section>

      {['screen', 'box', 'row', 'card'].includes(node.type) && (
        <Section title="Layout">
          <SelectField
            label="Yo'nalish"
            value={s.flexDir ?? 'column'}
            onChange={(v) => upd({ flexDir: v as WbStyle['flexDir'] })}
            options={['row', 'column']}
          />
          <SelectField
            label="Hizalash"
            value={s.align ?? 'flex-start'}
            onChange={(v) => upd({ align: v as WbStyle['align'] })}
            options={['flex-start', 'center', 'flex-end', 'stretch']}
          />
          <SelectField
            label="Tarqalish"
            value={s.justify ?? 'flex-start'}
            onChange={(v) => upd({ justify: v as WbStyle['justify'] })}
            options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around']}
          />
          <NField label="Gap" value={s.gap} onChange={(v) => upd({ gap: v })} min={0} />
          <SelectField
            label="Overflow"
            value={s.overflow ?? 'visible'}
            onChange={(v) => upd({ overflow: v as WbStyle['overflow'] })}
            options={['visible', 'hidden', 'scroll', 'auto']}
          />
        </Section>
      )}
    </div>
  )
}

// ── Content (props) editor ────────────────────────────────────────────────────

function ContentEditor({ nodeId }: { nodeId: string }) {
  const node    = useWebAppStore((s) => s.getNode(nodeId))
  const updProps = useWebAppStore((s) => s.updateNodeProps)

  if (!node) return null
  const def = COMPONENT_DEFAULTS[node.type]
  if (!def || def.propsConfig.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-tg-muted text-[13px]">
        Bu komponent uchun sozlamalar yo'q
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {def.propsConfig.map((cfg) => {
        const val = node.props[cfg.key]

        switch (cfg.type) {
          case 'text':
          case 'url':
            return (
              <TField
                key={cfg.key}
                label={cfg.label}
                value={(val as string) ?? ''}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
                placeholder={cfg.placeholder}
              />
            )
          case 'textarea':
            return (
              <TField
                key={cfg.key}
                label={cfg.label}
                value={(val as string) ?? ''}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
                placeholder={cfg.placeholder}
                multiline
              />
            )
          case 'number':
            return (
              <NField
                key={cfg.key}
                label={cfg.label}
                value={val as number}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
                min={cfg.min}
                max={cfg.max}
              />
            )
          case 'color':
            return (
              <ColorField
                key={cfg.key}
                label={cfg.label}
                value={val as string}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
              />
            )
          case 'select':
            return (
              <SelectField
                key={cfg.key}
                label={cfg.label}
                value={(val as string) ?? ''}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
                options={cfg.options ?? []}
              />
            )
          case 'toggle':
            return (
              <ToggleField
                key={cfg.key}
                label={cfg.label}
                value={!!val}
                onChange={(v) => updProps(nodeId, { [cfg.key]: v })}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function PropertiesPanel() {
  const [tab, setTab] = useState<'content' | 'style'>('content')
  const {
    selectedNodeId, deleteNode, duplicateNode, moveNodeUp, moveNodeDown, getNode,
  } = useWebAppStore(useShallow((s) => ({
    selectedNodeId: s.selectedNodeId,
    deleteNode:     s.deleteNode,
    duplicateNode:  s.duplicateNode,
    moveNodeUp:     s.moveNodeUp,
    moveNodeDown:   s.moveNodeDown,
    getNode:        s.getNode,
  })))

  if (!selectedNodeId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 bg-tg-bg border-l border-tg-darkborder">
        <Palette size={28} color="#4a6278" />
        <p className="text-tg-muted text-[13px] text-center m-0">
          Komponentni tanlang
        </p>
      </div>
    )
  }

  const node = getNode(selectedNodeId)
  if (!node) return null

  const def = COMPONENT_DEFAULTS[node.type]
  const isRoot = node.type === 'screen'

  return (
    <div className="flex flex-col h-full bg-tg-bg border-l border-tg-darkborder overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-tg-darkborder shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] font-semibold text-tg-muted uppercase tracking-wider m-0">
              {def?.label ?? node.type}
            </p>
          </div>
          {!isRoot && (
            <div className="flex gap-1">
              <button
                onClick={() => moveNodeUp(selectedNodeId)}
                title="Yuqoriga"
                className="size-7 rounded-lg bg-tg-card border-none cursor-pointer flex items-center justify-center text-tg-label hover:text-white hover:bg-tg-elevated transition-all"
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => moveNodeDown(selectedNodeId)}
                title="Pastga"
                className="size-7 rounded-lg bg-tg-card border-none cursor-pointer flex items-center justify-center text-tg-label hover:text-white hover:bg-tg-elevated transition-all"
              >
                <ChevronDown size={13} />
              </button>
              <button
                onClick={() => duplicateNode(selectedNodeId)}
                title="Nusxa olish"
                className="size-7 rounded-lg bg-tg-card border-none cursor-pointer flex items-center justify-center text-tg-label hover:text-white hover:bg-tg-elevated transition-all"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => deleteNode(selectedNodeId)}
                title="O'chirish"
                className="size-7 rounded-lg bg-tg-card border-none cursor-pointer flex items-center justify-center text-tg-muted hover:text-node-red hover:bg-node-red/10 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        {!isRoot && (
          <div className="seg-ctrl">
            <button
              onClick={() => setTab('content')}
              className={`seg-btn${tab === 'content' ? ' active' : ''}`}
            >
              Kontent
            </button>
            <button
              onClick={() => setTab('style')}
              className={`seg-btn${tab === 'style' ? ' active' : ''}`}
            >
              Stil
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto touch-scroll">
        {isRoot || tab === 'style' ? (
          <StyleEditor nodeId={selectedNodeId} />
        ) : (
          <ContentEditor nodeId={selectedNodeId} />
        )}
      </div>
    </div>
  )
}
