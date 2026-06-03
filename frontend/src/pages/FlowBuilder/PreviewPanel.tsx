import { useState, useRef, useEffect } from 'react'
import { RotateCcw, Send, Bot } from 'lucide-react'
import type { Node, Edge } from '@xyflow/react'
import { useSimulator, type ChatMsg } from './hooks/useSimulator'

interface Props {
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
}

function nowTime() {
  return new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
}

const MEDIA: Record<string, { emoji: string; label: string }> = {
  photo:    { emoji: '🖼',  label: 'Photo' },
  video:    { emoji: '🎬',  label: 'Video' },
  audio:    { emoji: '🎵',  label: 'Audio' },
  voice:    { emoji: '🎤',  label: 'Voice' },
  document: { emoji: '📄',  label: 'Document' },
}

function Bubble({ msg, onInlineClick }: { msg: ChatMsg; onInlineClick: (nodeId: string, label: string, msgId: string) => void }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center my-1 px-3">
        <span className="text-[10.5px] px-3 py-0.5 rounded-full bg-[rgba(14,28,44,0.78)] text-[#aab8c2] backdrop-blur-sm">
          {msg.text}
        </span>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-0.5 pl-10 pr-2">
        <div className="max-w-[78%]">
          <div className="rounded-[18px] rounded-br-[5px] px-3 py-2 text-[13.5px] leading-[1.45] break-words bg-[#2b5278] text-white">
            {msg.text}
            <span className="ml-2 text-[10.5px] float-right mt-0.5 select-none text-white/50">
              {msg.time}&nbsp;
              <span className="text-[#64b5f6]">✓✓</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  const media = msg.mediaType ? MEDIA[msg.mediaType] : null
  return (
    <div className="flex justify-start mb-1 pr-10 pl-2">
      <div className="w-8 h-8 rounded-full shrink-0 mr-1.5 mt-auto mb-[18px] flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-[#4a9de0] to-[#2c6e9e]">
        B
      </div>
      <div className="max-w-[78%] space-y-[3px]">
        <div className="rounded-[18px] rounded-tl-[5px] overflow-hidden bg-[#182533]">
          {media && (
            <div className="mx-2 mt-2 mb-1 rounded-xl flex flex-col items-center gap-1 py-5 bg-[#1d3045] text-[#8ab4cf]">
              <span className="text-3xl">{media.emoji}</span>
              <span className="text-[11px] font-medium">{media.label}</span>
            </div>
          )}
          {msg.pollQuestion && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[18px]">📊</span>
                <span className="text-[12.5px] font-semibold text-white">{msg.pollQuestion}</span>
              </div>
              {(msg.pollOptions || []).filter(Boolean).map((opt, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0 border-[#1d3045]">
                  <div className="w-4 h-4 rounded-full border-2 shrink-0 border-[#4a9de0]" />
                  <span className="text-[12px] text-[#c5d8e8]">{opt}</span>
                </div>
              ))}
            </div>
          )}
          {msg.text && (
            <div className="px-3 py-2 text-[13.5px] leading-[1.45] break-words whitespace-pre-wrap text-[#e8eaed]">
              {msg.text}
              <span className="ml-2 text-[10.5px] float-right mt-0.5 select-none text-[#637d8e]">
                {msg.time}
              </span>
            </div>
          )}
          {!msg.text && !media && !msg.pollQuestion && (
            <div className="px-3 py-1.5 text-right text-[10.5px] text-[#637d8e]">{msg.time}</div>
          )}
        </div>
        {msg.buttons && msg.layout !== 'reply' && (
          <div className="space-y-[3px] pt-0.5">
            {msg.buttons.map((btn, i) => {
              const isClicked = msg.clickedBtn === btn.label
              return (
                <button key={i}
                  onClick={() => !msg.clickedBtn && onInlineClick(btn.nodeId, btn.label, msg.id)}
                  disabled={!btn.nodeId || !!msg.clickedBtn}
                  className={[
                    'w-full text-[12.5px] rounded-xl px-3 py-2 transition-all text-center font-medium border',
                    isClicked
                      ? 'bg-[#1e3a5f] text-[#4a9de0] border-[#2d5a8e] opacity-80'
                      : msg.clickedBtn
                      ? 'bg-[#182533] text-[#3d6a8a] border-[#1d3a52] opacity-40 cursor-not-allowed'
                      : 'bg-[#182533] text-[#62a7d9] border-[#1d3a52] hover:bg-[#1e3047]',
                  ].join(' ')}
                >
                  {isClicked ? `✓ ${btn.label}` : btn.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex justify-start mb-2 pr-10 pl-2">
      <div className="w-8 h-8 rounded-full shrink-0 mr-1.5 flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-[#4a9de0] to-[#2c6e9e]">B</div>
      <div className="rounded-[18px] rounded-tl-[5px] px-4 py-3 flex items-center gap-1.5 bg-[#182533]">
        {[0, 160, 320].map((d, i) => (
          <span key={i}
            className="block w-1.5 h-1.5 rounded-full animate-bounce bg-[#6b8fa8] [animation-duration:900ms]"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function PreviewPanel({ nodes, edges, onClose }: Props) {
  const sim       = useSimulator(nodes, edges)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const [started, setStarted] = useState(false)

  const triggers = nodes.filter(n => {
    const t = (n.type as string) || (n.data.nodeType as string) || ''
    return ['command', 'start', 'handler', 'business_handler'].includes(t)
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sim.messages, sim.typing])

  useEffect(() => {
    if (sim.waitingFor === 'input') inputRef.current?.focus()
  }, [sim.waitingFor])

  function sendInput() {
    const text = sim.userInput.trim()
    if (!text) return
    sim.onUserInput(text); sim.setUserInput('')
  }

  function getTriggerLabel(n: Node) {
    const cfg  = (n.data.config as Record<string, unknown>) || {}
    const type = (n.type as string) || (n.data.nodeType as string) || ''
    if (type === 'handler' || type === 'business_handler') {
      const triggers: string[] = Array.isArray(cfg.triggers)
        ? (cfg.triggers as string[])
        : [(cfg.trigger as string) || (cfg.event as string) || 'any']
      const commands = (cfg.commands as string[]) || []
      if (triggers.includes('command') && commands.length) return commands[0] || '/start'
      if (triggers.length === 1) return triggers[0]
      return triggers.slice(0, 2).join(', ') + (triggers.length > 2 ? '…' : '')
    }
    return (cfg.command as string) || '/start'
  }

  function handleStart(nodeId: string) { setStarted(true); sim.startFrom(nodeId) }
  function handleReset() { sim.reset(); setStarted(false) }

  const [clockTime, setClockTime] = useState(nowTime())
  useEffect(() => {
    const t = setInterval(() => setClockTime(nowTime()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="w-[320px] shrink-0 flex items-stretch border-l border-slate-800/60 bg-[#0d1117]">
      <div className="flex-1 flex flex-col overflow-hidden relative bg-tg-bg">

        <div className="flex items-center justify-between px-4 pt-1.5 pb-0.5 shrink-0 select-none bg-tg-bg">
          <span className="text-[11px] font-semibold text-[#aab8c2]">{clockTime}</span>
          <div className="flex items-center gap-1.5">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
              {[0,1,2,3].map(i => (
                <rect key={i} x={i*4} y={10-(i+1)*2.2} width="3" height={(i+1)*2.2}
                  rx="0.8" fill={i < 3 ? '#aab8c2' : '#3a4a57'} />
              ))}
            </svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M7 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" fill="#aab8c2"/>
              <path d="M3.5 6C4.5 4.9 5.7 4.2 7 4.2S9.5 4.9 10.5 6" stroke="#aab8c2" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M1 3.5C2.7 1.8 4.7 1 7 1s4.3.8 6 2.5" stroke="#aab8c2" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5"/>
            </svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
              <rect x="0.5" y="1" width="18" height="8" rx="2" stroke="#aab8c2" strokeWidth="1"/>
              <rect x="2" y="2.5" width="13" height="5" rx="1" fill="#aab8c2"/>
              <path d="M19.5 3.5v3" stroke="#aab8c2" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 shrink-0 bg-tg-bg border-b border-[#1d2f3f]">
          <button onClick={onClose} className="text-[#8096a7] hover:text-white transition-colors p-0.5 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#4a9de0] to-[#2c6e9e]">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold leading-none text-white">Bot Preview</div>
            <div className="text-[11px] mt-[3px] text-tg-accent">bot</div>
          </div>
          <div className="flex items-center gap-3">
            {started && (
              <button onClick={handleReset} title="Qayta boshlash"
                className="transition-colors p-1 text-[#8096a7] hover:text-white">
                <RotateCcw size={16} />
              </button>
            )}
            <button className="p-1 transition-colors text-[#8096a7] hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="p-1 transition-colors text-[#8096a7] hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 scroll-smooth bg-cover bg-local tg-wallpaper">
          {!started && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center px-4 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-[#4a9de0] to-[#2c6e9e]">
                <Bot size={26} className="text-white" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-white">Bot Preview</p>
                <p className="text-[11.5px] mt-0.5 text-[#8096a7]">Test rejim</p>
              </div>
              {triggers.length === 0 ? (
                <p className="text-[11.5px] text-center px-2 mt-2 text-[#637d8e]">
                  Trigger node qo'shing va preview bosing.
                </p>
              ) : (
                <div className="w-full space-y-2 mt-1">
                  <p className="text-[10px] text-center uppercase tracking-widest mb-1 text-[#637d8e]">Trigger tanlang</p>
                  {triggers.map(t => (
                    <button key={t.id} onClick={() => handleStart(t.id)}
                      className="w-full text-left px-3.5 py-2.5 rounded-2xl text-[12.5px] font-mono transition-all bg-[rgba(24,37,51,0.9)] text-[#62a7d9] border border-[rgba(74,157,224,0.15)] hover:bg-[rgba(30,48,71,0.95)]">
                      ▶ {getTriggerLabel(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {started && (
            <>
              {sim.messages.map(msg => (
                <Bubble key={msg.id} msg={msg} onInlineClick={(nodeId, label, msgId) => sim.onInlineButtonClick(nodeId, label, msgId)} />
              ))}
              {sim.typing && <TypingDots />}
              <div ref={bottomRef} className="h-2" />
            </>
          )}
        </div>

        {sim.replyButtons && sim.replyButtons.length > 0 && sim.waitingFor === 'reply_btn' && (
          <div className={`grid px-2 py-2 gap-1.5 shrink-0 bg-[#232e3c] border-t border-[#1d2f3f] ${sim.replyButtons.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {sim.replyButtons.map((btn, i) => (
              <button key={i}
                onClick={() => sim.onReplyButtonClick(btn!.nodeId, btn!.label)}
                className="py-2.5 px-3 rounded-xl text-[12.5px] font-medium transition-all bg-[#1c2b38] text-[#e8eaed] border border-white/[0.06] hover:bg-[#243447]">
                {btn!.label}
              </button>
            ))}
          </div>
        )}

        {started && (
          <div className="flex items-end gap-2 px-2 py-2 shrink-0 bg-tg-bg border-t border-[#1d2f3f]">
            <button className="shrink-0 mb-1.5 text-[#637d8e]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M8.5 14s1 2 3.5 2 3.5-2 3.5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="9" cy="10" r="1" fill="currentColor"/>
                <circle cx="15" cy="10" r="1" fill="currentColor"/>
              </svg>
            </button>
            <div className="flex-1 flex items-center rounded-2xl min-h-[36px] px-3 bg-[#182533]">
              <input ref={inputRef}
                value={sim.userInput}
                onChange={e => sim.setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendInput() }}
                placeholder={sim.waitingFor === 'input' ? 'Javob yozing…' : 'Xabar…'}
                disabled={sim.waitingFor !== 'input'}
                className="flex-1 text-[13.5px] bg-transparent outline-none py-1.5 disabled:opacity-40 placeholder:text-[#637d8e] text-[#e8eaed] caret-tg-accent"
              />
              <button className="shrink-0 ml-1 text-[#637d8e]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <button
              onClick={sendInput}
              disabled={!sim.userInput.trim() || sim.waitingFor !== 'input'}
              className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all ${
                sim.userInput.trim() && sim.waitingFor === 'input' ? 'bg-tg-accent' : 'bg-[#182533]'
              }`}
            >
              {sim.userInput.trim() && sim.waitingFor === 'input'
                ? <Send size={16} className="text-white translate-x-0.5" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" stroke="#637d8e" strokeWidth="1.8"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="#637d8e" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
