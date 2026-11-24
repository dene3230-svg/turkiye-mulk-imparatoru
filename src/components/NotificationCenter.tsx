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
      return <Coins className={`${cls} text-emerald-600 dark:text-emerald-400`} />;
    case 'event':
      return <TrendingUp className={`${cls} text-amber-600 dark:text-amber-400`} />;
    case 'update':
      return <Download className={`${cls} text-sky-600 dark:text-sky-400`} />;
    case 'milestone':
      return <Sparkles className={`${cls} text-amber-500 dark:text-amber-300`} />;
    default:
      return <Bell className={`${cls} text-slate-500 dark:text-slate-400`} />;
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
      className="fixed inset-0 z-[1100] flex justify-end bg-slate-950/35 p-3 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[clamp(290px,34vw,390px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold">Bildirim Merkezi</h2>
          </div>

          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  aria-label="Tümünü okundu işaretle"
                  title="Tümünü okundu işaretle"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  aria-label="Bildirimleri temizle"
                  title="Temizle"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Bildirim Merkezini Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="panel-scroll flex-1 p-3">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
                    className={`rounded-xl border p-3 transition-colors ${
                      item.read
                        ? 'border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40'
                        : 'border-amber-300/80 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/25'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        <CategoryIcon category={item.category} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="shrink-0 font-mono-num text-[10px] text-slate-400">
                            {time}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
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
      className="pointer-events-none fixed left-1/2 top-[calc(58px+var(--safe-top))] z-[900] flex -translate-x-1/2 flex-col items-center gap-1.5"
    >
      {toasts.slice(0, 2).map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
        >
          <CategoryIcon category={toast.category} />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold">{toast.title}</div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {toast.body}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Bildirimi kapat"
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
