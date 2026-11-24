import { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Coffee,
  Utensils,
  Home,
  Laptop,
  ShoppingBag,
  Hotel,
  Truck,
  Building2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { BusinessBlueprint, PinLocationInfo } from '../types/game';
import { BUSINESS_BLUEPRINTS } from '../game/catalog';
import {
  calculateEstablishmentCost,
  formatTL,
  getAffinityMultiplier,
} from '../game/economy';
import { suggestBusinessName } from '../game/turkeyGeo';

interface PinDropPanelProps {
  location: PinLocationInfo;
  cash: number;
  onEstablish: (blueprintId: string, customName: string) => void;
  onClose: () => void;
}

function BlueprintIcon({ iconKey }: { iconKey: BusinessBlueprint['iconKey'] }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (iconKey) {
    case 'coffee':
      return <Coffee className={cls} />;
    case 'utensils':
      return <Utensils className={cls} />;
    case 'home':
      return <Home className={cls} />;
    case 'laptop':
      return <Laptop className={cls} />;
    case 'shopping-bag':
      return <ShoppingBag className={cls} />;
    case 'hotel':
      return <Hotel className={cls} />;
    case 'truck':
      return <Truck className={cls} />;
    default:
      return <Building2 className={cls} />;
  }
}

export function PinDropPanel({
  location,
  cash,
  onEstablish,
  onClose,
}: PinDropPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(BUSINESS_BLUEPRINTS[0].id);
  const [customName, setCustomName] = useState<string>(() =>
    suggestBusinessName(location.districtName, BUSINESS_BLUEPRINTS[0].shortName)
  );
  const [nameEdited, setNameEdited] = useState(false);

  const selectedBlueprint =
    BUSINESS_BLUEPRINTS.find((b) => b.id === selectedId) ?? BUSINESS_BLUEPRINTS[0];

  useEffect(() => {
    if (!nameEdited) {
      setCustomName(suggestBusinessName(location.districtName, selectedBlueprint.shortName));
    }
  }, [location.districtName, selectedBlueprint.shortName, nameEdited]);

  const cost = calculateEstablishmentCost(selectedBlueprint, location);
  const affinity = getAffinityMultiplier(selectedBlueprint, location);
  const estIncomePerSec = Math.round(selectedBlueprint.baseIncomePerSec * affinity);
  const canAfford = cash >= cost;

  const handleSelectBlueprint = (bp: BusinessBlueprint) => {
    setSelectedId(bp.id);
    if (!nameEdited) {
      setCustomName(suggestBusinessName(location.districtName, bp.shortName));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.isWithinTurkey || !canAfford || !customName.trim()) return;
    onEstablish(selectedBlueprint.id, customName.trim());
  };

  return (
    <aside
      aria-label="Pin Noktasında İşletme Kur"
      data-testid="pin-drop-panel"
      className="pointer-events-auto flex h-full w-[clamp(290px,34vw,400px)] flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 text-slate-900 shadow-2xl dark:border-slate-700/90 dark:bg-slate-900/98 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Seçilen Konum</span>
          </div>
          <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {location.cityName} · {location.districtName}
          </h2>
          <p className="mt-0.5 font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
            {location.regionName} · {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Pin Panelini Kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Location Metrics Strip */}
      <div className="grid grid-cols-4 gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-950/50">
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Arsa</div>
          <div className="font-mono-num text-xs font-bold text-slate-900 dark:text-slate-100">
            x{location.landMultiplier.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Trafik</div>
          <div className="font-mono-num text-xs font-bold text-emerald-700 dark:text-emerald-400">
            x{location.footTraffic.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Turizm</div>
          <div className="font-mono-num text-xs font-bold text-sky-700 dark:text-sky-400">
            x{location.tourism.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">İş/Tic.</div>
          <div className="font-mono-num text-xs font-bold text-amber-700 dark:text-amber-400">
            x{location.business.toFixed(2)}
          </div>
        </div>
      </div>

      {!location.isWithinTurkey ? (
        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          <AlertTriangle className="h-9 w-9 text-amber-500" />
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
            Türkiye Sınırları Dışında
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            İşletme kurmak için lütfen Türkiye haritası içinde bir noktaya pin bırakın.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Scrollable Business Catalog */}
          <div className="panel-scroll flex-1 space-y-1.5 p-3">
            {BUSINESS_BLUEPRINTS.map((bp) => {
              const bpCost = calculateEstablishmentCost(bp, location);
              const bpAff = getAffinityMultiplier(bp, location);
              const bpInc = Math.round(bp.baseIncomePerSec * bpAff);
              const affordable = cash >= bpCost;
              const isSelected = bp.id === selectedId;

              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => handleSelectBlueprint(bp)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 dark:border-amber-500/80 dark:bg-amber-950/35'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70'
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
                      <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {bp.name}
                      </span>
                      <span
                        className={`shrink-0 font-mono-num text-xs font-bold ${
                          affordable
                            ? 'text-slate-900 dark:text-amber-300'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatTL(bpCost)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono-num text-emerald-700 dark:text-emerald-400 font-semibold">
                        +{formatTL(bpInc)}/sn
                      </span>
                      <span>Bölge Uyumu x{bpAff.toFixed(2)}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Name Input + Establish CTA */}
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
              placeholder="Örn: Beşiktaş Altın Fırın"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Tahmini Gelir:</span>
              <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                +{formatTL(estIncomePerSec)}/sn
              </span>
            </div>

            <button
              type="submit"
              disabled={!canAfford || !customName.trim()}
              className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 whitespace-nowrap"
            >
              <span>
                {canAfford
                  ? `İşletmeyi Kur · ${formatTL(cost)}`
                  : `Yetersiz Bakiye (${formatTL(cost)})`}
              </span>
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
