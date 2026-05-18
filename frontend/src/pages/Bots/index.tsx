import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot, Plus, Trash2, Power, Edit, BarChart2,
  MessageSquare, Copy, Check, Wand2, Key, Loader2,
  ExternalLink, CheckCircle2, Clock, X, Search, Filter,
} from 'lucide-react'
import { useBotStore } from '@/store/bot.store'
import { botsApi } from '@/api/bots'
import { apiClient } from '@/api/client'
import { useMobile } from '@/hooks/useMobile'
import { toast } from '@/store/toast.store'
import { confirm } from '@/store/confirm.store'
import type { BotStats } from '@/types/bot'

// ── Local types ───────────────────────────────────────────────────────────────
type CreateTab  = 'auto' | 'manual'
type AutoStep   = 'form' | 'waiting' | 'done' | 'error'
type StatusFilter = 'all' | 'active' | 'draft'

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, onClick, danger, success, disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  success?: boolean
  disabled?: boolean
}) {
  const cls = danger
    ? 'bg-node-red/10 border-node-red/25 text-node-red'
    : success
    ? 'bg-green-500/10 border-green-500/25 text-green-500'
    : 'bg-tg-elevated border-tg-input text-tg-label'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 border rounded-[10px] px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap transition-opacity duration-150 h-9 hover:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {icon} {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BotsPage() {
  const { bots, fetchBots, createBot, deleteBot, activateBot, deactivateBot, isLoading } = useBotStore()
  const navigate = useNavigate()
  const isMobile = useMobile()
  const { t } = useTranslation()

  // ── Create modal state ───────────────────────────────────────────────────
  const [showCreate, setShowCreate]   = useState(false)
  const [createTab, setCreateTab]     = useState<CreateTab>('auto')

  // auto-create flow
  const [botName, setBotName]         = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [autoStep, setAutoStep]       = useState<AutoStep>('form')
  const [pendingId, setPendingId]     = useState('')
  const [tgLink, setTgLink]           = useState('')
  const [autoError, setAutoError]     = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // manual-create flow
  const [name, setName]     = useState('')
  const [token, setToken]   = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]   = useState('')

  // ── Per-bot stats ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Record<string, BotStats>>({})

  // ── Toggle loading ───────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  // ── Copied username ──────────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Search + filter ──────────────────────────────────────────────────────
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBots() }, [])

  useEffect(() => {
    bots.forEach((bot) => {
      apiClient.get<BotStats>(`/bots/${bot.id}/stats`)
        .then((r) => setStats((prev) => ({ ...prev, [bot.id]: r.data })))
        .catch(() => {})
    })
  }, [bots])

  // ── Auto-create polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (autoStep !== 'waiting' || !pendingId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/bots/pending/${pendingId}`)
        if (res.data.status === 'done') {
          clearInterval(pollRef.current!)
          await fetchBots()
          setAutoStep('done')
          setTimeout(() => resetCreate(), 1500)
        }
      } catch {}
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [autoStep, pendingId])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredBots = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bots
      .filter((b) => {
        if (q && !b.name.toLowerCase().includes(q) && !(b.username?.toLowerCase().includes(q))) return false
        if (statusFilter === 'active' && !b.is_active) return false
        if (statusFilter === 'draft' && b.is_active) return false
        return true
      })
  }, [bots, search, statusFilter])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const resetCreate = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setShowCreate(false)
    setBotName(''); setBotUsername('')
    setAutoStep('form'); setPendingId(''); setTgLink(''); setAutoError('')
    setName(''); setToken(''); setError('')
    setCreating(false)
  }

  const handleAutoCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setAutoError('')
    try {
      const res = await apiClient.post('/bots/request-managed', {
        bot_name: botName.trim(), bot_username: botUsername.trim(),
      })
      setPendingId(res.data.pending_id)
      setTgLink(res.data.link)
      setAutoStep('waiting')
      window.open(res.data.link, '_blank')
    } catch (err: any) {
      setAutoError(err.response?.data?.detail || 'Xatolik yuz berdi')
    }
  }

  const handleManualCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      await createBot(name, token)
      toast.success(t('bots.toast.created'))
      resetCreate()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = (username: string, botId: string) => {
    navigator.clipboard.writeText(`https://t.me/${username}`)
    setCopiedId(botId)
    setTimeout(() => setCopiedId(null), 2000)
  }

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

  // ── Form label helper ─────────────────────────────────────────────────────
  const lbl = (text: string) => (
    <label className="block text-xs text-tg-label mb-1.5">{text}</label>
  )

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className={`m-0 ${isMobile ? 'text-xl' : 'text-[22px]'} font-bold text-white tracking-[-0.4px]`}>
            {t('bots.title')}
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-tg-label">{t('bots.count', { count: bots.length })}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={`flex items-center gap-[7px] bg-tg-accent border-none rounded-xl ${isMobile ? 'px-[14px] py-[9px]' : 'px-[18px] py-[10px]'} text-white text-[13px] font-semibold cursor-pointer whitespace-nowrap shadow-[0_2px_12px_rgba(36,129,204,0.35)]`}
        >
          <Plus size={15} />
          {isMobile ? t('bots.add_short') : t('bots.add')}
        </button>
      </div>

      {/* ── Search + filter ───────────────────────────────────────────────── */}
      {bots.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-muted pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('bots.search')}
              className="w-full bg-tg-card border border-tg-input rounded-[10px] pl-9 pr-3 py-[9px] text-[13px] text-white outline-none focus:border-tg-accent transition-colors duration-150"
            />
          </div>
          <div className="relative">
            <Filter size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-tg-card border border-tg-input rounded-[10px] pl-8 pr-3 py-[9px] text-[13px] text-white outline-none focus:border-tg-accent transition-colors duration-150 cursor-pointer appearance-none"
            >
              <option value="all">{t('bots.filter.all')}</option>
              <option value="active">{t('bots.filter.active')}</option>
              <option value="draft">{t('bots.filter.draft')}</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
          <div className="bg-tg-bg rounded-2xl w-full max-w-[440px] border border-tg-input shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-[18px] pt-[18px] pb-[14px] border-b border-tg-input">
              <h2 className="m-0 text-base font-bold text-white">{t('bots.modal_title')}</h2>
              <button onClick={resetCreate} className="bg-tg-card border-none rounded-lg size-[30px] flex items-center justify-center cursor-pointer text-tg-label">
                <X size={14} />
              </button>
            </div>

            <div className="px-[18px] pt-3">
              <div className="seg-ctrl">
                {([['auto', Wand2, t('bots.tab_auto')], ['manual', Key, t('bots.tab_manual')]] as const).map(([tab, Icon, tabLabel]) => (
                  <button
                    key={tab}
                    onClick={() => setCreateTab(tab as CreateTab)}
                    className={`seg-btn${createTab === tab ? ' active' : ''} flex items-center justify-center gap-[5px]`}
                  >
                    <Icon size={12} /> {tabLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-[18px]">
              {/* AUTO tab */}
              {createTab === 'auto' && (
                <>
                  {autoStep === 'form' && (
                    <form onSubmit={handleAutoCreate} className="flex flex-col gap-[14px]">
                      <div className="bg-tg-card rounded-[10px] px-3 py-[10px] text-xs text-tg-label leading-relaxed">
                        Nom va username kiriting → Telegramda bir marta tasdiqlang → Bot avtomatik yaratiladi
                      </div>
                      {autoError && (
                        <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-3 py-[10px] text-[#ef5350] text-xs">
                          {autoError}
                        </div>
                      )}
                      <div>
                        {lbl('Bot nomi *')}
                        <input required value={botName} onChange={(e) => setBotName(e.target.value)}
                          className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] outline-none focus:border-tg-accent"
                          placeholder="Masalan: Mening Do'konim"
                        />
                      </div>
                      <div>
                        {lbl('Username *')}
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-label text-[13px] font-semibold">@</span>
                          <input required value={botUsername} onChange={(e) => setBotUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] pl-[26px] text-white text-[13px] font-mono outline-none focus:border-tg-accent"
                            placeholder="MyShopBot"
                          />
                        </div>
                        <p className="text-[11px] text-tg-muted mt-[5px] mb-0">Faqat lotin harflar, raqam, _. "bot" bilan tugashi shart.</p>
                      </div>
                      <div className="flex gap-[10px]">
                        <button type="button" onClick={resetCreate} className="flex-1 bg-tg-card border border-tg-input rounded-[10px] py-[10px] text-tg-label text-[13px] font-medium cursor-pointer">{t('common.cancel')}</button>
                        <button type="submit" className="flex-1 bg-tg-accent border-none rounded-[10px] py-[10px] text-white text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5">
                          <Wand2 size={14} /> {t('onboarding.next')}
                        </button>
                      </div>
                    </form>
                  )}

                  {autoStep === 'waiting' && (
                    <div className="flex flex-col gap-4">
                      <div className="text-center py-4">
                        <div className="size-[60px] rounded-full bg-tg-card flex items-center justify-center mx-auto mb-[14px]">
                          <Clock size={26} color="#2481cc" />
                        </div>
                        <p className="text-white font-semibold mb-1.5 mt-0 text-[15px]">Telegramda tasdiqlashingizni kutmoqda…</p>
                        <p className="text-tg-label text-xs m-0">Quyidagi havolani bosing va bot yaratishni tasdiqlang</p>
                      </div>
                      <a href={tgLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-tg-accent rounded-[10px] py-3 text-white text-sm font-semibold no-underline">
                        <ExternalLink size={16} /> Telegramda ochish
                      </a>
                      <div className="bg-tg-card rounded-[10px] px-[14px] py-3 flex flex-col gap-2">
                        {['Yuqoridagi tugmani bosing', 'Telegram ochiladi, tasdiqlang', "Bu sahifaga qaytib keling — bot qo'shiladi"].map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-tg-label">
                            <span className="size-[18px] rounded-full bg-tg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                            {step}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 justify-center text-tg-muted text-[11px]">
                        <Loader2 size={12} className="animate-spin" /> Tekshirilmoqda...
                      </div>
                      <button onClick={resetCreate} className="bg-tg-card border border-tg-input rounded-[10px] py-[9px] text-tg-label text-xs cursor-pointer">{t('common.cancel')}</button>
                    </div>
                  )}

                  {autoStep === 'done' && (
                    <div className="text-center py-8 flex flex-col items-center gap-3">
                      <div className="size-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                        <CheckCircle2 size={28} color="#4cd137" />
                      </div>
                      <p className="text-white font-bold m-0 text-base">{t('bots.toast.created')}</p>
                      <p className="text-tg-label text-xs m-0">{t('common.loading')}</p>
                    </div>
                  )}
                </>
              )}

              {/* MANUAL tab */}
              {createTab === 'manual' && (
                <form onSubmit={handleManualCreate} className="flex flex-col gap-[14px]">
                  <div className="bg-tg-card rounded-[10px] px-3 py-[10px] text-xs text-tg-label leading-relaxed">
                    <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                      className="text-tg-accent no-underline font-semibold">@BotFather</a>{' '}
                    → <code className="bg-tg-elevated px-[5px] py-px rounded">/newbot</code> → nom va username kiriting → tokenni nusxalang
                  </div>
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-3 py-[10px] text-[#ef5350] text-xs">
                      {error}
                    </div>
                  )}
                  <div>
                    {lbl('Bot nomi')}
                    <input required value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] outline-none focus:border-tg-accent"
                      placeholder="Mening Botim"
                    />
                  </div>
                  <div>
                    {lbl('Bot Token')}
                    <input value={token} onChange={(e) => setToken(e.target.value)}
                      className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] font-mono outline-none focus:border-tg-accent"
                      placeholder="123456789:ABC-DEF..."
                    />
                  </div>
                  <div className="flex gap-[10px]">
                    <button type="button" onClick={resetCreate} className="flex-1 bg-tg-card border border-tg-input rounded-[10px] py-[10px] text-tg-label text-[13px] font-medium cursor-pointer">{t('common.cancel')}</button>
                    <button type="submit" disabled={creating}
                      className={`flex-1 border-none rounded-[10px] py-[10px] text-[13px] font-semibold ${creating ? 'bg-tg-elevated text-tg-muted cursor-not-allowed' : 'bg-tg-accent text-white cursor-pointer'}`}>
                      {creating ? t('onboarding.adding') : t('bots.add_short')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bot list ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-tg-card rounded-xl h-[150px] animate-pulse" />
          ))}
        </div>

      ) : bots.length === 0 ? (
        <div className="text-center px-6 py-[52px] bg-tg-card rounded-[20px]">
          <Bot size={32} color="#4a6278" className="mx-auto mb-[14px] block" />
          <p className="text-white text-[15px] font-semibold m-0 mb-1.5">{t('bots.no_bots')}</p>
          <p className="text-tg-label text-[13px] m-0 mb-5">{t('bots.no_bots_desc')}</p>
          <button onClick={() => setShowCreate(true)}
            className="bg-tg-accent border-none rounded-[10px] px-6 py-[10px] text-white text-[13px] font-semibold cursor-pointer">
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
          {filteredBots.map((bot) => {
            const stat = stats[bot.id]
            const isToggling = togglingId === bot.id
            const isDuplicating = duplicatingId === bot.id

            return (
              <div key={bot.id} className="bg-tg-card rounded-[20px] px-[18px] py-4 shadow-[0_2px_16px_rgba(0,0,0,0.2)]">

                {/* ── Bot header ─────────────────────────────────────────── */}
                <div className="flex items-center gap-[14px] mb-[12px]">
                  <div className="size-[46px] rounded-[14px] bg-tg-accent/15 border border-tg-accent/25 flex items-center justify-center shrink-0">
                    <Bot size={20} color="#2481cc" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-white truncate tracking-[-0.2px]">
                      {bot.name}
                    </div>
                    {bot.username && (
                      <button
                        onClick={() => handleCopy(bot.username!, bot.id)}
                        className="bg-transparent border-none cursor-pointer flex items-center gap-1 text-tg-label text-xs p-0 mt-[3px]"
                      >
                        @{bot.username}
                        {copiedId === bot.id
                          ? <Check size={10} color="#4cd137" />
                          : <Copy size={10} />
                        }
                      </button>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 px-2 py-[3px] rounded-full ${bot.is_active ? 'text-green-500 bg-green-500/10' : 'text-tg-muted bg-tg-elevated'}`}>
                    {bot.is_active ? t('bots.status.active') : t('bots.status.draft')}
                  </span>
                </div>

                {/* ── Stats row ──────────────────────────────────────────── */}
                {stat && (
                  <div className="flex gap-4 mb-[12px] pb-[12px] border-b border-tg-input">
                    <div className="flex items-center gap-1.5 text-[11px] text-tg-label">
                      <span className="w-1.5 h-1.5 rounded-full bg-tg-accent shrink-0" />
                      {stat.total_users.toLocaleString()} {t('bots.users')}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-tg-label">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      {stat.active_users_7d} {t('bots.active_short')}
                    </div>
                    {stat.total_messages > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-tg-label">
                        <span className="w-1.5 h-1.5 rounded-full bg-node-amber shrink-0" />
                        {stat.total_messages.toLocaleString()} {t('bots.messages')}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Actions ────────────────────────────────────────────── */}
                <div className="flex gap-2 items-center flex-wrap">
                  {/* Edit Flow — primary */}
                  <button
                    onClick={() => navigate(`/bots/${bot.id}/flows`)}
                    className="flex items-center justify-center gap-1.5 bg-tg-accent border-none rounded-xl px-[14px] py-[9px] text-white text-[12px] font-semibold cursor-pointer flex-1 min-w-[80px]"
                  >
                    <Edit size={12} /> {t('bots.actions.flow')}
                  </button>

                  <ActionBtn
                    icon={<BarChart2 size={12} />}
                    label={t('bots.actions.analytics')}
                    onClick={() => navigate(`/analytics?bot=${bot.id}`)}
                  />

                  <ActionBtn
                    icon={<MessageSquare size={12} />}
                    label={t('bots.actions.chat')}
                    onClick={() => navigate(`/conversations?bot=${bot.id}`)}
                  />

                  <ActionBtn
                    icon={isToggling ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                    label={bot.is_active ? t('bots.actions.stop') : t('bots.actions.start')}
                    onClick={() => handleToggle(bot.id, bot.is_active)}
                    danger={bot.is_active}
                    success={!bot.is_active}
                    disabled={isToggling}
                  />

                  <button
                    onClick={() => handleDuplicate(bot.id, bot.name)}
                    disabled={isDuplicating}
                    title={t('bots.actions.duplicate')}
                    className="bg-transparent border border-tg-input rounded-[10px] size-9 flex items-center justify-center cursor-pointer text-tg-muted transition-all duration-150 shrink-0 hover:text-tg-accent hover:border-tg-accent/30 disabled:opacity-40"
                  >
                    {isDuplicating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                  </button>

                  <button
                    onClick={() => handleDelete(bot.id, bot.name)}
                    title={t('bots.actions.delete')}
                    className="bg-transparent border border-tg-input rounded-[10px] size-9 flex items-center justify-center cursor-pointer text-tg-muted transition-all duration-150 shrink-0 hover:text-node-red hover:bg-node-red/10 hover:border-node-red/30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
