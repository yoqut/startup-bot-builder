import { useState } from 'react'
import { Plus, Store, Zap, Edit2, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { templatesApi } from '@/api/templates'
import { toast } from '@/store/toast.store'
import type { Template } from '@/types/template'
import PublishTemplateModal from './PublishTemplateModal'

interface Props {
  templates: Template[]
  loading: boolean
  onUse: (template: Template) => void
  onRefetch: () => void
  purchased?: boolean
}

export default function MyPurchases({ templates, loading, onUse, onRefetch, purchased }: Props) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [showPublish, setShowPublish] = useState(false)

  const handleTogglePublish = async (tmpl: Template) => {
    setActionId(tmpl.id)
    try {
      if (tmpl.is_published) {
        await templatesApi.unpublish(tmpl.id)
        toast.success('Shablon yashirildi')
      } else {
        await templatesApi.publish(tmpl.id)
        toast.success('Shablon marketplace\'ga chiqarildi')
      }
      onRefetch()
    } catch {
      toast.error('Xatolik yuz berdi')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (tmpl: Template) => {
    if (!confirm(`"${tmpl.title}" shablonini o'chirishni tasdiqlaysizmi?`)) return
    setActionId(tmpl.id)
    try {
      await templatesApi.delete(tmpl.id)
      toast.success('Shablon o\'chirildi')
      onRefetch()
    } catch {
      toast.error('O\'chirishda xatolik')
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-tg-card rounded-[18px] h-[80px] animate-pulse" />
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-14 bg-tg-card rounded-[20px] flex flex-col items-center gap-3">
        <Store size={32} color="#4a6278" />
        <div>
          <p className="text-white text-[15px] font-semibold m-0 mb-1">
            {purchased ? 'Sotib olingan shablonlar yo\'q' : 'Siz hali shablon yaratmagansiz'}
          </p>
          <p className="text-tg-label text-[13px] m-0">
            {purchased
              ? 'Marketplace\'dan shablonlar sotib oling'
              : 'Botingizdan flow eksport qilib, uni marketplace\'ga qo\'ying'}
          </p>
        </div>
        {!purchased && (
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-2 bg-tg-accent border-none rounded-xl px-4 py-2 text-white text-[13px] font-semibold cursor-pointer mt-1"
          >
            <Plus size={14} />
            Shablon yaratish
          </button>
        )}
        {showPublish && (
          <PublishTemplateModal onClose={() => setShowPublish(false)} onCreated={() => { setShowPublish(false); onRefetch() }} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!purchased && (
        <button
          onClick={() => setShowPublish(true)}
          className="flex items-center justify-center gap-2 bg-tg-card border border-dashed border-tg-input rounded-[18px] py-4 text-tg-label text-[13px] font-medium cursor-pointer hover:border-tg-accent/40 hover:text-white transition-all duration-150"
        >
          <Plus size={15} />
          Yangi shablon qo'shish
        </button>
      )}

      {templates.map((tmpl) => {
        const busy = actionId === tmpl.id
        return (
          <div key={tmpl.id} className="bg-tg-card rounded-[18px] border border-tg-input p-3 flex items-center gap-3">
            {/* Icon */}
            <div className="w-11 h-11 rounded-[12px] bg-tg-elevated flex items-center justify-center text-[22px] shrink-0">
              {CATEGORY_ICONS[tmpl.category ?? ''] ?? '🤖'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-[13px] font-bold text-white m-0 truncate">{tmpl.title}</h3>
                {!purchased && (
                  <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded-full shrink-0 ${
                    tmpl.is_published
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'bg-tg-elevated text-tg-muted border border-tg-darkborder'
                  }`}>
                    {tmpl.is_published ? 'Chiqarilgan' : 'Yashirin'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-tg-muted">
                {tmpl.category && <span>{tmpl.category}</span>}
                {tmpl.uses_count > 0 && <span>· {tmpl.uses_count}x</span>}
                {tmpl.price_stars === 0
                  ? <span className="text-green-400">· Bepul</span>
                  : <span className="text-yellow-400">· ⭐ {tmpl.price_stars}</span>
                }
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onUse(tmpl)}
                title="Ishlatish"
                className="w-8 h-8 rounded-[9px] bg-tg-accent/15 border border-tg-accent/25 flex items-center justify-center text-tg-accent hover:bg-tg-accent hover:text-white transition-all duration-150"
              >
                <Zap size={13} />
              </button>

              {!purchased && (
                <>
                  <button
                    onClick={() => handleTogglePublish(tmpl)}
                    disabled={busy}
                    title={tmpl.is_published ? 'Yashirish' : 'Chiqarish'}
                    className="w-8 h-8 rounded-[9px] bg-tg-elevated border border-tg-input flex items-center justify-center text-tg-muted hover:text-white hover:border-tg-accent/30 disabled:opacity-40 transition-all duration-150"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : tmpl.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>

                  <button
                    onClick={() => handleDelete(tmpl)}
                    disabled={busy}
                    title="O'chirish"
                    className="w-8 h-8 rounded-[9px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-all duration-150"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}

      {showPublish && (
        <PublishTemplateModal onClose={() => setShowPublish(false)} onCreated={() => { setShowPublish(false); onRefetch() }} />
      )}
    </div>
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  'E-commerce': '🛍️',
  'Support':    '💬',
  'Booking':    '📅',
  'FAQ':        '❓',
  'Quiz':       '🧩',
  'Loyalty':    '⭐',
  'Other':      '🤖',
}
