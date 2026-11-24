import { useMemo, useState } from 'react';
import { X, Search, MapPin, Building2 } from 'lucide-react';
import type { GeographicRegion, OwnedBusiness, ProvinceInfo } from '../types/game';
import { GEOGRAPHIC_REGIONS, TURKEY_PROVINCES } from '../game/provinces81';

interface CityPickerModalProps {
  open: boolean;
  activePlate: number;
  ownBusinesses: OwnedBusiness[];
  onSelectProvince: (province: ProvinceInfo) => void;
  onClose: () => void;
}

export function CityPickerModal({
  open,
  activePlate,
  ownBusinesses,
  onSelectProvince,
  onClose,
}: CityPickerModalProps) {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<GeographicRegion | 'all'>('all');

  const countsByPlate = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of ownBusinesses) {
      map.set(b.cityPlate, (map.get(b.cityPlate) ?? 0) + 1);
    }
    return map;
  }, [ownBusinesses]);

  const filteredProvinces = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return TURKEY_PROVINCES.filter((p) => {
      if (regionFilter !== 'all' && p.region !== regionFilter) return false;
      if (!q) return true;
      return (
        p.name.toLocaleLowerCase('tr-TR').includes(q) ||
        p.code.includes(q) ||
        String(p.plate) === q ||
        p.region.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [search, regionFilter]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Şehir Seç ve Oda Değiştir"
      data-testid="city-picker-modal"
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/55 p-3 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[600px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header + Search */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold sm:text-base">81 İl Canlı Oda Seçimi</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Her il bağımsız bir canlı çok oyunculu harita odasıdır (01 Adana – 81 Düzce)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="İl adı veya plaka ara"
                data-testid="city-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Plaka veya il ara (32, Isparta)"
                className="h-9 w-60 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Şehir Seçimini Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 7 Geographical Regions Filter Bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setRegionFilter('all')}
            className={`min-h-[32px] shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              regionFilter === 'all'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Tümü (81)
          </button>
          {GEOGRAPHIC_REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setRegionFilter(region)}
              className={`min-h-[32px] shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                regionFilter === region
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* 81 Provinces Grid */}
        <div className="panel-scroll flex-1 p-3">
          {filteredProvinces.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="mb-2 h-7 w-7 opacity-40" />
              Aramanızla eşleşen il bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredProvinces.map((prov) => {
                const isActive = prov.plate === activePlate;
                const ownCount = countsByPlate.get(prov.plate) ?? 0;

                return (
                  <button
                    key={prov.plate}
                    type="button"
                    onClick={() => {
                      onSelectProvince(prov);
                      onClose();
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                      isActive
                        ? 'border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
                        : 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono-num text-xs font-extrabold ${
                        isActive
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-amber-300 dark:bg-slate-800'
                      }`}
                    >
                      {prov.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {prov.name}
                        </span>
                        {ownCount > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5 font-mono-num text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            <Building2 className="h-3 w-3" />
                            {ownCount}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">{prov.region}</span>
                        <span className="shrink-0 font-mono-num font-semibold">
                          x{prov.landMultiplier.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
