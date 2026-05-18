import { Check, ShoppingCart, Star, Zap, Loader2, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Template } from '@/types/template'
import { COMPLEXITY_META } from '@/types/template'
import type { PurchaseState } from '@/hooks/usePurchase'

const CATEGORY_COLORS: Record<string, string> = {
  'E-commerce': 'text-tg-accent bg-tg-accent/10',
  'Support':    'text-green-400 bg-green-500/10',
  'Booking':    'text-node-violet bg-node-violet/10',
  'FAQ':        'text-node-amber bg-node-amber/10',
  'Quiz':       'text-pink-400 bg-pink-500/10',
  'Loyalty':    'text-orange-400 bg-orange-500/10',
  'Other':      'text-tg-muted bg-tg-elevated',
}

const CATEGORY_ICONS: Record<string, string> = {
  'E-commerce': '🛍️', 'Support': '💬', 'Booking': '📅',
  'FAQ': '❓', 'Quiz': '🧩', 'Loyalty': '⭐', 'Other': '🤖',
}

function StarRating({ rating, small }: { rating: number; small?: boolean }) {
  const size = small ? 9 : 10
  return (
    <span className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-tg-muted'}
        />
      ))}
    </span>
  )
}

interface Props {
  template: Template
  onUse: (template: Template) => void
  onBuy: (template: Template) => void
  onPreview?: (template: Template) => void
  purchaseState?: PurchaseState
}

export default function TemplateCard({ template, onUse, onBuy, onPreview, purchaseState }: Props) {
  const { t } = useTranslation()
  const isBuying = purchaseState === 'sending' || purchaseState === 'polling'
  const catColor = CATEGORY_COLORS[template.category ?? ''] ?? CATEGORY_COLORS['Other']
  const complexMeta = template.complexity ? COMPLEXITY_META[template.complexity] : null

  return (
    <div className="bg-tg-card rounded-[18px] border border-tg-input flex flex-col overflow-hidden transition-all duration-150 hover:border-tg-accent/30 group">

      {/* Preview area */}
      <div className="h-[100px] bg-gradient-to-br from-tg-elevated to-tg-bg flex items-center justify-center relative overflow-hidden">
        {template.preview_url ? (
          <img src={template.preview_url} alt={template.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-[36px] select-none opacity-60">
            {CATEGORY_ICONS[template.category ?? ''] ?? '🤖'}
          </div>
        )}

        {/* Hover overlay — Ko'rish */}
        {onPreview && (
          <button
            onClick={() => onPreview(template)}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5 text-white text-[11px] font-semibold">
              <Eye size={11} />
              {t('templates.preview')}
            </span>
          </button>
        )}

        {/* Price badge */}
        <div className="absolute top-2 right-2">
          {template.price_stars === 0 ? (
            <span className="text-[10px] font-bold px-2 py-[3px] rounded-full bg-green-500/20 text-green-400 border border-green-500/25">
              {t('templates.free')}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-[3px] rounded-full bg-tg-bg/80 text-yellow-400 border border-yellow-500/25 flex items-center gap-1 backdrop-blur-sm">
              <Star size={9} className="fill-yellow-400" />
              {template.price_stars}
            </span>
          )}
        </div>

        {/* Own badge */}
        {template.is_own && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-bold px-1.5 py-[2px] rounded-full bg-tg-accent/20 text-tg-accent border border-tg-accent/30">
              Sizniki
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {template.category && (
            <span className={`text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-[2px] rounded-full ${catColor}`}>
              {template.category}
            </span>
          )}
          {complexMeta && template.complexity && (
            <span className={`text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-[2px] rounded-full border ${complexMeta.color}`}>
              {t(`templates.complexity.${template.complexity}`)}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-[13px] font-bold text-white m-0 mb-1 leading-snug line-clamp-2">
            {template.title}
          </h3>
          {template.description && (
            <p className="text-[11px] text-tg-label m-0 leading-relaxed line-clamp-2">
              {template.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-[10px] text-tg-muted">
          <div className="flex items-center gap-2">
            {template.node_count > 0 && (
              <span>{t('templates.nodes_count', { count: template.node_count })}</span>
            )}
            {template.uses_count > 0 && (
              <span>{template.uses_count}↓</span>
            )}
          </div>
          {template.review_count > 0 && (
            <div className="flex items-center gap-1">
              <StarRating rating={template.avg_rating} small />
              <span>{template.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Action button */}
        {template.is_unlocked || template.price_stars === 0 ? (
          <button
            onClick={() => onUse(template)}
            className="w-full flex items-center justify-center gap-1.5 bg-tg-accent border-none rounded-[10px] py-2 text-white text-[12px] font-semibold cursor-pointer hover:bg-tg-accent/90 transition-colors duration-150"
          >
            {template.is_unlocked && <Check size={12} />}
            <Zap size={12} />
            {t('templates.use')}
          </button>
        ) : (
          <button
            onClick={() => onBuy(template)}
            disabled={isBuying}
            className="w-full flex items-center justify-center gap-1.5 bg-tg-elevated border border-tg-input rounded-[10px] py-2 text-white text-[12px] font-semibold cursor-pointer hover:bg-tg-card hover:border-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          >
            {isBuying ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {purchaseState === 'polling' ? "Kutilmoqda…" : "Yuborilmoqda…"}
              </>
            ) : (
              <>
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                {template.price_stars} {t('templates.buy')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
