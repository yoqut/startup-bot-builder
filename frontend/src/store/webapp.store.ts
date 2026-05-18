import { create, useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { temporal } from 'zundo'
import type { WbApp, WbNode, WbNodeId, WbNodeType, WbPage, WbStyle, WbTheme } from '@/types/webapp'
import { webappApi } from '@/api/webapp'

// ── Utility ─────────────────────────────────────────────────────────────────

function genId() {
  return `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function genPageId() {
  return `pg_${Date.now().toString(36)}`
}

function makeRootNode(pageId: string): WbNode {
  return {
    id: `root_${pageId}`,
    type: 'screen',
    parentId: null,
    children: [],
    order: 0,
    props: {},
    style: {
      display: 'flex',
      flexDir: 'column',
      width: '100%',
      height: '100%',
      bg: '#17212b',
      gap: 0,
    },
  }
}

function makeEmptyPage(name: string): WbPage {
  const id = genPageId()
  const root = makeRootNode(id)
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    rootNodeId: root.id,
    nodes: { [root.id]: root },
  }
}

// ── Tracked state (for undo/redo) ─────────────────────────────────────────────

interface TrackedState {
  pages: WbPage[]
  currentPageIndex: number
}

// ── Full store interface ───────────────────────────────────────────────────────

interface WebAppState extends TrackedState {
  app: WbApp | null
  selectedNodeId: WbNodeId | null
  hoveredNodeId: WbNodeId | null
  isDirty: boolean
  isSaving: boolean
  activePanel: 'palette' | 'layers' | 'props'  // mobile panel state

  // App lifecycle
  loadApp: (botId: string) => Promise<void>
  saveApp: () => Promise<void>

  // Page management
  addPage: (name: string) => void
  deletePage: (pageId: string) => void
  renamePage: (pageId: string, name: string) => void
  setCurrentPage: (index: number) => void

  // Node management
  addNode: (type: WbNodeType, parentId?: WbNodeId | null) => WbNodeId
  deleteNode: (nodeId: WbNodeId) => void
  duplicateNode: (nodeId: WbNodeId) => void
  updateNodeProps: (nodeId: WbNodeId, props: Record<string, unknown>) => void
  updateNodeStyle: (nodeId: WbNodeId, style: Partial<WbStyle>) => void
  updateNodeMeta: (nodeId: WbNodeId, meta: WbNode['meta']) => void
  moveNodeUp: (nodeId: WbNodeId) => void
  moveNodeDown: (nodeId: WbNodeId) => void
  reparentNode: (nodeId: WbNodeId, newParentId: WbNodeId) => void

  // Selection
  selectNode: (id: WbNodeId | null) => void
  setHovered: (id: WbNodeId | null) => void
  setActivePanel: (panel: 'palette' | 'layers' | 'props') => void

  // Theme
  updateTheme: (theme: Partial<WbTheme>) => void

  // Helpers
  getCurrentPage: () => WbPage | null
  getNode: (id: WbNodeId) => WbNode | null
}

// ── Default node factory ───────────────────────────────────────────────────────

import { COMPONENT_DEFAULTS } from '@/pages/WebAppBuilder/registry'

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWebAppStore = create<WebAppState>()(
  temporal(
    (set, get) => ({
      app: null,
      pages: [],
      currentPageIndex: 0,
      selectedNodeId: null,
      hoveredNodeId: null,
      isDirty: false,
      isSaving: false,
      activePanel: 'palette',

      // ── App lifecycle ────────────────────────────────────────────────────────

      loadApp: async (botId) => {
        let app = await webappApi.load(botId)
        if (!app) {
          const homePage = makeEmptyPage('Ana sahifa')
          const { DEFAULT_THEME: theme } = await import('@/types/webapp')
          app = {
            id: genId(),
            botId,
            name: 'Mini App',
            pages: [homePage],
            theme,
            updatedAt: Date.now(),
          }
          await webappApi.save(app)
        }
        set({ app, pages: app.pages, currentPageIndex: 0, selectedNodeId: null })
      },

      saveApp: async () => {
        const { app, pages } = get()
        if (!app) return
        set({ isSaving: true })
        const updated: WbApp = { ...app, pages, updatedAt: Date.now() }
        await webappApi.save(updated)
        set({ app: updated, isDirty: false, isSaving: false })
      },

      // ── Pages ────────────────────────────────────────────────────────────────

      addPage: (name) => {
        const page = makeEmptyPage(name)
        set((s) => ({
          pages: [...s.pages, page],
          currentPageIndex: s.pages.length,
          isDirty: true,
        }))
      },

      deletePage: (pageId) => {
        const { pages, currentPageIndex } = get()
        if (pages.length <= 1) return
        const idx = pages.findIndex((p) => p.id === pageId)
        const next = pages.filter((p) => p.id !== pageId)
        set({
          pages: next,
          currentPageIndex: Math.min(currentPageIndex, next.length - 1),
          selectedNodeId: null,
          isDirty: true,
        })
      },

      renamePage: (pageId, name) => {
        set((s) => ({
          pages: s.pages.map((p) => p.id === pageId ? { ...p, name } : p),
          isDirty: true,
        }))
      },

      setCurrentPage: (index) => {
        set({ currentPageIndex: index, selectedNodeId: null })
      },

      // ── Nodes ────────────────────────────────────────────────────────────────

      addNode: (type, parentId) => {
        const { pages, currentPageIndex, selectedNodeId } = get()
        const page = pages[currentPageIndex]
        if (!page) return ''

        const def = COMPONENT_DEFAULTS[type]
        const id = genId()

        // Resolve parent: explicit > selectedNode (if container) > root
        let resolvedParent = parentId !== undefined ? parentId : null
        if (resolvedParent === undefined || resolvedParent === null) {
          if (selectedNodeId) {
            const sel = page.nodes[selectedNodeId]
            const canContainer = ['screen', 'box', 'row', 'card'].includes(sel?.type ?? '')
            resolvedParent = canContainer ? selectedNodeId : (sel?.parentId ?? page.rootNodeId)
          } else {
            resolvedParent = page.rootNodeId
          }
        }

        const parent = page.nodes[resolvedParent!]
        const order = parent ? parent.children.length : 0

        const newNode: WbNode = {
          id,
          type,
          parentId: resolvedParent,
          children: [],
          order,
          props: { ...(def?.defaultProps ?? {}) },
          style: { ...(def?.defaultStyle ?? {}) },
        }

        const updatedParent: WbNode = parent
          ? { ...parent, children: [...parent.children, id] }
          : page.nodes[page.rootNodeId]

        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: {
                ...p.nodes,
                [id]: newNode,
                [resolvedParent!]: updatedParent,
              },
            }
          ),
          selectedNodeId: id,
          isDirty: true,
        }))

        return id
      },

      deleteNode: (nodeId) => {
        const { pages, currentPageIndex } = get()
        const page = pages[currentPageIndex]
        if (!page) return
        const node = page.nodes[nodeId]
        if (!node || node.type === 'screen') return

        // Collect all descendants
        const toDelete = new Set<WbNodeId>()
        const collect = (id: WbNodeId) => {
          toDelete.add(id)
          page.nodes[id]?.children.forEach(collect)
        }
        collect(nodeId)

        const newNodes = { ...page.nodes }
        toDelete.forEach((id) => delete newNodes[id])

        // Remove from parent
        if (node.parentId && newNodes[node.parentId]) {
          newNodes[node.parentId] = {
            ...newNodes[node.parentId],
            children: newNodes[node.parentId].children.filter((c) => c !== nodeId),
          }
        }

        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : { ...p, nodes: newNodes }
          ),
          selectedNodeId: null,
          isDirty: true,
        }))
      },

      duplicateNode: (nodeId) => {
        const { pages, currentPageIndex } = get()
        const page = pages[currentPageIndex]
        if (!page) return
        const node = page.nodes[nodeId]
        if (!node || node.type === 'screen') return

        const remap = (n: WbNode, newParentId: WbNodeId | null, nodes: Record<WbNodeId, WbNode>): Record<WbNodeId, WbNode> => {
          const newId = genId()
          const newNode: WbNode = { ...n, id: newId, parentId: newParentId, children: [] }
          let result: Record<WbNodeId, WbNode> = { [newId]: newNode }
          for (const childId of n.children) {
            const childNodes = remap(nodes[childId], newId, nodes)
            result = { ...result, ...childNodes }
            newNode.children.push(Object.keys(childNodes)[0])
          }
          return result
        }

        const duped = remap(node, node.parentId, page.nodes)
        const newRootId = Object.keys(duped)[0]

        const newNodes = { ...page.nodes, ...duped }
        if (node.parentId && newNodes[node.parentId]) {
          const parent = newNodes[node.parentId]
          const idx = parent.children.indexOf(nodeId)
          const newChildren = [...parent.children]
          newChildren.splice(idx + 1, 0, newRootId)
          newNodes[node.parentId] = { ...parent, children: newChildren }
        }

        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : { ...p, nodes: newNodes }
          ),
          selectedNodeId: newRootId,
          isDirty: true,
        }))
      },

      updateNodeProps: (nodeId, props) => {
        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: {
                ...p.nodes,
                [nodeId]: { ...p.nodes[nodeId], props: { ...p.nodes[nodeId].props, ...props } },
              },
            }
          ),
          isDirty: true,
        }))
      },

      updateNodeStyle: (nodeId, style) => {
        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: {
                ...p.nodes,
                [nodeId]: { ...p.nodes[nodeId], style: { ...p.nodes[nodeId].style, ...style } },
              },
            }
          ),
          isDirty: true,
        }))
      },

      updateNodeMeta: (nodeId, meta) => {
        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: {
                ...p.nodes,
                [nodeId]: { ...p.nodes[nodeId], meta: { ...p.nodes[nodeId].meta, ...meta } },
              },
            }
          ),
          isDirty: true,
        }))
      },

      moveNodeUp: (nodeId) => {
        const { pages, currentPageIndex } = get()
        const page = pages[currentPageIndex]
        const node = page?.nodes[nodeId]
        if (!node?.parentId) return
        const parent = page.nodes[node.parentId]
        if (!parent) return
        const idx = parent.children.indexOf(nodeId)
        if (idx <= 0) return
        const newChildren = [...parent.children]
        ;[newChildren[idx - 1], newChildren[idx]] = [newChildren[idx], newChildren[idx - 1]]
        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: { ...p.nodes, [parent.id]: { ...parent, children: newChildren } },
            }
          ),
          isDirty: true,
        }))
      },

      moveNodeDown: (nodeId) => {
        const { pages, currentPageIndex } = get()
        const page = pages[currentPageIndex]
        const node = page?.nodes[nodeId]
        if (!node?.parentId) return
        const parent = page.nodes[node.parentId]
        if (!parent) return
        const idx = parent.children.indexOf(nodeId)
        if (idx >= parent.children.length - 1) return
        const newChildren = [...parent.children]
        ;[newChildren[idx], newChildren[idx + 1]] = [newChildren[idx + 1], newChildren[idx]]
        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : {
              ...p,
              nodes: { ...p.nodes, [parent.id]: { ...parent, children: newChildren } },
            }
          ),
          isDirty: true,
        }))
      },

      reparentNode: (nodeId, newParentId) => {
        const { pages, currentPageIndex } = get()
        const page = pages[currentPageIndex]
        if (!page) return
        const node = page.nodes[nodeId]
        if (!node || node.type === 'screen') return

        const newNodes = { ...page.nodes }

        // Remove from old parent
        if (node.parentId && newNodes[node.parentId]) {
          newNodes[node.parentId] = {
            ...newNodes[node.parentId],
            children: newNodes[node.parentId].children.filter((c) => c !== nodeId),
          }
        }

        // Add to new parent
        newNodes[newParentId] = {
          ...newNodes[newParentId],
          children: [...newNodes[newParentId].children, nodeId],
        }
        newNodes[nodeId] = { ...node, parentId: newParentId }

        set((s) => ({
          pages: s.pages.map((p, i) =>
            i !== s.currentPageIndex ? p : { ...p, nodes: newNodes }
          ),
          isDirty: true,
        }))
      },

      // ── Selection ────────────────────────────────────────────────────────────

      selectNode: (id) => set({ selectedNodeId: id }),
      setHovered: (id) => set({ hoveredNodeId: id }),
      setActivePanel: (panel) => set({ activePanel: panel }),

      // ── Theme ────────────────────────────────────────────────────────────────

      updateTheme: (theme) => {
        set((s) => ({
          app: s.app ? { ...s.app, theme: { ...s.app.theme, ...theme } } : s.app,
          isDirty: true,
        }))
      },

      // ── Helpers ──────────────────────────────────────────────────────────────

      getCurrentPage: () => {
        const { pages, currentPageIndex } = get()
        return pages[currentPageIndex] ?? null
      },

      getNode: (id) => {
        const page = get().getCurrentPage()
        return page?.nodes[id] ?? null
      },
    }),
    {
      limit: 100,
      partialize: (state) => ({
        pages: state.pages,
        currentPageIndex: state.currentPageIndex,
      }),
    }
  )
)

// Expose undo/redo — useShallow prevents infinite getSnapshot loop (Zustand v5)
export const useWebAppHistory = () =>
  useStore(
    useWebAppStore.temporal,
    useShallow((s) => ({
      undo:    s.undo,
      redo:    s.redo,
      canUndo: s.pastStates.length > 0,
      canRedo: s.futureStates.length > 0,
    })),
  )
