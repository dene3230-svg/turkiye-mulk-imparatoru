import React, { useEffect } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  CalendarCheck2,
  Crown,
  Gem,
  Landmark,
  LineChart,
  Newspaper,
  PieChart,
  Settings,
  Smartphone,
  Store,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { formatTL } from '../game/economy';

export type BottomSheetGroup = 'management' | 'finance' | 'office';

export type BottomSheetActionId =
  | 'mgmt_businesses'
  | 'mgmt_hr'
  | 'mgmt_hq'
  | 'mgmt_rivals'
  | 'mgmt_franchise'
  | 'fin_accounting'
  | 'fin_banking'
  | 'fin_stocks'
  | 'fin_portfolio'
  | 'office_design'
  | 'office_phone'
  | 'office_assets'
  | 'office_dayend'
  | 'office_missions'
  | 'office_news'
  | 'office_leaderboard'
  | 'office_guide'
  | 'office_settings';

interface SheetCardItem {
  id: BottomSheetActionId;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'amber' | 'emerald' | 'rose' | 'sky';
  icon: React.ReactNode;
  accent: string;
}

interface BottomSheetLauncherProps {
  group: BottomSheetGroup | null;
  onClose: () => void;
  onSelect: (actionId: BottomSheetActionId) => void;
  stats: {
    branchCount: number;
    underConstructionCount: number;
    staffCount: number;
    rivalCount: number;
    franchiseCount: number;
    hasCeoOrAccountant: boolean;
    activeLoansCount: number;
    unpaidTaxesCount: number;
    portfolioHoldingsCount: number;
    pendingDayEndCount: number;
    pendingDayEndNet: number;
    claimableMissionsCount: number;
    officePrestige?: number;
    officeTierName?: string;
    brandRecognition?: number;
    personalAssetsCount?: number;
  };
}

