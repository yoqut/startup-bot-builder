import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Copy, Plus, Minus } from 'lucide-react'
import { useBuilderStore } from '../../../stores/builderStore'
import {
  getNodeMeta, FILTER_FIELDS, FILTER_OPERATORS, MESSAGE_CONTENT_TYPES,
  TRIGGER_CONTEXTS, CONTEXT_EVENTS, type TriggerContext,
} from '../nodes/nodeTypeMeta'
import { cn } from '../../../lib/utils'

// ─── helpers ─────────────────────────────────────────────────────────────────

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label?: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      {label && <label className="text-white/45 text-[11px] mb-1 block">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-800 border border-neutral-700 text-white/90 text-xs
          px-2.5 py-2 rounded-lg focus:border-violet-500 focus:outline-none
          placeholder:text-neutral-600 transition-colors"
      />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }: {
  label?: string; value: string; onChange: (v: string) => void
  placeholder?: string; rows?: number
}) {
  return (
    <div>
      {label && <label className="text-white/45 text-[11px] mb-1 block">{label}</label>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-neutral-800 border border-neutral-700 text-white/90 text-xs
          px-2.5 py-2 rounded-lg focus:border-violet-500 focus:outline-none resize-none
          placeholder:text-neutral-600 transition-colors"
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label?: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      {label && <label className="text-white/45 text-[11px] mb-1 block">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 text-white/90 text-xs
          px-2.5 py-2 rounded-lg focus:border-violet-500 focus:outline-none transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-white/60 text-xs">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'w-9 h-5 rounded-full transition-colors relative',
          checked ? 'bg-violet-600' : 'bg-neutral-700'
        )}
      >
        <div className={cn(
          'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </div>
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2 mt-4 first:mt-0">{children}</p>
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void
}) {
  return (
    <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-neutral-950/50 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'text-[11px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap transition-colors',
            active === tab
              ? 'bg-violet-600 text-white'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function NodeConfigPanel() {
  const { nodes, selectedNodeId, selectNode, updateNodeConfig, updateNodeLabel, deleteNode, duplicateNode, isPanelOpen } = useBuilderStore()
  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const [activeTab, setActiveTab] = useState<string>('')

  if (!isPanelOpen || !selectedNode) return null

  const meta = getNodeMeta(selectedNode.data.nodeType)
  const Icon = meta.icon

  const tabs = getTabsForNodeType(selectedNode.data.nodeType)
  const currentTab = activeTab && tabs.includes(activeTab) ? activeTab : tabs[0]

  const update = (patch: Record<string, unknown>) => {
    updateNodeConfig(selectedNode.id, { ...selectedNode.data.config, ...patch })
  }
  const cfg = selectedNode.data.config

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-72 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full shrink-0 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 border-b border-neutral-800 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}22` }}>
            <Icon size={14} style={{ color: meta.color }} />
          </div>
          <input
            className="flex-1 bg-transparent text-white text-sm font-medium focus:outline-none
              border-b border-transparent focus:border-white/20 transition-colors truncate"
            value={selectedNode.data.label}
            onChange={e => updateNodeLabel(selectedNode.id, e.target.value)}
          />
          <button onClick={() => duplicateNode(selectedNode.id)}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded">
            <Copy size={13} />
          </button>
          <button onClick={() => deleteNode(selectedNode.id)}
            className="text-white/30 hover:text-red-400 transition-colors p-1 rounded">
            <Trash2 size={13} />
          </button>
          <button onClick={() => selectNode(null)}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={currentTab} onChange={setActiveTab} />

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <NodeTabContent
            nodeType={selectedNode.data.nodeType}
            tab={currentTab}
            config={cfg}
            update={update}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function getTabsForNodeType(nodeType: string): string[] {
  switch (nodeType) {
    case 'trigger':      return ['Events', 'Filters', 'Advanced']
    case 'message':      return ['Content', 'Media', 'Buttons', 'Advanced']
    case 'condition':    return ['Condition', 'Advanced']
    case 'delay':        return ['Config']
    case 'http_request': return ['Request', 'Headers', 'Advanced']
    case 'ai_reply':     return ['Prompt', 'Model', 'Advanced']
    case 'variable':     return ['Config']
    case 'split':        return ['Branches']
    case 'loop':         return ['Config']
    case 'track_event':  return ['Config']
    default:             return ['Config']
  }
}

// ─── Tab Content ─────────────────────────────────────────────────────────────

function NodeTabContent({ nodeType, tab, config, update }: {
  nodeType: string; tab: string; config: Record<string, unknown>; update: (p: Record<string, unknown>) => void
}) {
  switch (nodeType) {
    case 'trigger':      return <TriggerTabs tab={tab} config={config} update={update} />
    case 'message':      return <MessageTabs tab={tab} config={config} update={update} />
    case 'condition':    return <ConditionTabs tab={tab} config={config} update={update} />
    case 'http_request': return <HttpRequestTabs tab={tab} config={config} update={update} />
    case 'ai_reply':     return <AIReplyTabs tab={tab} config={config} update={update} />
    case 'delay':        return <DelayConfig config={config} update={update} />
    case 'variable':     return <VariableConfig config={config} update={update} />
    case 'split':        return <SplitConfig config={config} update={update} />
    case 'loop':         return <LoopConfig config={config} update={update} />
    case 'track_event':  return <TrackEventConfig config={config} update={update} />
    default:             return <p className="text-white/30 text-xs text-center py-6">No configuration</p>
  }
}

// ─── TRIGGER ─────────────────────────────────────────────────────────────────

type ContextConfig = { enabled: boolean; events: string[]; command?: string; callback_pattern?: string; schedule_cron?: string }
type ContextsMap = Record<TriggerContext, ContextConfig>

const DEFAULT_CONTEXTS: ContextsMap = {
  user:     { enabled: false, events: [] },
  group:    { enabled: false, events: [] },
  channel:  { enabled: false, events: [] },
  business: { enabled: false, events: [] },
}

function TriggerTabs({ tab, config, update }: TabProps) {
  const [activeCtx, setActiveCtx] = useState<TriggerContext>('user')
  const filters: FilterRule[] = (config.filters as FilterRule[]) ?? []

  const contexts: ContextsMap = {
    ...DEFAULT_CONTEXTS,
    ...((config.contexts as ContextsMap) ?? {}),
  }

  const updateContext = (ctx: TriggerContext, patch: Partial<ContextConfig>) => {
    update({ contexts: { ...contexts, [ctx]: { ...contexts[ctx], ...patch } } })
  }

  const toggleEvent = (ctx: TriggerContext, val: string) => {
    const cur = contexts[ctx].events ?? []
    updateContext(ctx, {
      events: cur.includes(val) ? cur.filter(e => e !== val) : [...cur, val],
    })
  }

  const ctxConf = contexts[activeCtx]
  const events = ctxConf.events ?? []
  const ctxMeta = TRIGGER_CONTEXTS.find(c => c.id === activeCtx)!

  if (tab === 'Events') {
    return (
      <>
        {/* ── Context cards — top of panel ─────────────────────────────── */}
        <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2">
          Accepts messages from
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TRIGGER_CONTEXTS.map(ctx => {
            const ctxData = contexts[ctx.id]
            const isActive  = activeCtx === ctx.id
            const isEnabled = ctxData.enabled
            const eventCount = ctxData.events?.length ?? 0
            return (
              <button
                key={ctx.id}
                onClick={() => setActiveCtx(ctx.id)}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                  isActive ? 'ring-1 ring-inset' : 'hover:bg-white/4',
                )}
                style={{
                  borderColor: isActive ? `${ctx.color}70` : isEnabled ? `${ctx.color}30` : '#27272a',
                  backgroundColor: isActive ? `${ctx.color}15` : isEnabled ? `${ctx.color}08` : 'transparent',
                  // @ts-ignore
                  '--tw-ring-color': ctx.color,
                }}
              >
                {/* emoji */}
                <span className="text-lg leading-none flex-shrink-0">{ctx.icon}</span>

                {/* name + description */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[11px] font-semibold leading-tight',
                    isEnabled ? 'text-white' : 'text-white/50')}>
                    {ctx.label}
                  </p>
                  <p className="text-[10px] text-white/30 leading-tight truncate">{ctx.description}</p>
                </div>

                {/* toggle */}
                <div
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={e => { e.stopPropagation(); updateContext(ctx.id, { enabled: !isEnabled }) }}
                  className={cn('w-8 h-4 rounded-full transition-colors relative cursor-pointer flex-shrink-0',
                    isEnabled ? '' : 'bg-neutral-700')}
                  style={isEnabled ? { backgroundColor: ctx.color } : {}}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm',
                    isEnabled ? 'translate-x-[17px]' : 'translate-x-0.5'
                  )} />
                </div>

                {/* event count badge */}
                {isEnabled && eventCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-[9px] min-w-[16px] h-4 px-1
                      rounded-full flex items-center justify-center font-bold z-10"
                    style={{ background: ctx.color, color: '#fff' }}
                  >
                    {eventCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Selected context detail ───────────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: `${ctxMeta.color}30`, backgroundColor: `${ctxMeta.color}06` }}>

          {/* Context header row */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b"
            style={{ borderColor: `${ctxMeta.color}20` }}>
            <span className="text-base">{ctxMeta.icon}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white/90">{ctxMeta.label}</p>
              <p className="text-[10px] text-white/35">
                {ctxConf.enabled
                  ? events.length > 0
                    ? `${events.length} event${events.length !== 1 ? 's' : ''} selected`
                    : 'Enabled — select events below'
                  : 'Disabled — toggle the switch above to activate'}
              </p>
            </div>
          </div>

          {/* Events list */}
          {ctxConf.enabled ? (
            <div className="p-1.5 space-y-0.5">
              {CONTEXT_EVENTS[activeCtx].map(evt => {
                const checked = events.includes(evt.value)
                return (
                  <label key={evt.value}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                    {/* custom checkbox */}
                    <div
                      className={cn(
                        'w-4 h-4 rounded-[4px] flex-shrink-0 flex items-center justify-center transition-colors border',
                        checked ? 'border-0' : 'border-neutral-600 group-hover:border-neutral-500'
                      )}
                      style={checked ? { backgroundColor: ctxMeta.color } : {}}
                    >
                      {checked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="sr-only" checked={checked}
                      onChange={() => toggleEvent(activeCtx, evt.value)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80">{evt.label}</p>
                      {evt.description && (
                        <p className="text-[10px] text-white/30 leading-tight">{evt.description}</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="text-white/25 text-xs">Enable this context to configure events</p>
            </div>
          )}
        </div>

        {/* Extra fields when specific events are selected */}
        {ctxConf.enabled && events.includes('scheduled') && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
            <Input label="Cron expression" value={ctxConf.schedule_cron || ''}
              onChange={v => updateContext(activeCtx, { schedule_cron: v })} placeholder="0 9 * * *" />
            <p className="text-white/25 text-[10px] mt-1">Daily 9:00 UTC = "0 9 * * *"</p>
          </div>
        )}
        {ctxConf.enabled && events.includes('command') && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
            <Input label="Command (without /)" value={ctxConf.command || ''}
              onChange={v => updateContext(activeCtx, { command: v })} placeholder="start" />
          </div>
        )}
        {ctxConf.enabled && events.includes('callback') && (
          <div className="mt-3 p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
            <Input label="Callback data pattern" value={ctxConf.callback_pattern || ''}
              onChange={v => updateContext(activeCtx, { callback_pattern: v })} placeholder="Leave empty = match any" />
          </div>
        )}
      </>
    )
  }

  if (tab === 'Filters') {
    return (
      <>
        <SectionTitle>Filter conditions</SectionTitle>
        <p className="text-white/30 text-[11px] -mt-1 mb-3">
          All filters must pass for the trigger to fire.
        </p>
        <FilterList filters={filters} onChange={f => update({ filters: f })} />
      </>
    )
  }

  // Advanced
  return (
    <>
      <SectionTitle>Advanced</SectionTitle>
      <Toggle label="Ignore bot messages" checked={(config.ignore_bots as boolean) ?? true}
        onChange={v => update({ ignore_bots: v })} />
      <Toggle label="Only when bot is admin" checked={!!(config.require_admin as boolean)}
        onChange={v => update({ require_admin: v })} />
      <Toggle label="Skip forwarded messages" checked={!!(config.skip_forwarded as boolean)}
        onChange={v => update({ skip_forwarded: v })} />
    </>
  )
}

type FilterRule = { field: string; operator: string; value: string }

function FilterList({ filters, onChange }: { filters: FilterRule[]; onChange: (f: FilterRule[]) => void }) {
  const addFilter = () => onChange([...filters, { field: 'text', operator: 'contains', value: '' }])
  const removeFilter = (i: number) => onChange(filters.filter((_, idx) => idx !== i))
  const updateFilter = (i: number, patch: Partial<FilterRule>) => {
    const next = filters.map((f, idx) => idx === i ? { ...f, ...patch } : f)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {filters.map((f, i) => (
        <div key={i} className="bg-neutral-800/60 rounded-lg p-2.5 space-y-2 border border-neutral-700/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30 font-medium">Filter {i + 1}</span>
            <button onClick={() => removeFilter(i)} className="text-white/25 hover:text-red-400 transition-colors">
              <Minus size={12} />
            </button>
          </div>
          <Select value={f.field} onChange={v => updateFilter(i, { field: v })}
            options={FILTER_FIELDS} />
          <Select value={f.operator} onChange={v => updateFilter(i, { operator: v })}
            options={FILTER_OPERATORS} />
          {!['is_empty', 'is_not_empty'].includes(f.operator) && (
            <Input value={f.value} onChange={v => updateFilter(i, { value: v })} placeholder="Value…" />
          )}
        </div>
      ))}
      <button onClick={addFilter}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
          border border-dashed border-neutral-700 text-white/40 hover:text-violet-400
          hover:border-violet-500/50 text-xs transition-colors">
        <Plus size={12} /> Add Filter
      </button>
    </div>
  )
}

// ─── MESSAGE ─────────────────────────────────────────────────────────────────

type TabProps = { tab: string; config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }

function MessageTabs({ tab, config, update }: TabProps) {
  const ct = (config.content_type as string) || 'text'
  const hasMedia = ct !== 'text' && ct !== 'poll' && ct !== 'location' && ct !== 'contact'

  if (tab === 'Content') {
    return (
      <>
        <Select label="Content type" value={ct}
          onChange={v => update({ content_type: v })}
          options={MESSAGE_CONTENT_TYPES} />

        {(ct === 'text' || ct === 'photo' || ct === 'video' || ct === 'animation' ||
          ct === 'audio' || ct === 'document' || ct === 'voice') && (
          <Textarea
            label={ct === 'text' ? 'Message text' : 'Caption'}
            value={(config.text as string) || ''}
            onChange={v => update({ text: v })}
            placeholder="Type message… Use {{user.first_name}} for variables"
            rows={4}
          />
        )}

        {ct !== 'text' && (
          <Select label="Parse mode" value={(config.parse_mode as string) || 'HTML'}
            onChange={v => update({ parse_mode: v })}
            options={[
              { value: 'HTML', label: 'HTML' },
              { value: 'Markdown', label: 'Markdown' },
              { value: 'MarkdownV2', label: 'MarkdownV2' },
              { value: 'None', label: 'Plain text' },
            ]} />
        )}

        {ct === 'text' && (
          <Select label="Parse mode" value={(config.parse_mode as string) || 'HTML'}
            onChange={v => update({ parse_mode: v })}
            options={[
              { value: 'HTML', label: 'HTML' },
              { value: 'Markdown', label: 'Markdown' },
              { value: 'MarkdownV2', label: 'MarkdownV2' },
              { value: 'None', label: 'Plain text' },
            ]} />
        )}

        {ct === 'location' && (
          <>
            <Input label="Latitude" value={(config.latitude as string) || ''} onChange={v => update({ latitude: v })} placeholder="40.7128" />
            <Input label="Longitude" value={(config.longitude as string) || ''} onChange={v => update({ longitude: v })} placeholder="-74.0060" />
          </>
        )}

        {ct === 'contact' && (
          <>
            <Input label="Phone number" value={(config.phone_number as string) || ''} onChange={v => update({ phone_number: v })} placeholder="+1234567890" />
            <Input label="First name" value={(config.contact_first_name as string) || ''} onChange={v => update({ contact_first_name: v })} placeholder="John" />
          </>
        )}

        {ct === 'poll' && (
          <>
            <Input label="Question" value={(config.poll_question as string) || ''} onChange={v => update({ poll_question: v })} placeholder="What do you think?" />
            <PollOptions options={(config.poll_options as string[]) ?? ['', '']} onChange={opts => update({ poll_options: opts })} />
            <Toggle label="Anonymous poll" checked={(config.is_anonymous as boolean) ?? true} onChange={v => update({ is_anonymous: v })} />
          </>
        )}
      </>
    )
  }

  if (tab === 'Media') {
    if (!hasMedia) {
      return <p className="text-white/30 text-xs text-center py-8">No media for "{ct}" type</p>
    }
    return (
      <>
        <SectionTitle>Media source</SectionTitle>
        <Select value={(config.media_source as string) || 'url'}
          onChange={v => update({ media_source: v })}
          options={[
            { value: 'url', label: 'URL' },
            { value: 'file_id', label: 'Telegram File ID' },
            { value: 'variable', label: 'Variable' },
          ]} />
        {(config.media_source === 'url' || !config.media_source) && (
          <Input label="Media URL" value={(config.media_url as string) || ''} onChange={v => update({ media_url: v })} placeholder="https://…" />
        )}
        {config.media_source === 'file_id' && (
          <Input label="File ID" value={(config.media_file_id as string) || ''} onChange={v => update({ media_file_id: v })} placeholder="AgACAgQAAxkBAAI…" />
        )}
        {config.media_source === 'variable' && (
          <Input label="Variable name" value={(config.media_variable as string) || ''} onChange={v => update({ media_variable: v })} placeholder="file_id" />
        )}
        <SectionTitle>Options</SectionTitle>
        <Toggle label="Spoiler effect" checked={!!(config.has_spoiler as boolean)} onChange={v => update({ has_spoiler: v })} />
      </>
    )
  }

  if (tab === 'Buttons') {
    return (
      <>
        <Select label="Keyboard type" value={(config.keyboard_type as string) || 'none'}
          onChange={v => update({ keyboard_type: v })}
          options={[
            { value: 'none', label: 'No keyboard' },
            { value: 'inline', label: 'Inline keyboard' },
            { value: 'reply', label: 'Reply keyboard' },
            { value: 'remove', label: 'Remove keyboard' },
          ]} />

        {config.keyboard_type === 'inline' && (
          <InlineButtonsEditor
            rows={(config.inline_buttons as InlineButton[][]) ?? []}
            onChange={rows => update({ inline_buttons: rows })}
          />
        )}
        {config.keyboard_type === 'reply' && (
          <ReplyButtonsEditor
            rows={(config.reply_buttons as string[][]) ?? []}
            onChange={rows => update({ reply_buttons: rows })}
          />
        )}
        {config.keyboard_type === 'reply' && (
          <>
            <Toggle label="Resize keyboard" checked={(config.resize_keyboard as boolean) ?? true} onChange={v => update({ resize_keyboard: v })} />
            <Toggle label="One-time keyboard" checked={!!(config.one_time_keyboard as boolean)} onChange={v => update({ one_time_keyboard: v })} />
          </>
        )}
      </>
    )
  }

  // Advanced
  return (
    <>
      <SectionTitle>Options</SectionTitle>
      <Toggle label="Reply to trigger message" checked={!!(config.reply_to_message as boolean)} onChange={v => update({ reply_to_message: v })} />
      <Toggle label="Disable notification" checked={!!(config.disable_notification as boolean)} onChange={v => update({ disable_notification: v })} />
      <Toggle label="Protect content" checked={!!(config.protect_content as boolean)} onChange={v => update({ protect_content: v })} />
      <SectionTitle>Override chat</SectionTitle>
      <Input label="Chat ID (leave empty for current)" value={(config.chat_id_override as string) || ''} onChange={v => update({ chat_id_override: v })} placeholder="{{chat.id}}" />
    </>
  )
}

function PollOptions({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div>
      <label className="text-white/45 text-[11px] mb-1 block">Options</label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; onChange(n) }}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-neutral-800 border border-neutral-700 text-white/90 text-xs px-2.5 py-1.5 rounded-lg focus:border-violet-500 focus:outline-none" />
            {options.length > 2 && (
              <button onClick={() => onChange(options.filter((_, idx) => idx !== i))} className="text-white/25 hover:text-red-400">
                <Minus size={12} />
              </button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button onClick={() => onChange([...options, ''])} className="text-white/30 hover:text-violet-400 text-xs flex items-center gap-1 transition-colors">
            <Plus size={11} /> Add option
          </button>
        )}
      </div>
    </div>
  )
}

type InlineButton = { text: string; callback_data?: string; url?: string }

function InlineButtonsEditor({ rows, onChange }: { rows: InlineButton[][]; onChange: (r: InlineButton[][]) => void }) {
  const addRow = () => onChange([...rows, [{ text: 'Button', callback_data: '' }]])
  const removeRow = (ri: number) => onChange(rows.filter((_, i) => i !== ri))
  const addBtn = (ri: number) => onChange(rows.map((r, i) => i === ri ? [...r, { text: 'Button', callback_data: '' }] : r))
  const removeBtn = (ri: number, bi: number) => onChange(rows.map((r, i) => i === ri ? r.filter((_, j) => j !== bi) : r))
  const updateBtn = (ri: number, bi: number, patch: Partial<InlineButton>) =>
    onChange(rows.map((r, i) => i === ri ? r.map((b, j) => j === bi ? { ...b, ...patch } : b) : r))

  return (
    <div className="space-y-2">
      <label className="text-white/45 text-[11px]">Inline buttons</label>
      {rows.map((row, ri) => (
        <div key={ri} className="bg-neutral-800/60 rounded-lg p-2 space-y-1.5 border border-neutral-700/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30">Row {ri + 1}</span>
            <button onClick={() => removeRow(ri)} className="text-white/20 hover:text-red-400"><Minus size={11} /></button>
          </div>
          {row.map((btn, bi) => (
            <div key={bi} className="space-y-1">
              <div className="flex gap-1.5 items-center">
                <input value={btn.text} onChange={e => updateBtn(ri, bi, { text: e.target.value })}
                  placeholder="Button text"
                  className="flex-1 bg-neutral-700/60 border border-neutral-600/50 text-white/80 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-violet-500" />
                {row.length > 1 && (
                  <button onClick={() => removeBtn(ri, bi)} className="text-white/20 hover:text-red-400"><Minus size={11} /></button>
                )}
              </div>
              <input value={btn.callback_data || ''} onChange={e => updateBtn(ri, bi, { callback_data: e.target.value })}
                placeholder="callback_data or URL"
                className="w-full bg-neutral-700/60 border border-neutral-600/50 text-white/60 text-[11px] px-2 py-1 rounded focus:outline-none focus:border-violet-500" />
            </div>
          ))}
          <button onClick={() => addBtn(ri)} className="text-white/25 hover:text-violet-400 text-[11px] flex items-center gap-1 transition-colors">
            <Plus size={11} /> Add button
          </button>
        </div>
      ))}
      <button onClick={addRow}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-neutral-700 text-white/35 hover:text-violet-400 hover:border-violet-500/40 text-xs transition-colors">
        <Plus size={11} /> Add row
      </button>
    </div>
  )
}

function ReplyButtonsEditor({ rows, onChange }: { rows: string[][]; onChange: (r: string[][]) => void }) {
  const addRow = () => onChange([...rows, ['Button']])
  const removeRow = (ri: number) => onChange(rows.filter((_, i) => i !== ri))
  const addBtn = (ri: number) => onChange(rows.map((r, i) => i === ri ? [...r, 'Button'] : r))
  const removeBtn = (ri: number, bi: number) => onChange(rows.map((r, i) => i === ri ? r.filter((_, j) => j !== bi) : r))
  const updateBtn = (ri: number, bi: number, val: string) =>
    onChange(rows.map((r, i) => i === ri ? r.map((b, j) => j === bi ? val : b) : r))

  return (
    <div className="space-y-2">
      <label className="text-white/45 text-[11px]">Reply buttons</label>
      {rows.map((row, ri) => (
        <div key={ri} className="bg-neutral-800/60 rounded-lg p-2 space-y-1.5 border border-neutral-700/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30">Row {ri + 1}</span>
            <button onClick={() => removeRow(ri)} className="text-white/20 hover:text-red-400"><Minus size={11} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {row.map((btn, bi) => (
              <div key={bi} className="flex items-center gap-1 bg-neutral-700/50 rounded px-2 py-1">
                <input value={btn} onChange={e => updateBtn(ri, bi, e.target.value)}
                  className="bg-transparent text-white/80 text-xs w-16 focus:outline-none" />
                {row.length > 1 && (
                  <button onClick={() => removeBtn(ri, bi)} className="text-white/20 hover:text-red-400"><Minus size={10} /></button>
                )}
              </div>
            ))}
            <button onClick={() => addBtn(ri)} className="text-white/25 hover:text-violet-400 text-xs px-2 py-1 transition-colors">+ btn</button>
          </div>
        </div>
      ))}
      <button onClick={addRow}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-neutral-700 text-white/35 hover:text-violet-400 hover:border-violet-500/40 text-xs transition-colors">
        <Plus size={11} /> Add row
      </button>
    </div>
  )
}

// ─── CONDITION ────────────────────────────────────────────────────────────────

function ConditionTabs({ tab, config, update }: TabProps) {
  if (tab === 'Condition') {
    return (
      <>
        <SectionTitle>Branch when</SectionTitle>
        <Select label="Field" value={(config.field as string) || ''}
          onChange={v => update({ field: v })}
          options={[
            { value: 'text', label: 'Message text' },
            { value: 'user.id', label: 'User ID' },
            { value: 'var.*', label: 'Variable' },
            { value: 'callback_data', label: 'Callback data' },
            { value: 'chat.type', label: 'Chat type' },
          ]} />
        {config.field === 'var.*' && (
          <Input label="Variable name" value={(config.variable_name as string) || ''} onChange={v => update({ variable_name: v })} placeholder="my_var" />
        )}
        <Select label="Operator" value={(config.operator as string) || 'eq'}
          onChange={v => update({ operator: v })}
          options={FILTER_OPERATORS} />
        {!['is_empty', 'is_not_empty'].includes((config.operator as string) || '') && (
          <Input label="Value" value={(config.value as string) || ''} onChange={v => update({ value: v })} placeholder="Expected value…" />
        )}
        <div className="pt-2 border-t border-neutral-800 mt-3">
          <p className="text-[11px] text-white/30">True → left handle &nbsp;|&nbsp; False → right handle</p>
        </div>
      </>
    )
  }
  return (
    <>
      <SectionTitle>Advanced</SectionTitle>
      <Toggle label="Continue on error" checked={!!(config.continue_on_error as boolean)} onChange={v => update({ continue_on_error: v })} />
    </>
  )
}

// ─── HTTP REQUEST ─────────────────────────────────────────────────────────────

function HttpRequestTabs({ tab, config, update }: TabProps) {
  if (tab === 'Request') {
    return (
      <>
        <Select label="Method" value={(config.method as string) || 'GET'}
          onChange={v => update({ method: v })}
          options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m }))} />
        <Input label="URL" value={(config.url as string) || ''} onChange={v => update({ url: v })} placeholder="https://api.example.com/…" />
        <Textarea label="Request body (JSON)" value={(config.body as string) || ''} onChange={v => update({ body: v })} placeholder='{"key": "value"}' />
        <Input label="Save response to variable" value={(config.output_variable as string) || 'response'} onChange={v => update({ output_variable: v })} />
      </>
    )
  }
  if (tab === 'Headers') {
    const headers: Record<string, string> = (config.headers as Record<string, string>) ?? {}
    const entries = Object.entries(headers)
    const updateHeaders = (key: string, val: string) => update({ headers: { ...headers, [key]: val } })
    const removeHeader = (key: string) => {
      const next = { ...headers }; delete next[key]; update({ headers: next })
    }
    return (
      <>
        <SectionTitle>Request headers</SectionTitle>
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-1.5 items-center">
            <input value={k} readOnly className="flex-1 bg-neutral-800 border border-neutral-700 text-white/60 text-xs px-2 py-1.5 rounded focus:outline-none" />
            <input value={v} onChange={e => updateHeaders(k, e.target.value)} className="flex-1 bg-neutral-800 border border-neutral-700 text-white/80 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-violet-500" />
            <button onClick={() => removeHeader(k)} className="text-white/20 hover:text-red-400"><Minus size={11} /></button>
          </div>
        ))}
        <button onClick={() => updateHeaders('', '')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-neutral-700 text-white/35 hover:text-violet-400 text-xs transition-colors">
          <Plus size={11} /> Add header
        </button>
      </>
    )
  }
  return (
    <>
      <SectionTitle>Options</SectionTitle>
      <Input label="Timeout (seconds)" value={(config.timeout as string) || '30'} onChange={v => update({ timeout: v })} type="number" />
      <Toggle label="Ignore errors" checked={!!(config.ignore_errors as boolean)} onChange={v => update({ ignore_errors: v })} />
    </>
  )
}

// ─── AI REPLY ─────────────────────────────────────────────────────────────────

function AIReplyTabs({ tab, config, update }: TabProps) {
  if (tab === 'Prompt') {
    return (
      <>
        <Textarea label="System prompt" value={(config.system_prompt as string) || ''} onChange={v => update({ system_prompt: v })}
          placeholder="You are a helpful assistant…" rows={5} />
        <Textarea label="User message override" value={(config.user_message as string) || ''} onChange={v => update({ user_message: v })}
          placeholder="Leave empty to use incoming message" rows={2} />
        <Input label="Save reply to variable" value={(config.output_variable as string) || 'ai_reply'} onChange={v => update({ output_variable: v })} />
      </>
    )
  }
  if (tab === 'Model') {
    return (
      <>
        <Select label="Model" value={(config.model as string) || 'gpt-4o-mini'}
          onChange={v => update({ model: v })}
          options={[
            { value: 'gpt-4o-mini', label: 'GPT-4o mini (fast, cheap)' },
            { value: 'gpt-4o', label: 'GPT-4o (smart)' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku (fast)' },
            { value: 'claude-sonnet-4-6', label: 'Claude Sonnet' },
          ]} />
        <Input label="Max tokens" value={(config.max_tokens as number) ?? 500} onChange={v => update({ max_tokens: Number(v) })} type="number" />
        <Input label="Temperature (0–2)" value={(config.temperature as number) ?? 0.7} onChange={v => update({ temperature: Number(v) })} type="number" />
      </>
    )
  }
  return (
    <>
      <SectionTitle>Context</SectionTitle>
      <Toggle label="Include chat history" checked={(config.include_history as boolean) ?? false} onChange={v => update({ include_history: v })} />
      <Input label="History length (messages)" value={(config.history_length as number) ?? 10} onChange={v => update({ history_length: Number(v) })} type="number" />
    </>
  )
}

// ─── SIMPLE CONFIGS ───────────────────────────────────────────────────────────

function DelayConfig({ config, update }: { config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Input label="Duration" value={(config.amount as number) ?? 1} onChange={v => update({ amount: Number(v) })} type="number" />
      <Select label="Unit" value={(config.unit as string) || 'seconds'}
        onChange={v => update({ unit: v })}
        options={[
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' },
        ]} />
    </>
  )
}

function VariableConfig({ config, update }: { config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }) {
  const action = (config.action as string) || 'set'
  return (
    <>
      <Select label="Action" value={action} onChange={v => update({ action: v })}
        options={[
          { value: 'set', label: 'Set variable' },
          { value: 'get', label: 'Get variable' },
          { value: 'update', label: 'Update variable' },
          { value: 'delete', label: 'Delete variable' },
          { value: 'increment', label: 'Increment counter' },
        ]} />
      <Input label="Variable name" value={(config.key as string) || ''} onChange={v => update({ key: v })} placeholder="my_variable" />
      {['set', 'update'].includes(action) && (
        <Input label="Value" value={(config.value as string) || ''} onChange={v => update({ value: v })} placeholder="Value or {{variable}}" />
      )}
      {action === 'get' && (
        <Input label="Default value" value={(config.default as string) || ''} onChange={v => update({ default: v })} placeholder="fallback" />
      )}
      {action === 'increment' && (
        <Input label="Increment by" value={(config.increment_by as number) || 1} onChange={v => update({ increment_by: Number(v) })} type="number" />
      )}
      <Toggle label="User-scoped (per user)" checked={(config.user_scoped as boolean) ?? true} onChange={v => update({ user_scoped: v })} />
    </>
  )
}

function SplitConfig({ config, update }: { config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }) {
  const branches: { label: string; weight: number }[] = (config.branches as { label: string; weight: number }[]) ?? [
    { label: 'A', weight: 50 }, { label: 'B', weight: 50 }
  ]
  const updateBranch = (i: number, patch: Partial<{ label: string; weight: number }>) =>
    update({ branches: branches.map((b, idx) => idx === i ? { ...b, ...patch } : b) })

  return (
    <>
      <SectionTitle>Branches</SectionTitle>
      {branches.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={b.label} onChange={e => updateBranch(i, { label: e.target.value })}
            className="w-16 bg-neutral-800 border border-neutral-700 text-white/80 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-violet-500" />
          <input type="number" value={b.weight} onChange={e => updateBranch(i, { weight: Number(e.target.value) })}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-white/80 text-xs px-2 py-1.5 rounded focus:outline-none focus:border-violet-500" />
          <span className="text-white/30 text-xs">%</span>
        </div>
      ))}
      <p className="text-white/25 text-[10px]">Weights are relative. A→left, B→right.</p>
    </>
  )
}

function LoopConfig({ config, update }: { config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Input label="List variable" value={(config.list_variable as string) || ''} onChange={v => update({ list_variable: v })} placeholder="my_list" />
      <Input label="Item variable name" value={(config.item_variable as string) || 'item'} onChange={v => update({ item_variable: v })} />
      <Input label="Max iterations" value={(config.max_iterations as number) || 10} onChange={v => update({ max_iterations: Number(v) })} type="number" />
    </>
  )
}

function TrackEventConfig({ config, update }: { config: Record<string, unknown>; update: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Input label="Event name" value={(config.event_name as string) || ''} onChange={v => update({ event_name: v })} placeholder="button_clicked" />
      <Textarea label="Properties (JSON)" value={(config.properties_json as string) || ''} onChange={v => update({ properties_json: v })} placeholder='{"source": "menu"}' rows={3} />
    </>
  )
}
