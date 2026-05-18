import { useEffect, useState } from 'react'
import { Megaphone, Send, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useBotStore } from '@/store/bot.store'
import { broadcastApi, type Broadcast } from '@/api/broadcast'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:   { label: 'Draft',        color: 'text-tg-label bg-tg-elevated' },
  queued:  { label: 'Kutmoqda',     color: 'text-yellow-400 bg-yellow-400/10' },
  running: { label: 'Yuborilmoqda', color: 'text-tg-accent bg-tg-accent/10' },
  done:    { label: 'Tugadi',       color: 'text-green-400 bg-green-400/10' },
  failed:  { label: 'Xato',         color: 'text-red-400 bg-red-400/10' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Hozirgina'
  if (m < 60) return `${m} daqiqa oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return `${Math.floor(h / 24)} kun oldin`
}

export default function BroadcastPage() {
  const { bots, fetchBots } = useBotStore()
  const [selectedBotId, setSelectedBotId] = useState('')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'photo' | 'video' | ''>('')

  useEffect(() => { fetchBots() }, [])

  useEffect(() => {
    if (bots.length && !selectedBotId) setSelectedBotId(bots[0].id)
  }, [bots])

  useEffect(() => {
    if (!selectedBotId) return
    setLoading(true)
    broadcastApi.list(selectedBotId)
      .then((r) => setBroadcasts(r.data))
      .finally(() => setLoading(false))
  }, [selectedBotId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await broadcastApi.create({
        bot_id: selectedBotId,
        message: message.trim(),
        media_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
      })
      setBroadcasts([res.data, ...broadcasts])
      setMessage('')
      setMediaUrl('')
      setMediaType('')
      setShowForm(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Xatolik yuz berdi')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: string) => {
    await broadcastApi.delete(id)
    setBroadcasts(broadcasts.filter((b) => b.id !== id))
  }

  const selectedBot = bots.find((b) => b.id === selectedBotId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white m-0">Broadcast</h1>
          <p className="text-tg-label text-[13px] mt-1 mb-0">Barcha foydalanuvchilarga xabar yuboring</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={!selectedBot?.is_active}
          className="flex items-center gap-2 bg-tg-accent hover:bg-tg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer border-none"
        >
          <Send size={15} />
          Xabar yuborish
        </button>
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

      {selectedBot && !selectedBot.is_active && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-[13px]">
          ⚠ Bot aktiv emas. Broadcast yuborish uchun avval botni aktivlashtiring.
        </div>
      )}

      {/* Send modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-tg-bg border border-tg-border rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-tg-border">
              <h2 className="text-base font-bold text-white flex items-center gap-2 m-0">
                <Megaphone size={18} className="text-tg-accent" />
                Broadcast yuborish
              </h2>
              <button onClick={() => setShowForm(false)} className="text-tg-label hover:text-white text-2xl leading-none bg-transparent border-none cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSend} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[13px] text-tg-label mb-1.5">Xabar matni <span className="text-red-400">*</span></label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Xabar matnini kiriting..."
                  className="tg-input tg-textarea focus:border-tg-accent"
                />
                <p className="text-[11px] text-tg-muted mt-1 mb-0">HTML teglari: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;, &lt;a href=""&gt;</p>
              </div>

              <div>
                <label className="block text-[13px] text-tg-label mb-1.5">Media (ixtiyoriy)</label>
                <div className="flex gap-2 mb-2">
                  {(['', 'photo', 'video'] as const).map((t) => (
                    <button
                      key={t || 'none'}
                      type="button"
                      onClick={() => setMediaType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer border-none ${
                        mediaType === t ? 'bg-tg-accent text-white' : 'bg-tg-elevated text-tg-label hover:text-white'
                      }`}
                    >
                      {t === '' ? "Yo'q" : t === 'photo' ? '📷 Rasm' : '🎥 Video'}
                    </button>
                  ))}
                </div>
                {mediaType && (
                  <input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={`${mediaType === 'photo' ? 'Rasm' : 'Video'} URL manzili`}
                    className="tg-input focus:border-tg-accent"
                  />
                )}
              </div>

              <div className="bg-tg-elevated rounded-xl p-3 text-xs text-tg-label">
                Qabul qiluvchilar: <span className="text-white font-medium">{selectedBot?.name}</span> botining barcha foydalanuvchilari
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-tg-elevated text-tg-text py-2.5 rounded-xl hover:bg-tg-card transition-all duration-150 cursor-pointer border-none">
                  Bekor
                </button>
                <button type="submit" disabled={sending || !message.trim()}
                  className="flex-1 bg-tg-accent hover:bg-tg-accent/80 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border-none">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {sending ? 'Yuborilmoqda...' : 'Yuborish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 m-0">Yuborish tarixi</h2>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-tg-bg border border-tg-border rounded-xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-16 bg-tg-bg border border-tg-border rounded-xl">
            <Megaphone size={40} className="mx-auto mb-3 text-tg-muted" />
            <p className="text-tg-label m-0">Hali broadcast yuborilmagan</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {broadcasts.map((bc) => {
              const st = STATUS_MAP[bc.status] || STATUS_MAP.draft
              const total = bc.sent_count + bc.fail_count
              return (
                <div key={bc.id} className="bg-tg-bg border border-tg-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] line-clamp-2 mb-2 m-0">{bc.message}</p>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {bc.status === 'done' && total > 0 && (
                          <>
                            <span className="text-green-400">✓ {bc.sent_count} yuborildi</span>
                            {bc.fail_count > 0 && <span className="text-red-400">✗ {bc.fail_count} xato</span>}
                          </>
                        )}
                        {bc.status === 'running' && <Loader2 size={11} className="animate-spin text-tg-accent" />}
                        <span className="text-tg-muted">{timeAgo(bc.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(bc.id)}
                      className="p-2 text-tg-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-150 cursor-pointer bg-transparent border-none"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {bc.status === 'done' && total > 0 && (
                    <div className="mt-3 pt-3 border-t border-tg-border">
                      <div className="flex items-center justify-between text-xs text-tg-muted mb-1">
                        <span>Muvaffaqiyat darajasi</span>
                        <span className="text-white font-medium">{Math.round((bc.sent_count / total) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-tg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(bc.sent_count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
