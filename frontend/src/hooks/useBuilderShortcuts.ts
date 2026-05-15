/**
 * Keyboard shortcuts for the flow builder.
 * Ctrl+Z / Ctrl+Shift+Z — undo/redo
 * Ctrl+S — save
 * Escape — deselect node
 * Ctrl+D — duplicate selected node
 * Delete / Backspace — delete selected node
 */
import { useEffect } from 'react'
import { useBuilderStore } from '../stores/builderStore'

export function useBuilderShortcuts() {
  const { undo, redo, selectedNodeId, deleteNode, duplicateNode, selectNode } = useBuilderStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Don't intercept when typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      }
      if (ctrl && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
      if (ctrl && e.key === 'd' && selectedNodeId) {
        e.preventDefault()
        duplicateNode(selectedNodeId)
      }
      if (e.key === 'Escape') {
        selectNode(null)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectedNodeId, deleteNode, duplicateNode, selectNode])
}
