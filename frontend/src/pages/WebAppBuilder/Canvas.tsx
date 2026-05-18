import { useDroppable } from '@dnd-kit/core'
import { RenderEngine } from './RenderEngine'
import { useWebAppStore } from '@/store/webapp.store'
import { useMobile } from '@/hooks/useMobile'

// ── Phone frame dimensions ────────────────────────────────────────────────────
const PHONE_W = 390
const PHONE_H = 720   // visible content area height

function PhoneFrame({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const isMobile = useMobile()

  if (isMobile) {
    // Mobile: full-screen with a Telegram Mini App header for context
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* TG Mini App header */}
        <div style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: '#17212b',
          borderBottom: '1px solid #0d1b2a',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2481cc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, flex: 1 }}>Mini App</span>
          <span style={{ fontSize: 10, color: '#2481cc', background: 'rgba(36,129,204,0.12)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.04em' }}>
            PREVIEW
          </span>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: '32px 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Phone chrome */}
      <div
        style={{
          width: PHONE_W,
          minWidth: PHONE_W,
          background: '#0e1621',
          borderRadius: 44,
          border: `3px solid #1e2d3d`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          position: 'relative',
          overflow: 'hidden',
          outline: isOver ? '3px solid #2481cc' : 'none',
          outlineOffset: 4,
          transition: 'outline 0.15s',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>9:41</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <rect x="0" y="4" width="3" height="6" rx="1" fill="#fff" fillOpacity="0.9" />
              <rect x="4.5" y="2.5" width="3" height="7.5" rx="1" fill="#fff" fillOpacity="0.9" />
              <rect x="9" y="1" width="3" height="9" rx="1" fill="#fff" fillOpacity="0.9" />
              <rect x="13.5" y="0" width="2.5" height="10" rx="1" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* Telegram Mini App header */}
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            background: '#17212b',
            borderBottom: '1px solid #0d1b2a',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: '#2481cc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Mini App</span>
        </div>

        {/* App content area */}
        <div
          style={{
            height: PHONE_H,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
          }}
        >
          {children}
        </div>

        {/* Home indicator */}
        <div
          style={{
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#17212b',
          }}
        >
          <div style={{ width: 120, height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  )
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

export default function Canvas() {
  const page = useWebAppStore((s) => s.getCurrentPage())
  const selectNode = useWebAppStore((s) => s.selectNode)

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' })

  if (!page) return null

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        background: '#0e1621',
        position: 'relative',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectNode(null)
      }}
    >
      <PhoneFrame isOver={isOver}>
        <RenderEngine page={page} isEditing />
      </PhoneFrame>
    </div>
  )
}
