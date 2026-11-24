import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface MobileModalTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  disabledHint?: string;
}

interface MobileGameModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  tabs?: MobileModalTab[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  subHeader?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  zIndexClass?: string;
  children: React.ReactNode;
}

export const MobileGameModal: React.FC<MobileGameModalProps> = ({
  title,
  subtitle,
  icon,
  headerRight,
  tabs,
  activeTabId,
  onSelectTab,
  subHeader,
  footer,
  onClose,
  zIndexClass = 'z-[1150]',
  children,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center bg-slate-950/75 backdrop-blur-sm`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-2 md:inset-6 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Top Header (max 44px) */}
        <header className="flex h-11 max-h-[44px] shrink-0 items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/90 px-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/15 text-amber-300">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-black tracking-tight text-white">
                  {title}
                </h2>
                {subtitle && (
                  <span className="hidden truncate text-xs font-semibold text-slate-400 sm:inline">
                    · {subtitle}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="Pencereyi kapat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/90 bg-slate-800/90 text-slate-100 transition hover:border-rose-400/60 hover:bg-rose-500/20 hover:text-rose-200 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Fixed Single-Row Horizontal Scrollable Tab Bar */}
        {tabs && tabs.length > 0 && (
          <nav
            aria-label="Sekmeler"
            className="shrink-0 border-b border-slate-800/80 bg-slate-900/65 px-3 py-1.5"
          >
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={tab.disabled}
                    title={tab.disabled ? tab.disabledHint : undefined}
                    onClick={() => !tab.disabled && onSelectTab?.(tab.id)}
                    className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition whitespace-nowrap ${
                      tab.disabled
                        ? 'cursor-not-allowed border border-slate-800 bg-slate-900/60 text-slate-500 opacity-65'
                        : isActive
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'border border-slate-700/70 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-black leading-none ${
                          isActive
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-slate-950/70 text-amber-300'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Optional Sub-Header (e.g. Calendar Bar or Branch Selector) */}
        {subHeader && (
          <div className="shrink-0 border-b border-slate-800/70 bg-slate-900/45 px-3 py-2">
            {subHeader}
          </div>
        )}

        {/* Spacious Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/90 px-3 py-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
