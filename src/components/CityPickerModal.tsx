import { useMemo, useState } from 'react';
import { X, Search, MapPin, Building2, Lock } from 'lucide-react';
import type { GeographicRegion, OwnedBusiness, ProvinceInfo } from '../types/game';
import { GEOGRAPHIC_REGIONS, TURKEY_PROVINCES } from '../game/provinces81';

interface CityPickerModalProps {
  open: boolean;
  activePlate: number;
  unlockedCityPlates?: number[];
  ownBusinesses: OwnedBusiness[];
  onSelectProvince: (province: ProvinceInfo) => void;
  onClose: () => void;
}

export function CityPickerModal({
  open,
  activePlate,
  unlockedCityPlates,
  ownBusinesses,
  onSelectProvince,
  onClose,
}: CityPickerModalProps) {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<GeographicRegion | 'all'>('all');
  const unlockedSet = useMemo(
    () => (unlockedCityPlates ? new Set(unlockedCityPlates) : null),
    [unlockedCityPlates]
  );

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
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-[#181F29] p-3 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-[#222B38] text-slate-100 border-[#334155] bg-[#222B38] dark:text-slate-100"
      >
        {/* Header + Search */}
        <div className="compact-short-pad flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2 border-[#334155] sm:px-4 sm:py-2.5">
          <div>
            <h2 className="text-sm font-bold sm:text-base">81 İl Canlı Oda Seçimi</h2>
            <p className="text-[11px] text-slate-400">
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
                className="h-9 w-60 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-[#C8AE7D]/45 focus:bg-white border-[#334155] bg-[#181F29] dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Şehir Seçimini Kapat"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#1D2532] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 7 Geographical Regions Filter Bar */}
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/90 px-3.5 py-1.5 border-[#334155] bg-black/70 sm:px-4 sm:py-2">
          <button
            type="button"
            onClick={() => setRegionFilter('all')}
            className={`min-h-[30px] shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              regionFilter === 'all'
                ? 'bg-[#C8AE7D] text-[#181F29]'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-[#1D2532]'
            }`}
          >
            Tümü (81)
          </button>
          {GEOGRAPHIC_REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setRegionFilter(region)}
              className={`min-h-[30px] shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                regionFilter === region
                  ? 'bg-[#C8AE7D] text-[#181F29]'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-[#1D2532]'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* 81 Provinces Grid */}
        <div className="panel-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
          {filteredProvinces.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
              <MapPin className="mb-2 h-7 w-7 opacity-40" />
              Aramanızla eşleşen il bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredProvinces.map((prov) => {
                const isActive = prov.plate === activePlate;
                const isLocked = unlockedSet !== null && !unlockedSet.has(prov.plate);
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
                        ? 'border-[#C8AE7D]/70 bg-[#C8AE7D]/15'
                        : isLocked
                        ? 'border-[#334155]/70 bg-[#181F29]/75 opacity-75 hover:border-[#475569]'
                        : 'border-[#334155] bg-[#222B38] hover:border-[#7A9E7E]/60 hover:bg-[#1D2532]'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono-num text-xs font-extrabold ${
                        isActive
                          ? 'bg-[#C8AE7D] text-[#181F29]'
                          : isLocked
                          ? 'bg-[#222B38] text-slate-500'
                          : 'bg-[#1D2532] text-[#7A9E7E]'
                      }`}
                    >
                      {isLocked ? <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> : prov.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`truncate text-xs font-bold ${
                            isLocked ? 'text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          {prov.name}
                        </span>
                        {ownCount > 0 ? (
                          <span className="flex shrink-0 items-center gap-0.5 font-mono-num text-[10px] font-bold text-[#7A9E7E]">
                            <Building2 className="h-3 w-3" />
                            {ownCount}
                          </span>
                        ) : isLocked ? (
                          <span className="shrink-0 text-[9.5px] font-semibold text-slate-500">
                            Kilitli
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
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
