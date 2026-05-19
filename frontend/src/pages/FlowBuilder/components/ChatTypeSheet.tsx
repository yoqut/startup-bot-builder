import { useSearchParams } from 'react-router-dom'
import type { FlowChatType } from '@/types/flow'
import { CHAT_TABS } from '../helpers/flowHelpers'

interface Props {
  chatType: FlowChatType
  isPublished?: boolean
  publishedChatType?: FlowChatType
  isMobile: boolean
  onClose: () => void
}

export default function ChatTypeSheet({ chatType, isPublished, publishedChatType, isMobile, onClose }: Props) {
  const [, setSearchParams] = useSearchParams()

  return (
    <div
      className={`absolute top-[52px] z-[9000] bg-tg-bg border border-tg-input rounded-xl overflow-hidden min-w-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${isMobile ? 'left-20' : 'left-[180px]'}`}
      onClick={onClose}
    >
      {CHAT_TABS.map(tab => {
        const Icon = tab.icon
        const active = chatType === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => { setSearchParams({ type: tab.key }); onClose() }}
            className={[
              'w-full flex items-center gap-[10px] px-[14px] py-[10px] border-none cursor-pointer text-left text-[13px]',
              active
                ? 'bg-tg-accent/[0.12] text-tg-accent border-l-2 border-tg-accent'
                : 'bg-transparent text-white border-l-2 border-transparent',
            ].join(' ')}
          >
            <Icon size={14} />
            {tab.label}
            {publishedChatType === tab.key && isPublished && (
              <span className="w-[5px] h-[5px] rounded-full bg-[#4cd137] ml-auto shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
