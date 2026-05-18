import { useState } from 'react'
import { X, Search, Layers } from 'lucide-react'
import { FLOW_TEMPLATES, type FlowTemplate } from './templates'

interface Props {
  onClose: () => void
  onSelect: (template: FlowTemplate) => void
}

export default function TemplatesModal({ onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Barchasi')

  const categories = ['Barchasi', ...Array.from(new Set(FLOW_TEMPLATES.map((t) => t.category)))]

  const filtered = FLOW_TEMPLATES.filter((t) => {
    const matchCat = category === 'Barchasi' || t.category === category
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Layers size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Flow Shablonlar</h2>
              <p className="text-xs text-slate-400">Tayyor shablondan boshlang</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search + filters */}
        <div className="p-4 border-b border-slate-800 flex-shrink-0 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Shablon qidirish..."
              className="w-full bg-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Layers size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Shablon topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 text-left transition-all"
                >
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-400 transition-colors">{t.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">{t.category}</span>
                    <span className="text-xs text-slate-500">{t.nodes.length} node</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center">
            Shablon tanlanganda mavjud flow o'chiriladi va yangisi qo'yiladi
          </p>
        </div>
      </div>
    </div>
  )
}
