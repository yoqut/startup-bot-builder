import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Node, Edge } from '@xyflow/react'

/**
 * Thin store that holds a snapshot of the canvas (nodes + edges).
 * zundo wraps it with temporal state, giving us undo/redo for free.
 *
 * Usage in FlowCanvas:
 *   push(nodes, edges)                    — record a snapshot
 *   useCanvasStore.temporal.getState().undo()  — step back
 *   useCanvasStore.temporal.getState().redo()  — step forward
 *   useCanvasStore.getState()             — read restored snapshot
 *
 * Reactive canUndo/canRedo (re-renders on change):
 *   import { useStore } from 'zustand'
 *   const canUndo = useStore(useCanvasStore.temporal, s => s.pastStates.length > 0)
 */

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  push: (nodes: Node[], edges: Edge[]) => void
}

export const useCanvasStore = create(
  temporal<CanvasState>(
    (set) => ({
      nodes: [],
      edges: [],
      push: (nodes, edges) => set({ nodes, edges }),
    }),
    { limit: 60 }
  )
)
