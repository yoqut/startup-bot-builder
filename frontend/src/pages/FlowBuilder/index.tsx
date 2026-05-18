import { useEffect, useCallback, useState, useRef } from 'react'
import { useMobile } from '@/hooks/useMobile'
import { useParams, useSearchParams } from 'react-router-dom'
import { useStore } from 'zustand'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  type Connection, type Node, type Edge,
  BackgroundVariant, MarkerType, Panel,
  type NodeChange, type EdgeChange,
} from '@xyflow/react'
import { useCanvasStore } from '@/store/canvas.store'
import '@xyflow/react/dist/style.css'
import {
  Save, Eye, EyeOff, Zap, Undo2, Redo2, Search,
  X, AlertCircle, AlertTriangle, CheckCircle2, Keyboard, Loader2,
  StickyNote, Layers, User, Users, Radio, Briefcase, Trash2,
} from 'lucide-react'
import { toast } from '@/store/toast.store'
import { confirm } from '@/store/confirm.store'
import type { FlowChatType } from '@/types/flow'
import { useFlowStore } from '@/store/flow.store'
import { botsApi } from '@/api/bots'
import NodePanel from './NodePanel'
import Sidebar from './Sidebar'
import PreviewPanel from './PreviewPanel'
import TemplatesModal from './TemplatesModal'
import type { FlowTemplate } from './templates'
import {
  StartNode, CommandNode, HandlerNode, MessageNode, ButtonNode,
  InputNode, ConditionNode, DelayNode, ApiCallNode, AiNode,
  SetVariableNode, EndNode, StickyNoteNode, AutoDeleteNode, SendToNode,
  BusinessHandlerNode,
} from '@/components/flow/nodes/CustomNode'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ValidationError {
  nodeId: string
  severity: 'error' | 'warning'
  message: string
}
interface QuickAddMenu {
  screenPos: { x: number; y: number }
  flowPos: { x: number; y: number }
  fromNodeId?: string
  fromHandle?: string
}

// ── Node types (stable — outside component) ───────────────────────────────────
const nodeTypes = {
  start:        StartNode,
  command:      CommandNode,
  handler:      HandlerNode,
  message:      MessageNode,
  button:       ButtonNode,
  input:        InputNode,
  condition:    ConditionNode,
  delay:        DelayNode,
  api_call:     ApiCallNode,
  ai:           AiNode,
  set_variable: SetVariableNode,
  auto_delete:      AutoDeleteNode,
  send_to:          SendToNode,
  business_handler: BusinessHandlerNode,
  end:              EndNode,
  sticky:           StickyNoteNode,
}

// ── Edge color by handle ──────────────────────────────────────────────────────
function edgeColor(handle: string | null | undefined): string {
  if (handle === 'true')  return '#10b981'
  if (handle === 'false') return '#ef4444'
  if (handle?.startsWith('btn_')) return '#3b82f6'
  return '#475569'
}

// ── Flow validation ───────────────────────────────────────────────────────────
function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = []
  const sourceSet = new Set(edges.map(e => e.source))
  const targetSet = new Set(edges.map(e => e.target))

  for (const node of nodes) {
    const cfg = (node.data.config as Record<string, unknown>) || {}
    const type = ((node.data.nodeType as string) || node.type || '')

    if (type === 'sticky') continue

    const hasOut = sourceSet.has(node.id)
    const hasIn  = targetSet.has(node.id)

    if (['handler', 'command', 'start'].includes(type) && !hasOut)
      errors.push({ nodeId: node.id, severity: 'error', message: "Trigger hech narsaga ulanmagan" })

    if (type === 'message' && !cfg.text && cfg.message_type === 'text')
      errors.push({ nodeId: node.id, severity: 'warning', message: "Xabar matni bo'sh" })

    if (type === 'input' && !cfg.variable_name)
      errors.push({ nodeId: node.id, severity: 'error', message: "O'zgaruvchi nomi kiritilmagan" })

    if (type === 'condition') {
      const out = edges.filter(e => e.source === node.id)
      const hasTrue  = out.some(e => e.sourceHandle === 'true')
      const hasFalse = out.some(e => e.sourceHandle === 'false')
      if (!hasTrue || !hasFalse)
        errors.push({ nodeId: node.id, severity: 'warning', message: "Shart to'liq ulanmagan (true/false kerak)" })
    }

    if (!['handler','command','start','sticky'].includes(type) && !hasIn)
      errors.push({ nodeId: node.id, severity: 'warning', message: "Hech narsa bu nodega ulanmagan" })
  }

  return errors
}

