import { Bell, X, CheckCheck, Trash2, Coins, TrendingUp, Sparkles, Download } from 'lucide-react';
import type { NotificationItem } from '../types/game';

interface NotificationCenterProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

function CategoryIcon({ category }: { category: NotificationItem['category'] }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (category) {
    case 'revenue':
      return <Coins className={`${cls} text-[#7A9E7E]`} strokeWidth={1.5} />;
    case 'event':
      return <TrendingUp className={`${cls} text-[#C8AE7D]`} strokeWidth={1.5} />;
    case 'update':
      return <Download className={`${cls} text-[#7E96B0]`} strokeWidth={1.5} />;
    case 'milestone':
      return <Sparkles className={`${cls} text-[#C8AE7D]`} strokeWidth={1.5} />;
    default:
      return <Bell className={`${cls} text-slate-400`} strokeWidth={1.5} />;
  }
}

export function NotificationCenter({
  open,
  notifications,
  onClose,
  onMarkAllRead,
  onClearAll,
}: NotificationCenterProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bildirim Merkezi"
      data-testid="notification-center"
      className="fixed inset-0 z-[1100] flex justify-end bg-black/70 p-3 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[clamp(290px,34vw,390px)] flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-[#334155] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
            <h2 className="text-sm font-bold text-slate-100">Bildirim Merkezi</h2>
          </div>

          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  aria-label="Tümünü okundu işaretle"
                  title="Tümünü okundu işaretle"
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
                >
                  <CheckCheck className="h-4 w-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  aria-label="Bildirimleri temizle"
                  title="Temizle"
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#334155] bg-[#181F29] text-[#B86B5E] hover:bg-[#B86B5E]/15"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Bildirim Merkezini Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="panel-scroll flex-1 p-3">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-slate-600" strokeWidth={1.5} />
              <p className="mt-2 text-xs font-semibold text-slate-300">
                Henüz yeni bildirim yok
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Ciro uyarıları, piyasa olayları ve güncellemeler burada görünür.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => {
                const time = new Date(item.timestamp).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={item.id}
                    className={`rounded-[14px] border p-3 transition-colors ${
                      item.read
                        ? 'border-[#334155] bg-[#181F29]'
                        : 'border-[#C8AE7D]/45 bg-[#1D2532]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <CategoryIcon category={item.category} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-100">
                            {item.title}
                          </span>
                          <span className="shrink-0 font-mono-num text-[10px] text-slate-400">
                            {time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToastItem {
  id: string;
  title: string;
  body: string;
  category: NotificationItem['category'];
}

export function NotificationToasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[900] flex flex-col items-end gap-2"
    >
      {toasts.slice(0, 2).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[16px] border border-[#334155] bg-[#222B38] px-3.5 py-2.5 text-slate-100"
        >
          <CategoryIcon category={toast.category} />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-100">{toast.title}</div>
            <div className="truncate text-[11px] text-slate-400">{toast.body}</div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Bildirimi kapat"
            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-[#181F29] hover:text-slate-100"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
