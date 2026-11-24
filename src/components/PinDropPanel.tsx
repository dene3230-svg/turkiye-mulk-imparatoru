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
} from 'lucide-react';
import type {
  BusinessBlueprint,
  BusinessTypeId,
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
  onEstablish: (
    blueprintId: BusinessTypeId,
    customName: string,
    franchiseBrand?: FranchiseBrand | null
  ) => void;
  onClose: () => void;
}

function BlueprintIcon({ iconKey }: { iconKey: BusinessBlueprint['iconKey'] }) {
  const cls = 'h-4 w-4 shrink-0';
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
  onEstablish,
  onClose,
}: PinDropPanelProps) {
  const [mode, setMode] = useState<'independent' | 'franchise'>('independent');
  const [selectedId, setSelectedId] = useState<BusinessTypeId>('kafe');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>(
    availableFranchises[0]?.id ?? ''
  );
  const [customName, setCustomName] = useState<string>(() =>
    suggestBusinessName(location.districtName, BUSINESS_BLUEPRINTS[0].shortName)
  );
  const [nameEdited, setNameEdited] = useState(false);

  const selectedFranchise =
    mode === 'franchise'
      ? availableFranchises.find((f) => f.id === selectedFranchiseId) ??
        availableFranchises[0] ??
        null
      : null;

  const effectiveTypeId = selectedFranchise ? selectedFranchise.businessType : selectedId;
  const selectedBlueprint =
    BUSINESS_BLUEPRINTS.find((b) => b.id === effectiveTypeId) ?? BUSINESS_BLUEPRINTS[0];

  useEffect(() => {
    if (!nameEdited) {
      if (selectedFranchise) {
        setCustomName(`${selectedFranchise.brandName} · ${location.districtName}`.slice(0, 42));
      } else {
        setCustomName(suggestBusinessName(location.districtName, selectedBlueprint.shortName));
      }
    }
  }, [location.districtName, selectedBlueprint.shortName, selectedFranchise, nameEdited]);

  const baseCost = calculateEstablishmentCost(selectedBlueprint, location);
  const totalCost = baseCost + (selectedFranchise?.licenseFee ?? 0);
  const affinity = getAffinityMultiplier(selectedBlueprint, location);
  const franchiseBonus = selectedFranchise ? 1.35 * (1 - selectedFranchise.royaltyRate) : 1.0;
  const estHourly = Math.round((selectedBlueprint.baseHourlyIncome * affinity * franchiseBonus) / 50) * 50;
  const estPerSec = Math.round(selectedBlueprint.baseIncomePerSec * affinity * franchiseBonus);

  const isChecking = location.landStatus === 'checking';
  const isWaterOrInvalid =
    !location.isWithinTurkey ||
    location.landStatus === 'water' ||
    location.landStatus === 'invalid';
  const isTooClose = !distanceCheck.allowed;
  const isQuotaFull = ownBranchCount >= maxBranches;
  const isLevelLocked = !selectedFranchise && companyLevel < selectedBlueprint.minCompanyLevel;
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
    setSelectedId(bp.id);
    if (!nameEdited) {
      setCustomName(suggestBusinessName(location.districtName, bp.shortName));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onEstablish(selectedBlueprint.id, customName.trim(), selectedFranchise);
  };

  return (
    <aside
      aria-label="Pin Noktasında İşletme Kur"
      data-testid="pin-drop-panel"
      className="pointer-events-auto flex h-full w-[clamp(305px,36vw,425px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {location.cityCode} {location.cityName} · {location.districtName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {location.resolvedAddress ||
              `${location.regionName} · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Pin Panelini Kapat"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Land Verification + Quota + Distance Status Banner */}
      <div className="border-b border-slate-200 bg-slate-50/90 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-950/60">
        {isChecking ? (
          <div
            data-testid="land-checking"
            className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400"
          >
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Kara ve adres doğrulaması yapılıyor...</span>
          </div>
        ) : isWaterOrInvalid ? (
          <div
            role="alert"
            data-testid="water-block-alert"
            className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
          >
            <Waves className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {location.landMessage ||
                'Deniz, boğaz veya göl üzerine inşaat yasaktır! Lütfen kara üzerinde bir nokta seçin.'}
            </span>
          </div>
        ) : isTooClose ? (
          <div
            role="alert"
            data-testid="distance-block-alert"
            className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
          >
            <Ruler className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Mevcut "{distanceCheck.nearestName}" işletmesine {distanceCheck.nearestMeters}m
              mesafede! En az {MIN_BUSINESS_DISTANCE_METERS}m mesafe kuralı gereklidir.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Kara Doğrulandı · Arsa x{location.landMultiplier.toFixed(2)}
            </span>
            <span
              className={`font-mono-num font-bold ${
                isQuotaFull
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Şube: {ownBranchCount}/{maxBranches}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      {isWaterOrInvalid ? (
        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
            İnşaat İzni Reddedildi
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Su kütleleri (deniz, boğaz, göl, nehir) ve Türkiye dışı koordinatlar üzerine pin
            bırakılamaz. Lütfen haritada cadde veya yerleşim alanı üzerine tıklayın.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Independent vs Franchise Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setMode('independent')}
              className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                mode === 'independent'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              Bağımsız İşletme (13)
            </button>
            <button
              type="button"
              data-testid="pin-mode-franchise"
              onClick={() => setMode('franchise')}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                mode === 'franchise'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              <span>Franchise (+%35)</span>
            </button>
          </div>

          {/* Sector or Franchise List */}
          <div className="panel-scroll flex-1 space-y-1.5 p-2.5">
            {mode === 'independent'
              ? BUSINESS_BLUEPRINTS.map((bp) => {
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
                      onClick={() => handleSelectBlueprint(bp)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/90 dark:border-amber-500/80 dark:bg-amber-950/35'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70'
                      } ${locked ? 'opacity-70' : ''}`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: bp.accentColor }}
                      >
                        {locked ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <BlueprintIcon iconKey={bp.iconKey} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {bp.name}
                          </span>
                          <span
                            className={`shrink-0 font-mono-num text-xs font-bold ${
                              locked
                                ? 'text-slate-500 dark:text-slate-400'
                                : affordable
                                ? 'text-slate-900 dark:text-amber-300'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatTL(bpCost)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {locked ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Şirket Sv.{bp.minCompanyLevel} gerekir
                            </span>
                          ) : (
                            <span className="font-mono-num font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatTL(bpHourly)}/sa
                            </span>
                          )}
                          <span className="truncate">
                            {bp.category === 'parking'
                              ? '250m +%15 Kapasite'
                              : bp.category === 'factory'
                              ? '%35 Tedarik İndirimi'
                              : bp.id === 'avm'
                              ? '+%25 Şehir Bonusu'
                              : `Kapasite: ${bp.baseCapacity}`}
                          </span>
                        </div>
                      </div>

                      {isSelected && !locked && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              : availableFranchises.map((brand) => {
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
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                        isSel
                          ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/35'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: bp.accentColor }}
                      >
                        <BlueprintIcon iconKey={bp.iconKey} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold">{brand.brandName}</span>
                          <span
                            className={`shrink-0 font-mono-num text-xs font-bold ${
                              affordable ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'
                            }`}
                          >
                            {formatTL(fullCost)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {bp.name} · Lisans {formatTL(brand.licenseFee, true)}
                          </span>
                          <span className="font-mono-num font-bold text-amber-700 dark:text-amber-400">
                            +%35 Ciro · %{Math.round(brand.royaltyRate * 100)} Pay
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>

          {/* Footer Name Input + Establish Button */}
          <div className="border-t border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-950/70">
            <label
              htmlFor="business-name-input"
              className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
            >
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
              placeholder="Örn: Beşiktaş Altın Kafe"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />

            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Net Saatlik / Canlı Akış:</span>
              <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                {formatTL(estHourly)}/sa · +{formatTL(estPerSec)}/sn
              </span>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap"
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
                  ? selectedFranchise
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