// ── Quick-add node list ───────────────────────────────────────────────────────
const QUICK_ADD_NODES = [
  { type: 'message',      label: 'Xabar',           color: 'text-blue-400' },
  { type: 'button',       label: 'Tugmalar',         color: 'text-indigo-400' },
  { type: 'input',        label: 'Kiritish',         color: 'text-yellow-400' },
  { type: 'condition',    label: 'Shart',            color: 'text-orange-400' },
  { type: 'delay',        label: 'Kutish',           color: 'text-slate-400' },
  { type: 'auto_delete',  label: "Xabar o'chirish",  color: 'text-rose-400' },
  { type: 'send_to',      label: 'ID ga yuborish',   color: 'text-teal-400' },
  { type: 'set_variable', label: "O'zgaruvchi",      color: 'text-purple-400' },
  { type: 'api_call',     label: 'API Call',         color: 'text-cyan-400' },
  { type: 'ai',           label: 'AI',               color: 'text-pink-400' },
  { type: 'end',          label: 'Tugash',           color: 'text-red-400' },
]

// ── Default node config factory ───────────────────────────────────────────────
function makeConfig(type: string, subtype = ''): Record<string, unknown> {
  switch (type) {
    case 'handler':          return { trigger: subtype || 'any', conditions: [], condition_mode: 'any', commands: ['/start'], save_as: '' }
    case 'business_handler': return { trigger: subtype || 'any', sender_type: 'customer', conditions: [], condition_mode: 'any', commands: ['/start'], save_as: '', connection_filter: '' }
    case 'command':      return { command: subtype || '/start', description: '' }
    case 'button':       return { text: '', buttons: [], button_layout: 'inline' }
    case 'message':      return { message_type: 'text', text: '', buttons: [], button_layout: 'inline' }
    case 'input':        return { prompt: '', variable_name: '', validation: 'text' }
    case 'condition':    return { variable: '', operator: 'equals', value: '' }
    case 'delay':        return { seconds: 3, typing_action: true }
    case 'api_call':     return { method: 'GET', url: '', response_variable: 'api_result' }
    case 'ai':           return { model: 'claude-opus-4-7', system_prompt: '', response_variable: 'ai_reply' }
    case 'set_variable': return { assignments: [{ variable: '', value: '' }] }
    case 'auto_delete':  return { seconds: 10, message_id_var: 'last_message_id' }
    case 'send_to':      return { chat_id: '', message_type: 'text', text: '', parse_mode: 'HTML' }
    case 'sticky':       return { text: '', color: 'yellow' }
    default:             return {}
  }
}

// ── Inner canvas (needs ReactFlow context) ────────────────────────────────────
const CHAT_TABS: { key: FlowChatType; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'user',     label: 'User',     icon: User,      color: 'text-blue-400'   },
  { key: 'group',    label: 'Guruh',    icon: Users,     color: 'text-green-400'  },
  { key: 'channel',  label: 'Channel',  icon: Radio,     color: 'text-orange-400' },
  { key: 'business', label: 'Business', icon: Briefcase, color: 'text-indigo-400' },
]

