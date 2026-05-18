import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X, Star, Zap, Download, GitBranch, Loader2,
  ChevronRight, Bot as BotIcon,
} from 'lucide-react'
import { templatesApi } from '@/api/templates'
import { botsApi } from '@/api/bots'
import { toast } from '@/store/toast.store'
import type { Template, TemplateDetail as TDetail, TemplateReview } from '@/types/template'
import { COMPLEXITY_META } from '@/types/template'
import type { Bot } from '@/types/bot'
import type { PurchaseState } from '@/hooks/usePurchase'
import TemplatePreviewFlow from './TemplatePreviewFlow'

interface Props {
  template: Template
  purchaseState?: PurchaseState
  onBuy: (template: Template) => void
  onClose: () => void
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="bg-transparent border-0 cursor-pointer p-0"
        >
          <Star
            size={20}
            className={
              i <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-tg-muted'
            }
          />
        </button>
      ))}
    </span>
  )
}

function ReviewItem({ review }: { review: TemplateReview }) {
  return (
    <div className="bg-tg-elevated rounded-[14px] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-tg-accent/20 flex items-center justify-center text-[11px] font-bold text-tg-accent">
            {(review.reviewer_name || '?').slice(0, 1).toUpperCase()}
          </div>
          <span className="text-[12px] font-medium text-white">{review.reviewer_name || 'Foydalanuvchi'}</span>
        </div>
        <span className="flex items-center gap-[2px]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={9} className={i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-tg-muted'} />
          ))}
        </span>
      </div>
      {review.comment && (
        <p className="text-[12px] text-tg-label m-0 leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

export default function TemplateDetail({ template, purchaseState, onBuy, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isBuying = purchaseState === 'sending' || purchaseState === 'polling'

  const [detail, setDetail] = useState<TDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Bot picker
  const [bots, setBots] = useState<Bot[]>([])
  const [showBotPicker, setShowBotPicker] = useState(false)
  const [loadingBots, setLoadingBots] = useState(false)
  const [applyingBotId, setApplyingBotId] = useState<string | null>(null)

  // Preview flow
  const [showFlowPreview, setShowFlowPreview] = useState(false)

  // Review form
  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Load full detail
  useEffect(() => {
    setLoadingDetail(true)
    templatesApi.get(template.id)
      .then(({ data }) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoadingDetail(false))
  }, [template.id])

  const handleUseClick = useCallback(async () => {
    setLoadingBots(true)
    setShowBotPicker(true)
    try {
      const { data } = await botsApi.list()
      setBots(data)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setLoadingBots(false)
    }
  }, [t])

  const handleApplyBot = useCallback(async (botId: string) => {
    setApplyingBotId(botId)
    try {
      const { data } = await templatesApi.use(template.id, botId)
      toast.success(t('templates.detail.applied'))
      setShowBotPicker(false)
      onClose()
      navigate(`/bots/${data.bot_id}/flows`)
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      if (status === 409) {
        toast.warning(t('templates.already_owned'))
      } else if (status === 403) {
        toast.error(t('templates.link_telegram'))
      } else {
        toast.error(detail || t('common.error'))
      }
    } finally {
      setApplyingBotId(null)
    }
  }, [template.id, navigate, onClose, t])

  const handleSubmitReview = useCallback(async () => {
    if (reviewRating === 0) { toast.error(t('templates.detail.your_rating')); return }
    setSubmittingReview(true)
    try {
      await templatesApi.review(template.id, { rating: reviewRating, comment: reviewComment || undefined })
      toast.success(t('templates.detail.review_submitted'))
      setShowReview(false)
      // Refresh detail
      const { data } = await templatesApi.get(template.id)
      setDetail(data)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) toast.error(t('templates.detail.review_only_owners'))
      else toast.error(t('common.error'))
    } finally {
      setSubmittingReview(false)
    }
  }, [reviewRating, reviewComment, template.id, t])

  const complexMeta = template.complexity ? COMPLEXITY_META[template.complexity] : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[9991] w-full max-w-md bg-tg-bg border-l border-tg-darkborder flex flex-col overflow-hidden animate-[slideInRight_0.2s_ease]">

        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-tg-darkborder shrink-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-tg-card border border-tg-input flex items-center justify-center text-tg-muted hover:text-white transition-colors mt-0.5 shrink-0">
            <X size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold text-white m-0 leading-tight">{template.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {template.category && (
                <span className="text-[10px] font-bold bg-tg-accent/15 text-tg-accent px-2 py-0.5 rounded-full">
                  {template.category}
                </span>
              )}
              {complexMeta && template.complexity && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${complexMeta.color}`}>
                  {t(`templates.complexity.${template.complexity}`)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Preview image */}
          <div className="h-[160px] bg-gradient-to-br from-tg-elevated to-tg-bg flex items-center justify-center relative overflow-hidden">
            {template.preview_url ? (
              <img src={template.preview_url} alt={template.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-[64px] opacity-30">
                {{'E-commerce':'🛍️','Support':'💬','Booking':'📅','FAQ':'❓','Quiz':'🧩','Loyalty':'⭐'}[template.category ?? ''] ?? '🤖'}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-tg-darkborder text-[12px] text-tg-muted">
            {template.node_count > 0 && (
              <span className="flex items-center gap-1">
                <GitBranch size={12} />
                {t('templates.detail.node_count', { count: template.node_count })}
              </span>
            )}
            {template.uses_count > 0 && (
              <span className="flex items-center gap-1">
                <Download size={12} />
                {t('templates.detail.downloads', { count: template.uses_count })}
              </span>
            )}
            {template.review_count > 0 && (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                {template.avg_rating.toFixed(1)} ({template.review_count})
              </span>
            )}
            {template.price_stars === 0 ? (
              <span className="ml-auto font-bold text-green-400">{t('templates.free')}</span>
            ) : (
              <span className="ml-auto font-bold text-yellow-400 flex items-center gap-1">
                <Star size={11} className="fill-yellow-400" />
                {template.price_stars}
              </span>
            )}
          </div>

          {/* Description */}
          {template.description && (
            <div className="px-4 py-3 border-b border-tg-darkborder">
              <p className="text-[13px] text-tg-label m-0 leading-relaxed">{template.description}</p>
            </div>
          )}

          {/* Flow preview button */}
          {(detail?.flow_data?.nodes?.length ?? 0) > 0 && (
            <div className="px-4 py-3 border-b border-tg-darkborder">
              <button
                onClick={() => setShowFlowPreview(true)}
                className="w-full flex items-center justify-between bg-tg-card border border-tg-input rounded-[12px] px-3 py-3 text-tg-accent text-[13px] font-medium cursor-pointer hover:border-tg-accent/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GitBranch size={14} />
                  {t('templates.detail.flow_preview')}
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Reviews */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-white m-0">{t('templates.detail.reviews')}</h3>
              {(template.is_unlocked || template.is_own) && !showReview && (
                <button
                  onClick={() => setShowReview(true)}
                  className="text-tg-accent text-[12px] font-medium bg-transparent border-0 cursor-pointer"
                >
                  {t('templates.detail.write_review')}
                </button>
              )}
            </div>

            {/* Review form */}
            {showReview && (
              <div className="bg-tg-card border border-tg-input rounded-[14px] p-3 mb-3 flex flex-col gap-2">
                <div>
                  <p className="text-[11px] text-tg-muted m-0 mb-1">{t('templates.detail.your_rating')}</p>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('templates.detail.review_placeholder')}
                  rows={3}
                  className="w-full bg-tg-elevated border border-tg-input rounded-[10px] px-3 py-2 text-[13px] text-white placeholder:text-tg-muted outline-none focus:border-tg-accent transition-colors resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReview(false)}
                    className="flex-1 bg-tg-elevated border border-tg-input rounded-[10px] py-2 text-tg-muted text-[12px] font-medium cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || reviewRating === 0}
                    className="flex-1 bg-tg-accent border-none rounded-[10px] py-2 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submittingReview && <Loader2 size={12} className="animate-spin" />}
                    {t('templates.detail.submit_review')}
                  </button>
                </div>
              </div>
            )}

            {loadingDetail ? (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => <div key={i} className="bg-tg-elevated rounded-[14px] h-[70px] animate-pulse" />)}
              </div>
            ) : (detail?.reviews?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-tg-muted text-center py-4 m-0">{t('templates.detail.no_reviews')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail!.reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
              </div>
            )}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="p-4 border-t border-tg-darkborder shrink-0 bg-tg-bg">
          {template.is_unlocked || template.price_stars === 0 ? (
            <button
              onClick={handleUseClick}
              className="w-full flex items-center justify-center gap-2 bg-tg-accent border-none rounded-[14px] py-3 text-white text-[15px] font-semibold cursor-pointer hover:bg-tg-accent/90 transition-colors"
            >
              <Zap size={16} />
              {t('templates.use')}
            </button>
          ) : (
            <button
              onClick={() => onBuy(template)}
              disabled={isBuying}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500/15 border border-yellow-500/30 rounded-[14px] py-3 text-yellow-400 text-[15px] font-semibold cursor-pointer hover:bg-yellow-500/20 disabled:opacity-50 transition-colors"
            >
              {isBuying ? (
                <><Loader2 size={15} className="animate-spin" /> {purchaseState === 'polling' ? "Kutilmoqda…" : "Yuborilmoqda…"}</>
              ) : (
                <><Star size={15} className="fill-yellow-400" /> {template.price_stars} — {t('templates.buy')}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bot Picker Modal */}
      {showBotPicker && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBotPicker(false)}>
          <div className="w-full max-w-sm bg-tg-bg border border-tg-input rounded-t-[24px] sm:rounded-[24px] p-4 flex flex-col gap-3 max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-white m-0">{t('templates.detail.select_bot')}</h3>
                <p className="text-[12px] text-tg-muted m-0">{t('templates.detail.select_bot_desc')}</p>
              </div>
              <button onClick={() => setShowBotPicker(false)} className="w-8 h-8 rounded-full bg-tg-card border border-tg-input flex items-center justify-center text-tg-muted hover:text-white">
                <X size={14} />
              </button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-2">
              {loadingBots ? (
                [1, 2, 3].map((i) => <div key={i} className="bg-tg-card rounded-[12px] h-[52px] animate-pulse" />)
              ) : bots.length === 0 ? (
                <div className="text-center py-6">
                  <BotIcon size={28} color="#4a6278" className="mx-auto mb-2 block" />
                  <p className="text-white text-[13px] font-semibold m-0 mb-1">{t('templates.detail.no_bots')}</p>
                  <p className="text-tg-muted text-[12px] m-0">{t('templates.detail.no_bots_desc')}</p>
                </div>
              ) : (
                bots.map((bot) => {
                  const applying = applyingBotId === bot.id
                  return (
                    <button
                      key={bot.id}
                      onClick={() => handleApplyBot(bot.id)}
                      disabled={!!applyingBotId}
                      className="flex items-center gap-3 bg-tg-card border border-tg-input rounded-[12px] px-3 py-2.5 text-left cursor-pointer hover:border-tg-accent/40 disabled:opacity-60 transition-all"
                    >
                      <div className="w-9 h-9 rounded-[10px] bg-tg-accent/15 flex items-center justify-center shrink-0">
                        <BotIcon size={16} color="#2481cc" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-white truncate">{bot.name}</div>
                        {bot.username && <div className="text-[11px] text-tg-muted">@{bot.username}</div>}
                      </div>
                      {applying ? (
                        <Loader2 size={15} className="animate-spin text-tg-accent shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-tg-muted shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flow Preview */}
      {showFlowPreview && detail && (
        <TemplatePreviewFlow
          template={detail}
          onClose={() => setShowFlowPreview(false)}
          onUse={() => { setShowFlowPreview(false); handleUseClick() }}
        />
      )}
    </>
  )
}
