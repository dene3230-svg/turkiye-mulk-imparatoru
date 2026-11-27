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
      className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center bg-black/70`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-2 md:inset-6 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#181F29] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Matte Top Header */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#334155] bg-[#222B38] px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-[#334155] bg-[#181F29] text-[#C8AE7D]">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-bold tracking-tight text-slate-100">
                  {title}
                </h2>
                {subtitle && (
                  <span className="hidden truncate text-xs text-slate-400 sm:inline">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[#334155] bg-[#181F29] text-slate-300 hover:border-[#B86B5E]/70 hover:text-slate-100"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Fixed Single-Row Horizontal Scrollable Tab Bar */}
        {tabs && tabs.length > 0 && (
          <nav
            aria-label="Sekmeler"
            className="shrink-0 border-b border-[#334155] bg-[#1D2532] px-3 py-2"
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
                    className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-[12px] border px-3.5 text-xs font-semibold whitespace-nowrap ${
                      tab.disabled
                        ? 'cursor-not-allowed border-[#334155]/60 bg-[#181F29] text-slate-500 opacity-65'
                        : isActive
                        ? 'border-[#C8AE7D] bg-[#C8AE7D] text-[#181F29] font-bold'
                        : 'border-[#334155] bg-[#222B38] text-slate-200 hover:bg-[#2A3444]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          isActive
                            ? 'bg-[#181F29]/20 text-[#181F29]'
                            : 'bg-[#181F29] text-[#C8AE7D]'
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

        {/* Optional Sub-Header */}
        {subHeader && (
          <div className="shrink-0 border-b border-[#334155] bg-[#1E2633] px-3 py-2">
            {subHeader}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="panel-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-3">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[#334155] bg-[#222B38] px-3.5 py-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
