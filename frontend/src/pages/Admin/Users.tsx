import { useEffect, useState } from 'react'
import { adminApi, type AdminUser, type Plan } from '@/api/admin'
import { Search, Shield, ShieldOff, Trash2, ChevronDown } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-tg-accent/20 text-tg-accent border-tg-accent/30',
  user:        'bg-tg-elevated/50 text-tg-label border-tg-border/30',
}

export default function AdminUsers() {
  const [users, setUsers]   = useState<AdminUser[]>([])
  const [plans, setPlans]   = useState<Plan[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([adminApi.users(), adminApi.plans()])
      .then(([ur, pr]) => { setUsers(ur.data); setPlans(pr.data) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function toggleActive(u: AdminUser) {
    const res = await adminApi.patchUser(u.id, { is_active: !u.is_active })
    setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
  }

  async function changeRole(u: AdminUser, role: string) {
    const res = await adminApi.patchUser(u.id, { role })
    setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
  }

  async function changePlan(u: AdminUser, plan_id: number) {
    const res = await adminApi.patchUser(u.id, { plan_id })
    setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
  }

  async function deleteUser(id: string) {
    if (!confirm('Foydalanuvchi o\'chirilsinmi? Bu amal qaytarib bo\'lmaydi.')) return
    await adminApi.deleteUser(id)
    setUsers(prev => prev.filter(x => x.id !== id))
  }

  if (loading) return <div className="p-8 text-tg-muted">Yuklanmoqda…</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Foydalanuvchilar</h1>
          <p className="text-sm text-tg-muted mt-0.5">Jami: {users.length} ta</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish…"
            className="pl-9 pr-4 py-2 bg-tg-elevated border border-tg-border rounded-lg text-sm text-white placeholder-tg-muted focus:outline-none focus:border-tg-accent w-64"
          />
        </div>
      </div>

      <div className="bg-tg-card border border-tg-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tg-border text-tg-muted text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Foydalanuvchi</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-center">Botlar</th>
              <th className="px-4 py-3 text-left">Ro'yxatdan o'tgan</th>
              <th className="px-4 py-3 text-left">Holat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-tg-border/60 hover:bg-tg-elevated/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{u.email}</div>
                  {u.full_name && <div className="text-xs text-tg-muted">{u.full_name}</div>}
                </td>

                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u, e.target.value)}
                      className={`appearance-none border rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer pr-6 bg-transparent ${ROLE_BADGE[u.role] || ROLE_BADGE.user}`}
                    >
                      <option value="user">user</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.plan_id ?? 0}
                      onChange={e => changePlan(u, parseInt(e.target.value))}
                      className="appearance-none bg-tg-elevated border border-tg-border rounded-lg px-2.5 py-1 text-xs text-white pr-6 cursor-pointer focus:outline-none"
                    >
                      <option value={0}>— Plansiz —</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-tg-label" />
                  </div>
                </td>

                <td className="px-4 py-3 text-center">
                  <span className="text-white font-medium">{u.bot_count}</span>
                </td>

                <td className="px-4 py-3 text-tg-label text-xs">
                  {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                    u.is_active
                      ? 'bg-node-green/10 text-node-green border-node-green/20'
                      : 'bg-node-red/10 text-node-red border-node-red/20'
                  }`}>
                    {u.is_active ? 'Aktiv' : 'Bloklangan'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => toggleActive(u)}
                      title={u.is_active ? 'Bloklash' : 'Faollashtirish'}
                      className="p-1.5 rounded-lg hover:bg-tg-elevated transition-colors text-tg-label hover:text-white"
                    >
                      {u.is_active ? <ShieldOff size={14} /> : <Shield size={14} />}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      title="O'chirish"
                      className="p-1.5 rounded-lg hover:bg-node-red/10 transition-colors text-tg-label hover:text-node-red"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-tg-muted text-sm">Hech narsa topilmadi</div>
        )}
      </div>
    </div>
  )
}
