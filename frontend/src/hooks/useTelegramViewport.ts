import { useEffect } from 'react'

/**
 * Syncs Telegram Mini App viewport heights to CSS custom properties.
 *
 * --tg-height   = stable height (no keyboard jitter) — use for overall app container
 * --tg-viewport = current visible height (shrinks when iOS keyboard opens) — use for modals/sheets
 *
 * Falls back to window.visualViewport for non-Telegram contexts.
 */
export function useTelegramViewport() {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp

    // ready() and expand() are called synchronously in main.tsx before React mounts.
    // Calling them again here would duplicate events (×2 with StrictMode).

    function update() {
      const stableH = tg?.viewportStableHeight
        ?? window.visualViewport?.height
        ?? window.innerHeight

      const currentH = tg?.viewportHeight
        ?? window.visualViewport?.height
        ?? window.innerHeight

      const root = document.documentElement
      root.style.setProperty('--tg-height', `${stableH}px`)
      root.style.setProperty('--tg-viewport', `${currentH}px`)
    }

    update()

    tg?.onEvent('viewportChanged', update)
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)

    return () => {
      tg?.offEvent?.('viewportChanged', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [])
}
