/**
 * Main FlowBuilder page — the visual canvas editor.
 * React Flow canvas + sidebar + node config panel + toolbar.
 * Autosave, keyboard shortcuts, drag-to-add nodes from sidebar.
 */
import React, { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useParams } from 'react-router-dom'
import { useBuilderStore } from '../../stores/builderStore'
import { CustomNode } from '../../components/builder/nodes/CustomNode'
import { getNodeCategory } from '../../components/builder/nodes/nodeTypeMeta'
import { NodeSidebar } from '../../components/builder/panels/NodeSidebar'
import { NodeConfigPanel } from '../../components/builder/panels/NodeConfigPanel'
import { BuilderToolbar } from '../../components/builder/toolbar/BuilderToolbar'
import { ExecutionDebugger } from '../../components/builder/panels/ExecutionDebugger'
import { useFlowLoader } from '../../hooks/useFlowLoader'
import { useAutosave } from '../../hooks/useAutosave'
import { useBuilderShortcuts } from '../../hooks/useBuilderShortcuts'
import { useWebSocket } from '../../hooks/useWebSocket'

const nodeTypes = { custom: CustomNode }

export function FlowBuilder() {
  const { botId, flowId } = useParams<{ botId: string; flowId: string }>()
  const rfInstance = useRef<ReactFlowInstance | null>(null)

  const {
    nodes, edges, viewport,
    onNodesChange, onEdgesChange, onConnect,
    setViewport, addNode, selectNode,
    isExecutionMode,
  } = useBuilderStore()

  useFlowLoader(botId!, flowId!)
  useAutosave(botId!, flowId!)
  useBuilderShortcuts()
  useWebSocket(botId!)

  // Drag-from-sidebar handler
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: { id: string }) => {
    selectNode(node.id)
  }, [selectNode])

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const nodeType = e.dataTransfer.getData('application/botbuilder-node')
    if (!nodeType || !rfInstance.current) return

    const position = rfInstance.current.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    })

    addNode(nodeType, position)
  }, [addNode])

  return (
    <div className="flex h-screen w-full bg-neutral-950 overflow-hidden">
      {/* Left sidebar — node palette */}
      <NodeSidebar />

      {/* Canvas */}
      <div className="flex-1 relative flex flex-col">
        <BuilderToolbar />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={(instance) => { rfInstance.current = instance }}
            defaultViewport={viewport}
            onMoveEnd={(_, vp) => setViewport(vp)}
            fitView={nodes.length > 0}
            snapToGrid={true}
            snapGrid={[16, 16]}
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
            className="bg-neutral-950"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#ffffff08"
            />
            <Controls
              className="!bg-neutral-900 !border-neutral-800 !shadow-xl"
              showInteractive={false}
            />
            <MiniMap
              className="!bg-neutral-900 !border-neutral-800"
              nodeColor={(node) => {
                const cat = getNodeCategory(node.data?.nodeType || '')
                const colors: Record<string, string> = {
                  trigger: '#8b5cf6', message: '#3b82f6', logic: '#f59e0b',
                  ai: '#10b981', data: '#f43f5e', analytics: '#0ea5e9',
                }
                return colors[cat] || '#6b7280'
              }}
              maskColor="#09090b80"
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-6xl mb-4">⚡</div>
                <h3 className="text-white/60 text-lg font-medium mb-2">Start building your flow</h3>
                <p className="text-white/30 text-sm">Drag nodes from the left sidebar onto the canvas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — node config */}
      <NodeConfigPanel />

      {/* Execution debugger overlay */}
      {isExecutionMode && <ExecutionDebugger />}
    </div>
  )
}
