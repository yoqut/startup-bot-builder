import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, reconnectEdge, useNodesState, useEdgesState, useReactFlow,
  type Connection, type Node, type Edge,
  BackgroundVariant, Panel,
  type NodeChange, type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X, Loader2, StickyNote, Layers } from 'lucide-react'
import { toast } from '@/store/toast.store'
import { confirm } from '@/store/confirm.store'
import type { FlowChatType } from '@/types/flow'
import { useFlowStore } from '@/store/flow.store'
import { useBuilderStore } from '@/store/builder.store'
import { botsApi } from '@/api/bots'
import NodePanel from './NodePanel'
import Sidebar from './Sidebar'
import PreviewPanel from './PreviewPanel'
import TemplatesModal from './TemplatesModal'
import type { FlowTemplate } from './templates'
import {
  nodeTypes, edgeTypes, validateFlow, makeConfig,
  makeEdge, serializeNodes, serializeEdges,
} from './helpers/flowHelpers'
import { useFlowHistory } from './hooks/useFlowHistory'
import { useAutoSave } from './hooks/useAutoSave'
import ValidationModal from './components/ValidationModal'
import SearchOverlay from './components/SearchOverlay'
import ShortcutsPopup from './components/ShortcutsPopup'
import ChatTypeSheet from './components/ChatTypeSheet'
import QuickAddMenu from './components/QuickAddMenu'
import FlowBuilderTopbar from './topbar/FlowBuilderTopbar'
import CanvasEmptyState from './components/CanvasEmptyState'
import type { ValidationError } from './helpers/flowHelpers'

