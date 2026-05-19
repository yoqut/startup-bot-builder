import {
  Zap, MessageSquare, GitBranch, Globe, Layers,
  ArrowRight, Antenna, Keyboard, Square,
} from 'lucide-react'

const NODE_ICONS: Record<string, React.ElementType> = {
  handler:   Antenna,
  message:   MessageSquare,
  input:     Keyboard,
  condition: GitBranch,
  api_call:  Globe,
  end:       Square,
}

const QUICK_STARTERS = [
  {
    title: 'Salomlashish',
    desc: 'Foydalanuvchini kutib olish',
    nodes: ['handler', 'message', 'input', 'end'] as string[],
    colors: ['#8b5cf6', '#2481cc', '#f39c12', '#e53935'],
    template: 'welcome',
  },
  {
    title: 'Savol-javob',
    desc: 'FAQ bot yaratish',
    nodes: ['handler', 'message', 'condition', 'message'] as string[],
    colors: ['#8b5cf6', '#2481cc', '#e67e22', '#2481cc'],
    template: 'faq',
  },
  {
    title: 'API integratsiya',
    desc: 'Tashqi servis bilan ulash',
    nodes: ['handler', 'input', 'api_call', 'message'] as string[],
    colors: ['#8b5cf6', '#f39c12', '#00bcd4', '#2481cc'],
    template: 'api',
  },
] as const

function MiniFlow({ nodes, colors }: { nodes: string[]; colors: readonly string[] }) {
  return (
    <div className="flex items-center gap-[5px] my-2">
      {nodes.map((type, i) => {
        const Icon = NODE_ICONS[type] || Zap
        const c = colors[i]
        return (
          <div key={i} className="flex items-center gap-[5px]">
            <div
              className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center"
              style={{ background: `${c}20`, border: `1.5px solid ${c}45` }}
            >
              <Icon size={11} color={c} />
            </div>
            {i < nodes.length - 1 && (
              <div className="w-[8px] h-px rounded-full" style={{ background: `${colors[i + 1]}35` }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  onAddNode:       (type: string, subtype?: string, pos?: { x: number; y: number }) => void
  onOpenTemplates: () => void
}

export default function CanvasEmptyState({ onAddNode, onOpenTemplates }: Props) {
  function handleStarter(template: string) {
    if (template === 'welcome') {
      const base = { x: 300, y: 160 }; const gap = 160
      onAddNode('handler', '', { x: base.x, y: base.y })
      onAddNode('message', '', { x: base.x, y: base.y + gap })
      onAddNode('input',   '', { x: base.x, y: base.y + gap * 2 })
      onAddNode('end',     '', { x: base.x, y: base.y + gap * 3 })
    } else if (template === 'faq') {
      onAddNode('handler',   '', { x: 300, y: 160 })
      onAddNode('message',   '', { x: 300, y: 320 })
      onAddNode('condition', '', { x: 300, y: 480 })
      onAddNode('message',   '', { x: 160, y: 640 })
      onAddNode('message',   '', { x: 440, y: 640 })
    } else if (template === 'api') {
      onAddNode('handler',  '', { x: 300, y: 160 })
      onAddNode('input',    '', { x: 300, y: 320 })
      onAddNode('api_call', '', { x: 300, y: 480 })
      onAddNode('message',  '', { x: 300, y: 640 })
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 pointer-events-auto select-none mt-[60px] px-4">

      {/* Icon */}
      <div className="w-[52px] h-[52px] rounded-[14px] bg-tg-accent/[0.08] border border-tg-accent/15 flex items-center justify-center">
        <Zap size={22} color="rgba(36,129,204,0.5)" />
      </div>

      <div className="text-center">
        <p className="text-[15px] font-semibold text-white m-0">Flow bo'sh</p>
        <p className="text-[12px] text-tg-muted mt-1 m-0">Tayyor shablon tanlang yoki chapdan node sudrang</p>
      </div>

      {/* Quick starter cards */}
      <div className="flex gap-2 flex-wrap justify-center max-w-[480px]">
        {QUICK_STARTERS.map(s => (
          <button
            key={s.template}
            onClick={() => handleStarter(s.template)}
            className="group flex flex-col items-start bg-tg-card border border-tg-input rounded-[14px] p-3 cursor-pointer w-[144px] transition-all duration-150 hover:border-tg-accent/35 hover:bg-tg-elevated hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] text-left"
          >
            <MiniFlow nodes={[...s.nodes]} colors={s.colors} />
            <p className="text-[12px] font-semibold text-white m-0 mt-1 group-hover:text-tg-accent transition-colors duration-150">
              {s.title}
            </p>
            <p className="text-[10px] text-tg-muted m-0 mt-[2px]">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Templates link */}
      <button
        onClick={onOpenTemplates}
        className="flex items-center gap-1.5 text-tg-accent/80 text-[12px] font-medium cursor-pointer bg-tg-card border border-tg-input rounded-[10px] px-3 py-[7px] hover:bg-tg-elevated hover:text-tg-accent transition-all duration-150 border-none bg-transparent"
      >
        <Layers size={13} />
        Barcha shablonlar
        <ArrowRight size={11} />
      </button>

      {/* Sidebar hint */}
      <div className="flex items-center gap-2 text-[11px] text-tg-muted/60 bg-tg-card border border-tg-darkborder rounded-[10px] px-3 py-[7px]">
        <ArrowRight size={10} className="rotate-180" />
        <span>Chapdan node bosing yoki sudrang</span>
      </div>

    </div>
  )
}
