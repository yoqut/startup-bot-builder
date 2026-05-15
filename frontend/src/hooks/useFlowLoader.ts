import { useEffect } from 'react'
import { useBuilderStore } from '../stores/builderStore'
import { flowsApi } from '../lib/api/flows'

export function useFlowLoader(botId: string, flowId: string) {
  const loadFlow = useBuilderStore(s => s.loadFlow)

  useEffect(() => {
    if (!botId || !flowId) return

    flowsApi.getFlow(botId, flowId).then((data: any) => {
      loadFlow({
        id: data.id,
        name: data.name,
        nodes: data.nodes || [],
        edges: data.edges || [],
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
      })
    }).catch(() => {
      // Flow not found, start with empty canvas
    })
  }, [botId, flowId])
}
