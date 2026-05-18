import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot, Users, Activity, MessageSquare,
  Plus, Radio, Edit, ChevronRight,
} from 'lucide-react'
import { useBotStore } from '@/store/bot.store'
import { botsApi } from '@/api/bots'
import type { BotStats } from '@/types/bot'
import StatCard from '@/components/shared/StatCard'
import OnboardingCard from '@/components/shared/OnboardingCard'

interface AggStats {
  total_users: number
  active_users_7d: number
  total_messages: number
}

function BotRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-[38px] rounded-full bg-tg-elevated animate-pulse shrink-0" />
      <div className="flex-1 flex flex-col gap-[7px]">
        <div className="h-[13px] w-28 bg-tg-elevated rounded animate-pulse" />
        <div className="h-[10px] w-16 bg-tg-elevated/60 rounded animate-pulse" />
      </div>
      <div className="h-[18px] w-10 bg-tg-elevated/60 rounded-full animate-pulse" />
    </div>
  )
}

function QuickAction({
  icon: Icon, label, desc, iconClass, iconBgClass, onClick,
}: {
  icon: React.ElementType
  label: string
  desc: string
  iconClass: string
  iconBgClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full bg-transparent border-none cursor-pointer text-left px-4 py-3 transition-colors duration-100 hover:bg-tg-elevated/50 active:bg-tg-elevated"
    >
      <div className={`w-9 h-9 rounded-[10px] ${iconBgClass} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconClass} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white">{label}</div>
        <div className="text-[11px] text-tg-label">{desc}</div>
      </div>
      <ChevronRight size={14} className="text-tg-muted shrink-0" />
    </button>
  )
}

function SectionHeader({
  title, action, onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <span className="text-[11px] font-bold text-tg-label uppercase tracking-[0.5px]">
        {title}
      </span>
      {action && onAction && (
        <button
          onClick={onAction}
          className="bg-transparent border-none cursor-pointer text-tg-accent text-[12px] flex items-center gap-[3px] font-medium"
        >
          {action}
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { bots, fetchBots, isLoading } = useBotStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [aggStats, setAggStats] = useState<AggStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => { fetchBots() }, [])

  useEffect(() => {
    if (bots.length === 0) return
    setStatsLoading(true)
    Promise.all(
      bots.map((b) => botsApi.stats(b.id).then((r) => r.data).catch(() => null))
    )
      .then((results) => {
        const valid = results.filter((r): r is BotStats => r !== null)
        setAggStats(
          valid.reduce<AggStats>(
            (acc, s) => ({
              total_users:     acc.total_users     + s.total_users,
              active_users_7d: acc.active_users_7d + s.active_users_7d,
              total_messages:  acc.total_messages  + s.total_messages,
            }),
            { total_users: 0, active_users_7d: 0, total_messages: 0 }
          )
        )
      })
      .finally(() => setStatsLoading(false))
  }, [bots])

  const activeBots  = bots.filter((b) => b.is_active).length
  const recentBots  = [...bots]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  const firstLoad   = isLoading && bots.length === 0
  const isEmpty     = !isLoading && bots.length === 0
  const cardLoading = firstLoad || statsLoading

  return (
    <div className="flex flex-col gap-5">

      {/* ── 1. Stats grid ──────────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title={t('dashboard.section_stats')} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t('dashboard.stats.total_users')}
            value={aggStats?.total_users ?? 0}
            icon={Users}
            iconClass="text-tg-accent"
            iconBgClass="bg-tg-accent/10"
            isLoading={cardLoading}
          />
          <StatCard
            label={t('dashboard.stats.active_users')}
            value={aggStats?.active_users_7d ?? 0}
            icon={Activity}
            iconClass="text-green-400"
            iconBgClass="bg-green-500/10"
            isLoading={cardLoading}
          />
          <StatCard
            label={t('dashboard.stats.active_bots')}
            value={firstLoad ? 0 : activeBots}
            icon={Bot}
            iconClass="text-node-violet"
            iconBgClass="bg-node-violet/10"
            isLoading={firstLoad}
          />
          <StatCard
            label={t('dashboard.stats.messages_today')}
            value={aggStats?.total_messages ?? 0}
            icon={MessageSquare}
            iconClass="text-node-amber"
            iconBgClass="bg-node-amber/10"
            isLoading={cardLoading}
          />
        </div>
      </div>

      {/* ── 2. Onboarding OR Recent bots ───────────────────────────────────────── */}
      {isEmpty ? (
        <OnboardingCard />
      ) : (
        <div>
          <SectionHeader
            title={t('dashboard.section_recent')}
            action={t('dashboard.see_all')}
            onAction={() => navigate('/bots')}
          />
          <div className="bg-tg-card rounded-[18px] overflow-hidden">
            {firstLoad ? (
              <>
                <BotRowSkeleton />
                <div className="h-px bg-tg-input mx-4" />
                <BotRowSkeleton />
                <div className="h-px bg-tg-input mx-4" />
                <BotRowSkeleton />
              </>
            ) : (
              recentBots.map((bot, i) => (
                <div key={bot.id}>
                  {i > 0 && <div className="h-px bg-tg-input mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-[11px]">
                    <div className="size-[38px] rounded-full bg-tg-accent/15 border border-tg-accent/20 flex items-center justify-center shrink-0">
                      <Bot size={17} className="text-tg-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{bot.name}</div>
                      {bot.username && (
                        <div className="text-[11px] text-tg-muted mt-[2px]">@{bot.username}</div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-[3px] rounded-full shrink-0 ${
                        bot.is_active ? 'text-green-400 bg-green-500/10' : 'text-tg-muted bg-tg-elevated'
                      }`}
                    >
                      {bot.is_active ? t('bots.status.active') : t('bots.status.draft')}
                    </span>
                    <button
                      onClick={() => navigate(`/bots/${bot.id}/flows`)}
                      title={t('common.edit')}
                      className="size-7 rounded-[8px] bg-tg-elevated border border-tg-input flex items-center justify-center cursor-pointer text-tg-label hover:text-tg-accent hover:border-tg-accent/30 transition-colors duration-100 shrink-0 ml-1"
                    >
                      <Edit size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 3. Quick actions ───────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title={t('dashboard.section_quick')} />
        <div className="bg-tg-card rounded-[18px] overflow-hidden divide-y divide-tg-input">
          <QuickAction
            icon={Plus}
            label={t('dashboard.quick.create_bot')}
            desc={t('dashboard.quick.create_bot_desc')}
            iconClass="text-tg-accent"
            iconBgClass="bg-tg-accent/10"
            onClick={() => navigate('/bots')}
          />
          <QuickAction
            icon={MessageSquare}
            label={t('dashboard.quick.conversations')}
            desc={t('dashboard.quick.conversations_desc')}
            iconClass="text-green-400"
            iconBgClass="bg-green-500/10"
            onClick={() => navigate('/conversations')}
          />
          <QuickAction
            icon={Radio}
            label={t('dashboard.quick.broadcast')}
            desc={t('dashboard.quick.broadcast_desc')}
            iconClass="text-node-amber"
            iconBgClass="bg-node-amber/10"
            onClick={() => navigate('/broadcast')}
          />
        </div>
      </div>

    </div>
  )
}
