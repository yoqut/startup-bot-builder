import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, ShoppingBag, Store, Search, Star } from 'lucide-react'
import { usePurchase } from '@/hooks/usePurchase'
import { useMobile } from '@/hooks/useMobile'
import { useTemplateStore } from '@/store/template.store'
import type { Template } from '@/types/template'
import { CATEGORIES } from '@/types/template'
import TemplateCard from './TemplateCard'
import TemplateDetail from './TemplateDetail'
import MyTemplates from './MyTemplates'

type TabType = 'marketplace' | 'my' | 'purchased'

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return <div className="bg-tg-card rounded-[18px] h-[220px] animate-pulse" />
}

// ── Featured strip ─────────────────────────────────────────────────────────────
function FeaturedStrip({
  templates,
  onPreview,
  onUse,
  onBuy,
  buyingId,
  purchaseState,
}: {
  templates: Template[]
  onPreview: (t: Template) => void
  onUse: (t: Template) => void
  onBuy: (t: Template) => void
  buyingId: string | null
  purchaseState: ReturnType<typeof usePurchase>['state']
}) {
  const { t } = useTranslation()
  if (templates.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Star size={13} className="fill-yellow-400 text-yellow-400" />
        <span className="text-[12px] font-bold text-yellow-400 uppercase tracking-wide">
          {t('templates.featured')}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="w-[160px] shrink-0">
            <TemplateCard
              template={tmpl}
              onUse={onUse}
              onBuy={onBuy}
              onPreview={onPreview}
              purchaseState={buyingId === tmpl.id ? purchaseState : 'idle'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { t } = useTranslation()
  const isMobile = useMobile()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = (searchParams.get('tab') as TabType) || 'marketplace'
  const setTab = (t: TabType) => setSearchParams({ tab: t })

  const {
    templates, featured, loading, category, search,
    myTemplates, myLoading,
    setCategory, setSearch, fetchMarketplace, fetchMyTemplates, markUnlocked,
  } = useTemplateStore()

  // Per-template purchase state
  const [buyingId, setBuyingId] = useState<string | null>(null)

  // Detail panel
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null)

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchInput, setSearchInput] = useState(search)

  const handleSearchChange = useCallback((q: string) => {
    setSearchInput(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(q), 300)
  }, [setSearch])

  const handleUnlocked = useCallback((templateId: string) => {
    markUnlocked(templateId)
    setBuyingId(null)
    fetchMyTemplates()
  }, [markUnlocked, fetchMyTemplates])

  const { purchase, state: purchaseState } = usePurchase(handleUnlocked)

  useEffect(() => {
    if (tab === 'marketplace') fetchMarketplace()
    else fetchMyTemplates()
  }, [tab])

  const handleBuy = useCallback(async (template: Template) => {
    setBuyingId(template.id)
    await purchase(template)
    if (purchaseState !== 'polling') setBuyingId(null)
  }, [purchase, purchaseState])

  const handleUse = useCallback((template: Template) => {
    setDetailTemplate(template)
  }, [])

  const handlePreview = useCallback((template: Template) => {
    setDetailTemplate(template)
  }, [])

  // Non-featured templates
  const regularTemplates = templates.filter((t) => !t.is_featured)

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`m-0 ${isMobile ? 'text-xl' : 'text-[22px]'} font-bold text-white tracking-[-0.4px]`}>
            {t('templates.title')}
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-tg-label">{t('templates.subtitle')}</p>
        </div>
        <button
          onClick={() => setTab('my')}
          className="flex items-center gap-2 bg-tg-accent border-none rounded-xl px-[14px] py-[9px] text-white text-[13px] font-semibold cursor-pointer shadow-[0_2px_12px_rgba(36,129,204,0.35)]"
        >
          <Plus size={15} />
          {!isMobile && t('templates.create')}
        </button>
      </div>

      {/* Tabs */}
      <div className="seg-ctrl">
        {([
          ['marketplace', Store,       t('templates.tab_marketplace')],
          ['my',          Plus,        t('templates.tab_my')],
          ['purchased',   ShoppingBag, t('templates.tab_purchased')],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as TabType)}
            className={`seg-btn${tab === key ? ' active' : ''} flex items-center justify-center gap-[5px]`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ── Marketplace ── */}
      {tab === 'marketplace' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-muted pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('templates.search')}
              className="w-full bg-tg-card border border-tg-input rounded-[12px] pl-9 pr-3 py-[9px] text-[13px] text-white placeholder:text-tg-muted outline-none focus:border-tg-accent transition-colors"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['', ...CATEGORIES].map((cat) => (
              <button
                key={cat || 'all'}
                onClick={() => setCategory(cat)}
                className={[
                  'flex-shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-150',
                  category === cat
                    ? 'bg-tg-accent border-tg-accent text-white'
                    : 'bg-tg-card border-tg-input text-tg-label hover:border-tg-accent/30 hover:text-white',
                ].join(' ')}
              >
                {cat || t('templates.all')}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
              </div>
            </>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-tg-card rounded-[20px]">
              <Store size={32} color="#4a6278" className="mx-auto mb-3 block" />
              <p className="text-white text-[15px] font-semibold m-0 mb-1">{t('templates.empty')}</p>
              <p className="text-tg-label text-[13px] m-0">
                {searchInput || category ? t('templates.empty_desc') : t('templates.empty_marketplace')}
              </p>
            </div>
          ) : (
            <>
              {/* Featured strip */}
              <FeaturedStrip
                templates={featured}
                onPreview={handlePreview}
                onUse={handleUse}
                onBuy={handleBuy}
                buyingId={buyingId}
                purchaseState={purchaseState}
              />

              {/* Regular grid */}
              {regularTemplates.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {regularTemplates.map((tmpl) => (
                    <TemplateCard
                      key={tmpl.id}
                      template={tmpl}
                      onUse={handleUse}
                      onBuy={handleBuy}
                      onPreview={handlePreview}
                      purchaseState={buyingId === tmpl.id ? purchaseState : 'idle'}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── My templates ── */}
      {tab === 'my' && (
        <MyTemplates
          templates={myTemplates.filter((t) => t.is_own)}
          loading={myLoading}
          onUse={handleUse}
          onRefetch={fetchMyTemplates}
        />
      )}

      {/* ── Purchased ── */}
      {tab === 'purchased' && (
        <MyTemplates
          templates={myTemplates.filter((t) => !t.is_own)}
          loading={myLoading}
          onUse={handleUse}
          onRefetch={fetchMyTemplates}
          purchased
        />
      )}

      {/* Detail slide-over */}
      {detailTemplate && (
        <TemplateDetail
          template={detailTemplate}
          purchaseState={buyingId === detailTemplate.id ? purchaseState : 'idle'}
          onBuy={handleBuy}
          onClose={() => setDetailTemplate(null)}
        />
      )}

    </div>
  )
}
