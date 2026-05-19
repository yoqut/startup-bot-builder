import { AlertCircle, AlertTriangle, X } from 'lucide-react'
import type { ValidationError } from '../helpers/flowHelpers'

interface Props {
  errors: ValidationError[]
  publishing: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ValidationModal({ errors, publishing, onClose, onConfirm }: Props) {
  const hasError = errors.some(e => e.severity === 'error')

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-[6px] p-4">
      <div className="bg-tg-bg border border-tg-input rounded-[20px] w-full max-w-[440px] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-tg-input">
          <span className="text-[14px] font-bold text-white">Flow tekshiruvi</span>
          <button
            onClick={onClose}
            className="bg-tg-card border border-tg-input rounded-lg w-7 h-7 flex items-center justify-center cursor-pointer text-tg-label"
          >
            <X size={13} />
          </button>
        </div>

        <div className="px-5 py-[14px] flex flex-col gap-2 max-h-[260px] overflow-y-auto">
          {errors.map((err, i) => (
            <div
              key={i}
              className={[
                'flex items-start gap-[10px] p-[10px_12px] rounded-[10px]',
                err.severity === 'error'
                  ? 'bg-red-500/5 border border-red-500/15'
                  : 'bg-amber-500/5 border border-amber-500/15',
              ].join(' ')}
            >
              {err.severity === 'error'
                ? <AlertCircle size={13} color="#f87171" className="shrink-0 mt-[1px]" />
                : <AlertTriangle size={13} color="#fbbf24" className="shrink-0 mt-[1px]" />
              }
              <span className={`text-[12px] ${err.severity === 'error' ? 'text-red-300' : 'text-amber-200'}`}>
                {err.message}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-[10px] px-5 py-[14px] border-t border-tg-input">
          {hasError ? (
            <>
              <span className="text-[12px] text-tg-muted flex-1">Xatolarni tuzating va qayta urinib ko'ring</span>
              <button
                onClick={onClose}
                className="bg-tg-card border border-tg-input rounded-[9px] px-4 py-2 text-white text-[12px] cursor-pointer"
              >
                Yopish
              </button>
            </>
          ) : (
            <>
              <span className="text-[12px] text-tg-muted flex-1">Faqat ogohlantirishlar bor. Nashr etasizmi?</span>
              <button
                onClick={onClose}
                className="bg-transparent border-none text-tg-label text-[12px] cursor-pointer px-[10px] py-2"
              >
                Bekor
              </button>
              <button
                onClick={onConfirm}
                disabled={publishing}
                className="bg-tg-accent border-none rounded-[9px] px-4 py-2 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Nashr etish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
