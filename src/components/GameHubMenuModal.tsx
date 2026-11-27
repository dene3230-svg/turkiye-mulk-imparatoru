import {
  Crown,
  Award,
  Settings,
  Home,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { formatTL } from '../game/economy';
import { MobileGameModal } from './MobileGameModal';

interface GameHubMenuModalProps {
  open: boolean;
  companyLevel: number;
  companyTitle: string;
  netWorth: number;
  activeCityLabel: string;
  onOpenLeaderboard: () => void;
  onOpenHolding: () => void;
  onOpenPatronChat: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onGoMainMenu: () => void;
  onClose: () => void;
}

export function GameHubMenuModal({
  open,
  companyLevel,
  companyTitle,
  netWorth,
  activeCityLabel,
  onOpenLeaderboard,
  onOpenHolding,
  onOpenPatronChat,
  onOpenGuide,
  onOpenSettings,
  onGoMainMenu,
  onClose,
}: GameHubMenuModalProps) {
  if (!open) return null;

  const items = [
    {
      id: 'leaderboard',
      testId: 'hub-item-leaderboard',
      title: 'Liderlik Tablosu',
      subtitle: 'En zengin holdingler, il liderleri, franchise ve bankalar',
      icon: Award,
      accent: 'bg-[#7E96B0]/15 text-[#7E96B0]',
      onClick: () => {
        onClose();
        onOpenLeaderboard();
      },
    },
    {
      id: 'holding',
      testId: 'hub-item-holding',
      title: 'Holding & Franchise',
      subtitle: 'Bayilik ver, Zincir Market kur, fabrika ve otopark ağı',
      icon: Crown,
      accent: 'bg-[#C8AE7D]/15 text-[#C8AE7D]',
      onClick: () => {
        onClose();
        onOpenHolding();
      },
    },
    {
      id: 'chat',
      testId: 'hub-item-chat',
      title: 'Patron Sohbeti',
      subtitle: `${activeCityLabel} odası ve Türkiye geneli canlı yatırımcı sohbeti`,
      icon: MessageSquare,
      accent: 'bg-[#7A9E7E]/15 text-[#7A9E7E]',
      onClick: () => {
        onClose();
        onOpenPatronChat();
      },
    },
    {
      id: 'guide',
      testId: 'hub-item-guide',
      title: 'Oyun Rehberi',
      subtitle: 'Pin bırakma, şube otomasyonu, borsa ve kredi kuralları',
      icon: BookOpen,
      accent: 'bg-[#7E96B0]/15 text-[#7E96B0]',
      onClick: () => {
        onClose();
        onOpenGuide();
      },
    },
    {
      id: 'settings',
      testId: 'hub-item-settings',
      title: 'Ayarlar',
      subtitle: 'Tema, harita stili, ses, bildirimler ve canlı OTA güncelleme',
      icon: Settings,
      accent: 'bg-slate-700/80 text-slate-200',
      onClick: () => {
        onClose();
        onOpenSettings();
      },
    },
  ];

  return (
    <div data-testid="hub-menu-modal">
      <MobileGameModal
        title="İmparatorluk Menüsü"
        subtitle={`Sv.${companyLevel} ${companyTitle} · ${formatTL(netWorth, true)}`}
        icon={<LayoutGrid className="h-4 w-4" />}
        headerRight={
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoMainMenu();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#334155] bg-[#1D2532] px-3 text-xs font-bold text-slate-100 hover:bg-[#2A3444] whitespace-nowrap"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Ana Menü</span>
          </button>
        }
        onClose={onClose}
        zIndexClass="z-[1250]"
      >
        <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={item.testId}
                onClick={item.onClick}
                className="group flex min-h-[64px] items-center gap-3 rounded-xl border border-[#334155] bg-[#222B38] p-3 text-left transition hover:border-[#C8AE7D]/45 hover:bg-[#1D2532]"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{item.title}</div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{item.subtitle}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#C8AE7D]" />
              </button>
            );
          })}
        </div>
      </MobileGameModal>
    </div>
  );
}
