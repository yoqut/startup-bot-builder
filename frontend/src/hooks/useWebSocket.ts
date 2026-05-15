/**
 * WebSocket hook — connects to the realtime backend channel for a bot.
 * Handles reconnection with exponential backoff.
 * Dispatches execution events to the builder store.
 */
import { useEffect, useRef } from 'react'
import { useBuilderStore } from '../stores/builderStore'
import { useAuthStore } from '../stores/authStore'

const BASE_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const MAX_RECONNECT_DELAY = 30_000
const BASE_RECONNECT_DELAY = 1_000

export function useWebSocket(botId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(BASE_RECONNECT_DELAY)
  const isMounted = useRef(true)

  const { markNodeActive, markNodeDone, markNodeError } = useBuilderStore()
  const { accessToken } = useAuthStore()

  useEffect(() => {
    isMounted.current = true
    if (!botId || !accessToken) return

    function connect() {
      if (!isMounted.current) return

      const url = `${BASE_URL}/api/v1/ws/bots/${botId}?token=${accessToken}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelay.current = BASE_RECONNECT_DELAY
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (!isMounted.current) return
        // Exponential backoff reconnect
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY)
          connect()
        }, reconnectDelay.current)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    function handleMessage(msg: Record<string, unknown>) {
      const type = msg.type as string
      const nodeId = msg.node_id as string | undefined

      switch (type) {
        case 'node_active':
          if (nodeId) markNodeActive(nodeId)
          break
        case 'node_done':
          if (nodeId) markNodeDone(nodeId)
          break
        case 'node_error':
          if (nodeId) markNodeError(nodeId)
          break
        case 'execution_complete':
          // Could show a toast notification here
          break
        case 'ping':
          wsRef.current?.send(JSON.stringify({ type: 'pong' }))
          break
      }
    }

    connect()

    return () => {
      isMounted.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [botId, accessToken])
}
