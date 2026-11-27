import { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Coffee,
  Monitor,
  Gamepad2,
  Sparkles,
  Utensils,
  ShoppingCart,
  Hotel,
  Building2,
  Car,
  Factory,
  Check,
  AlertTriangle,
  Waves,
  Lock,
  Loader2,
  ShieldCheck,
  Ruler,
  Store,
  Link2,
} from 'lucide-react';
import type {
  BusinessBlueprint,
  BusinessTypeId,
  ChainCloneDraft,
  FranchiseBrand,
  PinLocationInfo,
} from '../types/game';
import { BUSINESS_BLUEPRINTS, MIN_BUSINESS_DISTANCE_METERS } from '../game/catalog';
import {
  calculateEstablishmentCost,
  formatTL,
  getAffinityMultiplier,
  type DistanceCheckResult,
} from '../game/economy';
import { suggestBusinessName } from '../game/provinces81';

interface PinDropPanelProps {
  location: PinLocationInfo;
  cash: number;
  companyLevel: number;
  ownBranchCount: number;
  maxBranches: number;
  distanceCheck: DistanceCheckResult;
  availableFranchises: FranchiseBrand[];
  chainCloneDraft?: ChainCloneDraft | null;
  preselectedFranchise?: FranchiseBrand | null;
  onCancelSpecialMode?: () => void;
  onEstablish: (
    blueprintId: BusinessTypeId,
    customName: string,
    franchiseBrand?: FranchiseBrand | null,
    chainCloneMeta?: {
      chainBrandName: string;
      chainBranchNumber: number;
      sourceBusinessId?: string;
    } | null
  ) => void;
  onClose: () => void;
}

