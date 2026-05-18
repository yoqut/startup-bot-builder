import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, LayoutDashboard, MessageSquare, Settings, Store, ChevronDown, ChevronUp } from 'lucide-react'

export default function BottomNav() {
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useTranslation()

  const links = [
    { to: '/',              icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/bots',          icon: Bot,             label: t('nav.bots') },
    { to: '/templates',     icon: Store,           label: t('nav.templates') },
    { to: '/conversations', icon: MessageSquare,   label: t('nav.conversations') },
    { to: '/settings',      icon: Settings,        label: t('nav.settings') },
  ]

  return (
    <>
      {/* Toggle handle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="fixed z-[10000] left-1/2 -translate-x-1/2 flex items-center justify-center transition-[bottom] duration-300 ease-in-out"
        style={{ bottom: collapsed ? 8 : 'calc(var(--h-bottomnav, 56px) + 4px)' }}
        aria-label={collapsed ? t('nav.dashboard') : t('common.back')}
      >
        <div className="flex items-center gap-1 bg-tg-card border border-tg-darkborder rounded-full px-3 py-1 shadow-lg">
          {collapsed
            ? <ChevronUp   size={13} className="text-tg-muted" strokeWidth={2.5} />
            : <ChevronDown size={13} className="text-tg-muted" strokeWidth={2.5} />
          }
          {collapsed && (
            <span className="text-[10px] font-semibold text-tg-muted leading-none">Menyu</span>
          )}
        </div>
      </button>

      {/* Nav panel */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[9999] h-bottomnav flex items-stretch pb-safearea bg-tg-bg border-t border-tg-darkborder transition-transform duration-300 ease-in-out"
        style={{ transform: collapsed ? 'translateY(100%)' : 'translateY(0)' }}
      >
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className="flex-1 no-underline">
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center gap-[3px] h-full">
                <Icon size={22} color={isActive ? '#2481cc' : '#4a6278'} strokeWidth={isActive ? 2.2 : 1.8} />
                {isActive && <span className="text-[10px] font-medium text-tg-accent">{label}</span>}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