export const BottomSheetLauncher: React.FC<BottomSheetLauncherProps> = ({
  group,
  onClose,
  onSelect,
  stats,
}) => {
  useEffect(() => {
    if (!group) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [group, onClose]);

  if (!group) return null;

  const groupMeta: Record<
    BottomSheetGroup,
    { title: string; subtitle: string; accentBar: string; items: SheetCardItem[] }
  > = {
    management: {
      title: 'Yönetim Merkezi',
      subtitle: 'Şubeleriniz, İK kadronuz, holding genel müdürlüğü ve rekabet stratejisi',
      accentBar: 'from-amber-400 to-orange-500',
      items: [
        {
          id: 'mgmt_businesses',
          title: 'İşletmelerim',
          subtitle: 'Şubeler, inşaat takibi, yükseltme & çoğaltma',
          badge:
            stats.underConstructionCount > 0
              ? `${stats.branchCount} şube · ${stats.underConstructionCount} inşaat`
              : `${stats.branchCount} şube`,
          badgeTone: stats.underConstructionCount > 0 ? 'amber' : 'emerald',
          icon: <Building2 className="w-4 h-4" />,
          accent: 'from-amber-500/20 to-amber-600/5 border-amber-500/35 text-amber-300',
        },
        {
          id: 'mgmt_hr',
          title: 'İK & Çalışanlar',
          subtitle: 'Asgari ücret + %22.5 SGK, müdür & otomasyon',
          badge: `${stats.staffCount} personel`,
          badgeTone: 'sky',
          icon: <Users className="w-4 h-4" />,
          accent: 'from-sky-500/20 to-sky-600/5 border-sky-500/35 text-sky-300',
        },
        {
          id: 'mgmt_hq',
          title: 'Genel Müdürlük',
          subtitle: 'Holding CEO, Mali Müşavir & vergi planlaması',
          badge: stats.hasCeoOrAccountant ? 'Yönetim Aktif' : 'Kadro Boş',
          badgeTone: stats.hasCeoOrAccountant ? 'emerald' : 'amber',
          icon: <Crown className="w-4 h-4" />,
          accent: 'from-violet-500/20 to-violet-600/5 border-violet-500/35 text-violet-300',
        },
        {
          id: 'mgmt_rivals',
          title: 'Rakip İşletmeler',
          subtitle: 'Pazar analizi, fiyat savaşı & şube devralma',
          badge: `${stats.rivalCount} rakip`,
          badgeTone: 'rose',
          icon: <Swords className="w-4 h-4" />,
          accent: 'from-rose-500/20 to-rose-600/5 border-rose-500/35 text-rose-300',
        },
        {
          id: 'mgmt_franchise',
          title: 'Franchise & Bayilik',
          subtitle: 'Kendi markanla bayilik ver veya franchise aç',
          badge: `${stats.franchiseCount} marka`,
          badgeTone: 'amber',
          icon: <Store className="w-4 h-4" />,
          accent: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/35 text-emerald-300',
        },
      ],
    },
    finance: {
      title: 'Finans & Mali İşler',
      subtitle: 'Gün/Ay/Yıl sonu bilançosu, Türkiye vergi beyannameleri, banka ve BIST',
      accentBar: 'from-emerald-400 to-teal-500',
      items: [
        {
          id: 'fin_accounting',
          title: 'Muhasebe & Bilanço',
          subtitle: 'Gün / Ay / Yıl Sonu, KDV, Stopaj, Kurumlar & ÇTV',
          badge: stats.unpaidTaxesCount > 0 ? `${stats.unpaidTaxesCount} Vergi` : 'Güncel',
          badgeTone: stats.unpaidTaxesCount > 0 ? 'rose' : 'emerald',
          icon: <Calculator className="w-4 h-4" />,
          accent: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/35 text-emerald-300',
        },
        {
          id: 'fin_banking',
          title: 'Banka & Kredi',
          subtitle: 'Ticari krediler, aylık taksitler ve özel banka',
          badge: stats.activeLoansCount > 0 ? `${stats.activeLoansCount} Kredi` : 'Borçsuz',
          badgeTone: stats.activeLoansCount > 0 ? 'amber' : 'emerald',
          icon: <Landmark className="w-4 h-4" />,
          accent: 'from-amber-500/20 to-amber-600/5 border-amber-500/35 text-amber-300',
        },
        {
          id: 'fin_stocks',
          title: 'Borsa & Yatırım',
          subtitle: 'Canlı BIST hisseleri, emir ekranı ve halka arz',
          badge: 'Canlı',
          badgeTone: 'sky',
          icon: <LineChart className="w-4 h-4" />,
          accent: 'from-sky-500/20 to-sky-600/5 border-sky-500/35 text-sky-300',
        },
        {
          id: 'fin_portfolio',
          title: 'Yatırımlarım',
          subtitle: 'Hisse portföyü, ortalama maliyet ve temettüler',
          badge: `${stats.portfolioHoldingsCount} Hisse`,
          badgeTone: 'emerald',
          icon: <PieChart className="w-4 h-4" />,
          accent: 'from-teal-500/20 to-teal-600/5 border-teal-500/35 text-teal-300',
        },
      ],
    },
    office: {
      title: 'Ofisim & Kurumsal Prestij',
      subtitle: 'Ofis tasarımı, akıllı telefon, kişisel varlıklar, 00:00 gün sonu raporu ve ayarlar',
      accentBar: 'from-amber-400 via-sky-400 to-indigo-500',
      items: [
        {
          id: 'office_design',
          title: 'Ofis Tasarımı & Prestij',
          subtitle: `${stats.officeTierName ?? 'Home Ofis'} · Tedarik indirimi & kredi gücü`,
          badge: `Prestij ${stats.officePrestige ?? 10}/100`,
          badgeTone: (stats.officePrestige ?? 10) >= 20 ? 'emerald' : 'amber',
          icon: <Building2 className="w-4 h-4" />,
          accent: 'from-amber-500/25 to-amber-600/5 border-amber-400/45 text-amber-300',
        },
        {
          id: 'office_phone',
          title: 'Akıllı Telefonum',
          subtitle: 'Müşteri yorumları, banka & İK kısayolları',
          badge: `Tanınırlık %${(stats.brandRecognition ?? 5).toFixed(0)}`,
          badgeTone: 'sky',
          icon: <Smartphone className="w-4 h-4" />,
          accent: 'from-sky-500/25 to-sky-600/5 border-sky-400/45 text-sky-300',
        },
        {
          id: 'office_assets',
          title: 'Kişisel Varlıklar',
          subtitle: 'Saat, makam aracı, yalı, yat & özel jet',
          badge: `${stats.personalAssetsCount ?? 0} Varlık`,
          badgeTone: 'amber',
          icon: <Gem className="w-4 h-4" />,
          accent: 'from-violet-500/25 to-violet-600/5 border-violet-400/45 text-violet-300',
        },
        {
          id: 'office_dayend',
          title: 'Gün Sonu Raporu (00:00)',
          subtitle: 'Şube kâr/zarar tablosu ve günlük hasılat tahsilatı',
          badge:
            stats.pendingDayEndCount > 0
              ? `${stats.pendingDayEndCount} Rapor · ${formatTL(stats.pendingDayEndNet, true)}`
              : 'Tahsil Edildi',
          badgeTone: stats.pendingDayEndCount > 0 ? 'emerald' : 'sky',
          icon: <CalendarCheck2 className="w-4 h-4" />,
          accent: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/35 text-emerald-300',
        },
        {
          id: 'office_missions',
          title: 'Görevler & Hedefler',
          subtitle: 'Dinamik büyüme görevleri ve nakit ödüller',
          badge: stats.claimableMissionsCount > 0 ? `${stats.claimableMissionsCount} Ödül!` : 'Aktif',
          badgeTone: stats.claimableMissionsCount > 0 ? 'amber' : 'sky',
          icon: <Award className="w-4 h-4" />,
          accent: 'from-amber-500/20 to-amber-600/5 border-amber-500/35 text-amber-300',
        },
        {
          id: 'office_leaderboard',
          title: 'Liderlik Tablosu',
          subtitle: 'Türkiye geneli en büyük holding sıralaması',
          icon: <Trophy className="w-4 h-4" />,
          accent: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/35 text-yellow-300',
        },
        {
          id: 'office_news',
          title: 'Piyasa Haberleri',
          subtitle: 'Sektörel dalgalanmalar ve ekonomi bülteni',
          icon: <Newspaper className="w-4 h-4" />,
          accent: 'from-sky-500/20 to-sky-600/5 border-sky-500/35 text-sky-300',
        },
        {
          id: 'office_guide',
          title: 'Oyun Rehberi',
          subtitle: 'İnşaat, hizmet kalitesi, kredi ve strateji ipuçları',
          icon: <BookOpen className="w-4 h-4" />,
          accent: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/35 text-indigo-300',
        },
        {
          id: 'office_settings',
          title: 'Ayarlar & Kayıt',
          subtitle: 'Tema, ses efektleri, bulut eşitleme & sürüm',
          icon: <Settings className="w-4 h-4" />,
          accent: 'from-slate-500/20 to-slate-600/5 border-slate-500/35 text-slate-300',
        },
      ],
    },
  };

  const active = groupMeta[group];

  const badgeClass = (tone?: SheetCardItem['badgeTone']) => {
    switch (tone) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40';
      case 'rose':
        return 'bg-rose-500/20 text-rose-200 border-rose-400/40';
      case 'sky':
        return 'bg-sky-500/20 text-sky-200 border-sky-400/40';
      default:
        return 'bg-amber-500/20 text-amber-200 border-amber-400/40';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1350] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] px-2 sm:px-4"
      style={{ paddingBottom: 'calc(var(--hud-bottom-gap) + 56px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={active.title}
      data-testid={`bottom-sheet-${group}`}
    >
      <div
        className="animate-bottom-sheet w-full max-w-2xl rounded-2xl bg-slate-950/96 border border-slate-700/80 shadow-[0_-12px_40px_rgba(2,6,23,0.75)] overflow-hidden max-h-[72dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent & Drag Handle */}
        <div className={`h-1 w-full bg-gradient-to-r ${active.accentBar}`} />
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-800/90 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white tracking-tight truncate">
                {active.title}
              </h3>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                {active.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Alt menüyü kapat"
            className="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick-Access Cards Grid */}
        <div
          className={`p-2.5 sm:p-3 grid auto-rows-max content-start gap-2 overflow-y-auto panel-scroll ${
            active.items.length === 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {active.items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`sheet-card-${item.id}`}
              onClick={() => {
                onClose();
                onSelect(item.id);
              }}
              className={`group text-left rounded-xl p-2.5 sm:p-3 bg-gradient-to-br ${item.accent} border hover:brightness-110 active:scale-[0.98] transition-all flex flex-col justify-between gap-1.5 overflow-hidden`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-slate-950/60 border border-white/10 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border whitespace-nowrap ${badgeClass(
                      item.badgeTone
                    )}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-[13px] font-extrabold text-white leading-tight truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-300/85 leading-snug line-clamp-2 mt-0.5">
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
