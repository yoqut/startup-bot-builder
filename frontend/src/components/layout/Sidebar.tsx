import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot, Megaphone, Settings, LayoutDashboard,
  ShieldCheck, MessageSquare, Briefcase, LogOut,
  ChevronLeft, ChevronRight, Store,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const { t } = useTranslation()
  const isSuperAdmin = user?.role === 'superadmin'
  const initials = (user?.full_name || user?.email || '?').slice(0, 2).toUpperCase()

  const links = [
    { to: '/',              icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/bots',          icon: Bot,             label: t('nav.bots') },
    { to: '/templates',     icon: Store,           label: t('nav.templates') },
    { to: '/broadcast',     icon: Megaphone,       label: t('nav.broadcast') },
    { to: '/conversations', icon: MessageSquare,   label: t('nav.conversations') },
    { to: '/business',      icon: Briefcase,       label: t('nav.business') },
    { to: '/settings',      icon: Settings,        label: t('nav.settings') },
  ]

  return (
    <aside
      className="bg-tg-bg border-r border-tg-darkborder flex flex-col shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 56 : 232 }}
    >
      {/* Header */}
      <div className="px-3 pt-[18px] pb-[14px] border-b border-tg-darkborder flex items-center justify-between shrink-0 min-h-[58px]">
        {!collapsed && (
          <span className="text-[18px] font-bold text-white whitespace-nowrap">BotBuilder</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? t('common.next') : t('common.back')}
          className={`w-7 h-7 rounded-[8px] bg-tg-input border border-tg-darkborder flex items-center justify-center text-tg-muted hover:text-white hover:bg-tg-elevated transition-colors duration-150 shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          {collapsed
            ? <ChevronRight size={13} strokeWidth={2.5} />
            : <ChevronLeft  size={13} strokeWidth={2.5} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto flex flex-col gap-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[10px] no-underline transition-all duration-150 ${
                collapsed ? 'justify-center px-0 py-[10px]' : 'px-3 py-[10px] text-sm'
              } ${isActive
                ? 'font-medium text-white bg-tg-accent'
                : 'font-normal text-tg-label bg-transparent hover:bg-tg-input'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} color={isActive ? '#fff' : '#7d9ab5'} className="shrink-0" />
                {!collapsed && label}
              </>
            )}
          </NavLink>
        ))}

        {isSuperAdmin && (
          <NavLink
            to="/admin" end
            title={collapsed ? 'Super Admin' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[10px] no-underline mt-2 transition-all duration-150 ${
                collapsed ? 'justify-center px-0 py-[10px]' : 'px-3 py-[10px] text-sm'
              } ${isActive
                ? 'font-medium text-white bg-[#7c3aed]'
                : 'font-normal text-tg-label bg-transparent hover:bg-tg-input'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <ShieldCheck size={18} color={isActive ? '#fff' : '#7d9ab5'} className="shrink-0" />
                {!collapsed && 'Super Admin'}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="px-2 py-[10px] border-t border-tg-darkborder shrink-0">
        <div className={`flex items-center gap-[10px] px-2 py-2 rounded-[10px] ${collapsed ? 'justify-center flex-col' : ''}`}>
          <div
            className="w-8 h-8 rounded-full bg-tg-accent flex items-center justify-center text-xs font-bold text-white shrink-0"
            title={collapsed ? (user?.full_name || user?.email || '') : undefined}
          >
            {initials}
          </div>

          {!collapsed ? (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-white truncate">{user?.full_name || 'User'}</div>
                <div className="text-[11px] text-tg-muted truncate">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title={t('auth.logout')}
                className="bg-transparent border-0 cursor-pointer text-tg-muted p-1 hover:text-red-500 transition-colors duration-150"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              title={t('auth.logout')}
              className="bg-transparent border-0 cursor-pointer text-tg-muted p-0.5 hover:text-red-500 transition-colors duration-150"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
