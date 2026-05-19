import { Field, handleFocus, TrashBtn, AddDashBtn } from './shared'
import ButtonList from './ButtonList'
import type { BtnItem } from './ButtonList'

const MSG_TYPES = [
  { value: 'text',     label: 'Matn' },
  { value: 'photo',    label: 'Rasm (Photo)' },
  { value: 'video',    label: 'Video' },
  { value: 'audio',    label: 'Audio' },
  { value: 'voice',    label: 'Voice' },
  { value: 'document', label: 'Hujjat (Document)' },
  { value: 'poll',     label: "So'rovnoma (Poll)" },
]

interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
}

export default function MessagePanel({ cfg, set }: Props) {
  const msgType    = (cfg.message_type as string) || 'text'
  const buttons    = (cfg.buttons as BtnItem[]) || []
  const isMedia    = ['photo', 'video', 'audio', 'voice', 'document'].includes(msgType)
  const isPoll     = msgType === 'poll'
  const pollOptions = (cfg.poll_options as string[]) || ['', '']

  const updatePollOption = (i: number, val: string) => { const next = [...pollOptions]; next[i] = val; set('poll_options', next) }
  const addPollOption    = () => set('poll_options', [...pollOptions, ''])
  const removePollOption = (i: number) => set('poll_options', pollOptions.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-[14px]">
      <Field label="Xabar turi">
        <select value={msgType} onChange={e => set('message_type', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
          {MSG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>

      {!isPoll && !['voice'].includes(msgType) && (
        <Field label={isMedia ? 'Caption (ixtiyoriy)' : 'Matn'}>
          <textarea
            value={(cfg.text as string) || ''}
            onChange={e => set('text', e.target.value)}
            rows={4}
            className="tg-input tg-textarea"
            onFocus={handleFocus}
            placeholder={isMedia ? 'Rasm tavsifi...' : "Xabar matni...\n{{user_name}} kabi o'zgaruvchilar ishlatiladi"}
          />
        </Field>
      )}

      {!isPoll && (
        <Field label="Parse Mode">
          <select value={(cfg.parse_mode as string) || 'HTML'} onChange={e => set('parse_mode', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
            <option value="HTML">HTML</option>
            <option value="Markdown">Markdown</option>
          </select>
        </Field>
      )}

      {isMedia && (
        <Field label="Fayl URL">
          <input value={(cfg.file_url as string) || ''} onChange={e => set('file_url', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="https://example.com/image.jpg" />
        </Field>
      )}

      {isPoll && (
        <>
          <Field label="Savol">
            <input value={(cfg.poll_question as string) || ''} onChange={e => set('poll_question', e.target.value)} className="tg-input" onFocus={handleFocus} placeholder="Qaysi variant yaxshiroq?" />
          </Field>
          <Field label="Variantlar">
            <div className="flex flex-col gap-[6px]">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-[6px]">
                  <input value={opt} onChange={e => updatePollOption(i, e.target.value)} className="tg-input flex-1" onFocus={handleFocus} placeholder={`Variant ${i + 1}`} />
                  {pollOptions.length > 2 && <TrashBtn onClick={() => removePollOption(i)} />}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button onClick={addPollOption} className="bg-transparent border-none cursor-pointer text-tg-accent text-[13px] font-medium flex items-center gap-1 py-1 px-0">
                  + {"Variant qo'shish"}
                </button>
              )}
            </div>
          </Field>
          <Field label="Poll turi">
            <select value={(cfg.poll_type as string) || 'regular'} onChange={e => set('poll_type', e.target.value)} className="tg-input tg-select" onFocus={handleFocus}>
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
                <select value={(cfg.button_layout as string) || 'inline'} onChange={e => set('button_layout', e.target.value)} className="tg-input tg-select mb-2" onFocus={handleFocus}>
                  <option value="inline">Inline keyboard</option>
                  <option value="reply">Reply keyboard</option>
                </select>
              </Field>
              {((cfg.button_layout as string) || 'inline') === 'inline' && (
                <Field label="Tugma bosilganda">
                  <select value={(cfg.on_callback as string) || 'edit'} onChange={e => set('on_callback', e.target.value)} className="tg-input tg-select mb-2" onFocus={handleFocus}>
                    <option value="edit">Xabarni tahrirlash (edit) — tavsiya</option>
                    <option value="send">Yangi xabar yuborish (send)</option>
                  </select>
                </Field>
              )}
            </>
          )}
          <ButtonList buttons={buttons} layout={(cfg.button_layout as string) || 'inline'} onChange={b => set('buttons', b)} />
        </div>
      )}
    </div>
  )
}
