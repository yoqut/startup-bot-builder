import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, Zap, GitBranch, MessageSquare, ArrowRight } from 'lucide-react'

function FlowIllustration() {
  return (
    <svg
      width="260"
      height="96"
      viewBox="0 0 260 96"
      fill="none"
      aria-hidden="true"
      className="select-none"
    >
      <path d="M72 48 L112 48" stroke="#2481cc" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
      <path d="M168 48 L192 48" stroke="#2481cc" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
      <path d="M216 40 L216 22 L240 22" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M216 56 L216 74 L240 74" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />

      <rect x="8" y="32" width="64" height="32" rx="10" fill="#8b5cf620" stroke="#8b5cf640" strokeWidth="1.2" />
      <rect x="20" y="44" width="16" height="8" rx="3" fill="#8b5cf6" opacity="0.7" />
      <rect x="42" y="44" width="22" height="4" rx="2" fill="#8b5cf6" opacity="0.3" />
      <rect x="42" y="50" width="14" height="3" rx="1.5" fill="#8b5cf6" opacity="0.2" />

      <rect x="112" y="28" width="56" height="40" rx="10" fill="#2481cc20" stroke="#2481cc40" strokeWidth="1.2" />
      <rect x="122" y="38" width="36" height="5" rx="2" fill="#2481cc" opacity="0.5" />
      <rect x="122" y="46" width="28" height="4" rx="2" fill="#2481cc" opacity="0.3" />
      <rect x="122" y="53" width="20" height="3" rx="1.5" fill="#2481cc" opacity="0.2" />

      <rect x="192" y="33" width="28" height="28" rx="7" fill="#e67e2220" stroke="#e67e2240" strokeWidth="1.2" transform="rotate(45 206 47)" />

      <circle cx="248" cy="22" r="8" fill="#10b98120" stroke="#10b98150" strokeWidth="1.2" />
      <circle cx="248" cy="22" r="3" fill="#10b981" opacity="0.8" />
      <circle cx="248" cy="74" r="8" fill="#ef444420" stroke="#ef444450" strokeWidth="1.2" />
      <circle cx="248" cy="74" r="3" fill="#ef4444" opacity="0.8" />

      <path d="M109 45 L113 48 L109 51" stroke="#2481cc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M189 45 L193 48 L189 51" stroke="#2481cc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function OnboardingCard() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const steps = [
    { icon: Bot,       iconClass: 'text-node-violet', iconBgClass: 'bg-node-violet/10', text: t('onboarding.card.step1') },
    { icon: GitBranch, iconClass: 'text-tg-accent',   iconBgClass: 'bg-tg-accent/10',   text: t('onboarding.card.step2') },
    { icon: Zap,       iconClass: 'text-green-400',   iconBgClass: 'bg-green-500/10',   text: t('onboarding.card.step3') },
  ]

  return (
    <div className="bg-tg-card rounded-[20px] overflow-hidden border border-tg-input">
      {/* Illustration header */}
      <div className="relative flex items-center justify-center py-6 bg-gradient-to-br from-tg-accent/[0.06] to-node-violet/[0.06] border-b border-tg-input overflow-hidden">
        <div className="absolute left-[15%] top-[20%] w-16 h-16 rounded-full bg-tg-accent/10 blur-2xl pointer-events-none" />
        <div className="absolute right-[15%] bottom-[10%] w-12 h-12 rounded-full bg-node-violet/10 blur-xl pointer-events-none" />
        <FlowIllustration />
      </div>

      {/* Content */}
      <div className="px-5 pt-5 pb-[22px]">
        <div className="flex items-start gap-3 mb-[18px]">
          <div className="w-10 h-10 rounded-[12px] bg-tg-accent/10 border border-tg-accent/20 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="text-tg-accent" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white m-0 mb-[5px] leading-snug">
              {t('onboarding.card.title')}
            </h3>
            <p className="text-[13px] text-tg-label m-0 leading-relaxed">
              {t('onboarding.card.desc')}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-[10px] mb-5">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={`w-8 h-8 rounded-[9px] ${step.iconBgClass} flex items-center justify-center`}>
                    <Icon size={14} className={step.iconClass} />
                  </div>
                  <span className="absolute -top-[5px] -right-[5px] w-[14px] h-[14px] rounded-full bg-tg-bg border border-tg-input text-[8px] font-bold text-tg-muted flex items-center justify-center leading-none">
                    {i + 1}
                  </span>
                </div>
                <span className="text-[13px] text-tg-text">{step.text}</span>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/bots')}
          className="w-full flex items-center justify-center gap-2 bg-tg-accent border-none rounded-[12px] py-[11px] text-white text-[14px] font-semibold cursor-pointer hover:bg-tg-accent/90 transition-colors duration-150 shadow-[0_4px_16px_rgba(36,129,204,0.3)]"
        >
          <Bot size={16} />
          {t('onboarding.card.cta')}
          <ArrowRight size={15} className="opacity-70" />
        </button>
      </div>
    </div>
  )
}
