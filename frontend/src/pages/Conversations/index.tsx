import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Search, User, ChevronRight, Bot, ArrowLeft } from 'lucide-react'
import { useBotStore } from '@/store/bot.store'
import { conversationsApi, type BotUserItem, type ConversationMessage } from '@/api/conversations'

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Hozirgina'
  if (m < 60) return `${m} daqiqa oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return `${Math.floor(h / 24)} kun oldin`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationsPage() {
  const { bots, fetchBots } = useBotStore()
  const [selectedBotId, setSelectedBotId] = useState('')
  const [users, setUsers] = useState<BotUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<BotUserItem | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchBots() }, [])

  useEffect(() => {
    if (bots.length && !selectedBotId) setSelectedBotId(bots[0].id)
  }, [bots])

  useEffect(() => {
    if (!selectedBotId) return
    setSelectedUser(null)
    loadUsers()
  }, [selectedBotId, search])

  useEffect(() => {
    if (!selectedUser) return
    setLoadingMsgs(true)
    conversationsApi.listMessages(selectedBotId, selectedUser.telegram_id)
      .then((r) => { setMessages(r.data); setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50) })
      .finally(() => setLoadingMsgs(false))
  }, [selectedUser])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const r = await conversationsApi.listUsers(selectedBotId, search)
      setUsers(r.data.items)
      setTotal(r.data.total)
    } finally {
      setLoadingUsers(false)
    }
  }

  const displayName = (u: BotUserItem) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `ID: ${u.telegram_id}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-white m-0">Suhbatlar</h1>
        <p className="text-tg-label text-[13px] mt-1 mb-0">Foydalanuvchilar bilan xabar tarixi</p>
      </div>

      {/* Bot selector */}
      {bots.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {bots.map((bot) => (
            <button
              key={bot.id}
              onClick={() => setSelectedBotId(bot.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer border ${
                selectedBotId === bot.id
                  ? 'bg-tg-accent text-white border-tg-accent'
                  : 'bg-tg-bg border-tg-border text-tg-label hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${bot.is_active ? 'bg-green-400' : 'bg-tg-muted'}`} />
              {bot.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 h-[600px]">
        {/* Users list */}
        <div className={`col-span-2 bg-tg-bg border border-tg-border rounded-xl flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {/* Search */}
          <div className="p-3 border-b border-tg-border">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="tg-input focus:border-tg-accent pl-8 pr-4 py-2 text-sm rounded-lg"
              />
            </div>
            <p className="text-xs text-tg-muted mt-2 mb-0">{total} foydalanuvchi</p>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {loadingUsers ? (
              <div className="p-4 flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-tg-elevated" />
                    <div className="flex-1">
                      <div className="h-3 bg-tg-elevated rounded w-1/2 mb-1.5" />
                      <div className="h-2.5 bg-tg-elevated rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-tg-muted">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm m-0">Foydalanuvchi topilmadi</p>
              </div>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-tg-elevated transition-all duration-150 border-b border-tg-border/50 text-left cursor-pointer bg-transparent ${
                    selectedUser?.id === u.id ? 'bg-tg-elevated' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                    {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{displayName(u)}</span>
                      <span className="text-xs text-tg-muted shrink-0 ml-2">{timeAgo(u.last_seen_at)}</span>
                    </div>
                    {u.username && (
                      <p className="text-xs text-tg-muted m-0">@{u.username}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-tg-muted shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className={`col-span-3 bg-tg-bg border border-tg-border rounded-xl flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-tg-muted">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm m-0">Suhbatni ko'rish uchun foydalanuvchini tanlang</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-tg-border">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden p-1 text-tg-label hover:text-white bg-transparent border-none cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {(selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium m-0">{displayName(selectedUser)}</p>
                  <p className="text-xs text-tg-muted m-0">
                    ID: {selectedUser.telegram_id}
                    {selectedUser.language_code && ` • ${selectedUser.language_code.toUpperCase()}`}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-tg-deep">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-tg-muted text-sm">Yuklanmoqda...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-tg-muted">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm m-0">Xabarlar topilmadi</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.direction === 'out' && (
                        <div className="flex items-end gap-2 max-w-[75%]">
                          <div className="rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white bg-[#2b5278]">
                            {msg.content || `[${msg.message_type}]`}
                            <div className="text-right text-xs mt-0.5 text-[#7fbbde]">{formatTime(msg.created_at)}</div>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-tg-accent/20 flex items-center justify-center shrink-0 mb-1">
                            <Bot size={11} className="text-tg-accent" />
                          </div>
                        </div>
                      )}
                      {msg.direction === 'in' && (
                        <div className="flex items-end gap-2 max-w-[75%]">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs shrink-0 mb-1">
                            {(selectedUser.first_name?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-white bg-[#182533]">
                            {msg.content || `[${msg.message_type}]`}
                            <div className="text-right text-xs mt-0.5 text-tg-muted">{formatTime(msg.created_at)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Info bar */}
              <div className="px-4 py-2 border-t border-tg-border flex items-center gap-4 text-xs text-tg-muted">
                <span>Birinchi: {timeAgo(selectedUser.first_seen_at)}</span>
                <span>•</span>
                <span>So'ngi: {timeAgo(selectedUser.last_seen_at)}</span>
                {selectedUser.tags?.length > 0 && (
                  <>
                    <span>•</span>
                    {selectedUser.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-tg-accent/20 text-tg-accent rounded">{t}</span>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
