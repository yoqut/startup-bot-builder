import { useCallback, useRef } from 'react'
import { useStore } from 'zustand'
import type { Node, Edge } from '@xyflow/react'
import { useCanvasStore } from '@/store/canvas.store'

export function useFlowHistory(
  setNodes: (ns: Node[]) => void,
  setEdges: (es: Edge[]) => void,
) {
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

  const loadSnapshot = useCallback((ns: Node[], es: Edge[]) => {
    suppressPush.current = true
    useCanvasStore.setState({ nodes: ns, edges: es })
    useCanvasStore.temporal.getState().clear()
    setNodes(ns)
    setEdges(es)
    requestAnimationFrame(() => { suppressPush.current = false })
  }, [setNodes, setEdges])

  return { pushSnapshot, undo, redo, canUndo, canRedo, suppressPush, loadSnapshot }
}
