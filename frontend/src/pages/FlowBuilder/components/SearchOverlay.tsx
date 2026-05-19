import { Search, X } from 'lucide-react'
import type { Node } from '@xyflow/react'

interface Props {
  query: string
  results: Node[]
  onChange: (q: string) => void
  onSelect: (node: Node) => void
  onClose: () => void
}

export default function SearchOverlay({ query, results, onChange, onSelect, onClose }: Props) {
  return (
    <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-[9000] w-[280px] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-[10px] border-b border-tg-input">
        <Search size={13} color="#4a6278" />
        <input
          autoFocus
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Node qidirish…"
          className="flex-1 bg-transparent border-none text-white text-[13px] outline-none"
        />
        {query && (
          <button onClick={() => onChange('')} className="bg-transparent border-none cursor-pointer text-tg-muted">
            <X size={12} />
          </button>
        )}
      </div>
      {results.length > 0 ? (
        <div className="max-h-[180px] overflow-y-auto">
          {results.map(n => (
            <button
              key={n.id}
              onClick={() => { onSelect(n); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors duration-100 hover:bg-tg-card"
            >
              <span className="text-[9px] text-tg-muted uppercase font-bold w-[50px] shrink-0">{n.data.nodeType as string}</span>
              <span className="text-[12px] text-white overflow-hidden text-ellipsis whitespace-nowrap">
                {(n.data.config as any)?.text || (n.data.config as any)?.command || n.data.label as string}
              </span>
            </button>
          ))}
        </div>
      ) : query ? (
        <div className="p-[14px] text-[12px] text-tg-muted text-center">Hech narsa topilmadi</div>
      ) : null}
    </div>
  )
}
