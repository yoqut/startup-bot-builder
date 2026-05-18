import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { paymentsApi } from '@/api/payments'
import { toast } from '@/store/toast.store'
import type { Template } from '@/types/template'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS  = 5 * 60 * 1000 // 5 daqiqa

export type PurchaseState = 'idle' | 'sending' | 'polling' | 'done' | 'error'

export function usePurchase(onUnlocked?: (templateId: string) => void) {
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<PurchaseState>('idle')
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimer.current)   clearInterval(pollTimer.current)
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current)
    pollTimer.current   = null
    timeoutTimer.current = null
  }, [])

  const purchase = useCallback(async (template: Template) => {
    // telegram_id tekshir
    if (!user) return

    setState('sending')

    try {
      const res = await paymentsApi.createInvoice(template.id)

      // Bepul → darhol unlock
      if (res.data.status === 'unlocked') {
        setState('done')
        toast.success('Shablon ulandi! 🎉')
        onUnlocked?.(template.id)
        return
      }

      // Invoice yuborildi → polling boshlash
      toast.success("Telegram'da to'lov so'rovi yuborildi ✓")
      setState('polling')

      // Timeout (5 daqiqa)
      timeoutTimer.current = setTimeout(() => {
        stopPolling()
        setState('idle')
        toast.warning("To'lov tasdiqlanmadi — keyinroq tekshiring")
      }, POLL_TIMEOUT_MS)

      // Har 3 soniyada /payments/my ni tekshir
      pollTimer.current = setInterval(async () => {
        try {
          const { data: payments } = await paymentsApi.myPayments()
          const completed = payments.find(
            (p) => p.template_id === template.id && p.status === 'completed'
          )
          if (completed) {
            stopPolling()
            setState('done')
            toast.success('Shablon ulandi! 🎉')
            onUnlocked?.(template.id)
          }
        } catch {
          // polling xatolarini ovoz chiqarmay o'tkazib yubor
        }
      }, POLL_INTERVAL_MS)
    } catch (err: any) {
      stopPolling()
      setState('idle')
      const status = err?.response?.status
      const detail = err?.response?.data?.detail

      if (status === 409) {
        toast.warning('Allaqachon sotib olingan')
      } else if (status === 400 && detail?.includes('Telegram')) {
        toast.error("Avval Telegram akkauntingizni ulang")
      } else {
        toast.error(detail || "To'lovda xatolik yuz berdi")
      }
    }
  }, [user, onUnlocked, stopPolling])

  return { purchase, state, stopPolling }
}
