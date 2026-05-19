import { useCallback, useRef, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { serializeNodes, serializeEdges } from '../helpers/flowHelpers'

export function useAutoSave(
  getNodes: () => Node[],
  getEdges: () => Edge[],
  updateNodes: (nodes: any[]) => void,
  updateEdges: (edges: any[]) => void,
  saveFlow: () => Promise<void>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [saveStatus, setSaveStatus]   = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isDirty, setIsDirty]         = useState(false)
  const [lastSaved, setLastSaved]     = useState<Date | null>(null)

  const commitSave = useCallback(async () => {
    updateNodes(serializeNodes(getNodes()))
    updateEdges(serializeEdges(getEdges()))
    setSaveStatus('saving')
    await saveFlow()
    setSaveStatus('saved')
    setIsDirty(false)
    setLastSaved(new Date())
    setTimeout(() => setSaveStatus('idle'), 3000)
  }, [getNodes, getEdges, updateNodes, updateEdges, saveFlow])

  const scheduleAutoSave = useCallback(() => {
    setIsDirty(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { commitSave().catch(() => {}) }, 30_000)
  }, [commitSave])

  return { scheduleAutoSave, commitSave, saveStatus, setSaveStatus, isDirty, setIsDirty, lastSaved }
}
