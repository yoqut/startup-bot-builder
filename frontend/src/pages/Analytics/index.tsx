import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Users, MessageSquare, TrendingUp, Activity, UserPlus } from 'lucide-react'
import { apiClient } from '@/api/client'
import { botsApi } from '@/api/bots'
import type { Bot } from '@/types/bot'

interface Summary {
  total_users: number
  active_users_7d: number
  new_users_today: number
  messages_today: number
  messages_7d: number
  messages_total: number
}
interface DayPoint { date: string; count: number }
interface RecentUser {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  language_code: string | null
  first_seen_at: string | null
  last_seen_at: string | null
}
interface Analytics {
  summary: Summary
  users_by_day: DayPoint[]
  messages_by_day: DayPoint[]
  event_breakdown: Record<string, number>
  recent_users: RecentUser[]
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
function shortDate(iso: string) { return iso.slice(5) }
function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Hozirgina'
  if (m < 60) return `${m} daqiqa oldin`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} soat oldin`
  return `${Math.floor(h / 24)} kun oldin`
}

export default function AnalyticsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [selectedBot, setSelectedBot] = useState<string>('')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    botsApi.list().then((res) => {
      setBots(res.data)
      if (res.data.length > 0) setSelectedBot(res.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedBot) return
    setLoading(true)
    setError('')
    apiClient.get<Analytics>(`/analytics/${selectedBot}?days=${days}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Ma'lumotlarni yuklashda xatolik"))
      .finally(() => setLoading(false))
  }, [selectedBot, days])

  const s = data?.summary

  const statCards = s ? [
    { icon: Users, label: 'Jami foydalanuvchilar', value: s.total_users },
    { icon: Activity, label: 'Faol (7 kun)', value: s.active_users_7d },
    { icon: UserPlus, label: 'Bugun yangi', value: s.new_users_today },
    { icon: MessageSquare, label: 'Bugun xabarlar', value: s.messages_today },
    { icon: TrendingUp, label: `Xabarlar (${days}k)`, value: s.messages_7d },
    { icon: MessageSquare, label: 'Jami xabarlar', value: s.messages_total },
  ] : []

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-[10px]">
        <div>
          <h1 className="m-0 text-lg font-bold text-white">Analytics</h1>
          <p className="mt-0.5 mb-0 text-xs text-tg-label">Bot statistikasi</p>
        </div>
        <div className="flex items-center gap-2">
          {bots.length > 1 && (
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              className="tg-input tg-select py-1.5 px-[10px] rounded-lg text-[13px]"
            >
              {bots.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {/* Period segmented control */}
          <div className="seg-ctrl">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`seg-btn${days === d ? ' active' : ''}`}
              >
                {d}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-[10px] px-[14px] py-[10px] text-[#ef5350] text-[13px]">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-tg-card rounded-xl h-[72px]" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-2">
            {statCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-tg-card rounded-xl px-4 py-[14px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-[26px] rounded-[7px] bg-tg-accent flex items-center justify-center">
                    <Icon size={13} color="#fff" />
                  </div>
                  <span className="text-[11px] text-tg-label">{label}</span>
                </div>
                <div className="text-2xl font-bold text-white tracking-[-0.5px]">
                  {fmt(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="flex flex-col gap-3">
            <div className="bg-tg-card rounded-xl p-4">
              <div className="text-[13px] font-semibold text-white mb-[14px]">
                Foydalanuvchilar o'sishi
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.users_by_day} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2481cc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2481cc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#4a6278', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.users_by_day.length / 6)} />
                  <YAxis tick={{ fill: '#4a6278', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#17212b', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#7d9ab5' }} itemStyle={{ color: '#2481cc' }} />
                  <Area type="monotone" dataKey="count" name="Yangi foydalanuvchi" stroke="#2481cc" fill="url(#userGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-tg-card rounded-xl p-4">
              <div className="text-[13px] font-semibold text-white mb-[14px]">Kunlik xabarlar</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.messages_by_day} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: '#4a6278', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.messages_by_day.length / 6)} />
                  <YAxis tick={{ fill: '#4a6278', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#17212b', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#7d9ab5' }} itemStyle={{ color: '#2481cc' }} />
                  <Bar dataKey="count" name="Xabarlar" fill="#2481cc" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Event breakdown */}
          {Object.keys(data.event_breakdown).length > 0 && (
            <div className="bg-tg-card rounded-xl p-4">
              <div className="text-[13px] font-semibold text-white mb-[14px]">Event turlari</div>
              <div className="flex flex-col gap-3">
                {Object.entries(data.event_breakdown).map(([type, count]) => {
                  const total = Object.values(data.event_breakdown).reduce((a, b) => a + b, 0)
                  const pct = total ? Math.round(count / total * 100) : 0
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-[5px]">
                        <span className="text-white capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-tg-label">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1 bg-tg-elevated rounded-sm overflow-hidden">
                        <div className="h-full bg-tg-accent rounded-sm" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent users */}
          {data.recent_users.length > 0 && (
            <div className="bg-tg-card rounded-xl overflow-hidden">
              <div className="text-[13px] font-semibold text-white px-4 pt-[14px] pb-[10px]">
                So'nggi foydalanuvchilar
              </div>
              {data.recent_users.map((u, i) => (
                <div key={u.id}>
                  {i > 0 && <div className="h-px bg-tg-input ml-14" />}
                  <div className="flex items-center gap-3 px-4 py-[10px]">
                    <div className="size-9 rounded-full bg-tg-elevated flex items-center justify-center text-[13px] font-semibold text-tg-label shrink-0">
                      {(u.first_name || u.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-white truncate">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div className="text-[11px] text-tg-muted mt-0.5">
                        {u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-tg-muted">{timeAgo(u.last_seen_at)}</div>
                      {u.language_code && (
                        <div className="text-[10px] text-tg-muted bg-tg-elevated rounded px-[5px] py-px mt-0.5 inline-block">
                          {u.language_code}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
