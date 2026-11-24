import {
  X,
  Crown,
  Award,
  Trophy,
  TrendingUp,
  Settings,
  Users,
  Home,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { formatTL } from '../game/economy';

interface GameHubMenuModalProps {
  open: boolean;
  companyLevel: number;
  companyTitle: string;
  netWorth: number;
  activeCityLabel: string;
  claimableMissionCount: number;
  onOpenHolding: () => void;
  onOpenAccounting: () => void;
  onOpenLeaderboard: () => void;
  onOpenMissions: () => void;
  onOpenMarket: () => void;
  onOpenSettings: () => void;
  onOpenHrCenter: () => void;
  onGoMainMenu: () => void;
  onClose: () => void;
}

export function GameHubMenuModal({
  open,
  companyLevel,
  companyTitle,
  netWorth,
  activeCityLabel,
  claimableMissionCount,
  onOpenHolding,
  onOpenAccounting,
  onOpenLeaderboard,
  onOpenMissions,
  onOpenMarket,
  onOpenSettings,
  onOpenHrCenter,
  onGoMainMenu,
  onClose,
}: GameHubMenuModalProps) {
  if (!open) return null;

  const items = [
    {
      id: 'holding',
      testId: 'hub-item-holding',
      title: 'Holding & Franchise',
      subtitle: 'Bayilik ver, Zincir Market kur, fabrika & otopark ağı',
      icon: Crown,
      accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenHolding();
      },
    },
    {
      id: 'accounting',
      testId: 'hub-item-accounting',
      title: 'Muhasebe & Gelir-Gider',
      subtitle: 'Saatlik/günlük bilanço, net kâr marjı & şube kârlılığı',
      icon: FileSpreadsheet,
      accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenAccounting();
      },
    },
    {
      id: 'leaderboard',
      testId: 'hub-item-leaderboard',
      title: 'Liderlik Tablosu',
      subtitle: 'En zengin holdingler, il liderleri, franchise & bankalar',
      icon: Award,
      accent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenLeaderboard();
      },
    },
    {
      id: 'missions',
      testId: 'hub-item-missions',
      title: 'Görevler',
      subtitle: 'İmparatorluk hedeflerini tamamla ve ödülleri topla',
      icon: Trophy,
      accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      badge: claimableMissionCount > 0 ? claimableMissionCount : null,
      onClick: () => {
        onClose();
        onOpenMissions();
      },
    },
    {
      id: 'market',
      testId: 'hub-item-market',
      title: 'Piyasa Haberleri',
      subtitle: 'Canlı sektör çarpanları, piyasa olayları & şirket seviyesi',
      icon: TrendingUp,
      accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenMarket();
      },
    },
    {
      id: 'hr',
      testId: 'hub-item-hr',
      title: 'Personel & İK Merkezi',
      subtitle: `${activeCityLabel} Bölge Sorumlusu ve Genel Müdür atamaları`,
      icon: Users,
      accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenHrCenter();
      },
    },
    {
      id: 'settings',
      testId: 'hub-item-settings',
      title: 'Ayarlar & Güncelleme',
      subtitle: 'Tema, harita stili, ses, bildirimler ve canlı OTA güncelleme',
      icon: Settings,
      accent: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      badge: null as number | null,
      onClick: () => {
        onClose();
        onOpenSettings();
      },
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Holding Menüsü"
      data-testid="hub-menu-modal"
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-lg lg:max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="compact-short-pad flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-[clamp(0.88rem,1.8vw,1rem)] font-bold">
              İmparatorluk Yönetim Menüsü
            </h2>
            <p className="truncate text-[clamp(0.68rem,1.2vw,0.75rem)] text-slate-500 dark:text-slate-400">
              Sv.{companyLevel} {companyTitle} · Net Varlık:{' '}
              <strong className="font-mono-num text-amber-700 dark:text-amber-400">
                {formatTL(netWorth, true)}
              </strong>{' '}
              · {activeCityLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoMainMenu();
              }}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Ana Menü</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Menüyü Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Landscape Grid of Spacious Touch Cards */}
        <div className="panel-scroll flex-1 min-h-0 grid grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-2.5 sm:grid-cols-2 sm:p-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={item.testId}
                onClick={item.onClick}
                className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/75 p-2.5 text-left transition-colors hover:border-amber-400/80 hover:bg-amber-50/50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-amber-600/60 dark:hover:bg-slate-800/80"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[clamp(0.76rem,1.4vw,0.85rem)] font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    {item.badge !== null && (
                      <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 font-mono-num text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
