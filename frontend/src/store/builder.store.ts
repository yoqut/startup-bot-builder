import { create } from 'zustand'
import type { Node } from '@xyflow/react'
import type { NodeExecState } from '@/components/flow/nodes/NodeShell'

type RightPanel = 'node' | 'preview' | null
type Overlay    = 'search' | 'shortcuts' | 'templates' | 'quickadd' | null

export interface QuickAddState {
  screenPos: { x: number; y: number }
  flowPos:   { x: number; y: number }
  fromNodeId?: string
  fromHandle?: string
}

export interface NodeError {
  nodeId: string
  message: string
}

interface BuilderState {
  // ── Right panel ───────────────────────────────────────────────────────────
  rightPanel:     RightPanel
  selectedNode:   Node | null

  // ── Overlays ──────────────────────────────────────────────────────────────
  activeOverlay:  Overlay
  quickAdd:       QuickAddState | null

  // ── Mobile sheets ─────────────────────────────────────────────────────────
  nodeSheetOpen:  boolean
  chatSheetOpen:  boolean

  // ── Execution visualization ───────────────────────────────────────────────
  execStates:     Record<string, NodeExecState>  // nodeId → state
  nodeErrors:     Record<string, string>          // nodeId → error message

  // ── Actions ───────────────────────────────────────────────────────────────
  selectNode:       (node: Node | null) => void
  openPreview:      () => void
  closePanel:       () => void

  openOverlay:      (name: Overlay) => void
  closeOverlay:     () => void
  setQuickAdd:      (state: QuickAddState | null) => void

  openNodeSheet:    () => void
  closeNodeSheet:   () => void
  openChatSheet:    () => void
  closeChatSheet:   () => void

  setNodeExecState: (nodeId: string, state: NodeExecState) => void
  setNodeErrors:    (errors: NodeError[]) => void
  clearNodeErrors:  () => void
  clearExecStates:  () => void

  updateSelectedNodeConfig: (config: Record<string, unknown>) => void
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  rightPanel:    null,
  selectedNode:  null,
  activeOverlay: null,
  quickAdd:      null,
  nodeSheetOpen: false,
  chatSheetOpen: false,
  execStates:    {},
  nodeErrors:    {},

  selectNode: (node) => set({
    selectedNode: node,
    rightPanel:   node ? 'node' : null,
    activeOverlay: null,
  }),

  openPreview: () => set({ rightPanel: 'preview', selectedNode: null }),

  closePanel: () => set({ rightPanel: null, selectedNode: null }),

  openOverlay:  (name)  => set({ activeOverlay: name }),
  closeOverlay: ()      => set({ activeOverlay: null, quickAdd: null }),
  setQuickAdd:  (state) => set({ quickAdd: state, activeOverlay: state ? 'quickadd' : null }),

  openNodeSheet:  () => set({ nodeSheetOpen: true }),
  closeNodeSheet: () => set({ nodeSheetOpen: false }),
  openChatSheet:  () => set({ chatSheetOpen: true }),
  closeChatSheet: () => set({ chatSheetOpen: false }),

  setNodeExecState: (nodeId, state) =>
    set(s => ({ execStates: { ...s.execStates, [nodeId]: state } })),

  setNodeErrors: (errors) =>
    set({
      nodeErrors: Object.fromEntries(errors.map(e => [e.nodeId, e.message])),
    }),

  clearNodeErrors:  () => set({ nodeErrors: {} }),
  clearExecStates:  () => set({ execStates: {} }),

  updateSelectedNodeConfig: (config) => {
    const { selectedNode } = get()
    if (!selectedNode) return
    set({
      selectedNode: {
        ...selectedNode,
        data: { ...selectedNode.data, config },
      },
    })
  },
}))
