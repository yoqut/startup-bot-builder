import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'uz', flag: '🇺🇿', label: 'UZ' },
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.slice(0, 2)

  return (
    <div className="flex items-center gap-0.5">
      {LANGS.map(({ code, flag, label }) => {
        const isActive = current === code
        return (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className={[
              'flex items-center gap-1 px-[7px] py-[4px] rounded-[8px] text-[11px] font-semibold border-none cursor-pointer transition-all duration-150 leading-none',
              isActive
                ? 'bg-tg-accent/15 text-tg-accent underline underline-offset-2'
                : 'bg-transparent text-tg-muted hover:text-tg-label hover:bg-tg-elevated',
            ].join(' ')}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
