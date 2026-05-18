import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type Toast, type ToastType } from '@/store/toast.store'

// ── Icon + color map ──────────────────────────────────────────────────────────

const ICON: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const COLOR: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: { bg: 'bg-green-500/10',   border: 'border-green-500/25',   icon: 'text-green-400',  bar: 'bg-green-500'  },
  error:   { bg: 'bg-red-500/10',     border: 'border-red-500/25',     icon: 'text-red-400',    bar: 'bg-red-500'    },
  warning: { bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   icon: 'text-amber-400',  bar: 'bg-amber-500'  },
  info:    { bg: 'bg-tg-accent/10',   border: 'border-tg-accent/25',   icon: 'text-tg-accent',  bar: 'bg-tg-accent'  },
}

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const Icon    = ICON[toast.type]
  const c       = COLOR[toast.type]

  return (
    <div
      role="alert"
      className={[
        'relative flex items-start gap-[10px] overflow-hidden pointer-events-auto',
        'w-[320px] max-w-[calc(100vw-32px)]',
        'rounded-[14px] border px-[14px] py-[11px]',
        'shadow-[0_8px_28px_rgba(0,0,0,0.4)]',
        'animate-toast-in',
        c.bg, c.border,
      ].join(' ')}
    >
      {/* Icon */}
      <Icon size={15} className={`shrink-0 mt-[1px] ${c.icon}`} />

      {/* Message */}
      <p className="flex-1 text-[13px] text-white m-0 leading-[1.4] break-words">
        {toast.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Yopish"
        className="shrink-0 bg-transparent border-none cursor-pointer p-0 mt-[1px] text-tg-muted hover:text-white transition-colors duration-100"
      >
        <X size={13} />
      </button>

      {/* Auto-dismiss progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] opacity-50 ${c.bar}`}
        style={{ animation: `toastProgress ${toast.duration}ms linear forwards` }}
      />
    </div>
  )
}

// ── Container — mount once in App.tsx ─────────────────────────────────────────

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
