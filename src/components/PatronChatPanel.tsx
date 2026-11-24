import { useState } from 'react';
import { MessageSquare, Send, X, Globe2, MapPin } from 'lucide-react';
import type { ChatMessage, ProvinceInfo } from '../types/game';

interface PatronChatPanelProps {
  activeProvince: ProvinceInfo;
  messages: ChatMessage[];
  onSendMessage: (channel: 'global' | string, text: string) => void;
}

export function PatronChatPanel({
  activeProvince,
  messages,
  onSendMessage,
}: PatronChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'city' | 'global'>('city');
  const [draft, setDraft] = useState('');

  const activeChannel = scope === 'global' ? 'global' : `city-${activeProvince.plate}`;
  const filtered = messages.filter((m) => m.channel === activeChannel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendMessage(activeChannel, trimmed);
    setDraft('');
  };

  if (!open) {
    return (
      <button
        type="button"
        data-testid="patron-chat-toggle"
        onClick={() => setOpen(true)}
        aria-label="Patron Sohbetini Aç"
        className="pointer-events-auto fixed bottom-[max(14px,calc(var(--safe-bottom)+10px))] right-[max(14px,calc(var(--safe-right)+10px))] z-[610] flex min-h-[42px] items-center gap-1.5 rounded-2xl border border-slate-200/95 bg-white/95 px-3 text-[clamp(11px,1.4vw,12px)] font-bold text-slate-800 shadow-lg transition-colors hover:bg-amber-50 dark:border-slate-700/90 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="hidden min-[800px]:inline">Patron Sohbeti</span>
        <span className="inline min-[800px]:hidden">Sohbet</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Patron Sohbeti"
      data-testid="patron-chat-panel"
      className="pointer-events-auto fixed bottom-[max(14px,calc(var(--safe-bottom)+10px))] right-[max(14px,calc(var(--safe-right)+10px))] z-[640] flex h-[min(340px,56dvh)] w-[clamp(260px,34vw,340px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Patron Sohbeti</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Sohbeti Küçült"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Channel Switcher: City vs Turkey Global */}
      <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50/90 p-1.5 dark:border-slate-800 dark:bg-slate-950/60">
        <button
          type="button"
          onClick={() => setScope('city')}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition-colors ${
            scope === 'city'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {activeProvince.code} {activeProvince.name}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setScope('global')}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition-colors ${
            scope === 'global'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Globe2 className="h-3 w-3" />
          <span>Türkiye Geneli</span>
        </button>
      </div>

      {/* Messages */}
      <div className="panel-scroll flex-1 space-y-1.5 p-2.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-slate-400">
            Bu kanalda henüz mesaj yok. İlk mesajı gönderin!
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-950/70"
            >
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {m.senderName}{' '}
                  <span className="font-normal text-slate-400">· {m.senderBadge}</span>
                </span>
                <span className="font-mono-num text-[9px] text-slate-400">
                  {new Date(m.timestamp).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-0.5 break-words text-[11px] text-slate-800 dark:text-slate-200">
                {m.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 border-t border-slate-200 p-2 dark:border-slate-800"
      >
        <input
          type="text"
          maxLength={140}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Patronlara mesaj yaz..."
          className="h-8 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          aria-label="Mesaj Gönder"
          disabled={!draft.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </aside>
  );
}
