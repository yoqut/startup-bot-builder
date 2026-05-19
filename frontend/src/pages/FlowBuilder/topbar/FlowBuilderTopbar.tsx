import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, EyeOff, Zap, Undo2, Redo2,
  Search, StickyNote, Layers, Keyboard, CheckCircle2, Loader2,
  ChevronDown,
} from 'lucide-react'
import { CHAT_TABS } from '../helpers/flowHelpers'
import type { FlowChatType } from '@/types/flow'

type SaveStatus = 'idle' | 'saving' | 'saved'

interface Props {
  chatType:           FlowChatType
  saveStatus:         SaveStatus
  isDirty:            boolean
  lastSaved:          Date | null
  canUndo:            boolean
  canRedo:            boolean
  isMobile:           boolean
  showSearch:         boolean
  showPreview:        boolean
  flowName?:          string
  isPublished?:       boolean
  publishedChatType?: string

  onUndo:              () => void
  onRedo:              () => void
  onSave:              () => void
  onPublish:           () => Promise<{ hasErrors: boolean }>
  onToggleSearch:      () => void
  onTogglePreview:     () => void
  onToggleShortcuts:   () => void
  onOpenTemplates:     () => void
  onAddSticky:         () => void
  onOpenNodeSheet:     () => void
  onToggleChatSheet:   () => void
}

function SaveStatus({ status, isDirty, lastSaved }: { status: SaveStatus; isDirty: boolean; lastSaved: Date | null }) {
  if (status === 'saving') return (
    <span className="flex items-center gap-1 text-[11px] text-tg-muted">
      <Loader2 size={10} className="animate-spin" /> Saqlanmoqda…
    </span>
  )
  if (status === 'saved') return (
    <span className="flex items-center gap-1 text-[11px] text-node-green">
      <CheckCircle2 size={10} /> Saqlandi
    </span>
  )
  if (isDirty) return <span className="text-[11px] text-node-amber">● O'zgartirilgan</span>
  if (lastSaved) {
    const mins = Math.floor((Date.now() - lastSaved.getTime()) / 60000)
    return <span className="text-[11px] text-tg-muted">{mins < 1 ? 'hozirgina' : `${mins} daq oldin`}</span>
  }
  return null
}

function IconBtn({ icon: Icon, onClick, active, disabled, title }: {
  icon: React.ElementType; onClick?: () => void
  active?: boolean; disabled?: boolean; title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-all duration-150',
        active   ? 'bg-tg-accent/15 border-tg-accent/35 text-tg-accent' : 'bg-tg-card border-tg-input text-tg-label hover:text-white hover:bg-tg-elevated',
        disabled ? 'opacity-30 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <Icon size={14} />
    </button>
  )
}

