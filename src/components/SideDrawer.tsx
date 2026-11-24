import {
  X,
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
} from 'lucide-react';
import type { EmpireState, MissionDef, StockQuote } from '../types/game';
import { COMPANY_TIERS, getBlueprintById } from '../game/catalog';
import {
  calculateBusinessHourlyIncome,
  calculateNetWorth,
  formatTL,
  getCompanyTier,
  getMissionProgress,
} from '../game/economy';
import { resolveBusinessAutomation } from '../game/hrEngine';
import { ensureDynamicMissions } from '../game/missionEngine';

export type DrawerTab = 'portfolio' | 'missions' | 'market';

interface SideDrawerProps {
  tab: DrawerTab;
  state: EmpireState;
  stockQuotes?: StockQuote[];
  now: number;
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

  const titles: Record<DrawerTab, string> = {
    portfolio: 'Portföy & İK',
    missions: 'İmparatorluk Görevleri',
    market: 'Piyasa & Şirket Seviyesi',
  };

  const eventRemaining = state.activeEvent
    ? Math.max(0, Math.ceil((state.activeEvent.endsAt - now) / 1000))
    : 0;

  return (
    <aside
      aria-label={titles[tab]}
      data-testid={`drawer-${tab}`}
      className="pointer-events-auto flex h-full w-[clamp(275px,36vw,395px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {titles[tab]}
          </h2>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {tab === 'portfolio' &&
              `${state.businesses.length}/${currentTier.maxBranches} şube · ${uniqueCities} il · Net: ${formatTL(netWorth, true)}`}
            {tab === 'missions' &&
              `${state.completedMissionsCount ?? state.claimedMissionIds.length} tamamlandı · ${(state.companyXp ?? 0).toLocaleString('tr-TR')} XP · Otomatik yenilenir`}
            {tab === 'market' &&
              `Şirket Sv.${currentTier.level} (${currentTier.title}) · ${currentTier.maxBranches} Şube Kotası`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {tab === 'portfolio' && onOpenHrModal && (
            <button
              type="button"
              data-testid="portfolio-open-hr-btn"
              onClick={() => onOpenHrModal(state.businesses[0]?.id ?? null)}
              className="flex min-h-[34px] items-center gap-1 rounded-xl bg-sky-600 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-sky-700 whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5" />
              <span>İK Havuzu</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Paneli Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="panel-scroll flex-1 p-3">
        {tab === 'portfolio' && (
          <>
            {state.businesses.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  Henüz İşletmeniz Yok
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  81 ilden birini seçin, kara üzerinde bir noktaya pin bırakıp ilk işletmenizi
                  kurun (Başlangıç kotası: 3 şube).
                </p>
                <button
                  type="button"
                  onClick={onEnablePinMode}
                  className="mt-4 min-h-[42px] rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  Haritaya Pin Bırak
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {state.businesses.map((biz) => {
                  const bp = getBlueprintById(biz.blueprintId);
                  const automation = resolveBusinessAutomation(
                    biz,
                    state.cityManagers ?? [],
                    state.businesses
                  );
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
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectBusiness(biz.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-slate-900 hover:text-amber-700 dark:text-white dark:hover:text-amber-400">
                              {biz.customName}
                            </span>
                            {automation.autoCollectRevenue && (
                              <span
                                data-testid="portfolio-auto-collect-badge"
                                className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              >
                                <Zap className="h-2.5 w-2.5" /> Otomatik Tahsilat Aktif
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {String(biz.cityPlate).padStart(2, '0')} {biz.cityName} ·{' '}
                            {biz.districtName} · Sv.{biz.level} · {bp?.shortName}
                          </div>
                        </button>

                        <span className="shrink-0 font-mono-num text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {formatTL(hourly)}/sa
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => onSelectBusiness(biz.id)}
                            className="text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-400 whitespace-nowrap"
                          >
                            Haritada Gör
                          </button>
                          <button
                            type="button"
                            onClick={() => onEnterInterior(biz.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline dark:text-sky-400 whitespace-nowrap"
                          >
                            <DoorOpen className="h-3 w-3" />
                            <span>İçeri Gir</span>
                          </button>
                          {onOpenHrModal && (
                            <button
                              type="button"
                              onClick={() => onOpenHrModal(biz.id)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline dark:text-indigo-400 whitespace-nowrap"
                            >
                              <Users className="h-3 w-3" />
                              <span>İK</span>
                            </button>
                          )}
                        </div>

                        {pending > 0 && (
                          <button
                            type="button"
                            onClick={() => onCollectBusiness(biz.id)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 whitespace-nowrap"
                          >
                            <Coins className="h-3 w-3" />
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
          <div className="space-y-2.5">
            {/* Dynamic XP & Infinite Renewal Banner */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] dark:border-amber-800/60 dark:bg-amber-950/30">
              <span className="flex min-w-0 items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Dinamik Görevler</span>
              </span>
              <span className="shrink-0 font-mono-num font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {(state.companyXp ?? 0).toLocaleString('tr-TR')} XP ·{' '}
                {state.completedMissionsCount ?? state.claimedMissionIds.length} Tamam
              </span>
            </div>

            {dynamicMissions.map((mission) => {
              const progress = getMissionProgress(state, mission, now, stockQuotes);
              const completed = progress >= mission.targetValue;
              const pct = Math.min(100, Math.round((progress / Math.max(1, mission.targetValue)) * 100));

              return (
                <div
                  key={mission.id}
                  data-testid="dynamic-mission-card"
                  className={`rounded-xl border p-3 ${
                    completed
                      ? 'border-amber-400 bg-amber-50/80 dark:border-amber-600/80 dark:bg-amber-950/35'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        {completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        )}
                        <span>{mission.title}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {mission.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono-num text-xs font-bold text-amber-700 dark:text-amber-400">
                        +{formatTL(mission.rewardCash, true)}
                      </div>
                      <div className="font-mono-num text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        +{mission.rewardXp ?? 150} XP
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        completed ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono-num text-slate-500 dark:text-slate-400">
                      {mission.targetType === 'netWorth' || mission.targetType === 'totalEarned'
                        ? `${formatTL(progress, true)} / ${formatTL(mission.targetValue, true)}`
                        : `${Math.min(progress, mission.targetValue)} / ${mission.targetValue}`}
                    </span>

                    {completed ? (
                      <button
                        type="button"
                        data-testid="claim-mission-btn"
                        onClick={() => onClaimMission(mission)}
                        className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                      >
                        Ödülü Al & Yenile
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Devam Ediyor</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'market' && (
          <div className="space-y-3">
            {state.activeEvent && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 dark:border-amber-800/70 dark:bg-amber-950/35">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Aktif Piyasa Gündemi
                  </span>
                  <span className="font-mono-num text-[11px]">{eventRemaining}sn</span>
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {state.activeEvent.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {state.activeEvent.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  <span>Gelir x{state.activeEvent.incomeMultiplier.toFixed(2)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Mülk Değeri x{state.activeEvent.valuationMultiplier.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Şirket Seviyeleri ve Şube Kotaları</span>
              </div>
              <div className="space-y-1.5">
                {COMPANY_TIERS.map((tier) => {
                  const unlocked = netWorth >= tier.minNetWorth;
                  const isCurrent = tier.level === currentTier.level;
                  return (
                    <div
                      key={tier.level}
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-50 text-slate-900 dark:border-amber-500/80 dark:bg-amber-950/40 dark:text-white'
                          : unlocked
                          ? 'border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                          : 'border-slate-200/60 bg-slate-50/60 text-slate-400 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          Sv.{tier.level} · {tier.title}
                        </span>
                        <span className="font-mono-num text-[11px]">
                          {formatTL(tier.minNetWorth, true)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-80">{tier.unlocksText}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
