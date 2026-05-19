import { Plus, Trash2 } from 'lucide-react'
import { TYPE_LABELS as _REG_LABELS } from '@/pages/FlowBuilder/nodeDefinitions'

export function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  const el = e.currentTarget
  requestAnimationFrame(() => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-tg-label mb-[4px]">{label}</label>
      {children}
    </div>
  )
}

export function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-transparent border-none cursor-pointer p-1 flex shrink-0 text-tg-muted hover:text-node-red transition-colors duration-150"
    >
      <Trash2 size={13} />
    </button>
  )
}

export function AddDashBtn({ label, onClick, iconSize = 12 }: { label: string; onClick: () => void; iconSize?: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-[6px] border border-dashed border-tg-border rounded-[10px] py-[10px] text-tg-accent text-[13px] font-medium cursor-pointer bg-transparent hover:bg-tg-input transition-all duration-150"
    >
      <Plus size={iconSize} /> {label}
    </button>
  )
}

export const TYPE_LABELS: Record<string, string> = {
  ..._REG_LABELS,
  // panel-specific overrides
  handler:          'Handler',
  start:            '/start Trigger',
  message:          'Xabar yuborish',
  input:            'Foydalanuvchi kiritishi',
  condition:        'Shart (If/Else)',
  api_call:         'API Call',
  ai:               'AI',
  send_to:          'ID ga yuborish',
  business_handler: 'Business Chat Handler',
  sticky:           'Eslatma (Sticky Note)',
}
