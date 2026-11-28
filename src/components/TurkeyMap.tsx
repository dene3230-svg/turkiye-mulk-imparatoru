import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  Globe2,
  Lock,
  MapPin,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  Store,
  Unlock,
  X,
} from 'lucide-react';
import type {
  OwnedBusiness,
  PinLocationInfo,
  ProvinceInfo,
  RemoteBusinessRecord,
  ThemeMode,
} from '../types/game';
import { formatTL } from '../game/economy';
import { getProvinceByPlate } from '../game/provinces81';
import {
  getProvinceUnlockRequirement,
  generateCityJobListings,
} from '../game/careerEngine';
import {
  LAKE_VAN_POINTS,
  MARMARA_SEA_POINTS,
  SVG_MAP_HEIGHT,
  SVG_MAP_WIDTH,
  TUZ_GOLU_POINTS,
  getAllProvinceVectorShapes,
  getProvinceDistrictShapes,
  getProvinceVectorShape,
  getTurkeyOutlinePathD,
  getWaterFeaturePathD,
  projectLatLngToSvg,
  type DistrictVectorShape,
} from '../game/turkeyVectorGeo';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  computeWorldDbStats,
  fetchAllWorldBusinesses,
  isRealPlayerBusiness,
  subscribeToGlobalBusinesses,
  syncPlayerBusinessesToWorld,
  WORLD_POLL_INTERVAL_MS,
  type RoomSyncStatus,
  type WorldDbSyncSnapshot,
} from '../services/cityRoom';
import { soundEngine } from '../services/soundEngine';

export type VectorMapViewMode = 'turkey' | 'city';

interface TurkeyMapProps {
  theme: ThemeMode;
  mapStyle: 'osm' | 'carto';
  activePlate: number;
  unlockedCityPlates: number[];
  playerLevel: number;
  playerCash: number;
  currentUserId?: string;
  ownBusinesses: OwnedBusiness[];
  localSyncRecords: RemoteBusinessRecord[];
  competitorBusinesses: RemoteBusinessRecord[];
  syncRefreshNonce?: number;
  selectedBusinessId: string | null;
  selectedCompetitorId: string | null;
  droppedPin: PinLocationInfo | null;
  droppedPinBlocked: boolean;
  pinDropMode: boolean;
  initialCenter?: { lat: number; lng: number; zoom: number };
  flyTarget: { lat: number; lng: number; zoom: number; nonce: number } | null;
  onMapClick: (lat: number, lng: number, districtName?: string) => void;
  onSelectProvince?: (prov: ProvinceInfo) => void;
  onUnlockProvince?: (plate: number) => void;
  onOpenDistrictJobs?: (plate: number, districtName: string) => void;
  onSelectOwnBusiness: (businessId: string) => void;
  onSelectCompetitor: (record: RemoteBusinessRecord) => void;
  onWorldSyncUpdate?: (snapshot: WorldDbSyncSnapshot) => void;
  onRemoteInsert?: (record: RemoteBusinessRecord) => void;
  onRemoteUpdate?: (record: RemoteBusinessRecord) => void;
  onRemoteDelete?: (id: string) => void;
  isVisible?: boolean;
}

