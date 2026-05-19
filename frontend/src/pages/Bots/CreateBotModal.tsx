import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Wand2, Key, Clock, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useBotStore } from '@/store/bot.store'
import { toast } from '@/store/toast.store'

type CreateTab = 'auto' | 'manual'
type AutoStep  = 'form' | 'waiting' | 'done' | 'error'

interface Props {
  onClose: () => void
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-tg-label mb-1.5">{children}</label>
}

export default function CreateBotModal({ onClose }: Props) {
  const { t } = useTranslation()
  const { createBot, fetchBots } = useBotStore()

  const [createTab, setCreateTab] = useState<CreateTab>('auto')

  const [botName, setBotName]         = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [autoStep, setAutoStep]       = useState<AutoStep>('form')
  const [pendingId, setPendingId]     = useState('')
  const [tgLink, setTgLink]           = useState('')
  const [autoError, setAutoError]     = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [name, setName]         = useState('')
  const [token, setToken]       = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (autoStep !== 'waiting' || !pendingId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/bots/pending/${pendingId}`)
        if (res.data.status === 'done') {
          clearInterval(pollRef.current!)
          await fetchBots()
          setAutoStep('done')
          setTimeout(() => onClose(), 1500)
        }
      } catch {}
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [autoStep, pendingId])

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
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-tg-bg rounded-2xl w-full max-w-[440px] border border-tg-input shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-[18px] pt-[18px] pb-[14px] border-b border-tg-input">
          <h2 className="m-0 text-base font-bold text-white">{t('bots.modal_title')}</h2>
          <button onClick={onClose} className="bg-tg-card border-none rounded-lg size-[30px] flex items-center justify-center cursor-pointer text-tg-label">
            <X size={14} />
          </button>
        </div>

        <div className="px-[18px] pt-3">
          <div className="seg-ctrl">
            {([['auto', Wand2, t('bots.tab_auto')], ['manual', Key, t('bots.tab_manual')]] as const).map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={() => setCreateTab(tab as CreateTab)}
                className={`seg-btn${createTab === tab ? ' active' : ''} flex items-center justify-center gap-[5px]`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-[18px]">
          {createTab === 'auto' && (
            <>
              {autoStep === 'form' && (
                <form onSubmit={handleAutoCreate} className="flex flex-col gap-[14px]">
                  <div className="bg-tg-card rounded-[10px] px-3 py-[10px] text-xs text-tg-label leading-relaxed">
                    Nom va username kiriting → Telegramda bir marta tasdiqlang → Bot avtomatik yaratiladi
                  </div>
                  {autoError && (
                    <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-3 py-[10px] text-[#ef5350] text-xs">{autoError}</div>
                  )}
                  <div>
                    <Lbl>Bot nomi *</Lbl>
                    <input required value={botName} onChange={(e) => setBotName(e.target.value)}
                      className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] outline-none focus:border-tg-accent"
                      placeholder="Masalan: Mening Do'konim"
                    />
                  </div>
                  <div>
                    <Lbl>Username *</Lbl>
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
                    <button type="button" onClick={onClose} className="flex-1 bg-tg-card border border-tg-input rounded-[10px] py-[10px] text-tg-label text-[13px] font-medium cursor-pointer">{t('common.cancel')}</button>
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
                  <button onClick={onClose} className="bg-tg-card border border-tg-input rounded-[10px] py-[9px] text-tg-label text-xs cursor-pointer">{t('common.cancel')}</button>
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

          {createTab === 'manual' && (
            <form onSubmit={handleManualCreate} className="flex flex-col gap-[14px]">
              <div className="bg-tg-card rounded-[10px] px-3 py-[10px] text-xs text-tg-label leading-relaxed">
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                  className="text-tg-accent no-underline font-semibold">@BotFather</a>{' '}
                → <code className="bg-tg-elevated px-[5px] py-px rounded">/newbot</code> → nom va username kiriting → tokenni nusxalang
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-3 py-[10px] text-[#ef5350] text-xs">{error}</div>
              )}
              <div>
                <Lbl>Bot nomi</Lbl>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] outline-none focus:border-tg-accent"
                  placeholder="Mening Botim"
                />
              </div>
              <div>
                <Lbl>Bot Token</Lbl>
                <input value={token} onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[9px] text-white text-[13px] font-mono outline-none focus:border-tg-accent"
                  placeholder="123456789:ABC-DEF..."
                />
              </div>
              <div className="flex gap-[10px]">
                <button type="button" onClick={onClose} className="flex-1 bg-tg-card border border-tg-input rounded-[10px] py-[10px] text-tg-label text-[13px] font-medium cursor-pointer">{t('common.cancel')}</button>
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
  )
}
