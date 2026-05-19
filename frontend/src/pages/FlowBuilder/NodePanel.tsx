import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Node } from '@xyflow/react'
import { TYPE_LABELS } from './panels/shared'
import { META, ACCENT_HEX, ACCENT_CLS } from '@/components/flow/nodes/NodeShell'
import HandlerPanel from './panels/HandlerPanel'
import BusinessHandlerPanel from './panels/BusinessHandlerPanel'
import MessagePanel from './panels/MessagePanel'
import ButtonPanel from './panels/ButtonPanel'
import { CommandPanel, InputPanel, ConditionPanel, ApiCallPanel, AiPanel, DelayPanel, SetVariablePanel, AutoDeletePanel, SendToPanel, StickyPanel } from './panels/DataPanels'

interface Props {
  node: Node
  onClose: () => void
  onUpdate: (config: Record<string, unknown>) => void
  chatType?: string
  fullWidth?: boolean
}

export default function NodePanel({ node, onClose, onUpdate, chatType, fullWidth }: Props) {
  const [cfg, setCfg] = useState<Record<string, unknown>>(
    (node.data.config as Record<string, unknown>) || {}
  )
  const nodeType = (node.type as string) || (node.data.nodeType as string)

  useEffect(() => { setCfg((node.data.config as Record<string, unknown>) || {}) }, [node.id])

  const set = (key: string, value: unknown) => {
    const next = { ...cfg, [key]: value }
    setCfg(next)
    onUpdate(next)
  }

  const renderPanel = () => {
    switch (nodeType) {
      case 'handler':          return <HandlerPanel cfg={cfg} set={set} pageChatType={chatType} />
      case 'command':
      case 'start':            return <CommandPanel cfg={cfg} set={set} />
      case 'message':          return <MessagePanel cfg={cfg} set={set} />
      case 'button':           return <ButtonPanel cfg={cfg} set={set} />
      case 'input':            return <InputPanel cfg={cfg} set={set} />
      case 'condition':        return <ConditionPanel cfg={cfg} set={set} />
      case 'delay':            return <DelayPanel cfg={cfg} set={set} />
      case 'set_variable':     return <SetVariablePanel cfg={cfg} set={set} />
      case 'api_call':         return <ApiCallPanel cfg={cfg} set={set} />
      case 'ai':               return <AiPanel cfg={cfg} set={set} />
      case 'auto_delete':      return <AutoDeletePanel cfg={cfg} set={set} />
      case 'send_to':          return <SendToPanel cfg={cfg} set={set} />
      case 'business_handler': return <BusinessHandlerPanel cfg={cfg} set={set} />
      case 'sticky':           return <StickyPanel cfg={cfg} set={set} />
      case 'end':              return <p className="text-[13px] text-tg-label m-0">Bu node suhbatni yakunlaydi. Sozlamalar yo'q.</p>
      default:                 return <p className="text-[13px] text-tg-label m-0">Sozlamalar mavjud emas.</p>
    }
  }

  const meta      = META[nodeType] || META.message
  const accentHex = ACCENT_HEX[nodeType] || '#2481cc'
  const cls       = ACCENT_CLS[accentHex]
  const NodeIcon  = meta.icon

  return (
    <div className={fullWidth ? "w-full bg-tg-deep flex flex-col overflow-hidden" : "w-[280px] bg-tg-deep border-l border-tg-darkborder flex flex-col overflow-hidden"}>
      {/* ── Panel header ── */}
      <div
        className="flex items-center gap-2.5 px-3 py-[10px] border-b border-tg-input shrink-0"
        style={{ background: `linear-gradient(135deg, ${accentHex}10 0%, transparent 60%)` }}
      >
        <div className={`w-7 h-7 rounded-[8px] ${cls?.bg ?? 'bg-tg-card'} border ${cls?.border ?? 'border-tg-border'} flex items-center justify-center shrink-0`}>
          <span className={cls?.icon ?? 'text-tg-label'}>
            <NodeIcon size={13} color="currentColor" />
          </span>
        </div>
        <h3 className="m-0 text-[13px] font-bold text-white flex-1 truncate">
          {TYPE_LABELS[nodeType] || nodeType}
        </h3>
        <button onClick={onClose} className="bg-tg-card border border-tg-input rounded-lg w-[26px] h-[26px] flex items-center justify-center cursor-pointer text-tg-muted hover:text-white transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto touch-scroll px-3 py-3 pb-safe flex flex-col gap-[12px]">
        {renderPanel()}
      </div>
    </div>
  )
}
