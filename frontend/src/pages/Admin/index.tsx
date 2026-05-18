import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard, Users, Bot, CreditCard, Settings, ChevronRight,
} from 'lucide-react'

const NAV = [
  { to: '/admin',          label: 'Dashboard',       icon: LayoutDashboard, end: true },
  { to: '/admin/users',    label: 'Foydalanuvchilar', icon: Users },
  { to: '/admin/bots',     label: 'Botlar',           icon: Bot },
  { to: '/admin/plans',    label: 'Planlar',          icon: CreditCard },
  { to: '/admin/settings', label: 'Sozlamalar',       icon: Settings },
]

export default function AdminLayout() {
  const user = useAuthStore(s => s.user)
  if (!user || user.role !== 'superadmin') return <Navigate to="/" replace />

  return (
    <div className="flex h-screen bg-tg-deep text-tg-text overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-tg-bg border-r border-tg-border flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-tg-border">
          <div className="text-xs font-bold text-tg-accent uppercase tracking-widest">Super Admin</div>
          <div className="text-[11px] text-tg-muted mt-0.5 truncate">{user.email}</div>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map(n => {
            const Icon = n.icon
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-tg-accent/20 text-tg-accent font-medium'
                      : 'text-tg-label hover:text-tg-text hover:bg-tg-elevated/60'
                  }`
                }
              >
                <Icon size={15} />
                {n.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-tg-border">
          <NavLink to="/" className="flex items-center gap-1.5 text-xs text-tg-muted hover:text-tg-label transition-colors">
            <ChevronRight size={12} className="rotate-180" />
            Asosiy saytga qaytish
          </NavLink>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
