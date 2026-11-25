import { useEffect, useState } from 'react';
import {
  Building2,
  Smartphone,
  Gem,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Star,
  PhoneCall,
  Landmark,
  Users,
  Calculator,
  CalendarCheck2,
  ShieldCheck,
  Award,
  Briefcase,
} from 'lucide-react';
import type { EmpireState, OfficeTierId } from '../types/game';
import {
  OFFICE_TIERS,
  OFFICE_UPGRADES,
  PERSONAL_ASSETS,
  calculateBranchServiceQuality,
  calculateOfficeBenefits,
  calculatePersonalAssetsValuation,
} from '../game/officeEngine';
import { formatGameClock, formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';

export type OfficeModalTabId = 'design' | 'phone' | 'assets';

interface OfficeModalProps {
  open: boolean;
  initialTab?: OfficeModalTabId;
  state: EmpireState;
  companyName: string;
  netWorth: number;
  onUpgradeOfficeTier: (tierId: OfficeTierId) => void;
  onBuyOfficeUpgrade: (upgradeId: string) => void;
  onBuyPersonalAsset: (assetId: string) => void;
  onQuickNavigate?: (target: 'banking' | 'hr' | 'accounting' | 'dayend') => void;
  onClose: () => void;
}

const EXEC_ROLE_LABEL: Record<string, string> = {
  sube_muduru: 'Şube Müdürü’ne kadar',
  bolge_sorumlusu: 'Bölge Sorumlusu Açık',
  genel_mudur: 'Genel Müdür Açık',
  ceo: 'Holding CEO Dahil Tümü',
};

function OfficeArchitecturePreview({ tierId }: { tierId: OfficeTierId }) {
  if (tierId === 'holding_tower') {
    return (
      <svg viewBox="0 0 120 72" className="h-16 w-28 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="towerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
        <rect x="6" y="64" width="108" height="4" rx="2" fill="#334155" />
        <rect x="38" y="10" width="44" height="54" rx="3" fill="url(#towerGrad)" stroke="#c4b5fd" strokeWidth="1.2" />
        <rect x="52" y="4" width="16" height="6" rx="2" fill="#fbbf24" />
        <text x="60" y="9" textAnchor="middle" fontSize="5" fontWeight="900" fill="#0f172a">H</text>
        <rect x="16" y="28" width="18" height="36" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
        <rect x="86" y="24" width="18" height="40" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
        {[18, 28, 38, 48].map((y) => (
          <g key={y}>
            <rect x="44" y={y} width="14" height="5" rx="1" fill="#e0e7ff" opacity="0.85" />
            <rect x="62" y={y} width="14" height="5" rx="1" fill="#fde68a" opacity="0.85" />
          </g>
        ))}
      </svg>
    );
  }
  if (tierId === 'bosphorus_suite') {
    return (
      <svg viewBox="0 0 120 72" className="h-16 w-28 shrink-0" aria-hidden="true">
        <rect x="8" y="8" width="104" height="46" rx="6" fill="#0c4a6e" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M8 40 Q 34 33, 60 39 T 112 37 L 112 54 L 8 54 Z" fill="#0284c7" opacity="0.7" />
        <path d="M22 36 Q 60 16, 98 36" fill="none" stroke="#f59e0b" strokeWidth="2" />
        <line x1="36" y1="22" x2="36" y2="39" stroke="#fde68a" strokeWidth="2" />
        <line x1="84" y1="22" x2="84" y2="39" stroke="#fde68a" strokeWidth="2" />
        <rect x="20" y="56" width="80" height="8" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
      </svg>
    );
  }
  if (tierId === 'plaza_floor') {
    return (
      <svg viewBox="0 0 120 72" className="h-16 w-28 shrink-0" aria-hidden="true">
        <rect x="6" y="64" width="108" height="4" rx="2" fill="#334155" />
        <rect x="26" y="14" width="68" height="50" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
        {[22, 34, 46].map((y) => (
          <g key={y}>
            <rect x="33" y={y} width="16" height="7" rx="1.5" fill="#38bdf8" opacity="0.75" />
            <rect x="52" y={y} width="16" height="7" rx="1.5" fill="#7dd3fc" opacity="0.85" />
            <rect x="71" y={y} width="16" height="7" rx="1.5" fill="#38bdf8" opacity="0.75" />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-28 shrink-0" aria-hidden="true">
      <rect x="14" y="14" width="92" height="50" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.4" />
      <rect x="28" y="42" width="64" height="6" rx="2" fill="#94a3b8" />
      <rect x="44" y="24" width="32" height="16" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
      <rect x="34" y="48" width="5" height="14" fill="#64748b" />
      <rect x="81" y="48" width="5" height="14" fill="#64748b" />
    </svg>
  );
}

export function OfficeModal({
  open,
  initialTab = 'design',
  state,
  companyName,
  netWorth,
  onUpgradeOfficeTier,
  onBuyOfficeUpgrade,
  onBuyPersonalAsset,
  onQuickNavigate,
  onClose,
}: OfficeModalProps) {
  const [activeTab, setActiveTab] = useState<OfficeModalTabId>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const benefits = calculateOfficeBenefits(state);
  const ownedUpgrades = new Set(state.officeUpgradeIds ?? []);
  const ownedAssets = new Set(state.personalAssetIds ?? []);
  const personalAssetsVal = calculatePersonalAssetsValuation(state);
  const brandRecognition = state.brandRecognition ?? 5;
  const clock = formatGameClock(state.gameMinutes ?? 540);
  const pendingDayEndCount = (state.pendingDayEndReports ?? []).length;
  const unpaidTaxCount = (state.pendingTaxes ?? []).filter((t) => t.status !== 'paid').length;

  const branchQualityRows = state.businesses.map((b) => ({
    business: b,
    report: calculateBranchServiceQuality(b, state.cityManagers ?? [], state.businesses),
  }));
  const avgServiceStars =
    branchQualityRows.length > 0
      ? Number(
          (
            branchQualityRows.reduce((s, r) => s + r.report.stars, 0) / branchQualityRows.length
          ).toFixed(1)
        )
      : 0;

  const tabs: MobileModalTab[] = [
    {
      id: 'design',
      label: 'Ofis Tasarımı & Prestij',
      badge: `${benefits.officePrestige}/100`,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: 'phone',
      label: 'Akıllı Telefonum',
      badge: pendingDayEndCount + unpaidTaxCount > 0 ? pendingDayEndCount + unpaidTaxCount : undefined,
      icon: <Smartphone className="h-4 w-4" />,
    },
    {
      id: 'assets',
      label: 'Kişisel Varlıklar',
      badge: ownedAssets.size > 0 ? ownedAssets.size : undefined,
      icon: <Gem className="h-4 w-4" />,
    },
  ];

  return (
    <div data-testid="office-modal">
      <MobileGameModal
        title="Ofisim & Yönetim Merkezi"
        subtitle={`${benefits.tier.name} · Prestij ${benefits.officePrestige}/100 · Tanınırlık %${brandRecognition.toFixed(1)}`}
        icon={<Briefcase className="h-4 w-4" />}
        tabs={tabs}
        activeTabId={activeTab}
        onSelectTab={(id) => setActiveTab(id as OfficeModalTabId)}
        onClose={onClose}
        zIndexClass="z-[1280]"
      >
        {activeTab === 'design' && (
          <div className="space-y-3" data-testid="office-tab-design">
            {/* Hero Office Showcase & Live B2B Perks */}
            <section className="rounded-xl border border-amber-400/40 bg-slate-900/90 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <OfficeArchitecturePreview tierId={benefits.tier.id} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Seviye {benefits.tier.level}/4 · Mevcut Merkez Ofis
                    </div>
                    <h3 className="text-base font-black text-white truncate">{benefits.tier.name}</h3>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                      {benefits.tier.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-slate-400">Ofis Prestiji</div>
                  <div
                    data-testid="office-prestige-value"
                    className="font-mono-num text-2xl font-black text-amber-300"
                  >
                    {benefits.officePrestige}
                    <span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              {/* Prestige Progress Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(4, benefits.officePrestige)}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>
                    Firma Tanınırlığı:{' '}
                    <strong className="font-mono-num text-sky-300">
                      %{brandRecognition.toFixed(1)}
                    </strong>
                  </span>
                  <span>
                    Banka Kredi Prestij Barajı:{' '}
                    <strong
                      className={
                        benefits.officePrestige >= 20 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {benefits.officePrestige >= 20 ? 'Sağlandı (20+)' : `${benefits.officePrestige}/20`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Real B2B Perks Summary */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/30 p-2.5">
                  <div className="text-[10.5px] text-emerald-200/80">Toptancı İndirimi</div>
                  <div
                    data-testid="office-supply-discount"
                    className="mt-0.5 font-mono-num text-sm font-black text-emerald-300"
                  >
                    -%{(benefits.supplyDiscountRate * 100).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">Tedarik & hammadde</div>
                </div>
                <div className="rounded-lg border border-sky-500/35 bg-sky-950/30 p-2.5">
                  <div className="text-[10.5px] text-sky-200/80">Banka Faiz İndirimi</div>
                  <div className="mt-0.5 font-mono-num text-sm font-black text-sky-300">
                    -%{(benefits.loanInterestDiscount * 100).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">Kredi maliyeti</div>
                </div>
                <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 p-2.5">
                  <div className="text-[10.5px] text-amber-200/80">Kredi Limit Çarpanı</div>
                  <div className="mt-0.5 font-mono-num text-sm font-black text-amber-300">
                    {benefits.loanLimitMultiplier.toFixed(2)}×
                  </div>
                  <div className="text-[10px] text-slate-400">Prestij onayı</div>
                </div>
                <div className="rounded-lg border border-violet-500/35 bg-violet-950/30 p-2.5">
                  <div className="text-[10.5px] text-violet-200/80">Üst Düzey İK Erişimi</div>
                  <div className="mt-0.5 text-xs font-black text-violet-200 leading-tight">
                    {EXEC_ROLE_LABEL[benefits.maxHireableExecutive]}
                  </div>
                  <div className="text-[10px] text-slate-400">Yönetici başvurusu</div>
                </div>
              </div>
            </section>

            {/* 4-Tier Office Relocation Ladder */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Ofis Kademeleri (Büyüme & Kurumsal Statü)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Nakit: <strong className="font-mono-num text-white">{formatTL(state.cash, true)}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {OFFICE_TIERS.map((tier) => {
                  const isOwned = benefits.tier.level >= tier.level;
                  const isCurrent = benefits.tier.id === tier.id;
                  const isNext = tier.level === benefits.tier.level + 1;
                  const brandOk = brandRecognition >= tier.minBrandRecognition;
                  const canAfford = state.cash >= tier.cost;
                  const canUpgrade = isNext && brandOk && canAfford;

                  return (
                    <div
                      key={tier.id}
                      data-testid={`office-tier-${tier.id}`}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 ${
                        isCurrent
                          ? 'border-amber-400/80 bg-amber-500/10'
                          : isOwned
                          ? 'border-emerald-500/40 bg-emerald-950/20'
                          : 'border-slate-700/80 bg-slate-900/75'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-white">{tier.name}</div>
                            <div className="text-[11px] text-slate-400">{tier.subtitle}</div>
                          </div>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono-num text-[10.5px] font-bold text-amber-300">
                            +{tier.basePrestige} Prestij
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-300">
                            Tedarik -%{Math.round(tier.supplyDiscountRate * 100)}
                          </span>
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-semibold text-sky-300">
                            Faiz -%{(tier.loanInterestDiscount * 100).toFixed(1)}
                          </span>
                          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-semibold text-violet-300">
                            {EXEC_ROLE_LABEL[tier.maxHireableExecutive]}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <CheckCircle2 className="h-4 w-4" /> Aktif Merkez Ofis
                        </div>
                      ) : isOwned ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Tamamlandı
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-testid={`upgrade-tier-btn-${tier.id}`}
                          disabled={!canUpgrade}
                          onClick={() => onUpgradeOfficeTier(tier.id)}
                          className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
                        >
                          {!isNext || !brandOk ? <Lock className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                          <span>
                            {!isNext
                              ? `Önce Sv.${tier.level - 1} Ofise Geçin`
                              : !brandOk
                              ? `Min. %${tier.minBrandRecognition} Tanınırlık Gerekli`
                              : `Taşın · ${formatTL(tier.cost, true)}`}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Office Equipment & Interior Upgrades */}
            <section className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Ofis Donanımı & B2B Yatırımları
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {OFFICE_UPGRADES.map((upg) => {
                  const owned = ownedUpgrades.has(upg.id);
                  const tierLocked = benefits.tier.level < upg.minOfficeLevel;
                  const canBuy = !owned && !tierLocked && state.cash >= upg.cost;

                  return (
                    <div
                      key={upg.id}
                      data-testid={`office-upgrade-${upg.id}`}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                        owned
                          ? 'border-emerald-500/45 bg-emerald-950/20'
                          : 'border-slate-700/80 bg-slate-900/75'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-black text-white">{upg.name}</div>
                          <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-amber-300">
                            +{upg.prestigeBonus} Prestij
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                          {upg.description}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                          {upg.supplyDiscountBonus > 0 && (
                            <span className="text-emerald-300">
                              Tedarik -%{(upg.supplyDiscountBonus * 100).toFixed(1)}
                            </span>
                          )}
                          {upg.loanInterestDiscountBonus > 0 && (
                            <span className="text-sky-300">
                              Faiz -%{(upg.loanInterestDiscountBonus * 100).toFixed(1)}
                            </span>
                          )}
                          {upg.brandBonus > 0 && (
                            <span className="text-amber-300">Tanınırlık +%{upg.brandBonus}</span>
                          )}
                        </div>
                      </div>

                      {owned ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Kurulu
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-testid={`buy-upgrade-btn-${upg.id}`}
                          disabled={!canBuy}
                          onClick={() => onBuyOfficeUpgrade(upg.id)}
                          className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-sky-400/70 bg-sky-500 px-3 text-xs font-black text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
                        >
                          {tierLocked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                          <span>
                            {tierLocked
                              ? `Ofis Seviye ${upg.minOfficeLevel} Gerekli`
                              : `Kur · ${formatTL(upg.cost, true)}`}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'phone' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="office-tab-phone">
            {/* Executive Smartphone Frame */}
            <section className="rounded-2xl border-2 border-slate-700 bg-slate-950 p-3.5 shadow-xl space-y-3">
              {/* Phone Status Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-sky-400" />
                  <strong className="text-white">{companyName}</strong>
                </span>
                <span className="font-mono-num text-amber-300">{clock.compactLabel}</span>
              </div>

              {/* Phone KPI Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5">
                  <div className="text-[10px] text-slate-400">Nakit Kasa</div>
                  <div
                    className={`font-mono-num text-sm font-black ${
                      state.cash < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatTL(state.cash, true)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5">
                  <div className="text-[10px] text-slate-400">Net Şirket Değeri</div>
                  <div className="font-mono-num text-sm font-black text-white">
                    {formatTL(netWorth, true)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5">
                  <div className="text-[10px] text-slate-400">Firma Tanınırlığı</div>
                  <div className="font-mono-num text-sm font-black text-sky-300">
                    %{brandRecognition.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5">
                  <div className="text-[10px] text-slate-400">Ortalama Hizmet</div>
                  <div className="font-mono-num text-sm font-black text-amber-300">
                    {avgServiceStars > 0 ? `${avgServiceStars.toFixed(1)} ★` : '—'}
                  </div>
                </div>
              </div>

              {/* Quick Executive Call Shortcuts */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                  Hızlı Yönetici Hatları
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickNavigate?.('banking');
                    }}
                    className="flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/20"
                  >
                    <Landmark className="h-4 w-4 shrink-0" />
                    <span>Banka Müşteri Hattı</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickNavigate?.('hr');
                    }}
                    className="flex min-h-[42px] items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/20"
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>İK & Kadro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickNavigate?.('accounting');
                    }}
                    className="flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"
                  >
                    <Calculator className="h-4 w-4 shrink-0" />
                    <span>Mali Müşavir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickNavigate?.('dayend');
                    }}
                    className="flex min-h-[42px] items-center gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 px-2.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20"
                  >
                    <CalendarCheck2 className="h-4 w-4 shrink-0" />
                    <span>00:00 Gün Sonu</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Live Customer Reviews & B2B Alerts */}
            <section className="rounded-xl border border-slate-700/80 bg-slate-900/85 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-400" />
                  Canlı Müşteri Yorumları & Hizmet Puanları
                </h4>
                <span className="text-[11px] text-slate-400">{branchQualityRows.length} Şube</span>
              </div>

              {branchQualityRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-400">
                  Henüz açık bir şubeniz yok. İlk şubenizi kurduğunuzda müşteri puanları ve yorumları telefonunuza anlık düşecektir.
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto panel-scroll pr-1">
                  {branchQualityRows.map(({ business, report }) => (
                    <div
                      key={business.id}
                      className={`rounded-xl border p-2.5 text-xs space-y-1 ${
                        report.stars >= 3.5
                          ? 'border-emerald-500/35 bg-emerald-950/20'
                          : report.stars >= 2.5
                          ? 'border-amber-500/35 bg-amber-950/20'
                          : 'border-rose-500/45 bg-rose-950/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white truncate">{business.customName}</span>
                        <span className="font-mono-num font-black text-amber-300 shrink-0">
                          {report.stars.toFixed(1)} ★ · %{report.customerTrafficPct} Trafik
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {report.issues.length > 0
                          ? `“${report.issues[0]}”`
                          : '“Hizmet hızlı, mekan tertemiz ve ekip çok ilgili. Kesinlikle tekrar geleceğim!”'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
                <span>
                  Hizmet kalitesi <strong>2.5★</strong> altına düşen şubelerde müşteri trafiği hızla erir ve şube zarar edebilir. Personel kadrosunu tamamlayın ve kalite yatırımı yapın.
                </span>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-3" data-testid="office-tab-assets">
            <section className="rounded-xl border border-amber-400/35 bg-slate-900/90 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-white">Kişisel Prestij Portföyü</div>
                  <div className="text-[11px] text-slate-400">
                    Satın aldığınız kişisel varlıklar kalıcı ofis prestiji ve firma tanınırlığı kazandırır.
                  </div>
                </div>
              </div>
              <div className="text-right font-mono-num">
                <div className="text-[10.5px] text-slate-400">Kişisel Varlık Toplamı</div>
                <div className="text-sm font-black text-amber-300">
                  {formatTL(personalAssetsVal, true)}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PERSONAL_ASSETS.map((asset) => {
                const owned = ownedAssets.has(asset.id);
                const canAfford = state.cash >= asset.cost;
                return (
                  <div
                    key={asset.id}
                    data-testid={`personal-asset-${asset.id}`}
                    className={`rounded-xl border p-3 flex flex-col justify-between gap-2.5 ${
                      owned
                        ? 'border-emerald-500/45 bg-emerald-950/25'
                        : 'border-slate-700/80 bg-slate-900/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                            {asset.category}
                          </span>
                          <div className="text-sm font-black text-white">{asset.name}</div>
                        </div>
                        <span className="font-mono-num text-xs font-black text-amber-300 shrink-0">
                          {formatTL(asset.cost, true)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-snug">{asset.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">
                          +{asset.prestigeBonus} Ofis Prestiji
                        </span>
                        <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-300">
                          +%{asset.brandBonus} Firma Tanınırlığı
                        </span>
                      </div>
                    </div>

                    {owned ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Koleksiyonunuzda
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`buy-asset-btn-${asset.id}`}
                        disabled={!canAfford}
                        onClick={() => onBuyPersonalAsset(asset.id)}
                        className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-400 px-3 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Satın Al · {formatTL(asset.cost, true)}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
