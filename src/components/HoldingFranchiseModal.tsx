import { useState } from 'react';
import {
  X,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Holding ve Marka Merkezi"
      data-testid="holding-franchise-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/60 p-2.5 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[600px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Holding, Franchise & Sanayi Ağı</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bayilik Ver · Zincir Market Kur · Fabrika & Otopark Sinerjilerini Yönet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenHrCenter}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 whitespace-nowrap"
            >
              <Users className="h-3.5 w-3.5" />
              <span>İl İK & Genel Müdür</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Holding Penceresini Kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Synergy Summary Bar */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-orange-600" />
            <div>
              <div className="text-[10px] text-slate-500">Fabrika Ağı</div>
              <div className="font-bold">
                {factoryCount > 0 ? `${factoryCount} Tesis · %35 Tedarik İndirimi` : 'Henüz Fabrika Yok'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <div>
              <div className="text-[10px] text-slate-500">Otopark Sinerjisi</div>
              <div className="font-bold">
                {parkingCount > 0 ? `${parkingCount} Otopark (250m +%15)` : 'Otopark Yok'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            <div>
              <div className="text-[10px] text-slate-500">Toplam Telif Geliri</div>
              <div className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                {formatTL(state.franchiseRoyaltiesEarned ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          {[
            { id: 'franchise' as const, label: 'Markanı Franchise Aç' },
            { id: 'chain' as const, label: `Zincir Market (${smCount}/${SUPERMARKET_CHAIN_MIN_COUNT})` },
            { id: 'market' as const, label: `81 İl Franchise Pazarı (${allFranchises.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                tab === t.id
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="panel-scroll flex-1 p-4">
          {tab === 'franchise' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <form
                onSubmit={handlePublishFranchise}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Yeni Franchise Markası Yayınla (Supabase)
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Diğer oyuncular markanızdan şube açtığında isim hakkı anında kasanıza geçer ve
                  saatlik ciro payı (%10–%25) sürekli hesabınıza akar.
                </p>

                {!elig.eligible ? (
                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {elig.reason}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold">Marka Adı</label>
                      <input
                        type="text"
                        maxLength={38}
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Örn: İmparator Kahve Evi"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold">Yetkili Sektör (Sv.3+)</label>
                      <select
                        value={selectedSector}
                        onChange={(e) => setSector(e.target.value as BusinessTypeId)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        {elig.eligibleSectors.map((id) => (
                          <option key={id} value={id}>
                            {getBlueprintById(id)?.name ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold">
                          İsim Hakkı Bedeli (₺)
                        </label>
                        <input
                          type="number"
                          min={10000}
                          max={2500000}
                          step={5000}
                          value={licenseFee}
                          onChange={(e) => setLicenseFee(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-num text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold">
                          Saatlik Ciro Payı (%{royaltyPct})
                        </label>
                        <input
                          type="range"
                          min={10}
                          max={25}
                          value={royaltyPct}
                          onChange={(e) => setRoyaltyPct(Number(e.target.value))}
                          className="mt-2.5 w-full accent-amber-600"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={brandName.trim().length < 3}
                      className="w-full rounded-xl bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Franchise Markasını Yayına Al
                    </button>
                  </div>
                )}
              </form>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Kendi Franchise Markalarınız ({(state.ownFranchises ?? []).length})
                </h3>
                {(state.ownFranchises ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700">
                    Henüz yayınladığınız bir franchise markası yok.
                  </div>
                ) : (
                  (state.ownFranchises ?? []).map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{f.brandName}</span>
                        <span className="font-mono-num text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {f.branchCount} Bayi Şube
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {getBlueprintById(f.businessType)?.name} · Lisans:{' '}
                          {formatTL(f.licenseFee)}
                        </span>
                        <span className="font-mono-num font-bold text-amber-700 dark:text-amber-400">
                          %{Math.round(f.royaltyRate * 100)} Royalty
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'chain' && (
            <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-5 w-5 text-emerald-600" />
                <span>Zincir Market Ağı</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                3 veya daha fazla Süpermarket kuran yatırımcılar bunları tek bir Zincir Market
                Markası altında birleştirerek toplu tedarik indirimi (%20) ve doğrudan Franchise
                yetkisi kazanır.
              </p>

              {state.supermarketChain ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <div>Aktif Zincir Markanız: {state.supermarketChain.name}</div>
                    <div className="text-[11px] font-normal">
                      Tüm süpermarket şubelerinizde %20 toplu tedarik indirimi uygulanıyor.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  <div className="text-xs font-semibold">
                    Süpermarket Sayınız:{' '}
                    <span className="font-mono-num text-amber-700 dark:text-amber-400">
                      {smCount} / {SUPERMARKET_CHAIN_MIN_COUNT}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={chainName}
                    onChange={(e) => setChainName(e.target.value)}
                    disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT}
                    placeholder="Örn: Anadolu Ekspres Marketler"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT || chainName.trim().length < 3}
                    onClick={() => {
                      onFormSupermarketChain(chainName.trim());
                      setChainName('');
                    }}
                    className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Zincir Market Markasını Kur (%20 Tedarik İndirimi)
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'market' && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {allFranchises.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {f.brandName}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {f.ownerName} · {getBlueprintById(f.businessType)?.name}
                      </div>
                    </div>
                    <span className="flex items-center gap-0.5 rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <Sparkles className="h-3 w-3" /> +%35 Ciro
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                    <span className="font-mono-num">Lisans: {formatTL(f.licenseFee)}</span>
                    <span className="font-mono-num font-bold text-amber-700 dark:text-amber-400">
                      Pay: %{Math.round(f.royaltyRate * 100)}
                    </span>
                    <span className="font-mono-num text-slate-500">{f.branchCount} şube</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
