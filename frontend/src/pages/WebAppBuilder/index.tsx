import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay,
  useSensor, useSensors, MouseSensor, TouchSensor,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  Save, Undo2, Redo2, ArrowLeft, Plus, Trash2,
  Eye, EyeOff, Layers, PanelLeft, PanelRight, Loader2, Edit3,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useWebAppStore, useWebAppHistory } from '@/store/webapp.store'
import { useMobile } from '@/hooks/useMobile'
import Canvas from './Canvas'
import ComponentPalette, { PaletteDragGhost } from './ComponentPalette'
import PropertiesPanel from './PropertiesPanel'
import LayerTree from './LayerTree'
import type { WbNodeType } from '@/types/webapp'

// ── Toolbar button ─────────────────────────────────────────────────────────────

function TBtn({
  onClick, children, active, disabled, danger, title,
}: {
  onClick?: () => void
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        h-8 px-[10px] flex items-center gap-1.5 rounded-lg border-none
        text-[12px] font-medium cursor-pointer transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${danger
          ? 'bg-node-red/10 text-node-red hover:bg-node-red/20'
          : active
          ? 'bg-tg-accent text-white'
          : 'bg-tg-card text-tg-label hover:bg-tg-elevated hover:text-white'
        }
      `}
    >
      {children}
    </button>
  )
}

// ── Page tab ──────────────────────────────────────────────────────────────────

function PageTabs() {
  const { pages, currentPageIndex, setCurrentPage, addPage, deletePage } = useWebAppStore(useShallow((s) => ({
    pages:             s.pages,
    currentPageIndex:  s.currentPageIndex,
    setCurrentPage:    s.setCurrentPage,
    addPage:           s.addPage,
    deletePage:        s.deletePage,
  })))

  const handleAdd = () => {
    const name = prompt('Sahifa nomi:', `Sahifa ${pages.length + 1}`)
    if (name?.trim()) addPage(name.trim())
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {pages.map((page, i) => (
        <div key={page.id} className="flex items-center shrink-0">
          <button
            onClick={() => setCurrentPage(i)}
            className={`
              h-7 px-3 flex items-center gap-1.5 rounded-lg border-none
              text-[12px] font-medium cursor-pointer transition-all whitespace-nowrap
              ${i === currentPageIndex
                ? 'bg-tg-accent/20 text-tg-accent'
                : 'bg-transparent text-tg-label hover:bg-tg-card hover:text-white'
              }
            `}
          >
            {page.name}
          </button>
          {pages.length > 1 && i === currentPageIndex && (
            <button
              onClick={() => deletePage(page.id)}
              className="size-5 ml-0.5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-tg-muted hover:text-node-red transition-colors"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="size-7 shrink-0 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer text-tg-muted hover:text-white hover:bg-tg-card transition-all"
        title="Sahifa qo'shish"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ── Mobile bottom bar ─────────────────────────────────────────────────────────

const MOBILE_TABS = [
  { key: 'palette', label: 'Komponent', icon: Plus,   color: '#2481cc' },
  { key: 'layers',  label: 'Qatlamlar', icon: Layers,  color: '#8b5cf6' },
  { key: 'props',   label: 'Sozlash',   icon: Edit3,   color: '#10b981' },
] as const

function MobileBottomBar() {
  const { activePanel, setActivePanel } = useWebAppStore(useShallow((s) => ({
    activePanel:    s.activePanel,
    setActivePanel: s.setActivePanel,
  })))

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex bg-tg-bg border-t border-tg-darkborder"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {MOBILE_TABS.map(({ key, label, icon: Icon, color }) => {
        const isActive = activePanel === key
        return (
          <button
            key={key}
            onClick={() => setActivePanel(key)}
            className="flex-1 flex flex-col items-center justify-center h-14 gap-[3px] bg-transparent border-none cursor-pointer transition-all active:scale-95"
          >
            <div
              className={`size-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isActive ? 'scale-110' : ''}`}
              style={{ background: isActive ? color + '22' : 'transparent' }}
            >
              <Icon size={19} style={{ color: isActive ? color : '#4a6278' }} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
            <span
              className="text-[10px] font-semibold transition-colors leading-none"
              style={{ color: isActive ? color : '#4a6278' }}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Mobile panel sheet ─────────────────────────────────────────────────────────

function MobileSheet({ children, open }: { children: React.ReactNode; open: boolean }) {
  if (!open) return null
  return (
    <div
      className="fixed left-0 right-0 z-[9997] bg-tg-bg border-t border-tg-border rounded-t-[20px] overflow-hidden flex flex-col animate-sheet-in shadow-[0_-12px_40px_rgba(0,0,0,0.5)]"
      style={{ bottom: 56, height: '60vh' }}
    >
      {/* drag handle */}
      <div className="flex justify-center pt-[10px] pb-[4px] shrink-0">
        <div className="w-9 h-[4px] bg-tg-darkborder rounded-full" />
      </div>
      {children}
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────────────────

export default function WebAppBuilderPage() {
  const params   = useParams<{ botId: string }>()
  const navigate = useNavigate()
  const isMobile = useMobile()

  const {
    loadApp, saveApp, isDirty, isSaving,
    pages, currentPageIndex,
    selectedNodeId, activePanel, setActivePanel,
  } = useWebAppStore(useShallow((s) => ({
    loadApp:          s.loadApp,
    saveApp:          s.saveApp,
    isDirty:          s.isDirty,
    isSaving:         s.isSaving,
    pages:            s.pages,
    currentPageIndex: s.currentPageIndex,
    selectedNodeId:   s.selectedNodeId,
    activePanel:      s.activePanel,
    setActivePanel:   s.setActivePanel,
  })))

  const { undo, redo, canUndo, canRedo } = useWebAppHistory()

  const [showLeftPanel,  setShowLeftPanel]  = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [previewMode,    setPreviewMode]    = useState(false)
  const [activeDragType, setActiveDragType] = useState<WbNodeType | null>(null)
  const [loading,        setLoading]        = useState(true)

  // ── Load app ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!params.botId) return
    setLoading(true)
    loadApp(params.botId).finally(() => setLoading(false))
  }, [params.botId])

  // ── Auto-save every 30s ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return
    const t = setTimeout(() => saveApp(), 30_000)
    return () => clearTimeout(t)
  }, [isDirty])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if (ctrl && e.key === 's') { e.preventDefault(); saveApp() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, saveApp])

  // ── DnD sensors ────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragStart = useCallback((e: DragStartEvent) => {
    if (e.active.data.current?.source === 'palette') {
      setActiveDragType(e.active.data.current.type as WbNodeType)
    }
  }, [])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveDragType(null)
    const { active, over } = e
    if (!over) return
    if (active.data.current?.source !== 'palette') return
    if (over.id === 'canvas-root') {
      useWebAppStore.getState().addNode(active.data.current.type as WbNodeType)
    }
  }, [])

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 bg-tg-bg flex items-center justify-center">
        <Loader2 size={28} color="#2481cc" className="animate-spin" />
      </div>
    )
  }

  const currentPage = pages[currentPageIndex]

  // ── Desktop layout ──────────────────────────────────────────────────────────

  if (!isMobile) {
    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={`flex flex-col overflow-hidden h-canvas -m-4 -mt-5`}>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-tg-darkborder bg-tg-bg shrink-0 h-[48px]">
            {/* Left */}
            <TBtn onClick={() => navigate(-1)} title="Orqaga">
              <ArrowLeft size={14} />
            </TBtn>

            <div className="w-px h-5 bg-tg-border mx-1 shrink-0" />

            <TBtn onClick={undo} disabled={!canUndo} title="Ctrl+Z">
              <Undo2 size={14} />
            </TBtn>
            <TBtn onClick={redo} disabled={!canRedo} title="Ctrl+Y">
              <Redo2 size={14} />
            </TBtn>

            <div className="w-px h-5 bg-tg-border mx-1 shrink-0" />

            {/* Page tabs */}
            <div className="flex-1 overflow-hidden">
              <PageTabs />
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TBtn onClick={() => setShowLeftPanel((v) => !v)} active={showLeftPanel} title="Sol panel">
                <PanelLeft size={14} />
              </TBtn>
              <TBtn onClick={() => setShowRightPanel((v) => !v)} active={showRightPanel} title="O'ng panel">
                <PanelRight size={14} />
              </TBtn>
              <TBtn onClick={() => setPreviewMode((v) => !v)} active={previewMode} title="Preview">
                {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>Preview</span>
              </TBtn>
              <TBtn onClick={saveApp} active={isSaving} title="Ctrl+S">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isDirty ? 'Saqlash*' : 'Saqlandi'}</span>
              </TBtn>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Component palette or Layer tree */}
            {showLeftPanel && !previewMode && (
              <div className="w-[220px] shrink-0 flex flex-col overflow-hidden border-r border-tg-darkborder">
                {/* Sub-tabs */}
                <div className="flex border-b border-tg-darkborder shrink-0">
                  {[
                    { key: 'palette', icon: Plus,   label: 'Komponent' },
                    { key: 'layers',  icon: Layers,  label: 'Qatlamlar' },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setActivePanel(key as any)}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 py-[9px] border-none cursor-pointer
                        text-[11px] font-semibold transition-all
                        ${activePanel === key
                          ? 'bg-tg-card text-tg-accent border-b-2 border-tg-accent -mb-px'
                          : 'bg-tg-bg text-tg-muted hover:text-white'
                        }
                      `}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden">
                  {activePanel === 'palette' ? <ComponentPalette /> : <LayerTree />}
                </div>
              </div>
            )}

            {/* Canvas */}
            <Canvas />

            {/* Right: Properties */}
            {showRightPanel && !previewMode && (
              <div className="w-[260px] shrink-0 overflow-hidden">
                <PropertiesPanel />
              </div>
            )}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeDragType && <PaletteDragGhost type={activeDragType} />}
        </DragOverlay>
      </DndContext>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────

  const currentPageName = pages[currentPageIndex]?.name ?? 'Ana sahifa'

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col overflow-hidden h-canvas -m-4 -mt-5">

        {/* Mobile toolbar */}
        <div className="flex items-center gap-2 px-3 border-b border-tg-darkborder bg-tg-bg shrink-0 h-[52px]">

          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="size-9 shrink-0 flex items-center justify-center rounded-xl bg-tg-card border border-tg-darkborder active:scale-90 transition-transform"
          >
            <ArrowLeft size={16} color="#7d9ab5" />
          </button>

          {/* Page name — center */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] font-medium text-tg-muted leading-none mb-[3px]">Mini App Builder</span>
            <span className="text-[13px] font-semibold text-white leading-none truncate max-w-full px-2">
              {currentPageName}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-[6px] shrink-0">
            <button
              onClick={() => undo()}
              disabled={!canUndo}
              className="size-9 flex items-center justify-center rounded-xl bg-tg-card border border-tg-darkborder disabled:opacity-30 active:scale-90 transition-transform"
            >
              <Undo2 size={15} color="#7d9ab5" />
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo}
              className="size-9 flex items-center justify-center rounded-xl bg-tg-card border border-tg-darkborder disabled:opacity-30 active:scale-90 transition-transform"
            >
              <Redo2 size={15} color="#7d9ab5" />
            </button>
            <button
              onClick={saveApp}
              className={`
                h-9 px-[10px] rounded-xl flex items-center gap-[5px] border transition-all active:scale-90
                ${isDirty ? 'bg-tg-accent border-tg-accent' : 'bg-tg-card border-tg-darkborder'}
              `}
            >
              {isSaving
                ? <Loader2 size={14} className="animate-spin" color="#fff" />
                : <Save size={14} color={isDirty ? '#fff' : '#7d9ab5'} />
              }
              <span className={`text-[12px] font-semibold ${isDirty ? 'text-white' : 'text-tg-muted'}`}>
                {isDirty ? 'Saqlash' : 'OK'}
              </span>
            </button>
          </div>
        </div>

        {/* Canvas fills remaining space */}
        <div className={`flex-1 overflow-hidden ${!previewMode ? 'pb-bottomnav' : ''}`}>
          <Canvas />
        </div>

        {/* Mobile panel sheets (overlay) */}
        {!previewMode && (
          <>
            <MobileSheet open={activePanel === 'palette'}>
              <ComponentPalette />
            </MobileSheet>
            <MobileSheet open={activePanel === 'layers'}>
              <LayerTree />
            </MobileSheet>
            <MobileSheet open={activePanel === 'props'}>
              <PropertiesPanel />
            </MobileSheet>
          </>
        )}

        {!previewMode && <MobileBottomBar />}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragType && <PaletteDragGhost type={activeDragType} />}
      </DragOverlay>
    </DndContext>
  )
}
