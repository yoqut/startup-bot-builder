import { useEffect, useState } from 'react'
import { adminApi, type AdminBot } from '@/api/admin'
import { Search, Power, Trash2, Users, GitBranch } from 'lucide-react'

export default function AdminBots() {
  const [bots, setBots]     = useState<AdminBot[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.bots().then(r => setBots(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = bots.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    (b.username || '').toLowerCase().includes(search.toLowerCase())
  )

  async function toggleBot(b: AdminBot) {
    const res = await adminApi.toggleBot(b.id)
    setBots(prev => prev.map(x => x.id === b.id ? { ...x, is_active: res.data.is_active } : x))
  }

  async function deleteBot(id: string) {
    if (!confirm('Botni o\'chirishni tasdiqlaysizmi? Barcha flow va ma\'lumotlar yo\'qoladi.')) return
    await adminApi.deleteBot(id)
    setBots(prev => prev.filter(x => x.id !== id))
  }

  if (loading) return <div className="p-8 text-tg-muted">Yuklanmoqda…</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Botlar</h1>
          <p className="text-sm text-tg-muted mt-0.5">Jami: {bots.length} ta</p>
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
              <th className="px-4 py-3 text-left">Bot</th>
              <th className="px-4 py-3 text-left">Egasi</th>
              <th className="px-4 py-3 text-center">Flowlar</th>
              <th className="px-4 py-3 text-center">Foydalanuvchilar</th>
              <th className="px-4 py-3 text-left">Yaratilgan</th>
              <th className="px-4 py-3 text-left">Holat</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} className="border-b border-tg-border/60 hover:bg-tg-elevated/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{b.name}</div>
                  {b.username && <div className="text-xs text-tg-muted">@{b.username}</div>}
                </td>

                <td className="px-4 py-3 text-tg-label text-xs">{b.owner_email}</td>

                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 text-tg-text">
                    <GitBranch size={12} className="text-tg-muted" />
                    {b.flow_count}
                  </div>
                </td>

                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-1 text-tg-text">
                    <Users size={12} className="text-tg-muted" />
                    {b.user_count.toLocaleString()}
                  </div>
                </td>

                <td className="px-4 py-3 text-tg-label text-xs">
                  {new Date(b.created_at).toLocaleDateString('uz-UZ')}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
                    b.is_active
                      ? 'bg-node-green/10 text-node-green border-node-green/20'
                      : 'bg-tg-elevated/30 text-tg-muted border-tg-border'
                  }`}>
                    {b.is_active ? 'Aktiv' : 'Nofaol'}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => toggleBot(b)}
                      title={b.is_active ? 'O\'chirish' : 'Yoqish'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        b.is_active
                          ? 'hover:bg-node-amber/10 text-tg-label hover:text-node-amber'
                          : 'hover:bg-node-green/10 text-tg-label hover:text-node-green'
                      }`}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => deleteBot(b.id)}
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
