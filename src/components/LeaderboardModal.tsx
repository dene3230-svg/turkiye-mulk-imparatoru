import { useState } from 'react';
import { X, Trophy, Crown, MapPin, Store, Landmark } from 'lucide-react';
import type {
  BankRecord,
  EmpireState,
  FranchiseBrand,
  ProvinceInfo,
  RemoteBusinessRecord,
  UserProfile,
} from '../types/game';
import { formatTL } from '../game/economy';

interface LeaderboardModalProps {
  open: boolean;
  user: UserProfile | null;
  state: EmpireState;
  netWorth: number;
  activeProvince: ProvinceInfo;
  roomRecords: RemoteBusinessRecord[];
  allFranchises: FranchiseBrand[];
  allBanks: BankRecord[];
  onClose: () => void;
}

const SEED_HOLDINGS = [
  { id: 'seed-h1', name: 'Demirhan Holding A.Ş.', cities: 14, businesses: 26, netWorth: 42_800_000 },
  { id: 'seed-h2', name: 'Anadolu Sanayi Grubu', cities: 9, businesses: 18, netWorth: 28_400_000 },
  { id: 'seed-h3', name: 'Ege Yatırım & Turizm', cities: 7, businesses: 13, netWorth: 16_900_000 },
  { id: 'seed-h4', name: 'Marmara Perakende', cities: 5, businesses: 9, netWorth: 8_250_000 },
  { id: 'seed-h5', name: 'Başkent Gayrimenkul', cities: 4, businesses: 7, netWorth: 4_600_000 },
];

export function LeaderboardModal({
  open,
  user,
  state,
  netWorth,
  activeProvince,
  roomRecords,
  allFranchises,
  allBanks,
  onClose,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<'holdings' | 'city' | 'franchises' | 'banks'>('holdings');

  if (!open) return null;

  const ownName = user?.name ?? 'Siz';
  const ownCities = new Set(state.businesses.map((b) => b.cityPlate)).size;

  const holdingRows = [
    ...SEED_HOLDINGS.map((h) => ({ ...h, isSelf: false })),
    {
      id: user?.id ?? 'self',
      name: state.playerIpo ? `${state.playerIpo.holdingName} [${state.playerIpo.ticker}]` : ownName,
      cities: ownCities,
      businesses: state.businesses.length,
      netWorth,
      isSelf: true,
    },
  ].sort((a, b) => b.netWorth - a.netWorth);

  // Aggregate active province leaders from roomRecords + own branches in activeProvince
  const cityTotals = new Map<string, { name: string; branches: number; value: number; isSelf: boolean }>();
  for (const r of roomRecords) {
    const prev = cityTotals.get(r.owner_id) ?? {
      name: r.owner_name,
      branches: 0,
      value: 0,
      isSelf: r.owner_id === user?.id,
    };
    prev.branches += 1;
    prev.value += r.valuation;
    cityTotals.set(r.owner_id, prev);
  }
  const ownCityBranches = state.businesses.filter((b) => b.cityPlate === activeProvince.plate);
  if (ownCityBranches.length > 0 && !cityTotals.has(user?.id ?? 'self')) {
    cityTotals.set(user?.id ?? 'self', {
      name: ownName,
      branches: ownCityBranches.length,
      value: ownCityBranches.reduce((s, b) => s + b.purchaseCost * b.level, 0),
      isSelf: true,
    });
  }
  const cityLeaders = Array.from(cityTotals.values()).sort((a, b) => b.value - a.value);

  const sortedFranchises = [...allFranchises].sort(
    (a, b) => b.branchCount - a.branchCount || b.totalRoyaltyEarned - a.totalRoyaltyEarned
  );

  const sortedBanks = [...allBanks].sort((a, b) => b.poolCapital - a.poolCapital);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Canlı Liderlik Tablosu"
      data-testid="leaderboard-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="compact-short-pad flex shrink-0 items-center justify-between border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Türkiye Canlı Liderlik Tablosu</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Holdingler · {activeProvince.code} {activeProvince.name} İl Liderleri · Franchise ·
                Bankalar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Liderlik Tablosunu Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4 Exact Tabs */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-3.5 py-1.5 dark:border-slate-800 dark:bg-slate-950/60 sm:px-4 sm:py-2">
          {[
            { id: 'holdings' as const, label: 'En Zengin Holdingler', icon: Crown },
            { id: 'city' as const, label: `İl Liderleri (${activeProvince.name})`, icon: MapPin },
            { id: 'franchises' as const, label: 'En Büyük Franchise Markaları', icon: Store },
            { id: 'banks' as const, label: 'En Değerli Bankalar', icon: Landmark },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="panel-scroll flex-1 min-h-0 space-y-2 overflow-y-auto overscroll-contain p-3 sm:p-3.5">
          {tab === 'holdings' &&
            holdingRows.map((row, idx) => (
              <div
                key={row.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  row.isSelf
                    ? 'border-amber-400 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-950/35'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono-num text-xs font-extrabold text-amber-300">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">
                      {row.name} {row.isSelf && '(Siz)'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {row.businesses} şube · {row.cities} il
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                  {formatTL(row.netWorth, true)}
                </span>
              </div>
            ))}

          {tab === 'city' &&
            (cityLeaders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-700">
                {activeProvince.code} {activeProvince.name} odasında henüz kayıtlı şube yok. İlk
                işletmeyi kurarak il lideri olun!
              </div>
            ) : (
              cityLeaders.map((row, idx) => (
                <div
                  key={`${row.name}-${idx}`}
                  className={`flex items-center justify-between rounded-xl border p-3 ${
                    row.isSelf
                      ? 'border-amber-400 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-950/35'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 font-mono-num text-xs font-extrabold text-amber-300">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold">
                        {row.name} {row.isSelf && '(Siz)'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {activeProvince.name} içinde {row.branches} şube
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatTL(row.value, true)}
                  </span>
                </div>
              ))
            ))}

          {tab === 'franchises' &&
            sortedFranchises.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono-num text-xs font-extrabold text-amber-300">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{f.brandName}</div>
                    <div className="text-[10px] text-slate-500">
                      {f.ownerName} · %{Math.round(f.royaltyRate * 100)} telif payı
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono-num">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {f.branchCount} Bayi
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    {formatTL(f.totalRoyaltyEarned, true)}
                  </div>
                </div>
              </div>
            ))}

          {tab === 'banks' &&
            sortedBanks.map((b, idx) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono-num text-xs font-extrabold text-amber-300">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">
                      {b.emblem} {b.bankName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {b.hqCityName} · Baz Faiz %{Math.round(b.baseInterestRate * 100)} · Min Puan{' '}
                      {b.minCreditScore}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono-num">
                  <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatTL(b.poolCapital, true)}
                  </div>
                  <div className="text-[10px] text-slate-500">Kredi Havuzu</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