function FlowCanvas() {
  const { botId } = useParams<{ botId: string }>()
  const [searchParams] = useSearchParams()
  const chatType = (searchParams.get('type') as FlowChatType) || 'user'

  const { currentFlow, loadCanvas, saveFlow, publishFlow, updateNodes, updateEdges } = useFlowStore()
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow()
  const isMobile = useMobile()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // ── Builder store (replaces 15 useState) ──────────────────────────────────
  const {
    rightPanel, selectedNode,
    activeOverlay, quickAdd,
    nodeSheetOpen, chatSheetOpen,
    nodeErrors, execStates,
    selectNode, openPreview, closePanel,
    openOverlay, closeOverlay, setQuickAdd,
    openNodeSheet, closeNodeSheet, openChatSheet, closeChatSheet,
    setNodeErrors, clearNodeErrors, updateSelectedNodeConfig,
  } = useBuilderStore()

  const showSearch    = activeOverlay === 'search'
  const showShortcuts = activeOverlay === 'shortcuts'
  const showTemplates = activeOverlay === 'templates'
  const showPreview   = rightPanel === 'preview'

  // ── Publishing state (local — ephemeral) ──────────────────────────────────
  const publishingRef    = useRef(false)
  const publishSuccessRef = useRef(false)
  const [, forceUpdate]  = useNodesState([]) // trick to re-render topbar badge

  const { pushSnapshot, undo, redo, canUndo, canRedo, loadSnapshot } = useFlowHistory(
    ns => setNodes(ns),
    es => setEdges(es),
  )

  const { scheduleAutoSave, commitSave, saveStatus, setSaveStatus, isDirty, setIsDirty, lastSaved } = useAutoSave(
    getNodes, getEdges, updateNodes, updateEdges, saveFlow,
  )

  // ── Telegram WebApp setup ─────────────────────────────────────────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    tg?.disableVerticalSwipes?.()
    tg?.setHeaderColor?.('#17212b')
    return () => { tg?.enableVerticalSwipes?.() }
  }, [])

  useEffect(() => { if (botId) loadCanvas(botId, chatType) }, [botId, chatType, loadCanvas])

  useEffect(() => {
    if (!currentFlow) return
    let ns: Node[] = currentFlow.nodes.map(n => ({
      id:       n.id,
      type:     n.type in nodeTypes ? n.type : 'message',
      position: { x: n.position_x, y: n.position_y },
      data:     { label: n.label || n.type, config: n.config, nodeType: n.type },
    }))
    const es: Edge[] = currentFlow.edges.map(e =>
      makeEdge(e.id, e.source_node_id, e.target_node_id, e.condition_key)
    )
    if (ns.length === 0) {
      ns = [{
        id: crypto.randomUUID(), type: 'handler',
        position: { x: 260, y: 160 },
        data: { label: 'Handler', nodeType: 'handler', config: makeConfig('handler') },
      }]
      setTimeout(() => scheduleAutoSave(), 0)
    }
    loadSnapshot(ns, es)
  }, [currentFlow?.id])

  // ── Connection handlers ───────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    const edge = makeEdge(crypto.randomUUID(), params.source!, params.target!, params.sourceHandle)
    setEdges(eds => { const next = addEdge(edge, eds); pushSnapshot(getNodes(), next); return next })
  }, [setEdges, pushSnapshot, getNodes])

  // Edge endpoint drag-to-reconnect
  const isReconnecting = useRef(false)
  const onReconnectStart = useCallback(() => { isReconnecting.current = false }, [])
  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    isReconnecting.current = true
    setEdges(eds => reconnectEdge(oldEdge, newConnection, eds))
  }, [setEdges])
  const onReconnectEnd = useCallback((_: unknown, edge: Edge) => {
    if (!isReconnecting.current) setEdges(eds => eds.filter(e => e.id !== edge.id))
    isReconnecting.current = false
  }, [setEdges])

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: Record<string, any> | null) => {
    if (!state || state.isValid !== false) return
    const x = 'clientX' in event ? (event as MouseEvent).clientX : (event as TouchEvent).touches[0].clientX
    const y = 'clientY' in event ? (event as MouseEvent).clientY : (event as TouchEvent).touches[0].clientY
    setQuickAdd({
      screenPos: { x, y },
      flowPos:   screenToFlowPosition({ x, y }),
      fromNodeId: state.fromNode?.id,
      fromHandle: state.fromHandle?.id,
    })
  }, [screenToFlowPosition, setQuickAdd])

  // ── Node changes ──────────────────────────────────────────────────────────
  const dragBatchRef = useRef(false)

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id))
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
    closePanel()
    setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
    scheduleAutoSave()
  }, [selectedNode, setNodes, setEdges, closePanel, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  const onNodesChangeWrapped = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    if (changes.some(c => c.type === 'remove')) {
      setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
      scheduleAutoSave()
    }
  }, [onNodesChange, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  const onEdgesChangeWrapped = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes)
    if (changes.some(c => c.type === 'remove')) {
      setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
      scheduleAutoSave()
    }
  }, [onEdgesChange, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  const onNodeDragStart = useCallback(() => { dragBatchRef.current = true }, [])

  const onNodeDragStop = useCallback(() => {
    if (dragBatchRef.current) {
      pushSnapshot(getNodes(), getEdges())
      scheduleAutoSave()
      dragBatchRef.current = false
    }
  }, [pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  // ── Add node ──────────────────────────────────────────────────────────────
  const addNode = useCallback((type: string, subtype = '', position?: { x: number; y: number }) => {
    const id = crypto.randomUUID()
    const newNode: Node = {
      id,
      type:     type in nodeTypes ? type : 'message',
      position: position || { x: 260 + Math.random() * 80, y: 80 + getNodes().length * 130 },
      data:     { label: subtype || type, config: makeConfig(type, subtype), nodeType: type },
    }
    setNodes(ns => { const next = [...ns, newNode]; pushSnapshot(next, getEdges()); return next })
    scheduleAutoSave()
    return id
  }, [setNodes, getNodes, getEdges, pushSnapshot, scheduleAutoSave])

  const addAndConnect = useCallback((type: string) => {
    if (!quickAdd) return
    const newId = addNode(type, '', quickAdd.flowPos)
    if (quickAdd.fromNodeId) {
      const edge = makeEdge(crypto.randomUUID(), quickAdd.fromNodeId, newId, quickAdd.fromHandle)
      setEdges(es => [...es, edge])
    }
    closeOverlay()
  }, [quickAdd, addNode, setEdges, closeOverlay])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('nodeType')
    if (!raw) return
    const [type, subtype] = raw.split(':')
    addNode(type, subtype, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
  }, [screenToFlowPosition, addNode])

  // ── Save / Publish ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    updateNodes(serializeNodes(getNodes()))
    updateEdges(serializeEdges(getEdges()))
    setSaveStatus('saving')
    try {
      await saveFlow()
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('idle')
      toast.error(`Saqlashda xatolik: ${err?.response?.data?.detail || err?.message || "Noma'lum xato"}`)
    }
  }, [getNodes, getEdges, updateNodes, updateEdges, saveFlow, setSaveStatus, setIsDirty])

  const handlePublish = useCallback(async () => {
    const ns = getNodes(); const es = getEdges()
    const errors = validateFlow(ns, es)
    setNodeErrors(errors.map(e => ({ nodeId: e.nodeId, message: e.message })))
    if (errors.length > 0) {
      openOverlay(null)
      // show ValidationModal via local state — keep minimal
      return { hasErrors: true, errors }
    }
    publishingRef.current = true
    try {
      await handleSave()
      await publishFlow()
      if (currentFlow?.bot_id) { try { await botsApi.activate(currentFlow.bot_id) } catch {} }
      toast.success('Flow muvaffaqiyatli nashr etildi!')
      publishSuccessRef.current = true
      setTimeout(() => { publishSuccessRef.current = false }, 2000)
    } finally { publishingRef.current = false }
    return { hasErrors: false }
  }, [getNodes, getEdges, handleSave, publishFlow, currentFlow, setNodeErrors, openOverlay])

  const loadTemplate = useCallback(async (template: FlowTemplate) => {
    const ok = await confirm({
      message: `"${template.name}" shablonini yuklash`,
      description: "Mavjud flow o'chiriladi. Davom etasizmi?",
      confirmLabel: 'Yuklash', danger: true,
    })
    if (!ok) return
    loadSnapshot(template.nodes as Node[], template.edges as Edge[])
    closeOverlay()
  }, [loadSnapshot, closeOverlay])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const notInput = !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (mod && e.key === 's') { e.preventDefault(); handleSave() }
      if (mod && e.key === 'f') { e.preventDefault(); openOverlay(showSearch ? null : 'search') }
      if (e.key === '?' && notInput) { e.preventDefault(); openOverlay(showShortcuts ? null : 'shortcuts') }
      if (e.key === 'Escape') closeOverlay()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, handleSave, openOverlay, closeOverlay, showSearch, showShortcuts])

  // ── Node config update ────────────────────────────────────────────────────
  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes(ns => {
      const next = ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n)
      pushSnapshot(next, getEdges())
      return next
    })
    updateSelectedNodeConfig(config)
    scheduleAutoSave()
  }, [setNodes, getEdges, pushSnapshot, scheduleAutoSave, updateSelectedNodeConfig])

  // ── Search results ────────────────────────────────────────────────────────
  const searchQuery = useBuilderStore(s => (s as any)._searchQuery ?? '')
  const searchResults = useMemo(() =>
    searchQuery.trim()
      ? nodes.filter(n => {
          const cfg = n.data.config as any
          const label = (n.data.label as string || '').toLowerCase()
          const text  = (cfg?.text || cfg?.command || cfg?.prompt || '').toLowerCase()
          return label.includes(searchQuery.toLowerCase()) || text.includes(searchQuery.toLowerCase())
        })
      : []
  , [nodes, searchQuery])

  // ── Styled nodes (memoized with exec + error states) ─────────────────────
  const styledNodes = useMemo(() =>
    nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        execState:    execStates[n.id] || 'idle',
        errorMessage: nodeErrors[n.id],
        collapsed:    !!(n.data as any).collapsed,
      },
    }))
  , [nodes, execStates, nodeErrors])

  // Force type:'custom' — old saved edges may have type:'smoothstep' from previous sessions
  const styledEdges = useMemo(() =>
    edges.map(e => e.type === 'custom' ? e : { ...e, type: 'custom' })
  , [edges])

  return (
    <div className={`flex overflow-hidden h-canvas ${isMobile ? '-m-4' : '-m-6'}`}>
      {!isMobile && <Sidebar onAddNode={addNode} chatType={chatType} />}

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* 3-zone Topbar */}
        <FlowBuilderTopbar
          chatType={chatType}
          saveStatus={saveStatus}
          isDirty={isDirty}
          lastSaved={lastSaved}
          canUndo={canUndo}
          canRedo={canRedo}
          isMobile={isMobile}
          onUndo={undo}
          onRedo={redo}
          onSave={handleSave}
          onPublish={handlePublish}
          onToggleSearch={() => openOverlay(showSearch ? null : 'search')}
          onTogglePreview={() => showPreview ? closePanel() : openPreview()}
          onToggleShortcuts={() => openOverlay(showShortcuts ? null : 'shortcuts')}
          onOpenTemplates={() => openOverlay('templates')}
          onAddSticky={() => addNode('sticky')}
          onOpenNodeSheet={openNodeSheet}
          onToggleChatSheet={() => chatSheetOpen ? closeChatSheet() : openChatSheet()}
          showSearch={showSearch}
          showPreview={showPreview}
          flowName={currentFlow?.name}
          isPublished={currentFlow?.is_published}
          publishedChatType={currentFlow?.chat_type}
        />

        {chatSheetOpen && (
          <ChatTypeSheet
            chatType={chatType}
            isPublished={currentFlow?.is_published}
            publishedChatType={currentFlow?.chat_type}
            isMobile={isMobile}
            onClose={closeChatSheet}
          />
        )}

        {showSearch && (
          <SearchOverlay
            query={searchQuery}
            results={searchResults}
            onChange={() => {}}
            onSelect={n => selectNode(n)}
            onClose={closeOverlay}
          />
        )}

        {showShortcuts && <ShortcutsPopup onClose={closeOverlay} />}

        {/* Canvas */}
        <div className="flex-1" onDragOver={e => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChangeWrapped}
            onEdgesChange={onEdgesChangeWrapped}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd as any}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd as any}
            reconnectRadius={20}
            connectionRadius={40}
            connectOnClick
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => { closePanel(); selectNode(node) }}
            onNodeDoubleClick={(_, node) => {
              setNodes(ns => ns.map(n =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, collapsed: !(n.data as any).collapsed } }
                  : n
              ))
            }}
            onPaneClick={() => { selectNode(null); closeOverlay() }}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            snapToGrid
            snapGrid={[16, 16]}
            style={{ background: '#17212b' }}
            defaultEdgeOptions={{ type: 'custom' }}
            deleteKeyCode={['Delete', 'Backspace']}
            multiSelectionKeyCode="Shift"
            elevateNodesOnSelect
          >
            <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.04)" gap={32} />
            <Controls
              showInteractive={false}
              className="!bg-tg-card !border-tg-darkborder !rounded-xl [&>button]:!bg-tg-card [&>button]:!border-tg-darkborder [&>button]:!text-tg-label [&>button:hover]:!bg-tg-elevated"
            />
            <MiniMap
              nodeColor={n => {
                const t = (n.data as any)?.nodeType || n.type
                const c: Record<string, string> = {
                  handler: '#8b5cf6', command: '#27ae60', start: '#27ae60',
                  message: '#2481cc', button: '#8e44ad', input: '#f39c12',
                  condition: '#e67e22', delay: '#4a6278', ai: '#e91e8c',
                  api_call: '#00bcd4', end: '#e53935', sticky: '#f39c12',
                }
                return c[t] || '#2b3a4a'
              }}
              maskColor="rgba(13,17,23,0.85)"
              style={{ background: '#17212b', border: '1px solid #1e2d3d', borderRadius: 10, width: 180, height: 110 }}
              pannable
              zoomable
            />
            {nodes.length === 0 && (
              <Panel position="top-center">
                <CanvasEmptyState onAddNode={addNode} onOpenTemplates={() => openOverlay('templates')} />
              </Panel>
            )}
          </ReactFlow>

          {quickAdd && (
            <QuickAddMenu
              screenPos={quickAdd.screenPos}
              onSelect={addAndConnect}
              onClose={closeOverlay}
            />
          )}
        </div>
      </div>

      {/* Right panel */}
      {showPreview ? (
        isMobile ? (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={closePanel}>
            <div className="absolute bottom-0 left-0 right-0 h-sheet-75 sheet-transition bg-tg-bg rounded-t-[20px] overflow-hidden border border-tg-input border-b-0" onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 bg-[#1e2638] rounded-sm mx-auto mt-[10px]" />
              <PreviewPanel nodes={nodes} edges={edges} onClose={closePanel} />
            </div>
          </div>
        ) : (
          <PreviewPanel nodes={nodes} edges={edges} onClose={closePanel} />
        )
      ) : selectedNode ? (
        isMobile ? (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[6px] flex items-center justify-center p-4" onClick={() => selectNode(null)}>
            <div className="animate-modal-in w-full max-w-[400px] max-h-sheet bg-tg-bg rounded-3xl overflow-hidden flex flex-col border border-tg-input shadow-[0_24px_60px_rgba(0,0,0,0.6)]" onClick={e => e.stopPropagation()}>
              <NodePanel node={selectedNode} onClose={() => selectNode(null)} onUpdate={config => updateNodeConfig(selectedNode.id, config)} chatType={chatType} fullWidth />
            </div>
          </div>
        ) : (
          <NodePanel node={selectedNode} onClose={() => selectNode(null)} onUpdate={config => updateNodeConfig(selectedNode.id, config)} chatType={chatType} />
        )
      ) : null}

      {/* Mobile node palette sheet */}
      {isMobile && nodeSheetOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={closeNodeSheet}>
          <div className="absolute bottom-0 left-0 right-0 h-sheet-80 sheet-transition bg-tg-bg rounded-t-[20px] overflow-hidden flex flex-col border border-tg-input border-b-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-[10px] border-b border-tg-input shrink-0 relative">
              <div className="w-9 h-1 bg-[#1e2638] rounded-sm absolute top-2 left-1/2 -translate-x-1/2" />
              <span className="text-[13px] font-bold text-white mt-1.5">Node qo'shish</span>
              <button onClick={closeNodeSheet} className="bg-tg-card border border-tg-input rounded-lg w-7 h-7 flex items-center justify-center cursor-pointer text-tg-label mt-1">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto touch-scroll">
              <Sidebar onAddNode={(t, s) => { addNode(t, s); closeNodeSheet() }} chatType={chatType} sheet />
            </div>
          </div>
        </div>
      )}

      {showTemplates && (
        <TemplatesModal onClose={closeOverlay} onSelect={loadTemplate} />
      )}
    </div>
  )
}

export default function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}
