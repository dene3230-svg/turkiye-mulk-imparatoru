import { useState } from 'react';
import {
  Crown,
  Store,
  Award,
  CheckCircle2,
  Factory,
  Car,
  Users,
  Sparkles,
} from 'lucide-react';
import type { BusinessTypeId, EmpireState, FranchiseBrand } from '../types/game';
import {
  FACTORY_TYPES,
  PARKING_TYPES,
  SUPERMARKET_CHAIN_MIN_COUNT,
  getBlueprintById,
} from '../game/catalog';
import {
  checkFranchiseCreationEligibility,
  countSupermarkets,
} from '../game/holdingEngine';
import { formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';

interface HoldingFranchiseModalProps {
  open: boolean;
  state: EmpireState;
  allFranchises: FranchiseBrand[];
  onFormSupermarketChain: (chainName: string) => void;
  onCreateFranchise: (params: {
    brandName: string;
    businessType: BusinessTypeId;
    licenseFee: number;
    royaltyRate: number;
  }) => void;
  onOpenHrCenter: () => void;
  onClose: () => void;
}

export function HoldingFranchiseModal({
  open,
  state,
  allFranchises,
  onFormSupermarketChain,
  onCreateFranchise,
  onOpenHrCenter,
  onClose,
}: HoldingFranchiseModalProps) {
  const [tab, setTab] = useState<'franchise' | 'chain' | 'market'>('franchise');
  const [brandName, setBrandName] = useState('');
  const [sector, setSector] = useState<BusinessTypeId>('kafe');
  const [licenseFee, setLicenseFee] = useState(50_000);
  const [royaltyPct, setRoyaltyPct] = useState(15);
  const [chainName, setChainName] = useState('');

  if (!open) return null;

  const smCount = countSupermarkets(state.businesses);
  const factoryCount = state.businesses.filter((b) => FACTORY_TYPES.includes(b.blueprintId)).length;
  const parkingCount = state.businesses.filter((b) => PARKING_TYPES.includes(b.blueprintId)).length;
  const elig = checkFranchiseCreationEligibility(state);
  const selectedSector = elig.eligibleSectors.includes(sector)
    ? sector
    : elig.eligibleSectors[0] ?? 'kafe';

  const handlePublishFranchise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!elig.eligible || brandName.trim().length < 3) return;
    onCreateFranchise({
      brandName: brandName.trim(),
      businessType: selectedSector,
      licenseFee,
      royaltyRate: royaltyPct / 100,
    });
    setBrandName('');
  };

  const tabs: MobileModalTab[] = [
    { id: 'franchise', label: 'Markanı Franchise Aç', icon: <Crown className="h-4 w-4" /> },
    {
      id: 'chain',
      label: `Zincir Market (${smCount}/${SUPERMARKET_CHAIN_MIN_COUNT})`,
      icon: <Store className="h-4 w-4" />,
    },
    {
      id: 'market',
      label: `Franchise Pazarı`,
      badge: allFranchises.length,
      icon: <Award className="h-4 w-4" />,
    },
  ];

  return (
    <div data-testid="holding-franchise-modal">
      <MobileGameModal
        title="Holding & Franchise"
        subtitle="Marka, Zincir & Sanayi Ağı"
        icon={<Crown className="h-4 w-4" />}
        headerRight={
          <button
            type="button"
            onClick={onOpenHrCenter}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-3 text-xs font-bold text-slate-950 hover:bg-sky-400 whitespace-nowrap"
          >
            <Users className="h-3.5 w-3.5" />
            <span>İl İK & Yöneticiler</span>
          </button>
        }
        tabs={tabs}
        activeTabId={tab}
        onSelectTab={(id) => setTab(id as 'franchise' | 'chain' | 'market')}
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {/* Synergy Summary */}
        <section className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <Factory className="h-5 w-5 shrink-0 text-orange-400" />
            <div className="min-w-0 text-xs">
              <div className="text-slate-400">Fabrika & Otopark Sinerjisi</div>
              <div className="font-bold text-white">
                {factoryCount > 0 ? `${factoryCount} Fabrika (%35 İndirim)` : 'Fabrika Yok'} ·{' '}
                {parkingCount > 0 ? `${parkingCount} Otopark (+%15)` : 'Otopark Yok'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <Award className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0 text-xs">
              <div className="text-slate-400">Toplam Franchise Telif Geliri</div>
              <div className="font-mono-num text-sm font-black text-emerald-400">
                {formatTL(state.franchiseRoyaltiesEarned ?? 0)}
              </div>
            </div>
          </div>
        </section>

        {tab === 'franchise' && (
          <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
            <form
              onSubmit={handlePublishFranchise}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3"
            >
              <h3 className="text-sm font-bold text-white">Yeni Franchise Markası Yayınla</h3>
              <p className="text-xs text-slate-300">
                Diğer oyuncular markanızdan şube açtığında isim hakkı anında kasanıza geçer ve
                saatlik ciro payı (%10–%25) sürekli hesabınıza akar.
              </p>

              {!elig.eligible ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">
                  {elig.reason}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">Marka Adı</label>
                    <input
                      type="text"
                      maxLength={38}
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Örn: İmparator Kahve Evi"
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">
                      Yetkili Sektör (Sv.3+)
                    </label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSector(e.target.value as BusinessTypeId)}
                      className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-white"
                    >
                      {elig.eligibleSectors.map((id) => (
                        <option key={id} value={id}>
                          {getBlueprintById(id)?.name ?? id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300">
                        İsim Hakkı Bedeli (₺)
                      </label>
                      <input
                        type="number"
                        min={10000}
                        max={2500000}
                        step={5000}
                        value={licenseFee}
                        onChange={(e) => setLicenseFee(Number(e.target.value))}
                        className="mt-1 min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono-num text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300">
                        Saatlik Ciro Payı (%{royaltyPct})
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={25}
                        value={royaltyPct}
                        onChange={(e) => setRoyaltyPct(Number(e.target.value))}
                        className="mt-3 w-full accent-amber-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={brandName.trim().length < 3}
                    className="min-h-[44px] w-full rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    Franchise Markasını Yayına Al
                  </button>
                </div>
              )}
            </form>

            <section className="space-y-2.5">
              <h3 className="text-sm font-bold text-white">
                Kendi Franchise Markalarınız ({(state.ownFranchises ?? []).length})
              </h3>
              {(state.ownFranchises ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
                  Henüz yayınladığınız bir franchise markası yok.
                </div>
              ) : (
                (state.ownFranchises ?? []).map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-950/20 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BrandLogo brandKey={f.brandName} size={38} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{f.brandName}</div>
                        <div className="text-xs text-slate-300">
                          {getBlueprintById(f.businessType)?.name} · Lisans:{' '}
                          {formatTL(f.licenseFee)}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono-num">
                      <div className="text-xs font-bold text-emerald-400">
                        {f.branchCount} Bayi
                      </div>
                      <div className="text-xs font-bold text-amber-300">
                        %{Math.round(f.royaltyRate * 100)} Pay
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {tab === 'chain' && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Store className="h-5 w-5 text-emerald-400" />
              <span>Zincir Market Ağı</span>
            </div>
            <p className="text-xs text-slate-300">
              3 veya daha fazla Süpermarket kuran yatırımcılar bunları tek bir Zincir Market
              Markası altında birleştirerek toplu tedarik indirimi (%20) ve doğrudan Franchise
              yetkisi kazanır.
            </p>

            {state.supermarketChain ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-sm font-bold text-white">
                    Aktif Zincir Markanız: {state.supermarketChain.name}
                  </div>
                  <div>Tüm süpermarket şubelerinizde %20 toplu tedarik indirimi uygulanıyor.</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200">
                  Süpermarket Sayınız:{' '}
                  <span className="font-mono-num text-amber-300">
                    {smCount} / {SUPERMARKET_CHAIN_MIN_COUNT}
                  </span>
                </div>
                <input
                  type="text"
                  value={chainName}
                  onChange={(e) => setChainName(e.target.value)}
                  disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT}
                  placeholder="Örn: Anadolu Ekspres Marketler"
                  className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT || chainName.trim().length < 3}
                  onClick={() => {
                    onFormSupermarketChain(chainName.trim());
                    setChainName('');
                  }}
                  className="min-h-[44px] w-full rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  Zincir Market Markasını Kur (%20 Tedarik İndirimi)
                </button>
              </div>
            )}
          </section>
        )}

        {tab === 'market' && (
          <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
            {allFranchises.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <BrandLogo brandKey={f.id || f.brandName} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{f.brandName}</div>
                      <div className="truncate text-xs text-slate-400">
                        {f.ownerName} · {getBlueprintById(f.businessType)?.name}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" /> +%35 Ciro
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-2 font-mono-num text-xs text-slate-300">
                  <span>Lisans: {formatTL(f.licenseFee)}</span>
                  <span className="font-bold text-amber-300">
                    Pay: %{Math.round(f.royaltyRate * 100)}
                  </span>
                  <span className="text-slate-400">{f.branchCount} şube</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
