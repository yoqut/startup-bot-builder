import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useMobile } from '@/hooks/useMobile'

export default function AppLayout() {
  const isMobile = useMobile()
  return (
    <div className="flex h-tg bg-tg-bg overflow-hidden pt-[var(--tg-safe-top,0px)]">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className={`flex-1 overflow-y-auto overflow-x-hidden px-4 pt-5 overscroll-none ${isMobile ? 'pb-main' : 'pb-5'}`}>
          <Outlet />
        </main>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}
