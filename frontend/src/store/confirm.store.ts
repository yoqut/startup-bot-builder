import { create } from 'zustand'

export interface ConfirmOptions {
  message: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red button + trash icon instead of warning icon */
  danger?: boolean
  /** Disable confirm button for N seconds (0 = no countdown) */
  countdown?: number
}

const DEFAULTS: Required<Omit<ConfirmOptions, 'description'>> = {
  message: 'Ishonchingiz komilmi?',
  confirmLabel: 'Tasdiqlash',
  cancelLabel: 'Bekor',
  danger: false,
  countdown: 0,
}

interface ConfirmStore {
  open: boolean
  options: ConfirmOptions & typeof DEFAULTS
  _resolve: ((value: boolean) => void) | null

  /** Call this to show the dialog. Returns a Promise<boolean>. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** Internal — called by the modal buttons */
  _accept: () => void
  _cancel: () => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  options: { ...DEFAULTS, message: '' },
  _resolve: null,

  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        options: { ...DEFAULTS, ...opts },
        _resolve: resolve,
      })
    }),

  _accept: () => {
    get()._resolve?.(true)
    set({ open: false, _resolve: null })
  },

  _cancel: () => {
    get()._resolve?.(false)
    set({ open: false, _resolve: null })
  },
}))

// Imperative helper — mirrors the window.confirm() call signature
export const confirm = (opts: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().confirm(opts)
