import { MessageSquare, Image, Video, Music, Mic, FileText, BarChart2 } from 'lucide-react'
import { Field, handleFocus, TrashBtn } from './shared'
import ButtonList from './ButtonList'
import type { BtnItem } from './ButtonList'

const MSG_TYPES = [
  { value: 'text',     label: 'Matn',    icon: MessageSquare, color: '#2481cc' },
  { value: 'photo',    label: 'Rasm',    icon: Image,         color: '#e67e22' },
  { value: 'video',    label: 'Video',   icon: Video,         color: '#e91e8c' },
  { value: 'audio',    label: 'Audio',   icon: Music,         color: '#00bcd4' },
  { value: 'voice',    label: 'Ovoz',    icon: Mic,           color: '#f39c12' },
  { value: 'document', label: 'Hujjat',  icon: FileText,      color: '#7d9ab5' },
  { value: 'poll',     label: "So'rov",  icon: BarChart2,     color: '#22c55e' },
]

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 -mx-3 px-3 py-[6px] bg-tg-elevated/60 border-y border-tg-darkborder">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-tg-muted">{label}</span>
    </div>
  )
}

function TypeCard({
  value, label, icon: Icon, color, selected, onClick,
}: {
  value: string; label: string; icon: React.ElementType
  color: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-[5px] rounded-[10px] py-[9px] px-[6px] border cursor-pointer transition-all duration-120 w-full',
        selected
          ? 'border-transparent text-white'
          : 'bg-tg-elevated border-tg-input text-tg-muted hover:border-tg-border hover:text-tg-label',
      ].join(' ')}
      style={selected ? {
        background: `${color}18`,
        borderColor: `${color}55`,
        boxShadow: `0 0 0 1px ${color}30`,
      } : {}}
    >
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={selected
          ? { background: `${color}25`, color }
          : { background: 'transparent', color: 'currentColor' }
        }
      >
        <Icon size={14} color="currentColor" />
      </div>
      <span
        className={`text-[10px] font-semibold leading-none ${selected ? 'text-white' : 'text-tg-muted'}`}
        style={selected ? { color } : {}}
      >
        {label}
      </span>
    </button>
  )
}

interface Props {
  cfg: Record<string, unknown>
  set: (k: string, v: unknown) => void
}

