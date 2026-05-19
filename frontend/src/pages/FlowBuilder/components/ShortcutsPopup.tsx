import { X } from 'lucide-react'

interface Props { onClose: () => void }

const SHORTCUTS: [string, [string, string][]][] = [
  ['Tahrirlash', [
    ['Ctrl+Z', 'Bekor qilish'],
    ['Ctrl+Shift+Z', 'Qaytarish'],
    ['Ctrl+S', 'Saqlash'],
    ['Delete', "Noda o'chirish"],
  ]],
  ['Navigation', [
    ['Ctrl+F', 'Node qidirish'],
    ['Scroll', 'Zoom in/out'],
    ['Space+Drag', 'Canvas siljitish'],
  ]],
  ['Boshqaruv', [
    ['Shift+Click', "Ko'p noda tanlash"],
    ['?', "Yordam ko'rsatish"],
    ['Esc', 'Yopish/Bekor qilish'],
  ]],
]

export default function ShortcutsPopup({ onClose }: Props) {
  return (
    <div className="absolute top-[60px] right-3 z-[9000] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-[14px_16px] w-[240px]">
      <div className="flex items-center justify-between mb-[10px]">
        <span className="text-[12px] font-bold text-white">Klaviatura yorliqlari</span>
        <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-tg-muted">
          <X size={12} />
        </button>
      </div>
      {SHORTCUTS.map(([section, rows]) => (
        <div key={section}>
          <div className="text-[9px] text-tg-muted uppercase tracking-[0.1em] font-bold mb-[6px] mt-[10px] first:mt-0">
            {section}
          </div>
          {rows.map(([key, lbl]) => (
            <div key={key} className="flex items-center justify-between py-[4px]">
              <span className="text-[11px] text-tg-label">{lbl}</span>
              <kbd className="text-[10px] bg-tg-card border border-tg-input rounded-[5px] px-[6px] py-[2px] text-tg-label font-mono">{key}</kbd>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
