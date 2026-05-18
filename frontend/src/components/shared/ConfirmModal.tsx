import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useConfirmStore } from '@/store/confirm.store'

/**
 * Global confirm dialog — mount once in App.tsx.
 * Driven entirely by useConfirmStore; call the imperative `confirm()` helper
 * from anywhere in the app instead of window.confirm().
 *
 * Usage:
 *   import { confirm } from '@/store/confirm.store'
 *   const ok = await confirm({ message: 'O\'chirishni xohlaysizmi?', danger: true, countdown: 3 })
 *   if (!ok) return
 */
export default function ConfirmModal() {
  const { open, options, _accept, _cancel } = useConfirmStore()
  const [remaining, setRemaining] = useState(0)

  // Reset + start countdown whenever the dialog opens
  useEffect(() => {
    if (!open) {
      setRemaining(0)
      return
    }
    const secs = options.countdown ?? 0
    if (secs <= 0) {
      setRemaining(0)
      return
    }
    setRemaining(secs)
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(iv)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [open, options.countdown])

  if (!open) return null

  const canConfirm = remaining === 0

  return (
    <div
      className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[6px]"
      onClick={_cancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-modal-in bg-tg-bg border border-tg-input rounded-[20px] w-full max-w-[360px] shadow-[0_24px_60px_rgba(0,0,0,0.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Icon + text ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center gap-[14px] px-6 pt-6 pb-5">
          <div
            className={[
              'size-[52px] rounded-[16px] flex items-center justify-center',
              options.danger
                ? 'bg-red-500/10 border border-red-500/25'
                : 'bg-amber-500/10 border border-amber-500/20',
            ].join(' ')}
          >
            {options.danger
              ? <Trash2 size={22} className="text-red-400" />
              : <AlertTriangle size={22} className="text-amber-400" />
            }
          </div>

          <div>
            <p
              id="confirm-title"
              className="text-[15px] font-bold text-white m-0 mb-[6px] leading-snug"
            >
              {options.message}
            </p>
            {options.description && (
              <p className="text-[13px] text-tg-label m-0 leading-relaxed">
                {options.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-[10px] px-5 pb-5">
          <button
            onClick={_cancel}
            className="flex-1 bg-tg-card border border-tg-input rounded-[12px] py-[11px] text-tg-label text-[13px] font-medium cursor-pointer hover:bg-tg-elevated transition-colors duration-150"
          >
            {options.cancelLabel}
          </button>

          <button
            onClick={_accept}
            disabled={!canConfirm}
            className={[
              'flex-1 border-none rounded-[12px] py-[11px] text-[13px] font-semibold transition-all duration-150',
              options.danger
                ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-500/40 disabled:text-red-200 disabled:cursor-not-allowed'
                : 'bg-tg-accent text-white hover:bg-tg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {canConfirm
              ? options.confirmLabel
              : `${options.confirmLabel} (${remaining}s)`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
