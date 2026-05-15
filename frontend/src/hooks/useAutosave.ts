/**
 * Autosave hook — debounces flow changes and saves to backend.
 * Saves 2 seconds after the last change.
 * Shows save status in toolbar.
 */
import { useEffect, useRef } from 'react'
import { useBuilderStore } from '../stores/builderStore'
import { flowsApi } from '../lib/api/flows'

const DEBOUNCE_MS = 2000

export function useAutosave(botId: string, flowId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { nodes, edges, viewport, isDirty } = useBuilderStore()

  useEffect(() => {
    if (!isDirty || !flowId || !botId) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      useBuilderStore.setState({ isSaving: true })
      try {
        await flowsApi.updateFlow(botId, flowId, { nodes, edges, viewport })
        useBuilderStore.setState({
          isSaving: false,
          isDirty: false,
          lastSavedAt: new Date(),
        })
      } catch {
        useBuilderStore.setState({ isSaving: false })
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes, edges, viewport, isDirty, botId, flowId])
}
