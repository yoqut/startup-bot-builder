import { useState, useRef, useEffect, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'

export type MsgRole = 'bot' | 'user' | 'system'

export interface ChatMsg {
  id: string
  role: MsgRole
  text?: string
  mediaType?: string
  pollQuestion?: string
  pollOptions?: string[]
  buttons?: { label: string; nodeId: string }[]
  layout?: 'inline' | 'reply'
  time: string
  nodeId: string
}

function nowTime() {
  return new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

export function useSimulator(nodes: Node[], edges: Edge[]) {
  const [messages, setMessages]      = useState<ChatMsg[]>([])
  const [currentNodeId, setCurrent]  = useState<string | null>(null)
  const [waitingFor, setWaitingFor]  = useState<'input' | 'reply_btn' | null>(null)
  const [typing, setTyping]          = useState(false)
  const [userInput, setUserInput]    = useState('')
  const [vars, setVars]              = useState<Record<string, string>>({})
  const [replyButtons, setReplyBtns] = useState<ChatMsg['buttons']>([])

  const varsRef  = useRef(vars)
  const nodesRef = useRef<Record<string, Node>>({})
  const edgesRef = useRef<Record<string, Edge[]>>({})

  useEffect(() => { varsRef.current = vars }, [vars])
  useEffect(() => {
    nodesRef.current = Object.fromEntries(nodes.map(n => [n.id, n]))
    edgesRef.current = edges.reduce<Record<string, Edge[]>>((a, e) => { (a[e.source] ??= []).push(e); return a }, {})
  }, [nodes, edges])

  const push = useCallback((msg: Omit<ChatMsg, 'id' | 'time'>) => {
    setMessages(p => [...p, { ...msg, id: crypto.randomUUID(), time: nowTime() }])
  }, [])

  function interpolate(text: string) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, k) => varsRef.current[k] ?? `{{${k}}}`)
  }

  function nextEdge(nodeId: string, handle?: string): Edge | undefined {
    const out = edgesRef.current[nodeId] || []
    if (handle) return out.find(e => e.sourceHandle === handle) ?? out[0]
    return out[0]
  }

  const queueRef   = useRef<Array<() => void>>([])
  const runningRef = useRef(false)

  function enqueue(fn: () => void) { queueRef.current.push(fn); if (!runningRef.current) drain() }
  function drain() { const fn = queueRef.current.shift(); if (!fn) { runningRef.current = false; return }; runningRef.current = true; fn() }
  function scheduleNode(nodeId: string, delayMs = 0) { enqueue(() => setTimeout(() => { execNode(nodeId); drain() }, delayMs)) }

  function execNode(nodeId: string) {
    const node = nodesRef.current[nodeId]
    if (!node) { push({ role: 'system', text: '⚠ Node topilmadi', nodeId }); return }
    setCurrent(nodeId)
    const cfg  = (node.data.config as Record<string, unknown>) || {}
    const type = (node.type as string) || (node.data.nodeType as string) || ''

    switch (type) {
      case 'start': case 'command': case 'handler': case 'business_handler': {
        const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 100); break
      }
      case 'message': {
        const msgType = (cfg.message_type as string) || 'text'
        const text    = interpolate((cfg.text as string) || '')
        const buttons = (cfg.buttons as { label: string }[]) || []
        const layout  = ((cfg.button_layout as string) || 'inline') as 'inline' | 'reply'
        const out     = edgesRef.current[nodeId] || []
        const btns    = buttons.map((b, i) => ({ label: b.label, nodeId: out.find(e => e.sourceHandle === `btn_${i}`)?.target || '' })).filter(b => b.label)
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          push({ role: 'bot', text: msgType === 'text' ? text : undefined, mediaType: ['photo','video','audio','voice','document'].includes(msgType) ? msgType : undefined, pollQuestion: msgType === 'poll' ? interpolate((cfg.poll_question as string) || '') : undefined, pollOptions: msgType === 'poll' ? (cfg.poll_options as string[]) || [] : undefined, buttons: btns.length ? btns : undefined, layout: btns.length ? layout : undefined, nodeId })
          if (btns.length && layout === 'reply') { setReplyBtns(btns); setWaitingFor('reply_btn') }
          else if (btns.length) { setWaitingFor('reply_btn') }
          else { const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 200) }
        }, 600 + Math.random() * 300)
        break
      }
      case 'button': {
        const text   = interpolate((cfg.text as string) || '')
        const buttons = (cfg.buttons as { label: string }[]) || []
        const layout  = ((cfg.button_layout as string) || 'inline') as 'inline' | 'reply'
        const out     = edgesRef.current[nodeId] || []
        const btns    = buttons.map((b, i) => ({ label: b.label, nodeId: out.find(e => e.sourceHandle === `btn_${i}`)?.target || '' })).filter(b => b.label)
        setTyping(true)
        setTimeout(() => { setTyping(false); push({ role: 'bot', text: text || 'Tanlang:', buttons: btns, layout, nodeId }); if (layout === 'reply') { setReplyBtns(btns); setWaitingFor('reply_btn') } else setWaitingFor('reply_btn') }, 400)
        break
      }
      case 'input': {
        const prompt = interpolate((cfg.prompt as string) || 'Javob yozing:')
        setTyping(true)
        setTimeout(() => { setTyping(false); push({ role: 'bot', text: prompt, nodeId }); setWaitingFor('input'); setReplyBtns([]) }, 400)
        break
      }
      case 'condition': {
        const variable = (cfg.variable as string) || ''; const operator = (cfg.operator as string) || 'equals'; const value = (cfg.value as string) || ''; const actual = varsRef.current[variable] ?? ''
        let result = false
        if (operator === 'equals')        result = actual === value
        else if (operator === 'not_equals')  result = actual !== value
        else if (operator === 'contains')    result = actual.includes(value)
        else if (operator === 'greater_than') result = Number(actual) > Number(value)
        else if (operator === 'less_than')    result = Number(actual) < Number(value)
        else if (operator === 'is_empty')     result = !actual
        push({ role: 'system', text: `Shart: {{${variable}}} → ${result ? '✓ true' : '✗ false'}`, nodeId })
        const edge = nextEdge(nodeId, result ? 'true' : 'false'); if (edge) scheduleNode(edge.target, 300)
        break
      }
      case 'delay': {
        const secs = (cfg.seconds as number) || 1
        if (cfg.typing_action !== false) setTyping(true)
        push({ role: 'system', text: `⏱ ${secs}s kutilmoqda…`, nodeId })
        setTimeout(() => { setTyping(false); const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 50) }, Math.min(secs * 500, 3000))
        break
      }
      case 'set_variable': {
        const assignments = (cfg.assignments as { variable: string; value: string }[]) || []
        setVars(v => { const next = { ...v }; assignments.forEach(a => { next[a.variable] = interpolate(a.value) }); varsRef.current = next; return next })
        push({ role: 'system', text: assignments.map(a => `${a.variable} ← "${interpolate(a.value)}"`).join(' · '), nodeId })
        const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 200)
        break
      }
      case 'api_call': {
        const url = (cfg.url as string) || ''; const method = (cfg.method as string) || 'GET'; const respVar = (cfg.response_variable as string) || 'api_result'
        push({ role: 'system', text: `🌐 ${method} ${url || '—'} [mock]`, nodeId })
        setVars(v => { const next = { ...v, [respVar]: '{"status":"ok"}' }; varsRef.current = next; return next })
        const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 400)
        break
      }
      case 'ai': {
        const respVar = (cfg.response_variable as string) || 'ai_reply'
        setTyping(true)
        setTimeout(() => { setTyping(false); push({ role: 'bot', text: '🤖 [AI javobi — preview mock]', nodeId }); setVars(v => { const next = { ...v, [respVar]: 'Mock AI reply' }; varsRef.current = next; return next }); const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 200) }, 1200)
        break
      }
      case 'auto_delete': {
        const secs = (cfg.seconds as number) || 10; const msgVar = (cfg.message_id_var as string) || 'last_message_id'
        push({ role: 'system', text: `🗑 {{${msgVar}}} ${secs}s keyin o'chiriladi`, nodeId })
        const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 200)
        break
      }
      case 'send_to': {
        const chatId = interpolate((cfg.chat_id as string) || '?'); const text = interpolate((cfg.text as string) || '')
        push({ role: 'system', text: `📤 ${chatId} ga: "${text.slice(0, 40)}"`, nodeId })
        const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 300)
        break
      }
      case 'end': push({ role: 'system', text: '— Suhbat yakunlandi —', nodeId }); setWaitingFor(null); setReplyBtns([]); break
      default: { push({ role: 'system', text: `[${type}]`, nodeId }); const edge = nextEdge(nodeId); if (edge) scheduleNode(edge.target, 100) }
    }
  }

  function startFrom(nodeId: string) {
    setMessages([]); setVars({}); setWaitingFor(null); setCurrent(null); setTyping(false); setReplyBtns([])
    varsRef.current = {}; queueRef.current = []
    setTimeout(() => scheduleNode(nodeId, 200), 0)
  }

  function onInlineButtonClick(targetNodeId: string, label: string) {
    if (!targetNodeId) return
    push({ role: 'user', text: label, nodeId: targetNodeId })
    setWaitingFor(null); scheduleNode(targetNodeId, 100)
  }

  function onReplyButtonClick(targetNodeId: string, label: string) {
    push({ role: 'user', text: label, nodeId: targetNodeId })
    setReplyBtns([]); setWaitingFor(null)
    if (targetNodeId) scheduleNode(targetNodeId, 100)
  }

  function onUserInput(text: string) {
    const node    = currentNodeId ? nodesRef.current[currentNodeId] : null
    const cfg     = (node?.data?.config as Record<string, unknown>) || {}
    const varName = (cfg.variable_name as string) || 'user_input'
    push({ role: 'user', text, nodeId: currentNodeId || '' })
    setVars(v => { const next = { ...v, [varName]: text }; varsRef.current = next; return next })
    setWaitingFor(null)
    const edge = nextEdge(currentNodeId || ''); if (edge) scheduleNode(edge.target, 200)
  }

  function reset() {
    setMessages([]); setVars({}); setWaitingFor(null); setCurrent(null); setTyping(false); setReplyBtns([])
    varsRef.current = {}; queueRef.current = []
  }

  return { messages, waitingFor, typing, userInput, setUserInput, replyButtons, startFrom, onInlineButtonClick, onReplyButtonClick, onUserInput, reset, vars }
}
