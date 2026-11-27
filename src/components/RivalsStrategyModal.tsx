import { useMemo, useState } from 'react';
import {
  Building2,
  Users,
  Crown,
  Swords,
  MapPin,
  Handshake,
  Flame,
  Store,
  TrendingUp,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import type {
  EmpireState,
  FranchiseBrand,
  RemoteBusinessRecord,
} from '../types/game';
import { getBlueprintById } from '../game/catalog';
import { formatTL } from '../game/economy';
import {
  buildNationalRivalDirectory,
  formatRemainingGameHours,
} from '../game/strategyEngine';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';
import { parseOwnerAndHolding } from '../services/cityRoom';

export type ManagementTabId = 'portfolio' | 'hr' | 'franchise' | 'rivals';

interface RivalsStrategyModalProps {
  open: boolean;
  state: EmpireState;
  activeCityPlate: number;
  activeCityName: string;
  playerOwnerId?: string;
  competitorBusinesses: RemoteBusinessRecord[];
  allFranchises: FranchiseBrand[];
  onSelectManagementTab: (tab: ManagementTabId) => void;
  onFocusRivalOnMap: (rival: RemoteBusinessRecord) => void;
  onTakeoverRival: (rival: RemoteBusinessRecord, multiplier: number) => void;
  onLaunchBlitz: (rival: RemoteBusinessRecord) => void;
  onTakeRivalFranchise: (brand: FranchiseBrand) => void;
  onClose: () => void;
}

type RivalFilter = 'all' | 'players' | 'city' | 'distressed' | 'franchise';

export function RivalsStrategyModal({
  open,
  state,
  activeCityPlate,
  activeCityName,
  playerOwnerId,
  competitorBusinesses,
  allFranchises,
  onSelectManagementTab,
  onFocusRivalOnMap,
  onTakeoverRival,
  onLaunchBlitz,
  onTakeRivalFranchise,
  onClose,
}: RivalsStrategyModalProps) {
  const [filter, setFilter] = useState<RivalFilter>('all');

  const directory = useMemo(
    () =>
      buildNationalRivalDirectory(
        activeCityPlate,
        competitorBusinesses,
        state.acquiredRivalIds ?? [],
        allFranchises,
        playerOwnerId
      ),
    [activeCityPlate, competitorBusinesses, state.acquiredRivalIds, allFranchises, playerOwnerId]
  );

  if (!open) return null;

  const realPlayersCount = directory.filter((item) => !item.isAiHolding).length;

  const filtered = directory.filter((item) => {
    if (filter === 'players') return !item.isAiHolding;
    if (filter === 'city') return item.record.city_plate === activeCityPlate;
    if (filter === 'distressed') return item.isDistressed;
    if (filter === 'franchise') return Boolean(item.linkedFranchise);
    return true;
  });

  const activeBlitzes = (state.competitiveBlitzes ?? []).filter(
    (bl) => bl.endsAtGameMin > (state.gameMinutes ?? 540)
  );
  const pendingAppsCount = (state.franchiseApplications ?? []).filter(
    (a) => a.status === 'pending'
  ).length;

  const managementTabs: MobileModalTab[] = [
    {
      id: 'portfolio',
      label: 'İşletmelerim',
      badge: state.businesses.length,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: 'hr',
      label: 'İK & Çalışanlar',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'franchise',
      label: 'Franchise & Bayilik',
      badge: (state.ownFranchises?.length ?? 0) + pendingAppsCount || undefined,
      icon: <Crown className="h-4 w-4" />,
    },
    {
      id: 'rivals',
      label: 'Rakip İşletmeler',
      badge: directory.length,
      icon: <Swords className="h-4 w-4" />,
    },
  ];

  const filters: Array<{ id: RivalFilter; label: string }> = [
    { id: 'all', label: `Tümü (${directory.length})` },
    { id: 'players', label: `Canlı Oyuncular (${realPlayersCount})` },
    { id: 'city', label: `${activeCityName}` },
    { id: 'distressed', label: 'Devralma Fırsatları' },
    { id: 'franchise', label: 'Franchise Verenler' },
  ];

  return (
    <div data-testid="rivals-strategy-modal">
      <MobileGameModal
        title="Yönetim Merkezi"
        subtitle={`Rakip İşletmeler Strateji Merkezi · ${directory.length} Aktif Şube`}
        icon={<Swords className="h-4 w-4" />}
        headerRight={
          <span className="rounded-xl border border-[#334155] bg-[#222B38] px-2.5 py-1.5 font-mono-num text-xs font-bold text-[#7A9E7E] whitespace-nowrap">
            Nakit: {formatTL(state.cash, true)}
          </span>
        }
        tabs={managementTabs}
        activeTabId="rivals"
        onSelectTab={(id) => onSelectManagementTab(id as ManagementTabId)}
        subHeader={
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                  filter === f.id
                    ? 'bg-[#C8AE7D] text-[#181F29]'
                    : 'border border-[#334155] bg-[#1D2532] text-slate-200 hover:bg-[#2A3444]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1255]"
      >
        {/* Active Competitive Blitz Banner */}
        {activeBlitzes.length > 0 && (
          <section className="rounded-xl border border-[#B86B5E]/45 bg-[#B86B5E]/15 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#B86B5E]">
              <Flame className="h-4 w-4 shrink-0" />
              <span>Aktif Rekabetçi Kampanya Hamleleri ({activeBlitzes.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeBlitzes.map((bl) => (
                <span
                  key={bl.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#B86B5E]/45 bg-[#B86B5E]/15 px-2.5 py-1 text-xs font-semibold text-[#B86B5E]"
                >
                  <span>
                    {bl.cityName} · {bl.targetOwnerName} karşıtı (+%
                    {Math.round(bl.revenueBoost * 100)} ciro ·{' '}
                    {formatRemainingGameHours(bl.endsAtGameMin, state.gameMinutes ?? 540)})
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#334155] bg-[#222B38] p-8 text-center text-xs text-slate-400">
            Bu filtrede aktif rakip işletme bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            {filtered.map((item) => {
              const { record } = item;
              const bp = getBlueprintById(record.business_type);
              const canAffordTakeover = state.cash >= item.takeoverPrice;
              const hasBranchInSameCity = state.businesses.some(
                (b) => b.cityPlate === record.city_plate
              );
              const isBlitzActiveOnRival = activeBlitzes.some(
                (bl) => bl.targetRivalId === record.id
              );
              const canBlitz =
                hasBranchInSameCity && !isBlitzActiveOnRival && state.cash >= item.blitzCost;

              return (
                <div
                  key={record.id}
                  data-testid={`rival-card-${record.id}`}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#334155] bg-[#222B38] p-3"
                >
                  <div className="space-y-2.5">
                    {/* Header: Vector Logo + Holding & Branch Info */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <BrandLogo brandKey={parseOwnerAndHolding(record.owner_name).holdingName} size={42} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-white">
                              {record.business_name}
                            </span>
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                                item.isAiHolding
                                  ? 'border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0]'
                                  : 'border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0]'
                              }`}
                            >
                              {item.isAiHolding ? 'AI Holding' : 'Canlı Oyuncu'}
                            </span>
                          </div>
                          <div className="truncate text-xs font-semibold text-[#C8AE7D]">
                            {(() => {
                              const parsed = parseOwnerAndHolding(record.owner_name);
                              return item.isAiHolding
                                ? record.owner_name
                                : `${parsed.playerName} · ${parsed.holdingName}`;
                            })()}
                          </div>
                          <div className="truncate text-xs text-slate-400">
                            {String(record.city_plate).padStart(2, '0')} {record.city_name} ·{' '}
                            {record.district} · {bp?.shortName ?? record.business_type} · Sv.
                            {record.level}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                          item.isDistressed
                            ? 'bg-[#7A9E7E]/15 text-[#7A9E7E]'
                            : 'bg-[#1D2532] text-slate-300'
                        }`}
                      >
                        {item.isDistressed ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        <span>%{Math.round(item.takeoverMultiplier * 100)}</span>
                      </span>
                    </div>

                    {/* Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#334155] bg-black/70 p-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Şube Değeri</div>
                        <div className="font-mono-num font-bold text-white">
                          {formatTL(record.valuation, true)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Holding Değeri</div>
                        <div className="font-mono-num font-bold text-[#C8AE7D]">
                          {formatTL(item.holdingTotalValuation, true)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Pazar Payı</div>
                        <div className="flex items-center gap-1 font-mono-num font-bold text-[#7E96B0]">
                          <TrendingUp className="h-3 w-3" />%{item.sectorMarketSharePct}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-300">
                      Durum:{' '}
                      <span
                        className={item.isDistressed ? 'text-[#7A9E7E]' : 'text-slate-200'}
                      >
                        {item.distressLabel}
                      </span>{' '}
                      · Tahmini Ciro:{' '}
                      <span className="font-mono-num text-[#7A9E7E]">
                        {formatTL(record.hourly_income, true)}/sa
                      </span>
                    </div>
                  </div>

                  {/* 4 Strategy Actions */}
                  <div className="space-y-2 border-t border-[#334155] pt-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid={`rival-focus-btn-${record.id}`}
                        onClick={() => onFocusRivalOnMap(record)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#334155] bg-[#1D2532] px-2.5 text-xs font-bold text-[#C8AE7D] hover:bg-[#2A3444] whitespace-nowrap"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>Haritada Gör</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`rival-takeover-btn-${record.id}`}
                        disabled={!canAffordTakeover}
                        onClick={() => onTakeoverRival(record, item.takeoverMultiplier)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#C8AE7D] px-2.5 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500 whitespace-nowrap"
                      >
                        <Handshake className="h-3.5 w-3.5 shrink-0" />
                        <span>Devral ({formatTL(item.takeoverPrice, true)})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        data-testid={`rival-blitz-btn-${record.id}`}
                        disabled={!canBlitz}
                        onClick={() => onLaunchBlitz(record)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#B86B5E]/45 bg-[#B86B5E]/15 px-2.5 text-xs font-bold text-[#B86B5E] hover:bg-[#B86B5E]/15 disabled:cursor-not-allowed disabled:border-[#334155] disabled:bg-[#222B38] disabled:text-slate-500 whitespace-nowrap"
                      >
                        <Flame className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {isBlitzActiveOnRival
                            ? 'Kampanya Aktif (+%25)'
                            : !hasBranchInSameCity
                            ? `${record.city_name}'de Şube Gerekir`
                            : `Rekabet Hamlesi (${formatTL(item.blitzCost, true)})`}
                        </span>
                      </button>

                      {item.linkedFranchise && (
                        <button
                          type="button"
                          data-testid={`rival-franchise-btn-${record.id}`}
                          onClick={() => onTakeRivalFranchise(item.linkedFranchise!)}
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2.5 text-xs font-bold text-[#7A9E7E] hover:bg-[#7A9E7E]/15 whitespace-nowrap"
                        >
                          <Store className="h-3.5 w-3.5 shrink-0" />
                          <span>Franchise Al (+%35)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
