import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Undo2, Redo2, Save, Play, Pause, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { useBuilderStore } from '../../../stores/builderStore'
import { flowsApi } from '../../../lib/api/flows'
import { useMutation } from '@tanstack/react-query'
import { cn } from '../../../lib/utils'

export function BuilderToolbar() {
  const navigate = useNavigate()
  const { botId, flowId } = useParams<{ botId: string; flowId: string }>()
  const {
    flowName, isDirty, isSaving, lastSavedAt,
    undo, redo, past, future,
    setFlowName, nodes, edges, viewport
  } = useBuilderStore()

  const saveMutation = useMutation({
    mutationFn: () => flowsApi.updateFlow(botId!, flowId!, { name: flowName, nodes, edges, viewport }),
    onSuccess: () => {
      useBuilderStore.setState({ isDirty: false, isSaving: false, lastSavedAt: new Date() })
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => flowsApi.activateFlow(botId!, flowId!),
  })

  const generateAI = async () => {
    const description = prompt('Describe your bot flow:')
    if (!description) return
    const flow = await flowsApi.generateWithAI(botId!, description)
    useBuilderStore.setState({
      nodes: flow.nodes || [],
      edges: flow.edges || [],
      isDirty: true,
    })
  }

  return (
    <div className="h-12 bg-neutral-950 border-b border-neutral-800 flex items-center px-4 gap-3 shrink-0">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={15} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      <div className="w-px h-5 bg-neutral-800" />

      {/* Flow name */}
      <input
        type="text"
        value={flowName}
        onChange={e => setFlowName(e.target.value)}
        className="bg-transparent text-white text-sm font-medium focus:outline-none
          border-b border-transparent focus:border-neutral-600 px-1 py-0.5 min-w-0 w-40"
      />

      {/* Save status */}
      <div className="flex items-center gap-1.5 text-xs">
        {isSaving && <Loader2 size={12} className="text-white/40 animate-spin" />}
        {!isSaving && isDirty && <span className="text-amber-400/80">Unsaved</span>}
        {!isSaving && !isDirty && lastSavedAt && (
          <span className="text-white/30 flex items-center gap-1">
            <CheckCircle size={11} className="text-emerald-500" />
            Saved
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={past.length === 0}
        className="text-white/40 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors p-1.5 rounded-md hover:bg-white/5"
        title="Undo (⌘Z)"
      >
        <Undo2 size={15} />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        className="text-white/40 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors p-1.5 rounded-md hover:bg-white/5"
        title="Redo (⌘⇧Z)"
      >
        <Redo2 size={15} />
      </button>

      <div className="w-px h-5 bg-neutral-800" />

      {/* AI Generate */}
      <button
        onClick={generateAI}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300
          bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
        title="Generate flow with AI"
      >
        <Sparkles size={13} />
        AI Generate
      </button>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={!isDirty || saveMutation.isPending}
        className={cn(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium',
          isDirty
            ? 'bg-white/10 hover:bg-white/15 text-white'
            : 'bg-transparent text-white/30 cursor-default'
        )}
      >
        {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        Save
      </button>

      {/* Activate */}
      <button
        onClick={() => activateMutation.mutate()}
        disabled={activateMutation.isPending}
        className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500
          text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
      >
        {activateMutation.isPending
          ? <Loader2 size={13} className="animate-spin" />
          : <Play size={13} />
        }
        Publish
      </button>
    </div>
  )
}
