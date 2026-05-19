import { useState } from 'react'
import { Trash2, ChevronUp, ChevronDown, Copy, Palette } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useWebAppStore } from '@/store/webapp.store'
import { COMPONENT_DEFAULTS } from './registry'
import type { WbStyle } from '@/types/webapp'
import {
  Label, Section, TField, NField, ColorField, SelectField,
  ToggleField, PaddingField, BorderRadiusField, TextAlignField,
} from './fields'

function StyleEditor({ nodeId }: { nodeId: string }) {
  const node        = useWebAppStore((s) => s.getNode(nodeId))
  const updateStyle = useWebAppStore((s) => s.updateNodeStyle)

  if (!node) return null
  const s   = node.style
  const upd = (patch: Partial<WbStyle>) => updateStyle(nodeId, patch)

  return (
    <div className="flex flex-col">
      <Section title="O'lcham">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Kenglik</Label>
            <input value={s.width ?? ''} onChange={(e) => upd({ width: e.target.value })} placeholder="100% / 200" className="tg-input text-[13px]" />
          </div>
          <div>
            <Label>Balandlik</Label>
            <input value={s.height ?? ''} onChange={(e) => upd({ height: e.target.value })} placeholder="auto / 100" className="tg-input text-[13px]" />
          </div>
        </div>
        {s.minHeight !== undefined && (
          <NField label="Min Balandlik" value={s.minHeight} onChange={(v) => upd({ minHeight: v })} min={0} />
        )}
      </Section>

      <Section title="Ranglar">
        <ColorField label="Fon rangi"  value={s.bg}    onChange={(v) => upd({ bg: v })} />
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
        <PaddingField label="Tashqi masofa (margin)" value={s.margin}  onChange={(v) => upd({ margin: v as any })} />
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
          <SelectField label="Yo'nalish" value={s.flexDir ?? 'column'} onChange={(v) => upd({ flexDir: v as WbStyle['flexDir'] })} options={['row', 'column']} />
          <SelectField label="Hizalash"  value={s.align ?? 'flex-start'} onChange={(v) => upd({ align: v as WbStyle['align'] })} options={['flex-start', 'center', 'flex-end', 'stretch']} />
          <SelectField label="Tarqalish" value={s.justify ?? 'flex-start'} onChange={(v) => upd({ justify: v as WbStyle['justify'] })} options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around']} />
          <NField label="Gap" value={s.gap} onChange={(v) => upd({ gap: v })} min={0} />
          <SelectField label="Overflow" value={s.overflow ?? 'visible'} onChange={(v) => upd({ overflow: v as WbStyle['overflow'] })} options={['visible', 'hidden', 'scroll', 'auto']} />
        </Section>
      )}
    </div>
  )
}

function ContentEditor({ nodeId }: { nodeId: string }) {
  const node     = useWebAppStore((s) => s.getNode(nodeId))
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
        const upd = (v: unknown) => updProps(nodeId, { [cfg.key]: v })
        switch (cfg.type) {
          case 'text':
          case 'url':     return <TField     key={cfg.key} label={cfg.label} value={(val as string) ?? ''} onChange={upd}  placeholder={cfg.placeholder} />
          case 'textarea':return <TField     key={cfg.key} label={cfg.label} value={(val as string) ?? ''} onChange={upd}  placeholder={cfg.placeholder} multiline />
          case 'number':  return <NField     key={cfg.key} label={cfg.label} value={val as number}         onChange={upd}  min={cfg.min} max={cfg.max} />
          case 'color':   return <ColorField key={cfg.key} label={cfg.label} value={val as string}         onChange={upd} />
          case 'select':  return <SelectField key={cfg.key} label={cfg.label} value={(val as string) ?? ''} onChange={upd} options={cfg.options ?? []} />
          case 'toggle':  return <ToggleField key={cfg.key} label={cfg.label} value={!!val}                onChange={upd} />
          default:        return null
        }
      })}
    </div>
  )
}

export default function PropertiesPanel() {
  const [tab, setTab] = useState<'content' | 'style'>('content')
  const { selectedNodeId, deleteNode, duplicateNode, moveNodeUp, moveNodeDown, getNode } =
    useWebAppStore(useShallow((s) => ({
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
        <p className="text-tg-muted text-[13px] text-center m-0">Komponentni tanlang</p>
      </div>
    )
  }

  const node = getNode(selectedNodeId)
  if (!node) return null

  const def    = COMPONENT_DEFAULTS[node.type]
  const isRoot = node.type === 'screen'

  return (
    <div className="flex flex-col h-full bg-tg-bg border-l border-tg-darkborder overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-tg-darkborder shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-tg-muted uppercase tracking-wider m-0">{def?.label ?? node.type}</p>
          {!isRoot && (
            <div className="flex gap-1">
              {([
                { icon: ChevronUp,   title: 'Yuqoriga',    action: () => moveNodeUp(selectedNodeId),  danger: false },
                { icon: ChevronDown, title: 'Pastga',      action: () => moveNodeDown(selectedNodeId), danger: false },
                { icon: Copy,        title: 'Nusxa olish', action: () => duplicateNode(selectedNodeId), danger: false },
                { icon: Trash2,      title: "O'chirish",   action: () => deleteNode(selectedNodeId),  danger: true  },
              ] as { icon: React.ElementType; title: string; action: () => void; danger: boolean }[]).map(({ icon: Icon, title, action, danger }) => (
                <button
                  key={title}
                  onClick={action}
                  title={title}
                  className={`size-7 rounded-lg bg-tg-card border-none cursor-pointer flex items-center justify-center transition-all ${
                    danger
                      ? 'text-tg-muted hover:text-node-red hover:bg-node-red/10'
                      : 'text-tg-label hover:text-white hover:bg-tg-elevated'
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
        {!isRoot && (
          <div className="seg-ctrl">
            <button onClick={() => setTab('content')} className={`seg-btn${tab === 'content' ? ' active' : ''}`}>Kontent</button>
            <button onClick={() => setTab('style')}   className={`seg-btn${tab === 'style'   ? ' active' : ''}`}>Stil</button>
          </div>
        )}
      </div>
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
