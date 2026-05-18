import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastStore {
  toasts: Toast[]
  show: (type: ToastType, message: string, duration?: number) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  show: (type, message, duration = 3000) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Imperative helper — call anywhere (inside or outside React components)
export const toast = {
  success: (msg: string, duration?: number) =>
    useToastStore.getState().show('success', msg, duration),
  error: (msg: string, duration?: number) =>
    useToastStore.getState().show('error', msg, duration),
  warning: (msg: string, duration?: number) =>
    useToastStore.getState().show('warning', msg, duration),
  info: (msg: string, duration?: number) =>
    useToastStore.getState().show('info', msg, duration),
}
