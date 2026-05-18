import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: number | string
  icon: LucideIcon
  /** Tailwind text class for the icon, e.g. "text-tg-accent" */
  iconClass: string
  /** Tailwind bg class for the icon wrapper, e.g. "bg-tg-accent/10" */
  iconBgClass: string
  /** Optional text appended after value, e.g. " ta" */
  suffix?: string
  isLoading?: boolean
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  iconBgClass,
  suffix = '',
  isLoading = false,
}: Props) {
  if (isLoading) {
    return (
      <div className="bg-tg-card rounded-[18px] p-4 flex flex-col gap-[14px]">
        {/* Icon skeleton */}
        <div className="w-9 h-9 rounded-[10px] bg-tg-elevated animate-pulse" />
        <div className="flex flex-col gap-[7px]">
          {/* Value skeleton */}
          <div className="h-[26px] w-12 bg-tg-elevated rounded-[6px] animate-pulse" />
          {/* Label skeleton */}
          <div className="h-[11px] w-20 bg-tg-elevated/60 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-tg-card rounded-[18px] p-4 flex flex-col gap-[14px]">
      <div className={`w-9 h-9 rounded-[10px] ${iconBgClass} flex items-center justify-center`}>
        <Icon size={17} className={iconClass} />
      </div>
      <div>
        <div className="text-[22px] font-bold text-white leading-none tracking-[-0.5px] mb-[5px]">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix}
        </div>
        <div className="text-[12px] text-tg-label leading-snug">{label}</div>
      </div>
    </div>
  )
}
