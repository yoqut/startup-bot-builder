import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, ChevronRight, Bot, Zap, Check,
  ExternalLink, Eye, EyeOff, Loader2, X,
} from 'lucide-react'
import { FLOW_TEMPLATES, type FlowTemplate } from '@/pages/FlowBuilder/templates'
import { botsApi } from '@/api/bots'
import { toast } from '@/store/toast.store'

export const ONBOARDING_DONE_KEY = 'onboarding_done'
export const markOnboardingDone = () =>
  localStorage.setItem(ONBOARDING_DONE_KEY, '1')

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            'h-1 rounded-full flex-1 transition-all duration-300',
            i < step ? 'bg-tg-accent' : i === step ? 'bg-tg-accent/50' : 'bg-tg-input',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

// ── Step 1: Template selection ────────────────────────────────────────────────
interface Step1Props {
  selected: string | null
  onSelect: (id: string | null) => void
}

function Step1({ selected, onSelect }: Step1Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-bold text-white m-0 mb-[6px]">
          {t('onboarding.step1.title')}
        </h2>
        <p className="text-[13px] text-tg-label m-0 leading-relaxed">
          {t('onboarding.step1.desc')}
        </p>
      </div>

      <button
        onClick={() => onSelect(null)}
        className={[
          'flex items-center gap-3 p-4 rounded-[14px] border cursor-pointer text-left transition-all duration-150',
          selected === null
            ? 'bg-tg-accent/10 border-tg-accent/40'
            : 'bg-tg-card border-tg-input hover:border-tg-accent/25',
        ].join(' ')}
      >
        <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[20px] shrink-0 ${selected === null ? 'bg-tg-accent/15' : 'bg-tg-elevated'}`}>
          ✏️
        </div>
        <div>
          <div className="text-[13px] font-semibold text-white">{t('onboarding.from_scratch')}</div>
          <div className="text-[11px] text-tg-label mt-[2px]">{t('onboarding.from_scratch_desc')}</div>
        </div>
        {selected === null && (
          <div className="ml-auto size-5 rounded-full bg-tg-accent flex items-center justify-center shrink-0">
            <Check size={11} className="text-white" />
          </div>
        )}
      </button>

      <div className="grid grid-cols-2 gap-3">
        {FLOW_TEMPLATES.map((tmpl) => (
          <TemplateCard
            key={tmpl.id}
            template={tmpl}
            selected={selected === tmpl.id}
            onSelect={() => onSelect(tmpl.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  template, selected, onSelect,
}: { template: FlowTemplate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={[
        'flex flex-col gap-2 p-3 rounded-[14px] border cursor-pointer text-left transition-all duration-150 relative',
        selected
          ? 'bg-tg-accent/10 border-tg-accent/40'
          : 'bg-tg-card border-tg-input hover:border-tg-accent/25',
      ].join(' ')}
    >
      <div className="text-[24px] leading-none">{template.icon}</div>
      <div>
        <div className="text-[12px] font-semibold text-white leading-snug">{template.name}</div>
        <div className="text-[10px] text-tg-muted mt-[3px] leading-snug line-clamp-2">{template.description}</div>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 size-5 rounded-full bg-tg-accent flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </button>
  )
}

// ── Step 2: Token connection ───────────────────────────────────────────────────
interface Step2Props {
  token: string
  setToken: (v: string) => void
  botName: string
  setBotName: (v: string) => void
  verified: boolean
  onVerify: () => Promise<void>
}

function Step2({ token, setToken, botName, setBotName, verified, onVerify }: Step2Props) {
  const { t } = useTranslation()
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleVerify = async () => {
    if (!token.trim()) { setError(t('onboarding.token_warning')); return }
    setError('')
    setLoading(true)
    try {
      await onVerify()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || t('onboarding.token_warning'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[18px] font-bold text-white m-0 mb-[6px]">
          {t('onboarding.step2.title')}
        </h2>
        <p className="text-[13px] text-tg-label m-0 leading-relaxed">
          {t('onboarding.step2.desc')}
        </p>
      </div>

      {/* BotFather instructions */}
      <div className="bg-tg-card rounded-[14px] p-4 border border-tg-input">
        <p className="text-[11px] font-bold text-tg-label uppercase tracking-[0.05em] m-0 mb-3">
          Qanday qilib token olish kerak?
        </p>
        {[
          { step: '1', text: "@BotFather ga o'ting va /newbot buyrug'ini yuboring" },
          { step: '2', text: 'Bot nomi va username kiriting (username "bot" bilan tugashi shart)' },
          { step: '3', text: 'BotFather token beradi — uni nusxalab pastdagi maydonga kiriting' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-[10px] mb-[10px] last:mb-0">
            <span className="size-[18px] rounded-full bg-tg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-[1px]">
              {step}
            </span>
            <span className="text-[12px] text-tg-text leading-relaxed">{text}</span>
          </div>
        ))}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-tg-accent text-[12px] font-semibold no-underline mt-3"
        >
          <ExternalLink size={13} />
          @BotFather ni Telegramda ochish
        </a>
      </div>

      {/* Bot name */}
      <div>
        <label className="block text-[11px] text-tg-label mb-[6px] font-medium">
          Bot nomi *
        </label>
        <input
          value={botName}
          onChange={(e) => setBotName(e.target.value)}
          placeholder="Masalan: Mening Do'konim"
          className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[10px] text-white text-[13px] outline-none focus:border-tg-accent transition-colors duration-150"
        />
      </div>

      {/* Token input */}
      <div>
        <label className="block text-[11px] text-tg-label mb-[6px] font-medium">
          Bot Token *
        </label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABC-DEF..."
            className="w-full bg-tg-card border border-tg-input rounded-[10px] px-3 py-[10px] pr-10 text-white text-[13px] font-mono outline-none focus:border-tg-accent transition-colors duration-150"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-tg-muted hover:text-tg-label"
          >
            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && <p className="text-[11px] text-red-400 mt-[6px] m-0">{error}</p>}
      </div>

      {/* Verify button */}
      {!verified ? (
        <button
          onClick={handleVerify}
          disabled={loading || !token.trim() || !botName.trim()}
          className="flex items-center justify-center gap-2 w-full bg-tg-elevated border border-tg-input rounded-[10px] py-[10px] text-[13px] font-semibold text-tg-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tg-card transition-colors duration-150"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {loading ? t('onboarding.token_checking') : t('onboarding.token_check')}
        </button>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/25 rounded-[10px]">
          <Check size={15} className="text-green-400 shrink-0" />
          <span className="text-[13px] text-green-300 font-medium">
            {t('onboarding.token_verified')}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Success ───────────────────────────────────────────────────────────
function Step3({ botName }: { botName: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="relative">
        <div className="size-[80px] rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center animate-modal-in">
          <Check size={36} className="text-green-400" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" />
      </div>

      <div>
        <h2 className="text-[20px] font-bold text-white m-0 mb-2">
          {t('onboarding.step3.title')}
        </h2>
        <p className="text-[14px] text-tg-label m-0 leading-relaxed">
          {t('onboarding.step3.desc', { name: botName || 'Botingiz' })}
        </p>
      </div>

      <div className="w-full bg-tg-card rounded-[14px] p-4 border border-tg-input text-left">
        <p className="text-[11px] font-bold text-tg-label uppercase tracking-[0.05em] m-0 mb-3">
          {t('onboarding.next_steps')}
        </p>
        {[
          { icon: '🎨', text: t('onboarding.next_step1') },
          { icon: '⚡', text: t('onboarding.next_step2') },
          { icon: '📊', text: t('onboarding.next_step3') },
        ].map(({ icon, text }, i) => (
          <div key={i} className="flex items-center gap-3 py-[7px] border-b border-tg-input last:border-0 last:pb-0 first:pt-0">
            <span className="text-[16px]">{icon}</span>
            <span className="text-[12px] text-tg-text">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [step, setStep]               = useState(0)
  const [templateId, setTemplateId]   = useState<string | null>(null)
  const [token, setToken]             = useState('')
  const [botName, setBotName]         = useState('')
  const [verified, setVerified]       = useState(false)
  const [nextLoading, setNextLoading] = useState(false)

  const handleVerify = useCallback(async () => {
    await botsApi.verifyToken(token.trim())
    setVerified(true)
  }, [token])

  const handleNext = async () => {
    if (step === 0) { setStep(1); return }

    if (step === 1) {
      if (!verified) { toast.warning(t('onboarding.token_warning')); return }
      setNextLoading(true)
      try {
        await botsApi.create(botName.trim() || 'Mening Botim', token.trim())
        toast.success(t('onboarding.bot_added'))
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || t('onboarding.bot_add_error'))
        setNextLoading(false)
        return
      }
      setNextLoading(false)
      setStep(2)
      return
    }

    markOnboardingDone()
    navigate('/')
  }

  const handleBack = () => { if (step > 0) setStep((s) => s - 1) }

  const handleSkip = () => { markOnboardingDone(); navigate('/') }

  const nextDisabled = nextLoading || (step === 1 && (!verified || !botName.trim()))

  const nextLabel =
    step === 0 ? t('onboarding.next') :
    step === 1 ? (nextLoading ? t('onboarding.adding') : t('onboarding.add_bot')) :
    t('onboarding.finish')

  const stepLabel = [
    t('onboarding.step_label_0'),
    t('onboarding.step_label_1'),
    t('onboarding.step_label_2'),
  ][step]

  return (
    <div className="min-h-[100dvh] bg-tg-bg flex flex-col items-center justify-start px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-[420px] flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-[10px] bg-tg-accent/15 border border-tg-accent/25 flex items-center justify-center">
              <Bot size={16} className="text-tg-accent" />
            </div>
            <span className="text-[13px] font-bold text-white">BotBuilder</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-[12px] text-tg-muted hover:text-tg-label bg-transparent border-none cursor-pointer flex items-center gap-1"
          >
            {t('onboarding.skip')}
            <X size={12} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-tg-muted">
              {t('onboarding.progress', { step: step + 1, total: TOTAL_STEPS })}
            </span>
            <span className="text-[11px] text-tg-accent font-medium">{stepLabel}</span>
          </div>
          <ProgressBar step={step + 1} total={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        <div className="bg-tg-card rounded-[20px] border border-tg-input p-5">
          {step === 0 && <Step1 selected={templateId} onSelect={setTemplateId} />}
          {step === 1 && (
            <Step2
              token={token}
              setToken={(v) => { setToken(v); setVerified(false) }}
              botName={botName}
              setBotName={setBotName}
              verified={verified}
              onVerify={handleVerify}
            />
          )}
          {step === 2 && <Step3 botName={botName} />}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && step < 2 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 bg-tg-card border border-tg-input rounded-[12px] px-4 py-[11px] text-tg-label text-[13px] font-medium cursor-pointer hover:bg-tg-elevated transition-colors duration-150"
            >
              <ChevronLeft size={15} />
              {t('onboarding.back')}
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={nextDisabled}
            className="flex-1 flex items-center justify-center gap-2 bg-tg-accent border-none rounded-[12px] py-[11px] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tg-accent/90 transition-colors duration-150 shadow-[0_4px_16px_rgba(36,129,204,0.3)]"
          >
            {nextLoading && <Loader2 size={14} className="animate-spin" />}
            {nextLabel}
            {step < 2 && !nextLoading && <ChevronRight size={15} className="opacity-70" />}
            {step === 2 && <Zap size={14} className="opacity-80" />}
          </button>
        </div>

      </div>
    </div>
  )
}
