import { useEffect, useState } from 'react'
import { adminApi, type Setting } from '@/api/admin'
import { Save, Eye, EyeOff } from 'lucide-react'

const SENSITIVE_KEYS = ['OPENAI_API_KEY']

function SettingRow({
  setting,
  onSave,
}: {
  setting: Setting
  onSave: (key: string, value: string) => Promise<void>
}) {
  const [val, setVal]       = useState(setting.value ?? '')
  const [show, setShow]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const isSensitive = SENSITIVE_KEYS.includes(setting.key)
  const dirty = val !== (setting.value ?? '')

  async function save() {
    setSaving(true)
    await onSave(setting.key, val)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-tg-card border border-tg-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <label className="text-sm font-mono font-medium text-tg-accent">{setting.key}</label>
        {saved && <span className="text-xs text-node-green">Saqlandi ✓</span>}
      </div>
      {setting.description && (
        <p className="text-xs text-tg-muted mb-3">{setting.description}</p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isSensitive && !show ? 'password' : 'text'}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Qiymat kiriting…"
            className="w-full bg-tg-elevated border border-tg-border rounded-lg px-3 py-2 text-sm text-white placeholder-tg-muted focus:outline-none focus:border-tg-accent pr-10"
          />
          {isSensitive && (
            <button
              onClick={() => setShow(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tg-muted hover:text-tg-label"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-tg-accent hover:bg-tg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          <Save size={13} />
          {saving ? '…' : 'Saqlash'}
        </button>
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    adminApi.settings().then(r => setSettings(r.data)).finally(() => setLoading(false))
  }, [])

  async function handleSave(key: string, value: string) {
    const res = await adminApi.updateSetting(key, value)
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: res.data.value } : s))
  }

  if (loading) return <div className="p-8 text-tg-muted">Yuklanmoqda…</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Tizim Sozlamalari</h1>
        <p className="text-sm text-tg-muted mt-0.5">Bu yerdan o'zgartirilgan sozlamalar darhol kuchga kiradi</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        {settings.map(s => (
          <SettingRow key={s.key} setting={s} onSave={handleSave} />
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-tg-muted text-sm">Sozlamalar topilmadi</div>
      )}
    </div>
  )
}
