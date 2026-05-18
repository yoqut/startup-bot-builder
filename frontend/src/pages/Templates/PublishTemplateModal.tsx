import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { templatesApi } from '@/api/templates'
import { toast } from '@/store/toast.store'
import { CATEGORIES } from '@/types/template'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function PublishTemplateModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priceStars, setPriceStars] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Sarlavha kiriting'); return }
    setLoading(true)
    try {
      await templatesApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        price_stars: priceStars,
      })
      toast.success('Shablon yaratildi!')
      onCreated()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-tg-bg border border-tg-input rounded-t-[24px] sm:rounded-[24px] p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-white m-0">Shablon yaratish</h2>
          <button onClick={onClose} className="bg-tg-elevated border border-tg-input w-8 h-8 rounded-full flex items-center justify-center text-tg-muted hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-tg-muted uppercase tracking-[0.5px] mb-1 block">Sarlavha *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: E-commerce bot"
              className="w-full bg-tg-card border border-tg-input rounded-[12px] px-3 py-[10px] text-[14px] text-white placeholder:text-tg-muted outline-none focus:border-tg-accent transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-tg-muted uppercase tracking-[0.5px] mb-1 block">Tavsif</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shablon nima qiladi?"
              rows={3}
              className="w-full bg-tg-card border border-tg-input rounded-[12px] px-3 py-[10px] text-[14px] text-white placeholder:text-tg-muted outline-none focus:border-tg-accent transition-colors resize-none"
            />
          </div>

          {/* Category + Price row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-tg-muted uppercase tracking-[0.5px] mb-1 block">Kategoriya</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-tg-card border border-tg-input rounded-[12px] px-3 py-[10px] text-[14px] text-white outline-none focus:border-tg-accent transition-colors appearance-none"
              >
                <option value="">Tanlang</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="w-28">
              <label className="text-[11px] font-semibold text-tg-muted uppercase tracking-[0.5px] mb-1 block">Narx (⭐)</label>
              <input
                type="number"
                min={0}
                value={priceStars}
                onChange={(e) => setPriceStars(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-tg-card border border-tg-input rounded-[12px] px-3 py-[10px] text-[14px] text-white outline-none focus:border-tg-accent transition-colors"
              />
            </div>
          </div>

          {priceStars === 0 && (
            <p className="text-[11px] text-green-400 m-0 -mt-1">Bepul shablon — hamma foydalana oladi</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-tg-accent border-none rounded-[12px] py-[11px] text-white text-[14px] font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-1 transition-opacity"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Yaratilmoqda…' : 'Shablon yaratish'}
          </button>
        </form>
      </div>
    </div>
  )
}