export default function FlowBuilderTopbar({
  chatType, saveStatus, isDirty, lastSaved,
  canUndo, canRedo, isMobile,
  showSearch, showPreview, flowName, isPublished,
  onUndo, onRedo, onSave, onPublish,
  onToggleSearch, onTogglePreview, onToggleShortcuts,
  onOpenTemplates, onAddSticky, onOpenNodeSheet, onToggleChatSheet,
}: Props) {
  const navigate = useNavigate()
  const activeTab = CHAT_TABS.find(t => t.key === chatType) || CHAT_TABS[0]
  const TabIcon = activeTab.icon

  return (
    <div className="flex items-center h-[52px] px-3 bg-tg-deep border-b border-tg-darkborder shrink-0 gap-2">

      {/* ── Zone 1: Back + Flow name + Save status ──────────────────────── */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-tg-label hover:text-white hover:bg-tg-card transition-colors duration-150 shrink-0"
          title="Orqaga"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex flex-col min-w-0 leading-none">
          <span className={`text-[13px] font-semibold text-white truncate ${isMobile ? 'max-w-[90px]' : 'max-w-[160px]'}`}>
            {flowName || 'Flow'}
          </span>
          <SaveStatus status={saveStatus} isDirty={isDirty} lastSaved={lastSaved} />
        </div>

        {/* Chat type badge */}
        <button
          onClick={onToggleChatSheet}
          className="flex items-center gap-[5px] bg-tg-card border border-tg-input rounded-lg py-[5px] px-[9px] text-tg-label text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap hover:bg-tg-elevated transition-colors duration-150"
        >
          <TabIcon size={11} className={activeTab.color} />
          {!isMobile && <span>{activeTab.label}</span>}
          <ChevronDown size={10} />
          {isPublished && <span className="w-[5px] h-[5px] rounded-full bg-node-green shrink-0" title="Nashr qilingan" />}
        </button>
      </div>

      {/* ── Zone 2: Secondary actions (desktop only) ─────────────────────── */}
      {!isMobile && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Undo / Redo grouped */}
          <div className="flex items-center border border-tg-input rounded-lg overflow-hidden">
            <button
              onClick={onUndo} disabled={!canUndo} title="Bekor qilish (Ctrl+Z)"
              className="flex items-center justify-center bg-tg-card border-none py-[7px] px-[9px] text-tg-label cursor-pointer transition-colors hover:bg-tg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 size={13} />
            </button>
            <div className="w-px h-4 bg-tg-input" />
            <button
              onClick={onRedo} disabled={!canRedo} title="Qaytarish (Ctrl+Y)"
              className="flex items-center justify-center bg-tg-card border-none py-[7px] px-[9px] text-tg-label cursor-pointer transition-colors hover:bg-tg-elevated disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <div className="w-px h-5 bg-tg-darkborder mx-0.5" />

          <IconBtn icon={Search}     onClick={onToggleSearch}    active={showSearch}   title="Qidirish (Ctrl+F)" />
          <IconBtn icon={StickyNote} onClick={onAddSticky}                             title="Eslatma qo'shish"  />
          <IconBtn icon={Layers}     onClick={onOpenTemplates}                         title="Shablonlar"        />
          <IconBtn icon={Keyboard}   onClick={onToggleShortcuts}                       title="Klaviatura (?)   " />
        </div>
      )}

      {/* Mobile: node sheet */}
      {isMobile && (
        <IconBtn icon={Layers} onClick={onOpenNodeSheet} title="Node qo'shish" />
      )}

      <div className="w-px h-5 bg-tg-darkborder mx-0.5 shrink-0" />

      {/* ── Zone 3: Primary actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onTogglePreview}
          title={showPreview ? 'Previewni yopish' : 'Preview'}
          className={[
            'flex items-center gap-1.5 border rounded-lg py-[7px] px-[9px] text-[12px] font-medium cursor-pointer transition-all duration-150',
            showPreview
              ? 'bg-tg-accent/15 border-tg-accent/35 text-tg-accent'
              : 'bg-tg-card border-tg-input text-tg-label hover:text-white',
          ].join(' ')}
        >
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          {!isMobile && <span>{showPreview ? 'Yopish' : 'Preview'}</span>}
        </button>

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title="Saqlash (Ctrl+S)"
          className="flex items-center gap-1.5 bg-tg-card border border-tg-input rounded-lg py-[7px] px-[9px] text-tg-label text-[12px] font-medium cursor-pointer transition-all duration-150 hover:text-white hover:bg-tg-elevated disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={13} />
          {!isMobile && <span>Saqlash</span>}
        </button>

        <button
          onClick={onPublish}
          className="flex items-center gap-[5px] bg-tg-accent border-none rounded-lg py-[7px] px-3 text-white text-[12px] font-semibold cursor-pointer transition-all duration-200 hover:bg-tg-accent/90 whitespace-nowrap shadow-[0_2px_8px_rgba(36,129,204,0.3)]"
        >
          <Zap size={13} />
          {isMobile ? '' : 'Nashr et'}
        </button>
      </div>
    </div>
  )
}
