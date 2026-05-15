import React from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useBuilderStore } from '../../../stores/builderStore'

export function ExecutionDebugger() {
  const { completedNodeIds, errorNodeIds, executingNodeIds, setExecutionMode, clearExecution } = useBuilderStore()

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700
        rounded-xl px-4 py-3 flex items-center gap-4 shadow-xl z-10"
    >
      <span className="text-white/60 text-xs font-medium">Execution Mode</span>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-yellow-400">
          <Loader2 size={12} className="animate-spin" />
          {executingNodeIds.size} running
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle size={12} />
          {completedNodeIds.size} done
        </span>
        {errorNodeIds.size > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle size={12} />
            {errorNodeIds.size} errors
          </span>
        )}
      </div>
      <button
        onClick={() => { setExecutionMode(false); clearExecution() }}
        className="text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
