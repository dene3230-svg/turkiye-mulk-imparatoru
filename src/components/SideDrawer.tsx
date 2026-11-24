import {
  MapPin,
  Coins,
  Trophy,
  TrendingUp,
  Crown,
  CheckCircle2,
  DoorOpen,
  Users,
  Zap,
  Sparkles,
  CalendarDays,
  Briefcase,
} from 'lucide-react';
import type { EmpireState, MissionDef, StockQuote } from '../types/game';
import { COMPANY_TIERS, getBlueprintById } from '../game/catalog';
import {
  calculateBusinessHourlyIncome,
  calculateNetWorth,
  formatGameClock,
  formatTL,
  getCompanyTier,
  getMissionProgress,
} from '../game/economy';
import { getBranchStaffSlots, resolveBusinessAutomation } from '../game/hrEngine';
import { ensureDynamicMissions } from '../game/missionEngine';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';

export type DrawerTab = 'portfolio' | 'missions' | 'market';

interface SideDrawerProps {
  tab: DrawerTab;
  state: EmpireState;
  stockQuotes?: StockQuote[];
  now: number;
  onSwitchTab?: (tab: DrawerTab) => void;
  onClose: () => void;
  onSelectBusiness: (businessId: string) => void;
  onEnterInterior: (businessId: string) => void;
  onOpenHrModal?: (businessId: string | null) => void;
  onCollectBusiness: (businessId: string) => void;
  onClaimMission: (mission: MissionDef) => void;
  onEnablePinMode: () => void;
}

