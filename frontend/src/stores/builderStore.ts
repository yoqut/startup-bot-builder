/**
 * Builder store — single source of truth for the visual flow editor.
 * React Flow state (nodes/edges) lives here alongside UI state.
 * Autosave debounced at 2s after any change.
 * Undo/redo via history stack (max 50 entries).
 */
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from 'reactflow'
import { nanoid } from 'nanoid'
import { debounce } from '../lib/utils'
import { NODE_TYPE_META } from '../components/builder/nodes/nodeTypeMeta'

export type NodeData = {
  label: string
  nodeType: string
  config: Record<string, unknown>
  isSelected?: boolean
}

export type BuilderNode = Node<NodeData>
export type BuilderEdge = Edge

type HistoryEntry = {
  nodes: BuilderNode[]
  edges: BuilderEdge[]
}

type BuilderState = {
  // Flow identity
  flowId: string | null
  flowName: string
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null

  // React Flow state
  nodes: BuilderNode[]
  edges: BuilderEdge[]
  viewport: Viewport

  // History
  past: HistoryEntry[]
  future: HistoryEntry[]

  // UI state
  selectedNodeId: string | null
  isPanelOpen: boolean
  isExecutionMode: boolean
  executingNodeIds: Set<string>
  completedNodeIds: Set<string>
  errorNodeIds: Set<string>

  // Actions
  setFlowId: (id: string) => void
  setFlowName: (name: string) => void
  setNodes: (nodes: BuilderNode[]) => void
  setEdges: (edges: BuilderEdge[]) => void
  setViewport: (viewport: Viewport) => void

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  addNode: (type: string, position: { x: number; y: number }) => BuilderNode
  updateNodeConfig: (nodeId: string, config: Partial<Record<string, unknown>>) => void
  updateNodeLabel: (nodeId: string, label: string) => void
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void

  selectNode: (nodeId: string | null) => void
  togglePanel: (open?: boolean) => void

  undo: () => void
  redo: () => void
  saveHistory: () => void

  loadFlow: (flow: { id: string; name: string; nodes: BuilderNode[]; edges: BuilderEdge[]; viewport: Viewport }) => void
  resetBuilder: () => void

  // Execution visualization
  setExecutionMode: (active: boolean) => void
  markNodeActive: (nodeId: string) => void
  markNodeDone: (nodeId: string) => void
  markNodeError: (nodeId: string) => void
  clearExecution: () => void
}

const MAX_HISTORY = 50

function nodeTypeToLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const useBuilderStore = create<BuilderState>()(
  subscribeWithSelector((set, get) => ({
    flowId: null,
    flowName: 'Untitled Flow',
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    past: [],
    future: [],
    selectedNodeId: null,
    isPanelOpen: false,
    isExecutionMode: false,
    executingNodeIds: new Set(),
    completedNodeIds: new Set(),
    errorNodeIds: new Set(),

    setFlowId: (id) => set({ flowId: id }),
    setFlowName: (name) => set({ flowName: name, isDirty: true }),
    setNodes: (nodes) => set({ nodes, isDirty: true }),
    setEdges: (edges) => set({ edges, isDirty: true }),
    setViewport: (viewport) => set({ viewport }),

    onNodesChange: (changes) => {
      const { nodes, saveHistory } = get()
      const hasPositionChange = changes.some(c => c.type === 'position')
      if (hasPositionChange) saveHistory()
      set({ nodes: applyNodeChanges(changes, nodes) as BuilderNode[], isDirty: true })
    },

    onEdgesChange: (changes) => {
      const { edges } = get()
      set({ edges: applyEdgeChanges(changes, edges) as BuilderEdge[], isDirty: true })
    },

    onConnect: (connection) => {
      const { edges, saveHistory } = get()
      saveHistory()
      set({
        edges: addEdge(
          { ...connection, id: nanoid(), animated: false, type: 'smoothstep' },
          edges
        ) as BuilderEdge[],
        isDirty: true,
      })
    },

    addNode: (type, position) => {
      const { nodes, saveHistory } = get()
      saveHistory()
      const meta = NODE_TYPE_META[type]
      const newNode: BuilderNode = {
        id: nanoid(),
        type: 'custom',
        position,
        data: {
          label: meta?.label ?? nodeTypeToLabel(type),
          nodeType: type,
          config: meta?.defaultConfig ? { ...meta.defaultConfig } : {},
        },
      }
      set({ nodes: [...nodes, newNode], isDirty: true })
      return newNode
    },

    updateNodeConfig: (nodeId, config) => {
      set(state => ({
        nodes: state.nodes.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
            : n
        ),
        isDirty: true,
      }))
    },

    updateNodeLabel: (nodeId, label) => {
      set(state => ({
        nodes: state.nodes.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        ),
        isDirty: true,
      }))
    },

    deleteNode: (nodeId) => {
      const { saveHistory } = get()
      saveHistory()
      set(state => ({
        nodes: state.nodes.filter(n => n.id !== nodeId),
        edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isDirty: true,
      }))
    },

    duplicateNode: (nodeId) => {
      const { nodes, saveHistory } = get()
      const source = nodes.find(n => n.id === nodeId)
      if (!source) return
      saveHistory()
      const duplicate: BuilderNode = {
        ...source,
        id: nanoid(),
        position: { x: source.position.x + 50, y: source.position.y + 50 },
        data: { ...source.data, config: { ...source.data.config } },
      }
      set({ nodes: [...nodes, duplicate], isDirty: true })
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId, isPanelOpen: nodeId !== null }),

    togglePanel: (open) =>
      set(state => ({ isPanelOpen: open !== undefined ? open : !state.isPanelOpen })),

    saveHistory: () => {
      const { nodes, edges, past } = get()
      set({
        past: [...past.slice(-MAX_HISTORY), { nodes: [...nodes], edges: [...edges] }],
        future: [],
      })
    },

    undo: () => {
      const { past, nodes, edges, future } = get()
      if (past.length === 0) return
      const prev = past[past.length - 1]
      set({
        past: past.slice(0, -1),
        future: [{ nodes, edges }, ...future.slice(0, MAX_HISTORY)],
        nodes: prev.nodes,
        edges: prev.edges,
        isDirty: true,
      })
    },

    redo: () => {
      const { future, nodes, edges, past } = get()
      if (future.length === 0) return
      const next = future[0]
      set({
        future: future.slice(1),
        past: [...past, { nodes, edges }],
        nodes: next.nodes,
        edges: next.edges,
        isDirty: true,
      })
    },

    loadFlow: (flow) => {
      set({
        flowId: flow.id,
        flowName: flow.name,
        nodes: flow.nodes,
        edges: flow.edges,
        viewport: flow.viewport,
        isDirty: false,
        past: [],
        future: [],
        selectedNodeId: null,
      })
    },

    resetBuilder: () => set({
      flowId: null,
      flowName: 'Untitled Flow',
      nodes: [],
      edges: [],
      isDirty: false,
      past: [],
      future: [],
      selectedNodeId: null,
    }),

    setExecutionMode: (active) =>
      set({ isExecutionMode: active, executingNodeIds: new Set(), completedNodeIds: new Set(), errorNodeIds: new Set() }),

    markNodeActive: (nodeId) =>
      set(state => ({
        executingNodeIds: new Set([...state.executingNodeIds, nodeId]),
        completedNodeIds: new Set([...state.completedNodeIds].filter(id => id !== nodeId)),
      })),

    markNodeDone: (nodeId) =>
      set(state => ({
        executingNodeIds: new Set([...state.executingNodeIds].filter(id => id !== nodeId)),
        completedNodeIds: new Set([...state.completedNodeIds, nodeId]),
      })),

    markNodeError: (nodeId) =>
      set(state => ({
        executingNodeIds: new Set([...state.executingNodeIds].filter(id => id !== nodeId)),
        errorNodeIds: new Set([...state.errorNodeIds, nodeId]),
      })),

    clearExecution: () =>
      set({ executingNodeIds: new Set(), completedNodeIds: new Set(), errorNodeIds: new Set() }),
  }))
)
