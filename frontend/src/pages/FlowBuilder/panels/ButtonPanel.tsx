import { Field, handleFocus } from './shared'
import ButtonList from './ButtonList'
import type { BtnItem } from './ButtonList'

interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
}

export default function ButtonPanel({ cfg, set }: Props) {
  const layout  = (cfg.button_layout as string) || 'inline'
  const buttons = (cfg.buttons as BtnItem[]) || []

  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Xabar (ixtiyoriy)">
        <textarea value={(cfg.text as string) || ''} onChange={e => set('text', e.target.value)} rows={3} className="tg-input tg-textarea" onFocus={handleFocus} placeholder="Variant tanlang:" />
      </Field>
      <Field label="Keyboard turi">
        <select value={layout} onChange={e => set('button_layout', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          <option value="inline">Inline keyboard</option>
          <option value="reply">Reply keyboard</option>
        </select>
      </Field>
      {layout === 'inline' && (
        <Field label="Tugma bosilganda">
          <select value={(cfg.on_callback as string) || 'edit'} onChange={e => set('on_callback', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
            <option value="edit">Xabarni tahrirlash (edit) — tavsiya</option>
            <option value="send">Yangi xabar yuborish (send)</option>
          </select>
        </Field>
      )}
      <Field label="Tugmalar">
        <ButtonList buttons={buttons} layout={layout} onChange={b => set('buttons', b)} />
      </Field>
    </div>
  )
}
