import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart2, MessageSquare, Power, Copy, Trash2,
  Check, Loader2, MoreHorizontal, Edit,
  Users, Zap,
} from 'lucide-react'
import type { BotStats, Bot as BotType } from '@/types/bot'

// ── Avatar with initials + deterministic accent color ─────────────────────────
const AVATAR_COLORS = [
  '#8b5cf6', '#2481cc', '#e67e22', '#22c55e',
  '#e91e8c', '#00bcd4', '#f39c12', '#6366f1',
]

function BotAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <div
      className="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center shrink-0 text-[15px] font-bold select-none"
      style={{
        background: `${color}20`,
        border: `1.5px solid ${color}45`,
        color,
      }}
    >
      {initials}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: number; label: string; color: string
}) {
  return (
    <div className="flex items-center gap-[5px] text-[11px] text-tg-label">
      <Icon size={11} color={color} />
      <span className="font-semibold text-white">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  )
}

// ── Primary action button ─────────────────────────────────────────────────────
function PrimaryBtn({ icon: Icon, label, onClick, accent }: {
  icon: React.ElementType; label: string; onClick: () => void; accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex items-center justify-center gap-[6px] rounded-[10px] py-[8px] text-[12px] font-semibold cursor-pointer border transition-all duration-150',
        accent
          ? 'bg-tg-accent border-transparent text-white shadow-[0_2px_8px_rgba(36,129,204,0.3)] hover:bg-tg-accent/90'
          : 'bg-tg-elevated border-tg-input text-tg-label hover:text-white hover:bg-[#2e3f52]',
      ].join(' ')}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// ── MoreMenu ──────────────────────────────────────────────────────────────────
function MoreMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={[
          'w-[34px] h-[34px] rounded-[10px] flex items-center justify-center border cursor-pointer transition-all duration-150',
          open
            ? 'bg-tg-elevated border-tg-border text-white'
            : 'bg-tg-elevated border-tg-input text-tg-muted hover:text-white hover:border-tg-border',
        ].join(' ')}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-[calc(100%+6px)] bg-tg-card border border-tg-input rounded-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] py-1.5 z-50 min-w-[160px] animate-modal-in">
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }: {
  icon: React.ElementType; label: string; onClick: () => void
  danger?: boolean; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-[8px] text-[12px] font-medium cursor-pointer bg-transparent border-none text-left transition-colors duration-120',
        danger
          ? 'text-node-red hover:bg-node-red/10'
          : 'text-tg-label hover:text-white hover:bg-tg-elevated',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────
interface Props {
  bot: BotType
  stat?: BotStats
  isToggling: boolean
  isDuplicating: boolean
  onToggle: (id: string, isActive: boolean) => void
  onDuplicate: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
}

export default function BotCard({
  bot, stat, isToggling, isDuplicating,
  onToggle, onDuplicate, onDelete,
}: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!bot.username) return
    navigator.clipboard.writeText(`https://t.me/${bot.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-tg-card border border-tg-input rounded-[18px] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.2)] hover:border-tg-border transition-colors duration-200">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BotAvatar name={bot.name} />

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-white truncate tracking-[-0.2px]">
            {bot.name}
          </div>
          {bot.username ? (
            <button
              onClick={handleCopy}
              className="flex items-center gap-[5px] text-tg-muted text-[12px] mt-[2px] bg-transparent border-none cursor-pointer p-0 hover:text-tg-label transition-colors"
            >
              @{bot.username}
              {copied
                ? <Check size={10} className="text-node-green" />
                : <Copy size={10} />
              }
            </button>
          ) : (
            <span className="text-tg-muted/50 text-[11px] italic">username yo'q</span>
          )}
        </div>

        {/* Status badge */}
        <div className={[
          'shrink-0 flex items-center gap-[5px] px-[9px] py-[4px] rounded-full text-[11px] font-semibold',
          bot.is_active
            ? 'bg-node-green/12 text-node-green'
            : 'bg-tg-elevated text-tg-muted',
        ].join(' ')}>
          <span className={`w-[5px] h-[5px] rounded-full ${bot.is_active ? 'bg-node-green' : 'bg-tg-muted'}`} />
          {bot.is_active ? t('bots.status.active') : t('bots.status.draft')}
        </div>
      </div>

      {/* ── Stats row ── */}
      {stat !== undefined && (
        <div className="flex items-center gap-4 px-4 py-[8px] border-t border-b border-tg-input bg-tg-elevated/40">
          <StatPill icon={Users} value={stat?.total_users ?? 0}      label={t('bots.users')}        color="#2481cc" />
          <StatPill icon={Zap}   value={stat?.active_users_7d ?? 0}  label={t('bots.active_short')} color="#22c55e" />
          {(stat?.total_messages ?? 0) > 0 && (
            <StatPill icon={MessageSquare} value={stat!.total_messages} label={t('bots.messages')} color="#f39c12" />
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <PrimaryBtn
          icon={Edit}
          label={t('bots.actions.flow')}
          onClick={() => navigate(`/bots/${bot.id}/flows`)}
          accent
        />
        <PrimaryBtn
          icon={BarChart2}
          label={t('bots.actions.analytics')}
          onClick={() => navigate(`/analytics?bot=${bot.id}`)}
        />
        <PrimaryBtn
          icon={MessageSquare}
          label={t('bots.actions.chat')}
          onClick={() => navigate(`/conversations?bot=${bot.id}`)}
        />

        {/* More menu — destructive + secondary actions */}
        <MoreMenu>
          <MenuItem
            icon={isToggling ? Loader2 : Power}
            label={bot.is_active ? t('bots.actions.stop') : t('bots.actions.start')}
            onClick={() => onToggle(bot.id, bot.is_active)}
            danger={bot.is_active}
            disabled={isToggling}
          />
          <MenuItem
            icon={isDuplicating ? Loader2 : Copy}
            label={t('bots.actions.duplicate')}
            onClick={() => onDuplicate(bot.id, bot.name)}
            disabled={isDuplicating}
          />
          <div className="h-px bg-tg-input mx-2 my-1" />
          <MenuItem
            icon={Trash2}
            label={t('bots.actions.delete')}
            onClick={() => onDelete(bot.id, bot.name)}
            danger
          />
        </MoreMenu>
      </div>
    </div>
  )
}
