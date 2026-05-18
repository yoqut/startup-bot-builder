import { useEffect, useState } from 'react';
import { Briefcase, RefreshCw, Trash2, User, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { businessApi, type BusinessConnection } from '@/api/business';
import { botsApi } from '@/api/bots';
import type { Bot } from '@/types/bot';

export default function BusinessPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [connections, setConnections] = useState<BusinessConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [botDropdown, setBotDropdown] = useState(false);

  useEffect(() => {
    botsApi.list().then(r => {
      setBots(r.data);
      if (r.data.length > 0) setSelectedBot(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedBot) return;
    setLoading(true);
    businessApi.listConnections(selectedBot)
      .then(r => setConnections(r.data))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [selectedBot]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ulanishni o\'chirmoqchimisiz?')) return;
    await businessApi.deleteConnection(id);
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const selectedBotName = bots.find(b => b.id === selectedBot)?.name ?? '';
  const active = connections.filter(c => c.is_enabled);
  const inactive = connections.filter(c => !c.is_enabled);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-node-violet/10">
            <Briefcase className="w-6 h-6 text-node-violet" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white m-0">Business Chat</h1>
            <p className="text-sm text-tg-label m-0">Telegram Business ulanishlarini boshqaring</p>
          </div>
        </div>

        {/* Bot selector */}
        <div className="relative">
          <button
            onClick={() => setBotDropdown(v => !v)}
            className="flex items-center gap-2 bg-tg-input border border-tg-border rounded-xl px-4 py-2 text-sm text-white hover:border-node-violet/50 transition-all duration-150 cursor-pointer"
          >
            <span>{selectedBotName || 'Bot tanlang'}</span>
            <ChevronDown className="w-4 h-4 text-tg-label" />
          </button>
          {botDropdown && (
            <div className="absolute right-0 mt-1 w-56 bg-tg-input border border-tg-border rounded-xl shadow-xl z-10 overflow-hidden">
              {bots.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBot(b.id); setBotDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-tg-elevated/50 transition-all duration-150 cursor-pointer border-none ${b.id === selectedBot ? 'text-node-violet bg-node-violet/10' : 'text-white bg-transparent'}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-node-violet/10 border border-node-violet/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-node-violet/80 m-0">
          <strong>Qanday ishlaydi?</strong> Telegram Business foydalanuvchisi botingizni ulab qo'ysa,
          bot uning shaxsiy yozishmalarini ko'ra oladi va avtomatik javob bera oladi.
          Ulash uchun: <strong>Telegram → Sozlamalar → Business → Chatbotlar</strong>.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 text-node-violet animate-spin" />
        </div>
      ) : connections.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="w-12 h-12 text-tg-muted mx-auto mb-3" />
          <p className="text-tg-label m-0">Hali hech qanday business ulanish yo'q</p>
          <p className="text-sm text-tg-muted mt-1 mb-0">
            Foydalanuvchi Telegramda botingizni business chatbot sifatida ulashi kerak
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2 m-0">
                <CheckCircle className="w-4 h-4" />
                Faol ulanishlar ({active.length})
              </h2>
              <div className="flex flex-col gap-2">
                {active.map(c => <ConnectionCard key={c.id} conn={c} onDelete={handleDelete} />)}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-tg-muted mb-3 flex items-center gap-2 m-0">
                <XCircle className="w-4 h-4" />
                O'chirilgan ulanishlar ({inactive.length})
              </h2>
              <div className="flex flex-col gap-2">
                {inactive.map(c => <ConnectionCard key={c.id} conn={c} onDelete={handleDelete} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({ conn, onDelete }: { conn: BusinessConnection; onDelete: (id: string) => void }) {
  const displayName = [conn.first_name, conn.last_name].filter(Boolean).join(' ') || 'Noma\'lum';
  const date = new Date(conn.connected_at).toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-150 ${
      conn.is_enabled
        ? 'bg-tg-input border-tg-border hover:border-node-violet/50'
        : 'bg-tg-bg border-tg-darkborder opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          conn.is_enabled ? 'bg-node-violet/20 text-node-violet/80' : 'bg-tg-elevated text-tg-label'
        }`}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{displayName}</span>
            {conn.username && (
              <span className="text-xs text-tg-muted">@{conn.username}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              conn.is_enabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-tg-elevated text-tg-muted'
            }`}>
              {conn.is_enabled ? 'Faol' : 'O\'chirilgan'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-tg-muted">ID: {conn.user_id}</span>
            <span className="text-xs text-tg-muted">{date}</span>
            {conn.can_reply && (
              <span className="text-xs text-tg-accent">Javob bera oladi</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs text-tg-muted bg-tg-elevated px-2 py-1 rounded">
          {conn.connection_id.slice(0, 12)}...
        </code>
        <button
          onClick={() => onDelete(conn.id)}
          className="p-1.5 rounded-lg text-tg-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer bg-transparent border-none"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