export default function MessagePanel({ cfg, set }: Props) {
  const msgType     = (cfg.message_type as string) || 'text'
  const buttons     = (cfg.buttons as BtnItem[]) || []
  const isMedia     = ['photo', 'video', 'audio', 'voice', 'document'].includes(msgType)
  const isPoll      = msgType === 'poll'
  const pollOptions = (cfg.poll_options as string[]) || ['', '']

  const updatePollOption = (i: number, val: string) => { const next = [...pollOptions]; next[i] = val; set('poll_options', next) }
  const addPollOption    = () => set('poll_options', [...pollOptions, ''])
  const removePollOption = (i: number) => set('poll_options', pollOptions.filter((_, idx) => idx !== i))

  return (
    <div className="flex flex-col gap-0 -mx-3">

      {/* ── Xabar turi ── */}
      <SectionLabel label="Xabar turi" />
      <div className="px-3 py-3">
        <div className="grid grid-cols-4 gap-[6px]">
          {MSG_TYPES.map(t => (
            <TypeCard
              key={t.value}
              {...t}
              selected={msgType === t.value}
              onClick={() => set('message_type', t.value)}
            />
          ))}
        </div>
      </div>

      {/* ── Matn / Caption ── */}
      {!isPoll && msgType !== 'voice' && (
        <>
          <SectionLabel label={isMedia ? 'Caption (ixtiyoriy)' : 'Matn'} />
          <div className="px-3 py-3">
            <textarea
              value={(cfg.text as string) || ''}
              onChange={e => set('text', e.target.value)}
              rows={4}
              className="tg-input tg-textarea w-full"
              onFocus={handleFocus}
              placeholder={isMedia ? 'Rasm tavsifi...' : "Xabar matni...\n{{user_name}} kabi o'zgaruvchilar ishlatiladi"}
            />
          </div>
        </>
      )}

      {/* ── Parse Mode ── */}
      {!isPoll && (
        <>
          <SectionLabel label="Parse Mode" />
          <div className="px-3 py-3">
            <div className="flex gap-2">
              {['HTML', 'Markdown'].map(mode => (
                <button
                  key={mode}
                  onClick={() => set('parse_mode', mode)}
                  className={[
                    'flex-1 py-[7px] rounded-[9px] text-[12px] font-semibold border cursor-pointer transition-all duration-120',
                    ((cfg.parse_mode as string) || 'HTML') === mode
                      ? 'bg-tg-accent/15 border-tg-accent/50 text-tg-accent'
                      : 'bg-tg-elevated border-tg-input text-tg-muted hover:text-white hover:border-tg-border',
                  ].join(' ')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Fayl URL ── */}
      {isMedia && (
        <>
          <SectionLabel label="Fayl URL" />
          <div className="px-3 py-3">
            <input
              value={(cfg.file_url as string) || ''}
              onChange={e => set('file_url', e.target.value)}
              className="tg-input w-full"
              onFocus={handleFocus}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </>
      )}

      {/* ── Poll ── */}
      {isPoll && (
        <>
          <SectionLabel label="Savol" />
          <div className="px-3 py-3">
            <input
              value={(cfg.poll_question as string) || ''}
              onChange={e => set('poll_question', e.target.value)}
              className="tg-input w-full"
              onFocus={handleFocus}
              placeholder="Qaysi variant yaxshiroq?"
            />
          </div>

          <SectionLabel label="Variantlar" />
          <div className="px-3 py-3 flex flex-col gap-[6px]">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-[6px]">
                <input
                  value={opt}
                  onChange={e => updatePollOption(i, e.target.value)}
                  className="tg-input flex-1"
                  onFocus={handleFocus}
                  placeholder={`Variant ${i + 1}`}
                />
                {pollOptions.length > 2 && <TrashBtn onClick={() => removePollOption(i)} />}
              </div>
            ))}
            {pollOptions.length < 10 && (
              <button
                onClick={addPollOption}
                className="bg-transparent border-none cursor-pointer text-tg-accent text-[13px] font-medium flex items-center gap-1 py-1 px-0"
              >
                + Variant qo'shish
              </button>
            )}
          </div>

          <SectionLabel label="Poll turi" />
          <div className="px-3 py-3 flex gap-2">
            {[
              { value: 'regular', label: 'Regular' },
              { value: 'quiz',    label: 'Quiz' },
            ].map(pt => (
              <button
                key={pt.value}
                onClick={() => set('poll_type', pt.value)}
                className={[
                  'flex-1 py-[7px] rounded-[9px] text-[12px] font-semibold border cursor-pointer transition-all duration-120',
                  ((cfg.poll_type as string) || 'regular') === pt.value
                    ? 'bg-tg-accent/15 border-tg-accent/50 text-tg-accent'
                    : 'bg-tg-elevated border-tg-input text-tg-muted hover:text-white hover:border-tg-border',
                ].join(' ')}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Tugmalar ── */}
      {!isPoll && (
        <>
          <SectionLabel label="Tugmalar (ixtiyoriy)" />
          <div className="px-3 py-3">
            {buttons.length > 0 && (
              <div className="flex flex-col gap-3 mb-3">
                <div className="flex gap-2">
                  {['inline', 'reply'].map(layout => (
                    <button
                      key={layout}
                      onClick={() => set('button_layout', layout)}
                      className={[
                        'flex-1 py-[7px] rounded-[9px] text-[12px] font-semibold border cursor-pointer transition-all duration-120',
                        ((cfg.button_layout as string) || 'inline') === layout
                          ? 'bg-tg-accent/15 border-tg-accent/50 text-tg-accent'
                          : 'bg-tg-elevated border-tg-input text-tg-muted hover:text-white hover:border-tg-border',
                      ].join(' ')}
                    >
                      {layout === 'inline' ? 'Inline' : 'Reply'}
                    </button>
                  ))}
                </div>

                {((cfg.button_layout as string) || 'inline') === 'inline' && (
                  <div className="flex gap-2">
                    {[
                      { value: 'edit', label: 'Edit (tavsiya)' },
                      { value: 'send', label: 'Yangi xabar' },
                    ].map(cb => (
                      <button
                        key={cb.value}
                        onClick={() => set('on_callback', cb.value)}
                        className={[
                          'flex-1 py-[7px] rounded-[9px] text-[12px] font-semibold border cursor-pointer transition-all duration-120',
                          ((cfg.on_callback as string) || 'edit') === cb.value
                            ? 'bg-tg-accent/15 border-tg-accent/50 text-tg-accent'
                            : 'bg-tg-elevated border-tg-input text-tg-muted hover:text-white hover:border-tg-border',
                        ].join(' ')}
                      >
                        {cb.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ButtonList
              buttons={buttons}
              layout={(cfg.button_layout as string) || 'inline'}
              onChange={b => set('buttons', b)}
            />
          </div>
        </>
      )}

    </div>
  )
}
