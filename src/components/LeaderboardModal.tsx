import { useState } from 'react';
import { Trophy, Crown, MapPin, Store, Landmark } from 'lucide-react';
import type {
  BankRecord,
  EmpireState,
  FranchiseBrand,
  ProvinceInfo,
  RemoteBusinessRecord,
  UserProfile,
} from '../types/game';
import { formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';

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
      name: state.playerIpo
        ? `${state.playerIpo.holdingName} [${state.playerIpo.ticker}]`
        : ownName,
      cities: ownCities,
      businesses: state.businesses.length,
      netWorth,
      isSelf: true,
    },
  ].sort((a, b) => b.netWorth - a.netWorth);

  const cityTotals = new Map<
    string,
    { name: string; branches: number; value: number; isSelf: boolean }
  >();
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

  const tabs: MobileModalTab[] = [
    { id: 'holdings', label: 'Holdingler', icon: <Crown className="h-4 w-4" /> },
    { id: 'city', label: `İl Liderleri (${activeProvince.name})`, icon: <MapPin className="h-4 w-4" /> },
    { id: 'franchises', label: 'Franchise Markaları', icon: <Store className="h-4 w-4" /> },
    { id: 'banks', label: 'Bankalar', icon: <Landmark className="h-4 w-4" /> },
  ];

  return (
    <div data-testid="leaderboard-modal">
      <MobileGameModal
        title="Liderlik Tablosu"
        subtitle={`${activeProvince.code} ${activeProvince.name} · Türkiye Sıralaması`}
        icon={<Trophy className="h-4 w-4" />}
        tabs={tabs}
        activeTabId={tab}
        onSelectTab={(id) => setTab(id as 'holdings' | 'city' | 'franchises' | 'banks')}
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {tab === 'holdings' && (
          <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
            {holdingRows.map((row, idx) => (
              <div
                key={row.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  row.isSelf
                    ? 'border-amber-400 bg-amber-400/12'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono-num text-xs font-black text-amber-300">
                    #{idx + 1}
                  </span>
                  <BrandLogo brandKey={row.name} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {row.name} {row.isSelf && <span className="text-amber-300">(Siz)</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {row.businesses} şube · {row.cities} il
                    </div>
                  </div>
                </div>
                <span className="shrink-0 font-mono-num text-sm font-black text-emerald-400">
                  {formatTL(row.netWorth, true)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'city' &&
          (cityLeaders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-400">
              {activeProvince.code} {activeProvince.name} odasında henüz kayıtlı şube yok. İlk
              işletmeyi kurarak il lideri olun!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
              {cityLeaders.map((row, idx) => (
                <div
                  key={`${row.name}-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                    row.isSelf
                      ? 'border-amber-400 bg-amber-400/12'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono-num text-xs font-black text-amber-300">
                      #{idx + 1}
                    </span>
                    <BrandLogo brandKey={row.name} size={38} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        {row.name} {row.isSelf && <span className="text-amber-300">(Siz)</span>}
                      </div>
                      <div className="text-xs text-slate-400">
                        {activeProvince.name} içinde {row.branches} şube
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono-num text-sm font-black text-emerald-400">
                    {formatTL(row.value, true)}
                  </span>
                </div>
              ))}
            </div>
          ))}

        {tab === 'franchises' && (
          <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
            {sortedFranchises.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono-num text-xs font-black text-amber-300">
                    #{idx + 1}
                  </span>
                  <BrandLogo brandKey={f.id || f.brandName} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{f.brandName}</div>
                    <div className="truncate text-xs text-slate-400">
                      {f.ownerName} · %{Math.round(f.royaltyRate * 100)} telif
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono-num">
                  <div className="text-xs font-bold text-amber-300">{f.branchCount} Bayi</div>
                  <div className="text-xs text-emerald-400">
                    {formatTL(f.totalRoyaltyEarned, true)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'banks' && (
          <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
            {sortedBanks.map((b, idx) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono-num text-xs font-black text-amber-300">
                    #{idx + 1}
                  </span>
                  <BrandLogo brandKey={b.id || b.bankName} customColor={b.brandColor} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{b.bankName}</div>
                    <div className="truncate text-xs text-slate-400">
                      {b.hqCityName} · Faiz %{Math.round(b.baseInterestRate * 100)} · Min{' '}
                      {b.minCreditScore}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono-num">
                  <div className="text-sm font-black text-emerald-400">
                    {formatTL(b.poolCapital, true)}
                  </div>
                  <div className="text-[11px] text-slate-400">Havuz</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
