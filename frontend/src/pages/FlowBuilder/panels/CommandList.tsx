import { handleFocus, TrashBtn, AddDashBtn } from './shared'

interface Props {
  commands: string[]
  onChange: (commands: string[]) => void
}

export default function CommandList({ commands, onChange }: Props) {
  const update = (i: number, val: string) => { const next = [...commands]; next[i] = val; onChange(next) }
  const add    = () => onChange([...commands, ''])
  const remove = (i: number) => onChange(commands.filter((_, idx) => idx !== i))

  return (
    <div>
      <label className="block text-xs font-medium text-tg-label mb-2">Commandlar</label>
      <div className="flex flex-col gap-[6px]">
        {commands.map((cmd, i) => (
          <div key={i} className="flex items-center gap-[6px]">
            <span className="text-tg-label text-xs font-mono shrink-0">/</span>
            <input
              value={cmd.startsWith('/') ? cmd.slice(1) : cmd}
              onChange={e => update(i, '/' + e.target.value.replace(/^\//, ''))}
              className="tg-input font-mono text-node-green text-xs py-[6px] px-[10px] flex-1"
              onFocus={handleFocus}
              placeholder="start"
            />
            {commands.length > 1 && <TrashBtn onClick={() => remove(i)} />}
          </div>
        ))}
        <AddDashBtn onClick={add} label="Command qo'shish" />
      </div>
    </div>
  )
}
