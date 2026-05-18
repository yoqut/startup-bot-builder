import { useEffect, useState } from 'react'
import { adminApi, type AdminStats } from '@/api/admin'
import { Users, Bot, MessageSquare, TrendingUp, Activity, UserPlus, Zap } from 'lucide-react'

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: number; sub?: string; color: string
}) {
  return (
    <div className="bg-tg-card border border-tg-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-tg-muted mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
          {sub && <p className="text-xs text-tg-muted mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats().then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-tg-muted">Yuklanmoqda…</div>
  if (!stats)  return <div className="p-8 text-node-red">Xato yuz berdi</div>

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-sm text-tg-muted mb-8">Loyiha umumiy ko'rinishi</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}        label="Jami foydalanuvchilar" value={stats.total_users}     color="bg-node-violet" />
        <StatCard icon={Bot}          label="Jami botlar"           value={stats.total_bots}      color="bg-tg-accent"   />
        <StatCard icon={MessageSquare}label="Bot foydalanuvchilari" value={stats.total_bot_users} color="bg-node-teal"   />
        <StatCard icon={Activity}     label="Jami eventlar"         value={stats.total_events}    color="bg-node-green"  />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={UserPlus}   label="Bugun yangi userlar" value={stats.new_users_today} color="bg-node-pink"   />
        <StatCard icon={TrendingUp} label="Bugun yangi botlar"  value={stats.new_bots_today}  color="bg-node-orange" />
        <StatCard icon={Zap}        label="Aktiv botlar"        value={stats.active_bots}
          sub={`${stats.total_bots > 0 ? Math.round(stats.active_bots / stats.total_bots * 100) : 0}% aktiv`}
          color="bg-node-amber" />
      </div>
    </div>
  )
}