function BlueprintIcon({ iconKey }: { iconKey: BusinessBlueprint['iconKey'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  switch (iconKey) {
    case 'coffee':
      return <Coffee className={cls} />;
    case 'monitor':
      return <Monitor className={cls} />;
    case 'gamepad':
      return <Gamepad2 className={cls} />;
    case 'sparkles':
      return <Sparkles className={cls} />;
    case 'utensils':
      return <Utensils className={cls} />;
    case 'shopping-cart':
      return <ShoppingCart className={cls} />;
    case 'hotel':
      return <Hotel className={cls} />;
    case 'car':
      return <Car className={cls} />;
    case 'factory':
      return <Factory className={cls} />;
    default:
      return <Building2 className={cls} />;
  }
}

export function PinDropPanel({
  location,
  cash,
  companyLevel,
  ownBranchCount,
  maxBranches,
  distanceCheck,
  availableFranchises,
  chainCloneDraft,
  preselectedFranchise,
  onCancelSpecialMode,
  onEstablish,
  onClose,
}: PinDropPanelProps) {
  const [mode, setMode] = useState<'independent' | 'franchise'>(() =>
    preselectedFranchise && !chainCloneDraft ? 'franchise' : 'independent'
  );
  const [selectedId, setSelectedId] = useState<BusinessTypeId>(
    () => chainCloneDraft?.businessType ?? 'kafe'
  );
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>(
    () => preselectedFranchise?.id ?? availableFranchises[0]?.id ?? ''
  );
  const [customName, setCustomName] = useState<string>(() =>
    chainCloneDraft
      ? chainCloneDraft.suggestedName
      : suggestBusinessName(location.districtName, BUSINESS_BLUEPRINTS[0].shortName)
  );
  const [nameEdited, setNameEdited] = useState(Boolean(chainCloneDraft));

  useEffect(() => {
    if (chainCloneDraft) {
      setMode('independent');
      setSelectedId(chainCloneDraft.businessType);
      setCustomName(chainCloneDraft.suggestedName);
      setNameEdited(true);
    } else if (preselectedFranchise) {
      setMode('franchise');
      setSelectedFranchiseId(preselectedFranchise.id);
      setNameEdited(false);
    }
  }, [chainCloneDraft, preselectedFranchise]);

  const selectedFranchise =
    mode === 'franchise' && !chainCloneDraft
      ? availableFranchises.find((f) => f.id === selectedFranchiseId) ??
        preselectedFranchise ??
        availableFranchises[0] ??
        null
      : null;

  const effectiveTypeId = chainCloneDraft
    ? chainCloneDraft.businessType
    : selectedFranchise
    ? selectedFranchise.businessType
    : selectedId;
  const selectedBlueprint =
    BUSINESS_BLUEPRINTS.find((b) => b.id === effectiveTypeId) ?? BUSINESS_BLUEPRINTS[0];

  useEffect(() => {
    if (!nameEdited && !chainCloneDraft) {
      if (selectedFranchise) {
        setCustomName(`${selectedFranchise.brandName} · ${location.districtName}`.slice(0, 42));
      } else {
        setCustomName(suggestBusinessName(location.districtName, selectedBlueprint.shortName));
      }
    }
  }, [location.districtName, selectedBlueprint.shortName, selectedFranchise, nameEdited, chainCloneDraft]);

  const baseCost = calculateEstablishmentCost(selectedBlueprint, location);
  const totalCost = baseCost + (selectedFranchise?.licenseFee ?? 0);
  const affinity = getAffinityMultiplier(selectedBlueprint, location);
  const franchiseBonus = selectedFranchise ? 1.35 * (1 - selectedFranchise.royaltyRate) : 1.0;
  const estHourly =
    Math.round((selectedBlueprint.baseHourlyIncome * affinity * franchiseBonus) / 50) * 50;

  const isChecking = location.landStatus === 'checking';
  const isWaterOrInvalid =
    !location.isWithinTurkey ||
    location.landStatus === 'water' ||
    location.landStatus === 'invalid';
  const isTooClose = !distanceCheck.allowed;
  const isQuotaFull = false;
  const isLevelLocked =
    !selectedFranchise && !chainCloneDraft && companyLevel < selectedBlueprint.minCompanyLevel;
  const canAfford = cash >= totalCost;

  const canSubmit =
    !isChecking &&
    !isWaterOrInvalid &&
    !isTooClose &&
    !isQuotaFull &&
    !isLevelLocked &&
    canAfford &&
    Boolean(customName.trim()) &&
    (mode === 'independent' || Boolean(selectedFranchise));

  const handleSelectBlueprint = (bp: BusinessBlueprint) => {
    if (chainCloneDraft) return;
    setSelectedId(bp.id);
    if (!nameEdited) {
      setCustomName(suggestBusinessName(location.districtName, bp.shortName));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onEstablish(
      selectedBlueprint.id,
      customName.trim(),
      selectedFranchise,
      chainCloneDraft
        ? {
            chainBrandName: chainCloneDraft.brandName,
            chainBranchNumber: chainCloneDraft.nextBranchNumber,
            sourceBusinessId: chainCloneDraft.sourceBusinessId,
          }
        : null
    );
  };

  return (
    <aside
      aria-label="Pin Noktasında İşletme Kur"
      data-testid="pin-drop-panel"
      className="pointer-events-auto flex h-full max-h-full w-[clamp(300px,42vw,440px)] flex-col overflow-hidden rounded-[20px] border border-slate-200/95 bg-white/98 text-slate-900 border-[#334155] bg-[#222B38] dark:text-slate-100"
    >
      {/* Fixed Header (shrink-0) */}
      <div className="compact-short-pad flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 border-[#334155]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-[#C8AE7D]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {location.cityCode} {location.cityName} · {location.districtName}
            </span>
          </div>
          <p className="truncate text-[10px] text-slate-400 [@media(max-height:420px)]:hidden">
            {location.resolvedAddress ||
              `${location.regionName} · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Pin Panelini Kapat"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#1D2532] dark:hover:text-white sm:h-8 sm:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fixed Land Verification + Quota Banner (shrink-0) */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-3 py-1.5 border-[#334155] bg-black/70">
        {isChecking ? (
          <div
            data-testid="land-checking"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-[#C8AE7D]"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>Kara ve adres doğrulaması yapılıyor...</span>
          </div>
        ) : isWaterOrInvalid ? (
          <div
            role="alert"
            data-testid="water-block-alert"
            className="flex items-start gap-2 rounded-xl border border-[#B86B5E]/45 bg-red-50 p-2 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-[#B86B5E]"
          >
            <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {location.landMessage ||
                'Deniz, boğaz veya göl üzerine inşaat yasaktır! Lütfen kara üzerinde bir nokta seçin.'}
            </span>
          </div>
        ) : isTooClose ? (
          <div
            role="alert"
            data-testid="distance-block-alert"
            className="flex items-start gap-2 rounded-xl border border-[#B86B5E]/45 bg-red-50 p-2 text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-[#B86B5E]"
          >
            <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              "{distanceCheck.nearestName}" işletmesine {distanceCheck.nearestMeters}m mesafede! En
              az {MIN_BUSINESS_DISTANCE_METERS}m kuralı geçerlidir.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 text-[10.5px]">
            <span className="flex min-w-0 items-center gap-1 truncate font-semibold text-emerald-700 dark:text-[#7A9E7E]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Kara Doğrulandı · Arsa x{location.landMultiplier.toFixed(2)}
              </span>
            </span>
            <span className="shrink-0 font-mono-num font-bold whitespace-nowrap text-slate-300">
              {ownBranchCount} Aktif Şube
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      {isWaterOrInvalid ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4 text-center">
          <AlertTriangle className="h-9 w-9 text-[#B86B5E]" />
          <h3 className="mt-2 text-sm font-bold text-slate-100">
            İnşaat İzni Reddedildi
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Su kütleleri (deniz, boğaz, göl, nehir) ve Türkiye dışı koordinatlar üzerine pin
            bırakılamaz. Lütfen haritada cadde veya yerleşim alanı üzerine tıklayın.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {chainCloneDraft ? (
            <div
              data-testid="chain-clone-banner"
              className="flex shrink-0 items-center justify-between gap-2 border-b border-[#334155] bg-sky-50 px-3 py-2 text-[11px] dark:border-sky-800/70 dark:bg-sky-950/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1 font-bold text-sky-800 dark:text-[#7E96B0]">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    Zincir Şube: {chainCloneDraft.brandName} ({chainCloneDraft.nextBranchNumber}. Şube)
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Otomatik Zincir Marka · -%12 Tedarik İndirimi & +%10 Ciro
                </div>
              </div>
              {onCancelSpecialMode && (
                <button
                  type="button"
                  onClick={onCancelSpecialMode}
                  className="shrink-0 rounded-lg border border-[#334155] px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 dark:text-[#7E96B0] dark:hover:bg-sky-900"
                >
                  Normal Mod
                </button>
              )}
            </div>
          ) : (
            /* Fixed Mode Tabs (shrink-0) */
            <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50/70 px-2 py-1.5 border-[#334155] bg-[#181F29]">
              <button
                type="button"
                onClick={() => setMode('independent')}
                className={`rounded-lg py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
                  mode === 'independent'
                    ? 'bg-[#C8AE7D] text-[#181F29] '
                    : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-[#1D2532]'
                }`}
              >
                Bağımsız İşletme (13)
              </button>
              <button
                type="button"
                data-testid="pin-mode-franchise"
                onClick={() => setMode('franchise')}
                className={`flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-bold transition-colors whitespace-nowrap ${
                  mode === 'franchise'
                    ? 'bg-[#7A9E7E] text-[#181F29] '
                    : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-[#1D2532]'
                }`}
              >
                <Store className="h-3.5 w-3.5 shrink-0" />
                <span>Franchise (+%35)</span>
              </button>
            </div>
          )}

          {/* Scrollable 2-Column Sector / Franchise Grid (flex-1 min-h-0 overflow-y-auto overscroll-contain) */}
          <div
            data-testid="pin-sector-list"
            className="panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
          >
            {mode === 'independent' ? (
              <div className="grid grid-cols-2 gap-1.5">
                {BUSINESS_BLUEPRINTS.map((bp) => {
                  const bpCost = calculateEstablishmentCost(bp, location);
                  const bpAff = getAffinityMultiplier(bp, location);
                  const bpHourly = Math.round((bp.baseHourlyIncome * bpAff) / 50) * 50;
                  const locked = companyLevel < bp.minCompanyLevel;
                  const affordable = cash >= bpCost;
                  const isSelected = bp.id === selectedId;

                  return (
                    <button
                      key={bp.id}
                      type="button"
                      data-testid={`sector-card-${bp.id}`}
                      onClick={() => handleSelectBlueprint(bp)}
                      className={`relative flex items-center gap-1.5 rounded-xl border p-1.5 text-left transition-colors ${
                        isSelected
                          ? 'border-[#C8AE7D]/45 bg-amber-50/90 ring-1 ring-amber-400/50 dark:border-[#C8AE7D]/45 dark:bg-[#C8AE7D]/15'
                          : 'border-slate-200/85 bg-white hover:bg-slate-50 border-[#334155] bg-[#222B38] dark:hover:bg-[#1D2532]'
                      } ${locked ? 'opacity-70' : ''}`}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: bp.accentColor }}
                      >
                        {locked ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <BlueprintIcon iconKey={bp.iconKey} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[11px] font-bold leading-tight text-slate-100">
                            {bp.shortName}
                          </span>
                          {isSelected && !locked && (
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#C8AE7D] text-[#181F29]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1 leading-tight">
                          <span
                            className={`truncate font-mono-num text-[10px] font-extrabold ${
                              locked
                                ? 'text-slate-400'
                                : affordable
                                ? 'text-slate-900 dark:text-[#C8AE7D]'
                                : 'text-red-600 dark:text-[#B86B5E]'
                            }`}
                          >
                            {formatTL(bpCost, true)}
                          </span>
                          <span className="shrink-0 truncate text-[9px]">
                            {locked ? (
                              <span className="font-semibold text-amber-700 dark:text-[#C8AE7D]">
                                Sv.{bp.minCompanyLevel}
                              </span>
                            ) : (
                              <span className="font-mono-num font-semibold text-emerald-700 dark:text-[#7A9E7E]">
                                {formatTL(bpHourly, true)}/sa · {bp.constructionDays}g
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {availableFranchises.map((brand) => {
                  const bp =
                    BUSINESS_BLUEPRINTS.find((b) => b.id === brand.businessType) ??
                    BUSINESS_BLUEPRINTS[0];
                  const fullCost = calculateEstablishmentCost(bp, location) + brand.licenseFee;
                  const affordable = cash >= fullCost;
                  const isSel = selectedFranchise?.id === brand.id;

                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedFranchiseId(brand.id)}
                      className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition-colors ${
                        isSel
                          ? 'border-[#7A9E7E]/45 bg-emerald-50/90 dark:bg-emerald-950/35'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 border-[#334155] bg-[#222B38]'
                      }`}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: bp.accentColor }}
                      >
                        <BlueprintIcon iconKey={bp.iconKey} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-xs font-bold">{brand.brandName}</span>
                          <span
                            className={`shrink-0 font-mono-num text-[11px] font-bold ${
                              affordable ? 'text-emerald-700 dark:text-[#7A9E7E]' : 'text-red-600'
                            }`}
                          >
                            {formatTL(fullCost, true)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate">
                            {bp.shortName} · Lisans {formatTL(brand.licenseFee, true)}
                          </span>
                          <span className="shrink-0 font-mono-num font-bold text-amber-700 dark:text-[#C8AE7D]">
                            +%35 · %{Math.round(brand.royaltyRate * 100)} Pay
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fixed Bottom Name + Establish Action Footer (shrink-0) */}
          <div className="compact-short-pad shrink-0 border-t border-slate-200 bg-slate-50/95 px-3 py-2 border-[#334155] bg-black/70">
            <div className="flex items-center gap-2">
              <label htmlFor="business-name-input" className="sr-only">
                İşletme Adı
              </label>
              <input
                id="business-name-input"
                type="text"
                maxLength={42}
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setNameEdited(true);
                }}
                placeholder="İşletme Adı (Örn: Beşiktaş Altın Kafe)"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 outline-none focus:border-[#C8AE7D]/45 focus:ring-2 focus:ring-amber-500/20 border-[#334155] bg-[#222B38] dark:text-white"
              />
              <div className="shrink-0 text-right leading-tight">
                <div className="font-mono-num text-[10.5px] font-extrabold text-emerald-700 dark:text-[#7A9E7E]">
                  {formatTL(estHourly, true)}/sa
                </div>
                <div className="font-mono-num text-[9.5px] text-amber-700 dark:text-[#C8AE7D]">
                  🏗️ {selectedBlueprint.constructionDays}g tadilat · Kira{' '}
                  {formatTL(Math.round(selectedBlueprint.dailyRentBase * location.landMultiplier), true)}/g
                </div>
              </div>
            </div>

            <button
              type="submit"
              data-testid="establish-business-btn"
              disabled={!canSubmit}
              className="compact-short-btn mt-1.5 flex min-h-[38px] w-full items-center justify-center gap-2 rounded-xl bg-[#C8AE7D] px-3 py-1.5 text-xs font-bold text-[#181F29] transition-colors hover:bg-[#D2BB8E] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-[#1D2532] dark:disabled:text-slate-500 whitespace-nowrap"
            >
              <span>
                {isChecking
                  ? 'Kara Doğrulanıyor...'
                  : isTooClose
                  ? '75m Mesafe Kuralı Engeli'
                  : isQuotaFull
                  ? `Şube Kotası Dolu (${ownBranchCount}/${maxBranches})`
                  : isLevelLocked
                  ? `Şirket Seviyesi ${selectedBlueprint.minCompanyLevel} Gerekli`
                  : canAfford
                  ? chainCloneDraft
                    ? `Zincir Şube Aç (${chainCloneDraft.nextBranchNumber}. Şube) · ${formatTL(totalCost)}`
                    : selectedFranchise
                    ? `Franchise Şube Aç · ${formatTL(totalCost)}`
                    : `İşletmeyi Kur · ${formatTL(totalCost)}`
                  : `Yetersiz Bakiye (${formatTL(totalCost)})`}
              </span>
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