export function SideDrawer({
  tab,
  state,
  stockQuotes,
  now,
  onSwitchTab,
  onClose,
  onSelectBusiness,
  onEnterInterior,
  onOpenHrModal,
  onCollectBusiness,
  onClaimMission,
  onEnablePinMode,
}: SideDrawerProps) {
  const netWorth = calculateNetWorth(state, now, stockQuotes);
  const currentTier = getCompanyTier(netWorth);
  const uniqueCities = new Set(state.businesses.map((b) => b.cityPlate)).size;
  const dynamicMissions = ensureDynamicMissions(state, now, stockQuotes);
  const clock = formatGameClock(state.gameMinutes);

  const claimableCount = dynamicMissions.filter(
    (m) => getMissionProgress(state, m, now, stockQuotes) >= m.targetValue
  ).length;

  const titles: Record<DrawerTab, string> = {
    portfolio: 'Portföy & İK',
    missions: 'İmparatorluk Görevleri',
    market: 'Piyasa Haberleri & Seviye',
  };

  const subtitles: Record<DrawerTab, string> = {
    portfolio: `${state.businesses.length}/${currentTier.maxBranches} şube · ${uniqueCities} il · Net: ${formatTL(netWorth, true)}`,
    missions: `${state.completedMissionsCount ?? state.claimedMissionIds.length} tamamlandı · ${(state.companyXp ?? 0).toLocaleString('tr-TR')} XP`,
    market: `Sv.${currentTier.level} ${currentTier.title} · ${clock.label}`,
  };

  const eventRemaining = state.activeEvent
    ? Math.max(0, Math.ceil((state.activeEvent.endsAt - now) / 1000))
    : 0;

  const tabs: MobileModalTab[] = [
    {
      id: 'portfolio',
      label: 'Portföy & İK',
      badge: state.businesses.length,
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      id: 'missions',
      label: 'Görevler',
      badge: claimableCount > 0 ? claimableCount : undefined,
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      id: 'market',
      label: 'Piyasa Haberleri',
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div data-testid={`drawer-${tab}`}>
      <MobileGameModal
        title={titles[tab]}
        subtitle={subtitles[tab]}
        icon={
          tab === 'portfolio' ? (
            <Briefcase className="h-4 w-4" />
          ) : tab === 'missions' ? (
            <Trophy className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )
        }
        headerRight={
          tab === 'portfolio' && onOpenHrModal ? (
            <button
              type="button"
              data-testid="portfolio-open-hr-btn"
              onClick={() => onOpenHrModal(state.businesses[0]?.id ?? null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-400 px-3 text-xs font-bold text-slate-950 hover:bg-sky-300 whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5" />
              <span>İK Havuzu</span>
            </button>
          ) : undefined
        }
        tabs={tabs}
        activeTabId={tab}
        onSelectTab={(id) => onSwitchTab?.(id as DrawerTab)}
        onClose={onClose}
        zIndexClass="z-[1240]"
      >
        {tab === 'portfolio' && (
          <>
            {state.businesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-bold text-white">Henüz İşletmeniz Yok</h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-300">
                  81 ilden birini seçin, kara üzerinde bir noktaya pin bırakıp ilk işletmenizi
                  kurun (Başlangıç kotası: {currentTier.maxBranches} şube).
                </p>
                <button
                  type="button"
                  onClick={onEnablePinMode}
                  className="mt-4 min-h-[44px] rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 hover:bg-amber-300"
                >
                  Haritaya Pin Bırak
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
                {state.businesses.map((biz) => {
                  const bp = getBlueprintById(biz.blueprintId);
                  const automation = resolveBusinessAutomation(
                    biz,
                    state.cityManagers ?? [],
                    state.businesses
                  );
                  const slots = getBranchStaffSlots(biz);
                  const hourly = calculateBusinessHourlyIncome(
                    biz,
                    state.activeEvent,
                    now,
                    state.businesses,
                    state
                  );
                  const pending = Math.floor(biz.pendingCash);

                  return (
                    <div
                      key={biz.id}
                      className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-white hover:text-amber-300">
                              {biz.customName}
                            </span>
                            {automation.autoCollectRevenue && (
                              <span
                                data-testid="portfolio-auto-collect-badge"
                                className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300"
                              >
                                <Zap className="h-3 w-3" /> Oto Tahsilat
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {String(biz.cityPlate).padStart(2, '0')} {biz.cityName} ·{' '}
                            {biz.districtName} · Sv.{biz.level} · {bp?.shortName}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-semibold">
                              {slots.workers}/{slots.maxWorkers} Çalışan
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-semibold">
                              {slots.assistantManagers}/{slots.maxAssistantManagers} Yrd.
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-semibold">
                              {slots.branchManagers}/{slots.maxBranchManagers} Şube Müd.
                            </span>
                          </div>
                        </button>

                        <span className="shrink-0 font-mono-num text-sm font-black text-emerald-400">
                          {formatTL(hourly)}/sa
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz.id)}
                          className="min-h-[40px] flex-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs font-bold text-amber-300 hover:bg-slate-700 whitespace-nowrap"
                        >
                          Haritada Gör
                        </button>
                        <button
                          type="button"
                          onClick={() => onEnterInterior(biz.id)}
                          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs font-bold text-sky-300 hover:bg-slate-700 whitespace-nowrap"
                        >
                          <DoorOpen className="h-3.5 w-3.5" />
                          <span>İçeri Gir</span>
                        </button>
                        {onOpenHrModal && (
                          <button
                            type="button"
                            onClick={() => onOpenHrModal(biz.id)}
                            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3 text-xs font-bold text-indigo-200 hover:bg-indigo-500/30 whitespace-nowrap"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>İK</span>
                          </button>
                        )}
                        {pending > 0 && (
                          <button
                            type="button"
                            onClick={() => onCollectBusiness(biz.id)}
                            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 whitespace-nowrap"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            <span>{formatTL(pending)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'missions' && (
          <div className="space-y-3">
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Dinamik Görev Havuzu (Tamamlandıkça Otomatik Yenilenir)</span>
              </span>
              <span className="font-mono-num font-bold text-white">
                {(state.companyXp ?? 0).toLocaleString('tr-TR')} XP ·{' '}
                {state.completedMissionsCount ?? state.claimedMissionIds.length} Tamamlandı
              </span>
            </section>

            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {dynamicMissions.map((mission) => {
                const progress = getMissionProgress(state, mission, now, stockQuotes);
                const completed = progress >= mission.targetValue;
                const pct = Math.min(
                  100,
                  Math.round((progress / Math.max(1, mission.targetValue)) * 100)
                );

                return (
                  <div
                    key={mission.id}
                    data-testid="dynamic-mission-card"
                    className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3.5 ${
                      completed
                        ? 'border-amber-400 bg-amber-400/12'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                            {completed ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : (
                              <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
                            )}
                            <span>{mission.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{mission.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono-num text-sm font-black text-amber-300">
                            +{formatTL(mission.rewardCash, true)}
                          </div>
                          <div className="font-mono-num text-xs font-bold text-sky-300">
                            +{mission.rewardXp ?? 150} XP
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            completed ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <span className="font-mono-num font-semibold text-slate-300">
                        {mission.targetType === 'netWorth' || mission.targetType === 'totalEarned'
                          ? `${formatTL(progress, true)} / ${formatTL(mission.targetValue, true)}`
                          : `${Math.min(progress, mission.targetValue)} / ${mission.targetValue}`}
                      </span>

                      {completed ? (
                        <button
                          type="button"
                          data-testid="claim-mission-btn"
                          onClick={() => onClaimMission(mission)}
                          className="min-h-[40px] rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 hover:bg-amber-300"
                        >
                          Ödülü Al & Yenile
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-400">Devam Ediyor (%{pct})</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'market' && (
          <div className="space-y-3">
            {/* Game Calendar Card */}
            <section className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <CalendarDays className="h-5 w-5 text-amber-400" />
                <span>{clock.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-bold text-amber-300">
                  {clock.totalDaysLabel}
                </span>
                <span>Haftalık Temettü: Her 7. Gün · Aylık Bilanço: Her 30. Gün</span>
              </div>
            </section>

            {state.activeEvent && (
              <section className="rounded-xl border border-amber-400/45 bg-amber-500/10 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Aktif Piyasa Gündemi
                  </span>
                  <span className="font-mono-num">{eventRemaining}sn</span>
                </div>
                <h3 className="mt-1.5 text-sm font-black text-white">
                  {state.activeEvent.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                  {state.activeEvent.description}
                </p>
                <div className="mt-2.5 flex items-center gap-3 text-xs font-bold text-emerald-300">
                  <span>Gelir x{state.activeEvent.incomeMultiplier.toFixed(2)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Mülk Değeri x{state.activeEvent.valuationMultiplier.toFixed(2)}</span>
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>Şirket Seviyeleri ve Şube Kotaları</span>
              </div>
              <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
                {COMPANY_TIERS.map((tier) => {
                  const unlocked = netWorth >= tier.minNetWorth;
                  const isCurrent = tier.level === currentTier.level;
                  return (
                    <div
                      key={tier.level}
                      className={`rounded-xl border px-3 py-2.5 text-xs ${
                        isCurrent
                          ? 'border-amber-400 bg-amber-400/12 text-white'
                          : unlocked
                          ? 'border-slate-700 bg-slate-900/80 text-slate-200'
                          : 'border-slate-800 bg-slate-950/60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          Sv.{tier.level} · {tier.title}
                        </span>
                        <span className="font-mono-num text-amber-300">
                          {formatTL(tier.minNetWorth, true)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs opacity-85">{tier.unlocksText}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
