import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Plus, Zap, LogOut, Activity,
  Users, MessageSquare, ArrowRight, Loader2, X,
  Trash2, ChevronDown, ChevronRight, GitBranch
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { apiClient } from '../../lib/api/client'
import { cn } from '../../lib/utils'

// ── types ─────────────────────────────────────────────────────────────────────

type BotData = {
  id: string
  name: string
  username: string
  status: string
  total_users: number
  messages_today: number
}

type FlowData = {
  id: string
  name: string
  status: string
  version: number
}

// ── FlowRow ────────────────────────────────────────────────────────────────────

function FlowRow({ botId, flow, onOpen }: { botId: string; flow: FlowData; onOpen: () => void }) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/bots/${botId}/flows/${flow.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows', botId] })
      setConfirmDelete(false)
    },
  })

  const statusColor = flow.status === 'active'
    ? 'text-emerald-400' : flow.status === 'paused'
    ? 'text-amber-400' : 'text-neutral-500'

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors">
      <GitBranch size={13} className="text-violet-400 flex-shrink-0" />
      <span className="text-white/80 text-sm flex-1 truncate">{flow.name}</span>
      <span className={cn('text-[10px] font-medium capitalize flex-shrink-0', statusColor)}>
        {flow.status}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onOpen}
          className="text-white/40 hover:text-white/90 p-1 rounded transition-colors"
          title="Open editor"
        >
          <ArrowRight size={13} />
        </button>
        {confirmDelete ? (
          <>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-red-400 hover:text-red-300 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 font-medium"
            >
              {deleteMutation.isPending ? '…' : 'Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-white/30 hover:text-white/60 text-[10px] px-1.5 py-0.5 rounded"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-white/30 hover:text-red-400 p-1 rounded transition-colors"
            title="Delete flow"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── BotCard ───────────────────────────────────────────────────────────────────

function BotCard({ bot }: { bot: BotData }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingFlow, setAddingFlow] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')

  const { data: flows = [], isLoading: flowsLoading } = useQuery<FlowData[]>({
    queryKey: ['flows', bot.id],
    queryFn: () => apiClient.get(`/bots/${bot.id}/flows`).then(r => r.data),
    enabled: expanded,
  })

  const deleteBotMutation = useMutation({
    mutationFn: () => apiClient.delete(`/bots/${bot.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bots'] }),
  })

  const createFlowMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient.post(`/bots/${bot.id}/flows`, { name }).then(r => r.data),
    onSuccess: (flow: FlowData) => {
      queryClient.invalidateQueries({ queryKey: ['flows', bot.id] })
      setAddingFlow(false)
      setNewFlowName('')
      navigate(`/bots/${bot.id}/flows/${flow.id}`)
    },
  })

  const openFlow = async (flowId?: string) => {
    if (flowId) {
      navigate(`/bots/${bot.id}/flows/${flowId}`)
      return
    }
    // open first or create
    const list = flows.length > 0 ? flows : await apiClient.get(`/bots/${bot.id}/flows`).then(r => r.data)
    if (list.length > 0) {
      navigate(`/bots/${bot.id}/flows/${list[0].id}`)
    } else {
      const flow = await apiClient.post(`/bots/${bot.id}/flows`, { name: 'Main Flow' }).then(r => r.data)
      navigate(`/bots/${bot.id}/flows/${flow.id}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-neutral-900 border rounded-xl transition-colors',
        expanded ? 'border-neutral-700' : 'border-neutral-800 hover:border-neutral-700'
      )}
    >
      {/* Bot header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center text-lg flex-shrink-0">
              🤖
            </div>
            <div>
              <h3 className="text-white font-semibold leading-tight">{bot.name}</h3>
              <p className="text-white/40 text-sm">{bot.username ? `@${bot.username}` : 'No username'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              bot.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
            )}>
              {bot.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-white/30 text-xs mb-3">
          <span className="flex items-center gap-1"><Users size={11} />{bot.total_users} users</span>
          <span className="flex items-center gap-1"><Activity size={11} />{bot.messages_today} today</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openFlow()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600/20 hover:bg-violet-600/35
              text-violet-300 text-xs font-medium py-2 rounded-lg transition-colors"
          >
            <Zap size={12} />
            Open Builder
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className={cn(
              'flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors',
              expanded
                ? 'bg-neutral-700 text-white/80'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white/50 hover:text-white/80'
            )}
          >
            <GitBranch size={12} />
            Flows
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteBotMutation.mutate()}
                disabled={deleteBotMutation.isPending}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-2 rounded-lg bg-red-500/15 font-medium"
              >
                {deleteBotMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-white/30 hover:text-white/60 text-xs px-2 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-white/25 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Delete bot"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Flows panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-neutral-800"
          >
            <div className="p-2">
              {flowsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="text-white/30 animate-spin" />
                </div>
              ) : flows.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-3">No flows yet</p>
              ) : (
                flows.map(flow => (
                  <FlowRow
                    key={flow.id}
                    botId={bot.id}
                    flow={flow}
                    onOpen={() => openFlow(flow.id)}
                  />
                ))
              )}

              {addingFlow ? (
                <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
                  <input
                    autoFocus
                    value={newFlowName}
                    onChange={e => setNewFlowName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newFlowName.trim()) createFlowMutation.mutate(newFlowName.trim())
                      if (e.key === 'Escape') { setAddingFlow(false); setNewFlowName('') }
                    }}
                    placeholder="Flow name…"
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-white text-xs px-2 py-1.5
                      rounded-lg focus:border-violet-500 focus:outline-none placeholder:text-neutral-600"
                  />
                  <button
                    disabled={!newFlowName.trim() || createFlowMutation.isPending}
                    onClick={() => createFlowMutation.mutate(newFlowName.trim())}
                    className="text-violet-400 hover:text-violet-300 disabled:opacity-40 text-xs px-2 py-1.5
                      rounded-lg bg-violet-500/15 font-medium"
                  >
                    {createFlowMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => { setAddingFlow(false); setNewFlowName('') }}
                    className="text-white/30 hover:text-white/60 p-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingFlow(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/35
                    hover:text-violet-300 hover:bg-violet-500/10 text-xs transition-colors mt-1"
                >
                  <Plus size={12} />
                  New flow
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAddBot, setShowAddBot] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [botName, setBotName] = useState('')
  const [error, setError] = useState('')

  const { data: bots = [], isLoading } = useQuery<BotData[]>({
    queryKey: ['bots'],
    queryFn: () => apiClient.get('/bots').then(r => r.data),
  })

  const addBotMutation = useMutation({
    mutationFn: (data: { token: string; name?: string }) =>
      apiClient.post('/bots', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      setShowAddBot(false)
      setBotToken('')
      setBotName('')
      setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Failed to add bot')
    },
  })

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-bold">
            ⚡
          </div>
          <span className="text-white font-semibold text-lg">BotBuilder</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-sm">{user?.firstName} {user?.lastName}</span>
          <button
            onClick={() => { logout(); navigate('/auth') }}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Your Bots</h1>
          <p className="text-white/40">Build powerful Telegram bots without code</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Bots', value: bots.length, icon: Bot, color: 'violet' },
            { label: 'Active Flows', value: 0, icon: Zap, color: 'blue' },
            { label: 'Messages Today', value: 0, icon: MessageSquare, color: 'emerald' },
          ].map(stat => (
            <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center mb-3`}>
                <stat.icon size={18} className={`text-${stat.color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-white/40 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bots */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Connected Bots</h2>
          <button
            onClick={() => setShowAddBot(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white
              text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Bot
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-white/30 animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="border-2 border-dashed border-neutral-800 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-white/60 font-medium mb-2">No bots yet</h3>
            <p className="text-white/30 text-sm mb-6">Connect your first Telegram bot to start building</p>
            <button
              onClick={() => setShowAddBot(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium
                px-5 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus size={15} />
              Add Your First Bot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map(bot => <BotCard key={bot.id} bot={bot} />)}
            <button
              onClick={() => setShowAddBot(true)}
              className="border-2 border-dashed border-neutral-800 rounded-xl p-5 hover:border-violet-500/40
                hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-3
                min-h-[180px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center
                group-hover:bg-violet-500/20 transition-colors">
                <Plus size={20} className="text-violet-400" />
              </div>
              <span className="text-white/40 group-hover:text-violet-300 text-sm font-medium transition-colors">
                Add New Bot
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Add Bot Modal */}
      <AnimatePresence>
        {showAddBot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={e => e.target === e.currentTarget && setShowAddBot(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">Connect a Bot</h2>
                <button onClick={() => setShowAddBot(false)} className="text-white/40 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-1.5 block">Bot Token *</label>
                  <input
                    type="text"
                    placeholder="1234567890:AAH..."
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm
                      px-3 py-2.5 rounded-lg focus:border-violet-500 focus:outline-none placeholder:text-neutral-600"
                  />
                  <p className="text-white/30 text-xs mt-1">
                    Get token from <span className="text-blue-400">@BotFather</span> on Telegram
                  </p>
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1.5 block">Bot Name (optional)</label>
                  <input
                    type="text"
                    placeholder="My Awesome Bot"
                    value={botName}
                    onChange={e => setBotName(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm
                      px-3 py-2.5 rounded-lg focus:border-violet-500 focus:outline-none placeholder:text-neutral-600"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  disabled={!botToken || addBotMutation.isPending}
                  onClick={() => addBotMutation.mutate({ token: botToken, name: botName || undefined })}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed
                    text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {addBotMutation.isPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Connecting…</>
                  ) : 'Connect Bot'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