/* ── Toolbar button ──────────────────────────────────────────────────────── */
function TlBtn({ onClick, children, disabled, active }: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center gap-1 bg-tg-card border border-tg-input rounded-lg py-[7px] px-[9px] text-xs cursor-pointer transition-all duration-150 min-w-8 whitespace-nowrap',
        active
          ? 'bg-tg-accent/15 text-tg-accent border-tg-accent/35'
          : 'text-tg-label',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function FlowCanvas() {
  const { botId } = useParams<{ botId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const chatType = (searchParams.get('type') as FlowChatType) || 'user'

  const { currentFlow, loadCanvas, saveFlow, publishFlow, updateNodes, updateEdges } = useFlowStore()
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const isMobile = useMobile()
  const [showNodeSheet, setShowNodeSheet] = useState(false) // mobile node palette

  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showPreview,  setShowPreview]  = useState(false)
  const [saveStatus,   setSaveStatus]   = useState<'idle'|'saving'|'saved'>('idle')
  const [publishing,   setPublishing]   = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showSearch,   setShowSearch]   = useState(false)
  const [quickAdd,     setQuickAdd]     = useState<QuickAddMenu | null>(null)
  const [validation,   setValidation]   = useState<ValidationError[] | null>(null)
  const [showShortcuts,setShowShortcuts]= useState(false)
  const [errNodeIds,   setErrNodeIds]   = useState<Set<string>>(new Set())
  const [showTemplates,setShowTemplates]= useState(false)
  const [showChatSheet,setShowChatSheet]= useState(false)

  // ── History (undo/redo) via zundo ─────────────────────────────────────────
  const suppressPush = useRef(false)
  const canUndo = useStore(useCanvasStore.temporal, s => s.pastStates.length > 0)
  const canRedo = useStore(useCanvasStore.temporal, s => s.futureStates.length > 0)

  const pushSnapshot = useCallback((ns: Node[], es: Edge[]) => {
    if (suppressPush.current) return
    useCanvasStore.getState().push(ns, es)
  }, [])

  const undo = useCallback(() => {
    suppressPush.current = true
    useCanvasStore.temporal.getState().undo()
    const { nodes: ns, edges: es } = useCanvasStore.getState()
    setNodes([...ns])
    setEdges([...es])
    requestAnimationFrame(() => { suppressPush.current = false })
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    suppressPush.current = true
    useCanvasStore.temporal.getState().redo()
    const { nodes: ns, edges: es } = useCanvasStore.getState()
    setNodes([...ns])
    setEdges([...es])
    requestAnimationFrame(() => { suppressPush.current = false })
  }, [setNodes, setEdges])

  // ── Auto-save (debounced 30 s) ────────────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const scheduleAutoSave = useCallback(() => {
    setIsDirty(true)
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const ns = getNodes(); const es = getEdges()
      updateNodes(ns.map(n => ({ id: n.id, type: (n.type || n.data.nodeType) as any, label: n.data.label as string, position_x: n.position.x, position_y: n.position.y, config: (n.data.config as any) || {} })))
      updateEdges(es.map(e => ({ id: e.id, source_node_id: e.source, target_node_id: e.target, label: (e.label as string) || null, condition_key: e.sourceHandle || null })))
      setSaveStatus('saving')
      await saveFlow().catch(() => {})
      setSaveStatus('saved')
      setIsDirty(false)
      setLastSaved(new Date())
      setTimeout(() => setSaveStatus('idle'), 3000)
    }, 30_000)
  }, [getNodes, getEdges, updateNodes, updateEdges, saveFlow])

  // ── Disable Telegram swipe-to-close while in Flow Builder ────────────────
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    tg?.disableVerticalSwipes?.()
    tg?.setHeaderColor?.('#17212b')
    return () => { tg?.enableVerticalSwipes?.() }
  }, [])

  // ── Load flow by botId + chatType ─────────────────────────────────────────
  useEffect(() => {
    if (botId) loadCanvas(botId, chatType)
  }, [botId, chatType, loadCanvas])

  useEffect(() => {
    if (!currentFlow) return
    let ns: Node[] = currentFlow.nodes.map(n => ({
      id: n.id,
      type: n.type in nodeTypes ? n.type : 'message',
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.label || n.type, config: n.config, nodeType: n.type },
    }))
    const es: Edge[] = currentFlow.edges.map(e => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: e.condition_key || undefined,
      type: 'smoothstep',
      style: { stroke: edgeColor(e.condition_key), strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor(e.condition_key) },
      label: e.condition_key === 'true' ? '✓' : e.condition_key === 'false' ? '✗' : undefined,
      labelStyle: { fill: edgeColor(e.condition_key), fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a' },
    }))

    // New empty flow — place a default Handler node at canvas center
    if (ns.length === 0) {
      ns = [{
        id: crypto.randomUUID(),
        type: 'handler',
        position: { x: 260, y: 160 },
        data: { label: 'Handler', nodeType: 'handler', config: makeConfig('handler') },
      }]
      setTimeout(() => scheduleAutoSave(), 0)
    }

    // Init canvas store with loaded snapshot; clear temporal history
    suppressPush.current = true
    useCanvasStore.setState({ nodes: ns, edges: es })
    useCanvasStore.temporal.getState().clear()
    setNodes(ns)
    setEdges(es)
    requestAnimationFrame(() => { suppressPush.current = false })
  }, [currentFlow?.id])

  // ── Connect ───────────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    const color = edgeColor(params.sourceHandle)
    const edge: Edge = {
      ...params,
      id: crypto.randomUUID(),
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      label: params.sourceHandle === 'true' ? '✓' : params.sourceHandle === 'false' ? '✗' : undefined,
      labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#0f172a' },
    }
    setEdges(eds => {
      const next = addEdge(edge, eds)
      pushSnapshot(getNodes(), next)
      return next
    })
  }, [setEdges, pushSnapshot, getNodes])

  // Drop edge onto empty canvas → quick-add
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: Record<string, any> | null) => {
    if (!state || state.isValid !== false) return
    const x = 'clientX' in event ? (event as MouseEvent).clientX : (event as TouchEvent).touches[0].clientX
    const y = 'clientY' in event ? (event as MouseEvent).clientY : (event as TouchEvent).touches[0].clientY
    setQuickAdd({
      screenPos: { x, y },
      flowPos: screenToFlowPosition({ x, y }),
      fromNodeId: state.fromNode?.id,
      fromHandle: state.fromHandle?.id,
    })
  }, [screenToFlowPosition])

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id))
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
    setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
    scheduleAutoSave()
  }, [selectedNode, setNodes, setEdges, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  // ── Node changes (track history on stop-drag + delete) ────────────────────
  const onNodesChangeWrapped = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes)
    const hasDelete = changes.some(c => c.type === 'remove')
    if (hasDelete) {
      setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
      scheduleAutoSave()
    }
  }, [onNodesChange, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  const onEdgesChangeWrapped = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes)
    const hasDelete = changes.some(c => c.type === 'remove')
    if (hasDelete) {
      setTimeout(() => pushSnapshot(getNodes(), getEdges()), 0)
      scheduleAutoSave()
    }
  }, [onEdgesChange, pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  const onNodeDragStop = useCallback(() => {
    pushSnapshot(getNodes(), getEdges())
    scheduleAutoSave()
  }, [pushSnapshot, getNodes, getEdges, scheduleAutoSave])

  // ── Add node ──────────────────────────────────────────────────────────────
  const addNode = useCallback((type: string, subtype = '', position?: { x: number; y: number }) => {
    const id = crypto.randomUUID()
    const cfg = makeConfig(type, subtype)
    const newNode: Node = {
      id,
      type: type in nodeTypes ? type : 'message',
      position: position || { x: 260 + Math.random() * 80, y: 80 + getNodes().length * 130 },
      data: { label: subtype || type, config: cfg, nodeType: type },
    }
    setNodes(ns => {
      const next = [...ns, newNode]
      pushSnapshot(next, getEdges())
      return next
    })
    scheduleAutoSave()
    return id
  }, [setNodes, getNodes, getEdges, pushSnapshot, scheduleAutoSave])

  // ── Quick-add connect ─────────────────────────────────────────────────────
  const addAndConnect = useCallback((type: string) => {
    if (!quickAdd) return
    const newId = addNode(type, '', quickAdd.flowPos)
    if (quickAdd.fromNodeId) {
      const color = edgeColor(quickAdd.fromHandle)
      const edge: Edge = {
        id: crypto.randomUUID(),
        source: quickAdd.fromNodeId,
        target: newId,
        sourceHandle: quickAdd.fromHandle,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      }
      setEdges(es => [...es, edge])
    }
    setQuickAdd(null)
  }, [quickAdd, addNode, setEdges])

  // ── Drag-from-sidebar drop ────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('nodeType')
    if (!raw) return
    const [type, subtype] = raw.split(':')
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type, subtype, pos)
  }, [screenToFlowPosition, addNode])

  // ── Save / Publish ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const ns = getNodes(); const es = getEdges()
    updateNodes(ns.map(n => ({ id: n.id, type: (n.type || n.data.nodeType) as any, label: n.data.label as string, position_x: n.position.x, position_y: n.position.y, config: (n.data.config as any) || {} })))
    updateEdges(es.map(e => ({ id: e.id, source_node_id: e.source, target_node_id: e.target, label: (e.label as string) || null, condition_key: e.sourceHandle || null })))
    setSaveStatus('saving')
    try {
      await saveFlow()
      setSaveStatus('saved')
      setIsDirty(false)
      setLastSaved(new Date())
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('idle')
      toast.error(`Saqlashda xatolik: ${err?.response?.data?.detail || err?.message || 'Noma\'lum xato'}`)
    }
  }, [getNodes, getEdges, updateNodes, updateEdges, saveFlow])

  const handlePublish = useCallback(async () => {
    const ns = getNodes(); const es = getEdges()
    const errors = validateFlow(ns, es)
    setErrNodeIds(new Set(errors.map(e => e.nodeId)))
    if (errors.length > 0) {
      setValidation(errors)
      return
    }
    setPublishing(true)
    try {
      await handleSave()
      await publishFlow()
      if (currentFlow?.bot_id) { try { await botsApi.activate(currentFlow.bot_id) } catch {} }
    } finally {
      setPublishing(false)
    }
  }, [getNodes, getEdges, handleSave, publishFlow, currentFlow])

  const loadTemplate = useCallback(async (template: FlowTemplate) => {
    const ok = await confirm({
      message: `"${template.name}" shablonini yuklash`,
      description: "Mavjud flow o'chiriladi. Davom etasizmi?",
      confirmLabel: 'Yuklash',
      danger: true,
    })
    if (!ok) return
    const ns = template.nodes as Node[]
    const es = template.edges as Edge[]
    suppressPush.current = true
    useCanvasStore.setState({ nodes: ns, edges: es })
    useCanvasStore.temporal.getState().clear()
    setNodes(ns)
    setEdges(es)
    requestAnimationFrame(() => { suppressPush.current = false })
    setShowTemplates(false)
  }, [setNodes, setEdges])

  const confirmPublish = useCallback(async () => {
    setValidation(null)
    setPublishing(true)
    try {
      await handleSave()
      await publishFlow()
      if (currentFlow?.bot_id) { try { await botsApi.activate(currentFlow.bot_id) } catch {} }
      toast.success('Flow muvaffaqiyatli nashr etildi!')
      setPublishSuccess(true)
      setTimeout(() => setPublishSuccess(false), 2000)
    } catch (err: any) {
      toast.error(`Nashr xatosi: ${err?.response?.data?.detail || err?.message || 'Noma\'lum xato'}`)
    } finally {
      setPublishing(false)
    }
  }, [handleSave, publishFlow, currentFlow])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (mod && e.key === 's') { e.preventDefault(); handleSave() }
      if (mod && e.key === 'f') { e.preventDefault(); setShowSearch(v => !v) }
      if (e.key === '?' && !mod && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setShowShortcuts(v => !v) }
      if (e.key === 'Escape') { setQuickAdd(null); setShowSearch(false); setShowShortcuts(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, handleSave])

  // ── Node update ───────────────────────────────────────────────────────────
  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes(ns => {
      const next = ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n)
      pushSnapshot(next, getEdges())
      return next
    })
    setSelectedNode(prev => prev?.id === nodeId ? { ...prev, data: { ...prev.data, config } } : prev)
    scheduleAutoSave()
  }, [setNodes, getEdges, pushSnapshot, scheduleAutoSave])

  // ── Search ────────────────────────────────────────────────────────────────
  const searchResults = searchQuery.trim()
    ? nodes.filter(n => {
        const cfg = n.data.config as any
        const label = (n.data.label as string || '').toLowerCase()
        const text = (cfg?.text || cfg?.command || cfg?.prompt || '').toLowerCase()
        return label.includes(searchQuery.toLowerCase()) || text.includes(searchQuery.toLowerCase())
      })
    : []

  // ── Save status label ─────────────────────────────────────────────────────
  function SaveLabel() {
    if (saveStatus === 'saving') return <span className="text-[10px] text-tg-muted">Saqlanmoqda…</span>
    if (saveStatus === 'saved')  return <span className="text-[10px] text-green-500">✓ Saqlandi</span>
    if (isDirty) return <span className="text-[10px] text-amber-400">● O'zgartirilgan</span>
    if (lastSaved) return <span className="text-[10px] text-tg-muted">{Math.round((Date.now() - lastSaved.getTime()) / 60000) || '<1'} daq oldin</span>
    return null
  }

  return (
    <div className={`flex overflow-hidden h-canvas ${isMobile ? '-m-4' : '-m-6'}`}>
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar onAddNode={addNode} chatType={chatType} />}

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* ── Single combined toolbar ──────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 bg-tg-bg border-b border-tg-darkborder shrink-0 h-[52px]">
          {/* Flow name + dirty indicator */}
          <div className="flex items-center gap-1.5 min-w-0 flex-[0_1_auto] overflow-hidden">
            <span className={`text-[13px] font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap ${isMobile ? 'max-w-[80px]' : 'max-w-[140px]'}`}>
              {currentFlow?.name || 'Flow'}
            </span>
            <SaveLabel />
          </div>

          {/* Chat type pill — tap to change */}
          {(() => {
            const tab = CHAT_TABS.find(t => t.key === chatType) || CHAT_TABS[0]
            const Icon = tab.icon
            return (
              <button
                onClick={() => setShowChatSheet(v => !v)}
                className="flex items-center gap-[5px] bg-tg-card border border-tg-input rounded-lg py-[5px] px-[9px] text-tg-label text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Icon size={12} />{tab.label}
                {currentFlow?.is_published && <span className="w-[5px] h-[5px] rounded-full bg-[#4cd137] shrink-0" />}
              </button>
            )
          })()}

          <div className="flex-1" />

          {/* Mobile: Nodes */}
          {isMobile && (
            <TlBtn onClick={() => setShowNodeSheet(true)}>
              <Layers size={13} />
            </TlBtn>
          )}

          {/* Desktop extras */}
          {!isMobile && (
            <>
              <div className="flex items-center border border-tg-input rounded-lg overflow-hidden">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className={`flex items-center justify-center bg-tg-card border-none rounded-none py-[7px] px-[9px] text-tg-label cursor-pointer transition-all duration-150 ${canUndo ? 'opacity-100' : 'opacity-30'}`}
                >
                  <Undo2 size={13} />
                </button>
                <div className="w-px h-4 bg-tg-input" />
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className={`flex items-center justify-center bg-tg-card border-none rounded-none py-[7px] px-[9px] text-tg-label cursor-pointer transition-all duration-150 ${canRedo ? 'opacity-100' : 'opacity-30'}`}
                >
                  <Redo2 size={13} />
                </button>
              </div>
              <button
                onClick={() => setShowSearch(v => !v)}
                className={`flex items-center justify-center bg-tg-card border rounded-lg py-[7px] px-[9px] text-xs cursor-pointer transition-all duration-150 min-w-8 ${showSearch ? 'bg-tg-accent/15 text-tg-accent border-tg-accent/30' : 'border-tg-input text-tg-label'}`}
              >
                <Search size={13} />
              </button>
              <button
                onClick={() => addNode('sticky', '')}
                className="flex items-center justify-center bg-tg-card border border-tg-input rounded-lg py-[7px] px-[9px] text-tg-label text-xs cursor-pointer transition-all duration-150 min-w-8"
              >
                <StickyNote size={13} />
              </button>
              <TlBtn onClick={() => setShowTemplates(true)}><Layers size={13} /></TlBtn>
            </>
          )}

          {/* Preview */}
          <TlBtn onClick={() => { setShowPreview(v => !v); setSelectedNode(null) }} active={showPreview}>
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          </TlBtn>

          {/* Save */}
          <TlBtn onClick={handleSave} disabled={saveStatus === 'saving'}>
            <Save size={13} />
          </TlBtn>

          {/* Publish */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={[
              'flex items-center gap-[5px] border-none rounded-lg py-[7px] px-3 text-white text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
              publishSuccess
                ? 'bg-green-600 hover:bg-green-600'
                : 'bg-tg-accent hover:bg-tg-accent/90',
            ].join(' ')}
          >
            {publishing
              ? <Loader2 size={13} className="animate-spin" />
              : publishSuccess
                ? <CheckCircle2 size={13} />
                : <Zap size={13} />
            }
            {publishing ? '…' : publishSuccess ? 'Nashr qilindi' : 'Nashr'}
          </button>

          {!isMobile && (
            <button
              onClick={() => setShowShortcuts(v => !v)}
              className="flex items-center justify-center bg-tg-card border border-tg-input rounded-lg py-[7px] px-[9px] text-tg-label text-xs cursor-pointer transition-all duration-150 min-w-8"
            >
              <Keyboard size={13} />
            </button>
          )}
        </div>

        {/* ── Chat type selector sheet ─────────────────────────────────────── */}
        {showChatSheet && (
          <div
            className={`absolute top-[52px] z-[9000] bg-tg-bg border border-tg-input rounded-xl overflow-hidden min-w-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${isMobile ? 'left-20' : 'left-[180px]'}`}
            onClick={() => setShowChatSheet(false)}
          >
            {CHAT_TABS.map(tab => {
              const Icon = tab.icon
              const active = chatType === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setSearchParams({ type: tab.key }); setShowChatSheet(false) }}
                  className={[
                    'w-full flex items-center gap-[10px] px-[14px] py-[10px] border-none cursor-pointer text-left text-[13px]',
                    active
                      ? 'bg-tg-accent/[0.12] text-tg-accent border-l-2 border-tg-accent'
                      : 'bg-transparent text-white border-l-2 border-transparent',
                  ].join(' ')}
                >
                  <Icon size={14} />
                  {tab.label}
                  {currentFlow?.chat_type === tab.key && currentFlow.is_published && (
                    <span className="w-[5px] h-[5px] rounded-full bg-[#4cd137] ml-auto shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Search overlay ───────────────────────────────────────────────── */}
        {showSearch && (
          <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-[9000] w-[280px] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-[10px] border-b border-tg-input">
              <Search size={13} color="#4a6278" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Node qidirish…"
                className="flex-1 bg-transparent border-none text-white text-[13px] outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="bg-transparent border-none cursor-pointer text-tg-muted">
                  <X size={12} />
                </button>
              )}
            </div>
            {searchResults.length > 0 ? (
              <div className="max-h-[180px] overflow-y-auto">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setSelectedNode(n); setShowSearch(false); setSearchQuery('') }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors duration-100 hover:bg-tg-card"
                  >
                    <span className="text-[9px] text-tg-muted uppercase font-bold w-[50px] shrink-0">{n.data.nodeType as string}</span>
                    <span className="text-[12px] text-white overflow-hidden text-ellipsis whitespace-nowrap">{(n.data.config as any)?.text || (n.data.config as any)?.command || n.data.label as string}</span>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="p-[14px] text-[12px] text-tg-muted text-center">Hech narsa topilmadi</div>
            ) : null}
          </div>
        )}

        {/* ── Keyboard shortcuts popup ─────────────────────────────────────── */}
        {showShortcuts && (
          <div className="absolute top-[60px] right-3 z-[9000] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-[14px_16px] w-[240px]">
            <div className="flex items-center justify-between mb-[10px]">
              <span className="text-[12px] font-bold text-white">Klaviatura yorliqlari</span>
              <button onClick={() => setShowShortcuts(false)} className="bg-transparent border-none cursor-pointer text-tg-muted"><X size={12} /></button>
            </div>
            <div className="text-[9px] text-tg-muted uppercase tracking-[0.1em] font-bold mb-[6px]">Tahrirlash</div>
            {[
              ['Ctrl+Z', 'Bekor qilish'],
              ['Ctrl+Shift+Z', 'Qaytarish'],
              ['Ctrl+S', 'Saqlash'],
              ['Delete', "Noda o'chirish"],
            ].map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between py-[4px]">
                <span className="text-[11px] text-tg-label">{lbl}</span>
                <kbd className="text-[10px] bg-tg-card border border-tg-input rounded-[5px] px-[6px] py-[2px] text-tg-label font-mono">{key}</kbd>
              </div>
            ))}
            <div className="text-[9px] text-tg-muted uppercase tracking-[0.1em] font-bold mt-[10px] mb-[6px]">Navigation</div>
            {[
              ['Ctrl+F', 'Node qidirish'],
              ['Scroll', 'Zoom in/out'],
              ['Space+Drag', 'Canvas siljitish'],
            ].map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between py-[4px]">
                <span className="text-[11px] text-tg-label">{lbl}</span>
                <kbd className="text-[10px] bg-tg-card border border-tg-input rounded-[5px] px-[6px] py-[2px] text-tg-label font-mono">{key}</kbd>
              </div>
            ))}
            <div className="text-[9px] text-tg-muted uppercase tracking-[0.1em] font-bold mt-[10px] mb-[6px]">Boshqaruv</div>
            {[
              ['Shift+Click', "Ko'p noda tanlash"],
              ['?', "Yordam ko'rsatish"],
              ['Esc', 'Yopish/Bekor qilish'],
            ].map(([key, lbl]) => (
              <div key={key} className="flex items-center justify-between py-[4px]">
                <span className="text-[11px] text-tg-label">{lbl}</span>
                <kbd className="text-[10px] bg-tg-card border border-tg-input rounded-[5px] px-[6px] py-[2px] text-tg-label font-mono">{key}</kbd>
              </div>
            ))}
          </div>
        )}

        {/* ── Canvas ───────────────────────────────────────────────────────── */}
        <div
          className="flex-1"
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes.map(n => ({
              ...n,
              style: errNodeIds.has(n.id) ? { outline: '2px solid rgba(239,68,68,0.6)', borderRadius: 12 } : undefined,
            }))}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChangeWrapped}
            onEdgesChange={onEdgesChangeWrapped}
            onConnect={onConnect}
            onConnectEnd={onConnectEnd as any}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => { setShowPreview(false); setSelectedNode(node) }}
            onPaneClick={() => { setSelectedNode(null); setQuickAdd(null) }}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            style={{ background: '#17212b' }}
            defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#2b3a4a', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } }}
            deleteKeyCode={['Delete', 'Backspace']}
            multiSelectionKeyCode="Shift"
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(36,129,204,0.08)" gap={24} size={1.2} />
            <Controls
              showInteractive={false}
              className="!bg-[#17212b] !border-[#1e2d3d] !rounded-xl [&>button]:!bg-[#17212b] [&>button]:!border-[#1e2d3d] [&>button]:!text-[#7d9ab5] [&>button:hover]:!bg-[#242f3d]"
            />
            <MiniMap
              nodeColor={n => {
                const t = (n.data as any)?.nodeType || n.type
                const c: Record<string,string> = { handler:'#2481cc', command:'#27ae60', message:'#2481cc', button:'#8e44ad', input:'#f39c12', condition:'#e67e22', delay:'#4a6278', ai:'#e91e8c', api_call:'#00bcd4', end:'#e53935', sticky:'#f39c12' }
                return c[t] || '#2b3a4a'
              }}
              maskColor="rgba(13,17,23,0.8)"
              style={{ background: '#17212b', border: '1px solid #1e2d3d', borderRadius: 8, width: 160, height: 100 }}
            />
            {/* Empty canvas hint */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="flex flex-col items-center gap-3 pointer-events-none select-none mt-[140px]">
                  <div className="w-[52px] h-[52px] rounded-[14px] bg-tg-accent/[0.08] border border-tg-accent/15 flex items-center justify-center">
                    <Zap size={22} color="rgba(36,129,204,0.5)" />
                  </div>
                  <p className="text-tg-label text-[14px] font-semibold m-0">Flow bo'sh</p>
                  <p className="text-tg-muted text-[12px] m-0">Chapdan node torting yoki bosing</p>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* ── Quick-add menu ─────────────────────────────────────────────── */}
          {quickAdd && (
            <div
              className="fixed z-[9000] bg-tg-bg border border-tg-input rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] pb-1 w-[160px]"
              style={{
                left: quickAdd.screenPos.x,
                top: quickAdd.screenPos.y,
                transform: 'translate(-50%, 8px)',
              }}
            >
              <div className="px-3 pt-2 pb-1.5 text-[10px] text-tg-muted uppercase tracking-[0.08em] font-bold border-b border-tg-input mb-1">
                Node qo'shish
              </div>
              {QUICK_ADD_NODES.map(n => (
                <button
                  key={n.type}
                  onClick={() => addAndConnect(n.type)}
                  className="w-full flex items-center px-3 py-[7px] text-[12px] font-medium bg-transparent border-none cursor-pointer text-tg-label text-left transition-colors duration-100 hover:bg-tg-card hover:text-white"
                >
                  {n.label}
                </button>
              ))}
              <button
                onClick={() => setQuickAdd(null)}
                className="w-full px-3 py-1.5 text-[10px] text-tg-muted bg-transparent border-none border-t border-tg-input cursor-pointer text-left mt-1"
              >
                Bekor qilish (Esc)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel (desktop) / Bottom sheet (mobile) ───────────────────── */}
      {showPreview ? (
        isMobile ? (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 h-sheet-75 sheet-transition bg-tg-bg rounded-t-[20px] overflow-hidden border border-tg-input border-b-0"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-9 h-1 bg-[#1e2638] rounded-sm mx-auto mt-[10px]" />
              <PreviewPanel nodes={nodes} edges={edges} onClose={() => setShowPreview(false)} />
            </div>
          </div>
        ) : (
          <PreviewPanel nodes={nodes} edges={edges} onClose={() => setShowPreview(false)} />
        )
      ) : selectedNode ? (
        isMobile ? (
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[6px] flex items-center justify-center p-4"
            onClick={() => setSelectedNode(null)}
          >
            <div
              className="animate-modal-in w-full max-w-[400px] max-h-sheet bg-tg-bg rounded-3xl overflow-hidden flex flex-col border border-tg-input shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header with delete */}
              <div className="flex items-center justify-between px-[14px] pt-3 pb-[10px] shrink-0 border-b border-tg-input relative">
                <div className="w-8 h-1 bg-[#1e2638] rounded-sm absolute top-[10px] left-1/2 -translate-x-1/2" />
                <div className="flex-1" />
                <button
                  onClick={deleteSelectedNode}
                  className="flex items-center gap-[5px] bg-red-500/[0.08] border border-red-500/20 rounded-[9px] py-[6px] px-[11px] text-[#f87171] text-[12px] font-semibold"
                >
                  <Trash2 size={13} /> O'chirish
                </button>
              </div>
              <NodePanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={config => updateNodeConfig(selectedNode.id, config)}
                chatType={chatType}
                fullWidth
              />
            </div>
          </div>
        ) : (
          <NodePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={config => updateNodeConfig(selectedNode.id, config)}
            chatType={chatType}
          />
        )
      ) : null}

      {/* ── Mobile: Node palette bottom sheet ───────────────────────────────── */}
      {isMobile && showNodeSheet && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={() => setShowNodeSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 h-sheet-80 sheet-transition bg-tg-bg rounded-t-[20px] overflow-hidden flex flex-col border border-tg-input border-b-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-[10px] border-b border-tg-input shrink-0 relative">
              <div className="w-9 h-1 bg-[#1e2638] rounded-sm absolute top-2 left-1/2 -translate-x-1/2" />
              <span className="text-[13px] font-bold text-white mt-1.5">Node qo'shish</span>
              <button
                onClick={() => setShowNodeSheet(false)}
                className="bg-tg-card border border-tg-input rounded-lg w-7 h-7 flex items-center justify-center cursor-pointer text-tg-label mt-1"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto touch-scroll">
              <Sidebar onAddNode={(t, s) => { addNode(t, s); setShowNodeSheet(false) }} chatType={chatType} sheet />
            </div>
          </div>
        </div>
      )}

      {/* ── Validation modal ─────────────────────────────────────────────────── */}
      {validation && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-[6px] p-4">
          <div className="bg-tg-bg border border-tg-input rounded-[20px] w-full max-w-[440px] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-tg-input">
              <span className="text-[14px] font-bold text-white">Flow tekshiruvi</span>
              <button
                onClick={() => { setValidation(null); setErrNodeIds(new Set()) }}
                className="bg-tg-card border border-tg-input rounded-lg w-7 h-7 flex items-center justify-center cursor-pointer text-tg-label"
              >
                <X size={13} />
              </button>
            </div>

            <div className="px-5 py-[14px] flex flex-col gap-2 max-h-[260px] overflow-y-auto">
              {validation.map((err, i) => (
                <div
                  key={i}
                  className={[
                    'flex items-start gap-[10px] p-[10px_12px] rounded-[10px]',
                    err.severity === 'error'
                      ? 'bg-red-500/5 border border-red-500/15'
                      : 'bg-amber-500/5 border border-amber-500/15',
                  ].join(' ')}
                >
                  {err.severity === 'error'
                    ? <AlertCircle size={13} color="#f87171" className="shrink-0 mt-[1px]" />
                    : <AlertTriangle size={13} color="#fbbf24" className="shrink-0 mt-[1px]" />
                  }
                  <span className={`text-[12px] ${err.severity === 'error' ? 'text-red-300' : 'text-amber-200'}`}>
                    {err.message}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-[10px] px-5 py-[14px] border-t border-tg-input">
              {validation.some(e => e.severity === 'error') ? (
                <>
                  <span className="text-[12px] text-tg-muted flex-1">Xatolarni tuzating va qayta urinib ko'ring</span>
                  <button
                    onClick={() => { setValidation(null); setErrNodeIds(new Set()) }}
                    className="bg-tg-card border border-tg-input rounded-[9px] px-4 py-2 text-white text-[12px] cursor-pointer"
                  >
                    Yopish
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[12px] text-tg-muted flex-1">Faqat ogohlantirishlar bor. Nashr etasizmi?</span>
                  <button
                    onClick={() => { setValidation(null); setErrNodeIds(new Set()) }}
                    className="bg-transparent border-none text-tg-label text-[12px] cursor-pointer px-[10px] py-2"
                  >
                    Bekor
                  </button>
                  <button
                    onClick={confirmPublish}
                    disabled={publishing}
                    className="bg-tg-accent border-none rounded-[9px] px-4 py-2 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Nashr etish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Templates modal ──────────────────────────────────────────────────── */}
      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onSelect={loadTemplate}
        />
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
