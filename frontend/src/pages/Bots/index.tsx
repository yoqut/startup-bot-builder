import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Plus, Search } from 'lucide-react'
import { useBotStore } from '@/store/bot.store'
import { botsApi } from '@/api/bots'
import { apiClient } from '@/api/client'
import { useMobile } from '@/hooks/useMobile'
import { toast } from '@/store/toast.store'
import { confirm } from '@/store/confirm.store'
import type { BotStats } from '@/types/bot'
import BotCard from './BotCard'
import CreateBotModal from './CreateBotModal'

type StatusFilter = 'all' | 'active' | 'draft'

export default function BotsPage() {
  const { bots, fetchBots, deleteBot, activateBot, deactivateBot, isLoading } = useBotStore()
  const isMobile = useMobile()
  const { t } = useTranslation()

  const [showCreate, setShowCreate]       = useState(false)
  const [stats, setStats]                 = useState<Record<string, BotStats>>({})
  const [togglingId, setTogglingId]       = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')

  useEffect(() => { fetchBots() }, [])

  useEffect(() => {
    bots.forEach((bot) => {
      apiClient.get<BotStats>(`/bots/${bot.id}/stats`)
        .then((r) => setStats((prev) => ({ ...prev, [bot.id]: r.data })))
        .catch(() => {})
    })
  }, [bots])

  const filteredBots = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bots.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q) && !(b.username?.toLowerCase().includes(q))) return false
      if (statusFilter === 'active' && !b.is_active) return false
      if (statusFilter === 'draft' && b.is_active) return false
      return true
    })
  }, [bots, search, statusFilter])

  const handleToggle = async (id: string, isActive: boolean) => {
    setTogglingId(id)
    try {
      isActive ? await deactivateBot(id) : await activateBot(id)
    } catch {
      toast.error(t('bots.toast.toggle_error'))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (botId: string, name: string) => {
    const ok = await confirm({
      message: t('bots.confirm.delete', { name }),
      description: t('bots.confirm.delete_desc'),
      confirmLabel: t('bots.confirm.delete_label'),
      danger: true,
      countdown: 3,
    })
    if (!ok) return
    try {
      await deleteBot(botId)
      toast.success(t('bots.toast.deleted', { name }))
    } catch {
      toast.error(t('bots.toast.delete_error'))
    }
  }

  const handleDuplicate = async (botId: string, name: string) => {
    setDuplicatingId(botId)
    try {
      await botsApi.duplicate(botId)
      await fetchBots()
      toast.success(t('bots.toast.duplicated', { name }))
    } catch {
      toast.error(t('bots.toast.duplicate_error'))
    } finally {
      setDuplicatingId(null)
    }
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className={`m-0 ${isMobile ? 'text-xl' : 'text-[22px]'} font-bold text-white tracking-[-0.4px]`}>
            {t('bots.title')}
          </h1>
          <p className="mt-[3px] mb-0 text-[12px] text-tg-muted">{t('bots.count', { count: bots.length })}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={`flex items-center gap-[6px] bg-tg-accent border-none rounded-[12px] ${isMobile ? 'px-[12px] py-[8px]' : 'px-[16px] py-[9px]'} text-white text-[13px] font-semibold cursor-pointer whitespace-nowrap shadow-[0_2px_12px_rgba(36,129,204,0.3)] hover:bg-tg-accent/90 transition-colors`}
        >
          <Plus size={14} />
          {isMobile ? t('bots.add_short') : t('bots.add')}
        </button>
      </div>

      {/* ── Search + filter — shown only when there are bots ── */}
      {bots.length > 0 && (
        <div className="flex items-center gap-2 mb-4 bg-tg-card border border-tg-input rounded-[12px] px-3 py-[7px]">
          <Search size={13} className="text-tg-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('bots.search')}
            className="flex-1 bg-transparent border-none text-[13px] text-white outline-none placeholder:text-tg-muted"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-tg-muted hover:text-white text-[10px] bg-transparent border-none cursor-pointer shrink-0 px-1">✕</button>
          )}
          <div className="w-px h-4 bg-tg-input shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-transparent border-none text-[12px] text-tg-label outline-none cursor-pointer"
          >
            <option value="all">{t('bots.filter.all')}</option>
            <option value="active">{t('bots.filter.active')}</option>
            <option value="draft">{t('bots.filter.draft')}</option>
          </select>
        </div>
      )}

      {showCreate && <CreateBotModal onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="bg-tg-card rounded-xl h-[150px] animate-pulse" />)}
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center px-6 py-[52px] bg-tg-card rounded-[20px]">
          <Bot size={32} color="#4a6278" className="mx-auto mb-[14px] block" />
          <p className="text-white text-[15px] font-semibold m-0 mb-1.5">{t('bots.no_bots')}</p>
          <p className="text-tg-label text-[13px] m-0 mb-5">{t('bots.no_bots_desc')}</p>
          <button onClick={() => setShowCreate(true)} className="bg-tg-accent border-none rounded-[10px] px-6 py-[10px] text-white text-[13px] font-semibold cursor-pointer">
            {t('bots.add')}
          </button>
        </div>
      ) : filteredBots.length === 0 ? (
        <div className="text-center px-6 py-[40px] bg-tg-card rounded-[20px]">
          <Search size={28} color="#4a6278" className="mx-auto mb-3 block" />
          <p className="text-white text-[14px] font-semibold m-0 mb-1">{t('bots.empty')}</p>
          <p className="text-tg-label text-[12px] m-0">{t('bots.empty_desc')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              stat={stats[bot.id]}
              isToggling={togglingId === bot.id}
              isDuplicating={duplicatingId === bot.id}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
