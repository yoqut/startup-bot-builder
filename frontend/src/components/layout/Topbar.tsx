import { useMobile } from '@/hooks/useMobile'

export default function Topbar() {
  const isMobile = useMobile()

  return (
    <header className={`${isMobile ? 'mt-12' : ''} relative flex h-14 shrink-0 items-center border-b border-[#0d1b2a] bg-[#17212b] px-3.5`}>
      <div className="flex flex-1 items-center justify-center gap-1.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2481cc]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
      </div>
    </header>
  )
}
