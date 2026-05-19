import { QUICK_ADD_NODES } from '../helpers/flowHelpers'

interface Props {
  screenPos: { x: number; y: number }
  onSelect: (type: string) => void
  onClose: () => void
}

export default function QuickAddMenu({ screenPos, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed z-[9000] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] pb-1 w-[160px]"
      style={{ left: screenPos.x, top: screenPos.y, transform: 'translate(-50%, 8px)' }}
    >
      <div className="px-3 pt-2 pb-1.5 text-[10px] text-tg-muted uppercase tracking-[0.08em] font-bold border-b border-tg-input mb-1">
        Node qo'shish
      </div>
      {QUICK_ADD_NODES.map(n => (
        <button
          key={n.type}
          onClick={() => onSelect(n.type)}
          className="w-full flex items-center px-3 py-[7px] text-[12px] font-medium bg-transparent border-none cursor-pointer text-tg-label text-left transition-colors duration-100 hover:bg-tg-card hover:text-white"
        >
          {n.label}
        </button>
      ))}
      <button
        onClick={onClose}
        className="w-full px-3 py-1.5 text-[10px] text-tg-muted bg-transparent border-none border-t border-tg-input cursor-pointer text-left mt-1"
      >
        Bekor qilish (Esc)
      </button>
    </div>
  )
}
