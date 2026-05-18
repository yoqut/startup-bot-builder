import { useEffect, useState } from 'react'
import { adminApi, type Plan } from '@/api/admin'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'

const EMPTY: Omit<Plan, 'id' | 'user_count'> = {
  name: '', price: 0, max_bots: 3, max_webapps: 1, max_bot_users: 500000,
  has_ads: true, multi_lang: false, webhook_access: false,
  ai_nodes: false, marketplace: false, crm_access: false, erp_access: false,
}

const BOOLEANS: { key: keyof Omit<Plan, 'id' | 'user_count' | 'name' | 'price' | 'max_bots' | 'max_webapps' | 'max_bot_users'>; label: string }[] = [
  { key: 'has_ads',        label: 'Reklama' },
  { key: 'multi_lang',     label: 'Ko\'p til' },
  { key: 'webhook_access', label: 'Webhook' },
  { key: 'ai_nodes',       label: 'AI nodes' },
  { key: 'marketplace',    label: 'Marketplace' },
  { key: 'crm_access',     label: 'CRM' },
  { key: 'erp_access',     label: 'ERP' },
]

export default function AdminPlans() {
  const [plans, setPlans]   = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Omit<Plan, 'id' | 'user_count'>>(EMPTY)

  useEffect(() => {
    adminApi.plans().then(r => setPlans(r.data)).finally(() => setLoading(false))
  }, [])

  function openCreate() { setDraft(EMPTY); setCreating(true); setEditing(null) }
  function openEdit(p: Plan) { setDraft(p); setEditing(p); setCreating(false) }

  function setD(key: string, val: unknown) {
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    if (!draft.name.trim()) return alert('Plan nomini kiriting')
    if (editing) {
      const res = await adminApi.updatePlan(editing.id, draft)
      setPlans(prev => prev.map(x => x.id === editing.id ? res.data : x))
    } else {
      const res = await adminApi.createPlan(draft)
      setPlans(prev => [...prev, res.data])
    }
    setEditing(null); setCreating(false)
  }

  async function deletePlan(id: number) {
    if (!confirm('Planni o\'chirishni tasdiqlaysizmi?')) return
    await adminApi.deletePlan(id)
    setPlans(prev => prev.filter(x => x.id !== id))
  }

  const showForm = creating || editing !== null

  if (loading) return <div className="p-8 text-tg-muted">Yuklanmoqda…</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Planlar</h1>
          <p className="text-sm text-tg-muted mt-0.5">Subscription planlari</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-tg-accent hover:bg-tg-accent/80 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} /> Yangi plan
        </button>
      </div>

      {showForm && (
        <div className="bg-tg-card border border-tg-accent/30 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editing ? 'Planni tahrirlash' : 'Yangi plan'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-tg-label mb-1">Nomi</label>
              <input value={draft.name} onChange={e => setD('name', e.target.value)}
                className="w-full bg-tg-elevated border border-tg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tg-accent" />
            </div>
            <div>
              <label className="block text-xs text-tg-label mb-1">Narxi ($/oy)</label>
              <input type="number" value={draft.price} onChange={e => setD('price', parseFloat(e.target.value))}
                className="w-full bg-tg-elevated border border-tg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tg-accent" />
            </div>
            <div>
              <label className="block text-xs text-tg-label mb-1">Max botlar</label>
              <input type="number" value={draft.max_bots} onChange={e => setD('max_bots', parseInt(e.target.value))}
                className="w-full bg-tg-elevated border border-tg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tg-accent" />
            </div>
            <div>
              <label className="block text-xs text-tg-label mb-1">Max bot foydalanuvchilari</label>
              <input type="number" value={draft.max_bot_users} onChange={e => setD('max_bot_users', parseInt(e.target.value))}
                className="w-full bg-tg-elevated border border-tg-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tg-accent" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            {BOOLEANS.map(b => (
              <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!draft[b.key]}
                  onChange={e => setD(b.key, e.target.checked)}
                  className="w-4 h-4 rounded accent-tg-accent"
                />
                <span className="text-sm text-tg-text">{b.label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 bg-tg-accent hover:bg-tg-accent/80 text-white text-sm font-medium rounded-lg transition-colors">
              <Check size={14} /> Saqlash
            </button>
            <button onClick={() => { setEditing(null); setCreating(false) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-tg-elevated hover:bg-tg-elevated/70 text-white text-sm rounded-lg transition-colors">
              <X size={14} /> Bekor
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.id} className="bg-tg-card border border-tg-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{p.name}</h3>
                <p className="text-2xl font-bold text-tg-accent mt-1">${p.price}<span className="text-sm text-tg-muted font-normal">/oy</span></p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)}
                  className="p-1.5 rounded-lg hover:bg-tg-elevated text-tg-label hover:text-white transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deletePlan(p.id)}
                  className="p-1.5 rounded-lg hover:bg-node-red/10 text-tg-label hover:text-node-red transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-tg-label mb-3">
              <div className="flex justify-between"><span>Max botlar</span><span className="text-white">{p.max_bots}</span></div>
              <div className="flex justify-between"><span>Max foydalanuvchilar</span><span className="text-white">{p.max_bot_users.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Foydalanuvchilar soni</span><span className="text-tg-accent font-medium">{p.user_count}</span></div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BOOLEANS.filter(b => p[b.key]).map(b => (
                <span key={b.key} className="text-[10px] px-2 py-0.5 bg-tg-accent/10 text-tg-accent border border-tg-accent/20 rounded-full">
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