export function TurkeyMap({
  activePlate,
  unlockedCityPlates,
  playerLevel,
  playerCash,
  currentUserId,
  ownBusinesses,
  localSyncRecords,
  competitorBusinesses,
  syncRefreshNonce = 0,
  selectedBusinessId,
  selectedCompetitorId,
  droppedPin,
  onMapClick,
  onSelectProvince,
  onUnlockProvince,
  onOpenDistrictJobs,
  onSelectOwnBusiness,
  onSelectCompetitor,
  onWorldSyncUpdate,
  onRemoteInsert,
  onRemoteUpdate,
  onRemoteDelete,
}: TurkeyMapProps) {
  const [viewMode, setViewMode] = useState<VectorMapViewMode>('turkey');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoveredPlate, setHoveredPlate] = useState<number | null>(null);
  const [lockedInspectPlate, setLockedInspectPlate] = useState<number | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictVectorShape | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomSyncStatus>('connecting');

  const onWorldSyncUpdateRef = useRef(onWorldSyncUpdate);
  const onRemoteInsertRef = useRef(onRemoteInsert);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onRemoteDeleteRef = useRef(onRemoteDelete);
  const localSyncRecordsRef = useRef(localSyncRecords);
  const currentUserIdRef = useRef(currentUserId);
  const dbRecordsRef = useRef<RemoteBusinessRecord[]>([]);
  const roomStatusRef = useRef<RoomSyncStatus>('connecting');
  const syncErrorRef = useRef<string | null>(null);

  onWorldSyncUpdateRef.current = onWorldSyncUpdate;
  onRemoteInsertRef.current = onRemoteInsert;
  onRemoteUpdateRef.current = onRemoteUpdate;
  onRemoteDeleteRef.current = onRemoteDelete;
  localSyncRecordsRef.current = localSyncRecords;
  currentUserIdRef.current = currentUserId;

  // ============================================================================
  // CENTRALIZED MULTIPLAYER SYNC (SUPABASE public.businesses REALTIME + 10s POLL)
  // ============================================================================
  const emitSnapshot = (loading = false) => {
    const ownIds = new Set(localSyncRecordsRef.current.map((r) => r.id));
    const stats = computeWorldDbStats(dbRecordsRef.current, currentUserIdRef.current, ownIds);
    setRoomStatus(roomStatusRef.current);
    onWorldSyncUpdateRef.current?.({
      records: dbRecordsRef.current,
      dbTotal: stats.dbTotal,
      rivalCount: stats.rivalCount,
      status: roomStatusRef.current,
      error: syncErrorRef.current,
      loading,
      lastSyncedAt: Date.now(),
    });
  };

  const pollWorldCompetitorsNowRef = useRef<(() => Promise<void>) | null>(null);
  pollWorldCompetitorsNowRef.current = async () => {
    const fetchRes = await fetchAllWorldBusinesses();
    if (fetchRes.error) {
      syncErrorRef.current = fetchRes.error;
      roomStatusRef.current = 'offline';
    } else if (fetchRes.connected) {
      dbRecordsRef.current = fetchRes.records;
      syncErrorRef.current = null;
      if (roomStatusRef.current !== 'live') {
        roomStatusRef.current = 'live';
      }
    }
    emitSnapshot(false);
  };

  const syncWorldNowRef = useRef<(() => Promise<void>) | null>(null);
  syncWorldNowRef.current = async () => {
    let latestError: string | null = null;
    const ownLocal = localSyncRecordsRef.current;

    if (ownLocal.length > 0) {
      const upsertRes = await syncPlayerBusinessesToWorld(ownLocal);
      if (!upsertRes.ok && upsertRes.error) {
        latestError = upsertRes.error;
      }
    }

    const fetchRes = await fetchAllWorldBusinesses();
    if (fetchRes.error) {
      latestError = fetchRes.error;
      roomStatusRef.current = 'offline';
    } else {
      dbRecordsRef.current = fetchRes.records;
      if (roomStatusRef.current !== 'live') {
        roomStatusRef.current = fetchRes.connected ? 'live' : 'offline';
      }
    }

    syncErrorRef.current = latestError;
    emitSnapshot(false);
  };

  useEffect(() => {
    let active = true;
    emitSnapshot(true);

    const runFullSync = async () => {
      if (!active) return;
      await syncWorldNowRef.current?.();
    };

    const runSilentPoll = async () => {
      if (!active) return;
      await pollWorldCompetitorsNowRef.current?.();
    };

    runFullSync();

    const unsubscribe = subscribeToGlobalBusinesses({
      onUpsert: (rec) => {
        if (!active) return;
        dbRecordsRef.current = applyRealtimeBusinessUpsert(dbRecordsRef.current, rec);
        syncErrorRef.current = null;
        emitSnapshot(false);
      },
      onPatch: (id, patch) => {
        if (!active) return;
        dbRecordsRef.current = applyRealtimeBusinessPatch(dbRecordsRef.current, id, patch);
        emitSnapshot(false);
      },
      onDelete: (id) => {
        if (!active) return;
        dbRecordsRef.current = applyRealtimeBusinessDelete(dbRecordsRef.current, id);
        emitSnapshot(false);
        onRemoteDeleteRef.current?.(id);
      },
      onInsert: (rec) => {
        if (!active) return;
        onRemoteInsertRef.current?.(rec);
      },
      onUpdate: (rec) => {
        if (!active) return;
        onRemoteUpdateRef.current?.(rec);
      },
      onStatus: (status) => {
        if (!active) return;
        roomStatusRef.current = status;
        emitSnapshot(false);
      },
      onReconnect: () => {
        if (!active) return;
        runSilentPoll();
      },
    });

    const fallbackInterval = window.setInterval(runSilentPoll, WORLD_POLL_INTERVAL_MS);
    const onOnline = () => runFullSync();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSilentPoll();
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(fallbackInterval);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribe();
    };
  }, []);

  const localSyncSignature = localSyncRecords
    .map((r) => `${r.id}:${r.level}:${Math.round(r.hourly_income)}:${r.business_name}`)
    .join('|');

  useEffect(() => {
    if (!localSyncSignature && syncRefreshNonce === 0) return;
    const t = window.setTimeout(() => {
      syncWorldNowRef.current?.();
    }, 350);
    return () => window.clearTimeout(t);
  }, [localSyncSignature, syncRefreshNonce]);

  // Reset selected district when switching provinces
  useEffect(() => {
    setSelectedDistrict(null);
  }, [activePlate]);

  // ============================================================================
  // VECTOR GEOMETRY (81 PROVINCES + REAL DISTRICTS)
  // ============================================================================
  const provinceShapes = useMemo(() => getAllProvinceVectorShapes(), []);
  const turkeyOutlineD = useMemo(() => getTurkeyOutlinePathD(), []);
  const marmaraPathD = useMemo(() => getWaterFeaturePathD(MARMARA_SEA_POINTS), []);
  const lakeVanPathD = useMemo(() => getWaterFeaturePathD(LAKE_VAN_POINTS), []);
  const tuzGoluPathD = useMemo(() => getWaterFeaturePathD(TUZ_GOLU_POINTS), []);

  const unlockedSet = useMemo(() => new Set(unlockedCityPlates), [unlockedCityPlates]);
  const activeProvShape = useMemo(() => getProvinceVectorShape(activePlate), [activePlate]);
  const activeProvInfo = useMemo(() => getProvinceByPlate(activePlate), [activePlate]);
  const activeDistricts = useMemo(() => getProvinceDistrictShapes(activePlate), [activePlate]);

  // Compute dynamic SVG viewBox for "Tüm Türkiye (81 İl)" vs "Sadece Seçili Şehir"
  const svgViewBox = useMemo(() => {
    if (viewMode === 'city') {
      const { minX, minY, maxX, maxY } = activeProvShape.bounds;
      const bw = Math.max(40, maxX - minX);
      const bh = Math.max(30, maxY - minY);
      const padX = bw * 0.35;
      const padY = bh * 0.35;
      const rawW = (bw + padX * 2) / zoomScale;
      const rawH = (bh + padY * 2) / zoomScale;
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;
      return `${(cx - rawW / 2).toFixed(1)} ${(cy - rawH / 2).toFixed(1)} ${rawW.toFixed(1)} ${rawH.toFixed(1)}`;
    }
    const vw = SVG_MAP_WIDTH / zoomScale;
    const vh = SVG_MAP_HEIGHT / zoomScale;
    const vx = (SVG_MAP_WIDTH - vw) * 0.5;
    const vy = (SVG_MAP_HEIGHT - vh) * 0.5;
    return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`;
  }, [viewMode, activeProvShape, zoomScale]);

  const ownBusinessCountByPlate = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of ownBusinesses) {
      map.set(b.cityPlate, (map.get(b.cityPlate) ?? 0) + 1);
    }
    return map;
  }, [ownBusinesses]);

  const rivalBusinessCountByPlate = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of competitorBusinesses) {
      if (isRealPlayerBusiness(c)) {
        map.set(c.city_plate, (map.get(c.city_plate) ?? 0) + 1);
      }
    }
    return map;
  }, [competitorBusinesses]);

  const visibleOwnPins = useMemo(() => {
    if (viewMode === 'city') {
      return ownBusinesses.filter((b) => b.cityPlate === activePlate);
    }
    return ownBusinesses;
  }, [ownBusinesses, viewMode, activePlate]);

  const visibleCompetitorPins = useMemo(() => {
    const realRivals = competitorBusinesses.filter(
      (c) => isRealPlayerBusiness(c) && (!currentUserId || c.owner_id !== currentUserId)
    );
    if (viewMode === 'city') {
      return realRivals.filter((c) => c.city_plate === activePlate);
    }
    return realRivals;
  }, [competitorBusinesses, currentUserId, viewMode, activePlate]);

  const lockedInspectReq = useMemo(() => {
    if (!lockedInspectPlate) return null;
    return getProvinceUnlockRequirement(lockedInspectPlate, unlockedCityPlates);
  }, [lockedInspectPlate, unlockedCityPlates]);

  const districtJobs = useMemo(() => {
    if (!selectedDistrict) return [];
    return generateCityJobListings(activePlate, selectedDistrict.name).slice(0, 3);
  }, [activePlate, selectedDistrict]);

  const handleProvinceClick = (plate: number) => {
    soundEngine.playClick();
    if (!unlockedSet.has(plate)) {
      setLockedInspectPlate(plate);
      return;
    }
    setLockedInspectPlate(null);
    const prov = getProvinceByPlate(plate);
    onSelectProvince?.(prov);
    setViewMode('city');
    setZoomScale(1);
  };

  const handleDistrictClick = (district: DistrictVectorShape) => {
    soundEngine.playClick();
    setSelectedDistrict(district);
  };

  const handleInvestInDistrict = (district: DistrictVectorShape) => {
    soundEngine.playClick();
    setSelectedDistrict(null);
    // Slight deterministic offset if multiple shops exist near district center
    const jitter = ((ownBusinesses.length % 5) - 2) * 0.004;
    onMapClick(district.lat + jitter, district.lng + jitter, district.name);
  };

  const markerScale = viewMode === 'city' ? 0.34 / zoomScale : 1 / Math.sqrt(zoomScale);

  return (
    <div
      data-testid="vector-turkey-map"
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#181F29] select-none"
    >
      {/* Top Centered View Mode Switcher: [ Tüm Türkiye (81 İl) ] | [ Sadece Seçili Şehir ] */}
      <div className="pointer-events-none absolute inset-x-0 top-12 z-[510] flex justify-center px-3 sm:top-2.5">
        <div
          role="tablist"
          aria-label="Harita Görünüm Modu"
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#334155] bg-[#222B38]/95 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'turkey'}
            data-testid="map-mode-turkey-btn"
            onClick={() => {
              soundEngine.playClick();
              setViewMode('turkey');
              setZoomScale(1);
              setSelectedDistrict(null);
            }}
            className={`flex min-h-[30px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'turkey'
                ? 'bg-[#C8AE7D] text-[#181F29]'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Tüm Türkiye (81 İl)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'city'}
            data-testid="map-mode-city-btn"
            onClick={() => {
              soundEngine.playClick();
              setViewMode('city');
              setZoomScale(1);
              setLockedInspectPlate(null);
            }}
            className={`flex min-h-[30px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'city'
                ? 'bg-[#7A9E7E] text-[#181F29]'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Sadece Seçili Şehir ({activeProvInfo.name})</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Vector SVG Viewport */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#151C25]">
        {/* Subtle nautical/cartographic grid lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, #2A3647 1px, transparent 1px), linear-gradient(to bottom, #2A3647 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <svg
          viewBox={svgViewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
          role="img"
          aria-label={
            viewMode === 'turkey'
              ? 'Türkiye 81 İl Vektörel Haritası'
              : `${activeProvInfo.name} Gerçek İlçe Haritası`
          }
        >
          {/* MODE A: ALL TURKEY (81 PROVINCES) */}
          {viewMode === 'turkey' && (
            <g>
              {/* Soft Base Land Silhouette */}
              <path
                d={turkeyOutlineD}
                fill="#1D2633"
                stroke="#334155"
                strokeWidth="2"
              />

              {/* All 81 Province Polygons */}
              {provinceShapes.map((prov) => {
                const isUnlocked = unlockedSet.has(prov.plate);
                const isActive = prov.plate === activePlate;
                const isHovered = prov.plate === hoveredPlate;
                const ownCnt = ownBusinessCountByPlate.get(prov.plate) ?? 0;
                const rivalCnt = rivalBusinessCountByPlate.get(prov.plate) ?? 0;

                const fill = isActive
                  ? '#3A534B'
                  : isUnlocked
                  ? isHovered
                    ? '#435F55'
                    : '#2F4640'
                  : isHovered
                  ? '#263242'
                  : '#1E2733';

                const stroke = isActive
                  ? '#C8AE7D'
                  : isUnlocked
                  ? '#7A9E7E'
                  : '#334155';

                return (
                  <g
                    key={prov.plate}
                    data-testid={`province-poly-${prov.plate}`}
                    onClick={() => handleProvinceClick(prov.plate)}
                    onMouseEnter={() => setHoveredPlate(prov.plate)}
                    onMouseLeave={() => setHoveredPlate(null)}
                    className="cursor-pointer transition-colors duration-150"
                  >
                    <path
                      d={prov.pathD}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive ? 1.8 : isUnlocked ? 1.25 : 0.75}
                    />
                    <title>
                      {prov.code} {prov.name} ({isUnlocked ? 'Açık İl' : 'Kilitli İl'})
                      {ownCnt > 0 ? ` · ${ownCnt} Şuben` : ''}
                      {rivalCnt > 0 ? ` · ${rivalCnt} Rakip` : ''}
                    </title>

                    {/* Unlocked Province Label vs Locked Small Lock Icon */}
                    {isUnlocked ? (
                      <g pointerEvents="none">
                        <text
                          x={prov.labelX}
                          y={prov.labelY - 1}
                          textAnchor="middle"
                          fill="#F1F5F9"
                          fontSize={isActive ? '8.5' : '7.5'}
                          fontWeight="700"
                        >
                          {prov.name}
                        </text>
                        <text
                          x={prov.labelX}
                          y={prov.labelY + 7.5}
                          textAnchor="middle"
                          fill="#C8AE7D"
                          fontSize="6"
                          fontWeight="600"
                        >
                          {prov.code}
                        </text>
                      </g>
                    ) : (
                      <g
                        transform={`translate(${prov.labelX}, ${prov.labelY})`}
                        pointerEvents="none"
                        opacity={isHovered ? 0.95 : 0.55}
                      >
                        {/* Minimal 1.5px outline lock glyph */}
                        <rect
                          x="-3.6"
                          y="-1"
                          width="7.2"
                          height="5.4"
                          rx="1.2"
                          fill="#181F29"
                          stroke="#64748B"
                          strokeWidth="0.9"
                        />
                        <path
                          d="M -2 -1 L -2 -3 A 2 2 0 0 1 2 -3 L 2 -1"
                          fill="none"
                          stroke="#64748B"
                          strokeWidth="0.9"
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Marmara Sea, Lake Van & Tuz Gölü overlays */}
              <path d={marmaraPathD} fill="#151C25" stroke="#2D3B4E" strokeWidth="0.8" pointerEvents="none" />
              <path d={lakeVanPathD} fill="#16212E" stroke="#334155" strokeWidth="0.7" pointerEvents="none" />
              <path d={tuzGoluPathD} fill="#1A2634" stroke="#334155" strokeWidth="0.7" pointerEvents="none" />
            </g>
          )}

          {/* MODE B: ONLY SELECTED CITY (REAL DISTRICTS ZOOMED VIEW) */}
          {viewMode === 'city' && (
            <g>
              {/* Outer Province Border Highlight */}
              <path
                d={activeProvShape.pathD}
                fill="#1D2633"
                stroke="#C8AE7D"
                strokeWidth={0.9 / zoomScale}
              />

              {/* Real District Polygons */}
              {activeDistricts.map((dist) => {
                const isSelected = selectedDistrict?.id === dist.id;
                return (
                  <g
                    key={dist.id}
                    data-testid={`district-poly-${dist.name}`}
                    onClick={() => handleDistrictClick(dist)}
                    className="cursor-pointer"
                  >
                    <path
                      d={dist.pathD}
                      fill={isSelected ? '#3D574D' : '#243140'}
                      stroke={isSelected ? '#C8AE7D' : '#475569'}
                      strokeWidth={(isSelected ? 0.9 : 0.45) / zoomScale}
                    />
                    <text
                      x={dist.centerX}
                      y={dist.centerY}
                      textAnchor="middle"
                      fill={isSelected ? '#F8FAFC' : '#CBD5E1'}
                      fontSize={Math.max(2.6, 3.6 / zoomScale)}
                      fontWeight="700"
                      pointerEvents="none"
                    >
                      {dist.name}
                    </text>
                    <text
                      x={dist.centerX}
                      y={dist.centerY + Math.max(3.2, 4.4 / zoomScale)}
                      textAnchor="middle"
                      fill="#C8AE7D"
                      fontSize={Math.max(1.8, 2.4 / zoomScale)}
                      fontWeight="600"
                      pointerEvents="none"
                    >
                      {dist.jobCount} ilan · Yatırım
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* LIVE MULTIPLAYER COMPETITOR PINS (FROM SUPABASE public.businesses) */}
          {visibleCompetitorPins.map((rec) => {
            const pt = projectLatLngToSvg(rec.lat, rec.lng);
            const isSel = rec.id === selectedCompetitorId;
            const blockClickForLockedOverview =
              viewMode === 'turkey' && !unlockedSet.has(rec.city_plate);
            return (
              <g
                key={rec.id}
                transform={`translate(${pt.x}, ${pt.y}) scale(${markerScale})`}
                pointerEvents={blockClickForLockedOverview ? 'none' : 'auto'}
                onClick={(e) => {
                  if (blockClickForLockedOverview) return;
                  e.stopPropagation();
                  soundEngine.playClick();
                  onSelectCompetitor(rec);
                }}
                className={blockClickForLockedOverview ? '' : 'cursor-pointer'}
              >
                <circle
                  r={isSel ? 8.5 : 6.5}
                  fill="#B86B5E"
                  stroke="#F8FAFC"
                  strokeWidth={isSel ? 2.2 : 1.3}
                />
                <text
                  y="2.5"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="6.5"
                  fontWeight="800"
                  pointerEvents="none"
                >
                  S{rec.level}
                </text>
                <title>
                  {rec.business_name} ({rec.owner_name}) · {rec.city_name}/{rec.district}
                </title>
              </g>
            );
          })}

          {/* OWN BUSINESS PINS */}
          {visibleOwnPins.map((biz) => {
            const pt = projectLatLngToSvg(biz.lat, biz.lng);
            const isSel = biz.id === selectedBusinessId;
            return (
              <g
                key={biz.id}
                transform={`translate(${pt.x}, ${pt.y}) scale(${markerScale})`}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playClick();
                  onSelectOwnBusiness(biz.id);
                }}
                className="cursor-pointer"
              >
                <circle
                  r={isSel ? 10 : 7.8}
                  fill="#7A9E7E"
                  stroke="#C8AE7D"
                  strokeWidth={isSel ? 2.4 : 1.6}
                />
                <text
                  y="2.6"
                  textAnchor="middle"
                  fill="#181F29"
                  fontSize="6.8"
                  fontWeight="800"
                  pointerEvents="none"
                >
                  ★
                </text>
                <title>
                  {biz.customName} (S{biz.level}) · {biz.cityName}/{biz.districtName}
                </title>
              </g>
            );
          })}

          {/* DROPPED PIN INDICATOR */}
          {droppedPin && (
            <g
              transform={`translate(${projectLatLngToSvg(droppedPin.lat, droppedPin.lng).x}, ${
                projectLatLngToSvg(droppedPin.lat, droppedPin.lng).y
              }) scale(${markerScale})`}
            >
              <circle r="11" fill="#C8AE7D" opacity="0.25" />
              <circle r="6" fill="#C8AE7D" stroke="#181F29" strokeWidth="1.8" />
            </g>
          )}
        </svg>
      </div>

      {/* Bottom-Left Compact Legend + Unlocked Counter */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[480] flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#334155] bg-[#222B38]/95 px-3.5 py-1.5 text-[11px] text-slate-300">
          <span className="font-semibold text-[#C8AE7D]">
            Açık İl: {unlockedCityPlates.length} / 81
          </span>
          <span aria-hidden="true" className="text-[#334155]">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7A9E7E]" />
            Şubelerin ({ownBusinesses.length})
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#B86B5E]" />
            Rakipler ({competitorBusinesses.filter((c) => isRealPlayerBusiness(c)).length})
          </span>
          <span className="hidden items-center gap-1 text-[#7A9E7E] sm:inline-flex">
            <Radio className="h-3 w-3" strokeWidth={1.5} />
            {roomStatus === 'live' ? 'Canlı Senkron' : 'Bağlanıyor'}
          </span>
        </div>
      </div>

      {/* Left Vertical Zoom Controls */}
      <div className="absolute left-3 top-1/2 z-[480] flex -translate-y-1/2 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setZoomScale((z) => Math.min(3.2, Number((z + 0.35).toFixed(2))))}
          aria-label="Haritayı Yakınlaştır"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#334155] bg-[#222B38] text-slate-200 hover:bg-[#2A3444]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setZoomScale((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
          aria-label="Haritayı Uzaklaştır"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#334155] bg-[#222B38] text-slate-200 hover:bg-[#2A3444]"
        >
          <Minus className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setZoomScale(1)}
          aria-label="Görünümü Sıfırla"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#334155] bg-[#222B38] text-slate-200 hover:bg-[#2A3444]"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* LOCKED PROVINCE UNLOCK REQUIREMENTS MODAL */}
      {lockedInspectReq && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="locked-province-modal"
          className="absolute inset-0 z-[540] flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-[#C8AE7D]">
                  <Lock className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {String(lockedInspectReq.plate).padStart(2, '0')} {lockedInspectReq.cityName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lockedInspectReq.region} · Kilitli Ticaret Bölgesi
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setLockedInspectPlate(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-[14px] border border-[#334155] bg-[#181F29] p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gereken Seviye</span>
                <span
                  className={`font-mono-num font-bold ${
                    playerLevel >= lockedInspectReq.requiredLevel
                      ? 'text-[#7A9E7E]'
                      : 'text-[#B86B5E]'
                  }`}
                >
                  Seviye {lockedInspectReq.requiredLevel} (Mevcut: {playerLevel})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">İl Ticaret Lisansı Bedeli</span>
                <span
                  className={`font-mono-num font-bold ${
                    playerCash >= lockedInspectReq.licenseCost
                      ? 'text-[#C8AE7D]'
                      : 'text-[#B86B5E]'
                  }`}
                >
                  {formatTL(lockedInspectReq.licenseCost)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setLockedInspectPlate(null)}
                className="min-h-[40px] rounded-[12px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-300"
              >
                Kapat
              </button>
              <button
                type="button"
                data-testid="unlock-province-confirm-btn"
                disabled={
                  playerLevel < lockedInspectReq.requiredLevel ||
                  playerCash < lockedInspectReq.licenseCost
                }
                onClick={() => {
                  onUnlockProvince?.(lockedInspectReq.plate);
                  setLockedInspectPlate(null);
                  setViewMode('city');
                }}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-45"
              >
                <Unlock className="h-4 w-4" strokeWidth={1.75} />
                <span>İl Lisansını Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECTED DISTRICT OPPORTUNITIES PANEL (IN "Sadece Seçili Şehir" MODE) */}
      {viewMode === 'city' && selectedDistrict && (
        <aside
          data-testid="district-opportunities-panel"
          className="absolute right-3 top-14 z-[530] w-[min(360px,calc(100%-24px))] rounded-[20px] border border-[#334155] bg-[#222B38] p-4 text-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                {activeProvInfo.name} · İlçe Fırsatları
              </p>
              <h3 className="text-base font-bold text-slate-100">{selectedDistrict.name}</h3>
            </div>
            <button
              type="button"
              aria-label="İlçe Panelini Kapat"
              onClick={() => setSelectedDistrict(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-[12px] border border-[#334155] bg-[#181F29] p-2.5">
              <div className="text-[10px] text-slate-400">Yaya Trafiği</div>
              <div className="mt-0.5 font-mono-num font-bold text-[#7A9E7E]">
                {selectedDistrict.footTraffic}x
              </div>
            </div>
            <div className="rounded-[12px] border border-[#334155] bg-[#181F29] p-2.5">
              <div className="text-[10px] text-slate-400">Ticari Talep</div>
              <div className="mt-0.5 font-mono-num font-bold text-[#C8AE7D]">
                {selectedDistrict.businessDemand}x
              </div>
            </div>
          </div>

          {/* District Job Listings Preview */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Briefcase className="h-3.5 w-3.5 text-[#7E96B0]" strokeWidth={1.5} />
              <span>Öne Çıkan İş İlanları</span>
            </div>
            {districtJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-[10px] border border-[#334155] bg-[#181F29] px-2.5 py-1.5 text-[11px]"
              >
                <span className="truncate text-slate-200">{job.title}</span>
                <span className="font-mono-num font-bold text-[#7A9E7E]">
                  {formatTL(job.dailyWage)}/gün
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="district-open-jobs-btn"
              onClick={() => {
                soundEngine.playClick();
                onOpenDistrictJobs?.(activePlate, selectedDistrict.name);
              }}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-[12px] border border-[#7E96B0]/60 bg-[#181F29] px-3 text-xs font-semibold text-slate-100 hover:bg-[#2A3444]"
            >
              <Briefcase className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
              <span>İş İlanları</span>
            </button>

            <button
              type="button"
              data-testid="district-invest-branch-btn"
              onClick={() => handleInvestInDistrict(selectedDistrict)}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-[12px] bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
            >
              <Store className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Şube Kur</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
