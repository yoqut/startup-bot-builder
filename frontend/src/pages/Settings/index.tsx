import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth.store'
import { LogOut, User, Mail, CreditCard, Shield, Languages, Check } from 'lucide-react'

const LANGS = [
  { code: 'uz', flag: '🇺🇿', label: "O'zbek" },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const { i18n } = useTranslation()
  const initials = (user?.full_name || user?.email || '?').slice(0, 2).toUpperCase()
  const [loggingOut, setLoggingOut] = useState(false)

  const currentLang = i18n.language?.slice(0, 2)

  const handleLogout = async () => {
    setLoggingOut(true)
    logout()
  }

  return (
    <div className="flex flex-col gap-6 max-w-[480px]">

      {/* Profile card */}
      <div className="bg-tg-card rounded-xl p-4 flex items-center gap-[14px]">
        <div className="size-14 rounded-full bg-tg-accent flex items-center justify-center text-xl font-bold text-white shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-white truncate">
            {user?.full_name || 'Foydalanuvchi'}
          </div>
          <div className="text-[13px] text-tg-label mt-0.5 truncate">
            {user?.email}
          </div>
        </div>
      </div>

      {/* Account info */}
      <div>
        <div className="text-xs font-medium text-tg-label uppercase tracking-[0.5px] mb-2 px-1">
          Hisob ma'lumotlari
        </div>
        <div className="bg-tg-card rounded-xl overflow-hidden">
          {[
            { icon: User,       label: 'Ism',   value: user?.full_name || '—' },
            { icon: Mail,       label: 'Email', value: user?.email || '—' },
            { icon: CreditCard, label: 'Tarif', value: user?.plan_id ? `Plan #${user.plan_id}` : 'Free' },
          ].map(({ icon: Icon, label, value }, i) => (
            <div key={label}>
              {i > 0 && <div className="h-px bg-tg-input ml-[54px]" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="size-8 rounded-lg bg-tg-elevated flex items-center justify-center shrink-0">
                  <Icon size={15} color="#7d9ab5" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-tg-muted mb-0.5">{label}</div>
                  <div className="text-sm text-white">{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <div className="text-xs font-medium text-tg-label uppercase tracking-[0.5px] mb-2 px-1">
          Til / Язык / Language
        </div>
        <div className="bg-tg-card rounded-xl overflow-hidden">
          {LANGS.map(({ code, flag, label }, i) => {
            const isActive = currentLang === code
            return (
              <div key={code}>
                {i > 0 && <div className="h-px bg-tg-input ml-[54px]" />}
                <button
                  onClick={() => i18n.changeLanguage(code)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-none cursor-pointer text-left hover:bg-tg-elevated/40 transition-colors duration-150"
                >
                  <div className="size-8 rounded-lg bg-tg-elevated flex items-center justify-center shrink-0 text-[18px] leading-none">
                    {flag}
                  </div>
                  <div className="flex items-center gap-2">
                    <Languages size={13} color="#7d9ab5" className="shrink-0" />
                    <span className={`text-sm font-medium ${isActive ? 'text-tg-accent' : 'text-white'}`}>
                      {label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="ml-auto size-5 rounded-full bg-tg-accent flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* App */}
      <div>
        <div className="text-xs font-medium text-tg-label uppercase tracking-[0.5px] mb-2 px-1">
          Ilova
        </div>
        <div className="bg-tg-card rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="size-8 rounded-lg bg-tg-elevated flex items-center justify-center shrink-0">
              <Shield size={15} color="#7d9ab5" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-white">Versiya</div>
            </div>
            <span className="text-[13px] text-tg-muted">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-tg-card rounded-xl overflow-hidden">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-4 py-[14px] bg-transparent border-none cursor-pointer text-left"
        >
          <div className="size-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <LogOut size={15} color="#e53935" />
          </div>
          <span className="text-sm text-node-red font-medium">
            {loggingOut ? 'Chiqilmoqda…' : 'Chiqish'}
          </span>
        </button>
      </div>

    </div>
  )
}
