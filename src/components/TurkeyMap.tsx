import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Plus, Minus, Compass } from 'lucide-react';
import type {
  BusinessTypeId,
  OwnedBusiness,
  PinLocationInfo,
  RemoteBusinessRecord,
  ThemeMode,
} from '../types/game';
import { MIN_BUSINESS_DISTANCE_METERS } from '../game/catalog';
import { calculateVaultCapacity } from '../game/economy';
import {
  DEFAULT_PROVINCE_PLATE,
  TURKEY_BOUNDS,
  TURKEY_CENTER,
  getProvinceByPlate,
} from '../game/provinces81';
import { getBrandLogoSvgString } from './BrandLogo';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  computeWorldDbStats,
  fetchAllWorldBusinesses,
  isRealPlayerBusiness,
  parseOwnerAndHolding,
  subscribeToGlobalBusinesses,
  syncPlayerBusinessesToWorld,
  type RoomSyncStatus,
  type WorldDbSyncSnapshot,
} from '../services/cityRoom';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateLabel(text: string, maxLen = 18): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
}

interface TurkeyMapProps {
  theme: ThemeMode;
  mapStyle: 'osm' | 'carto';
  activePlate: number;
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
  onMapClick: (lat: number, lng: number) => void;
  onSelectOwnBusiness: (businessId: string) => void;
  onSelectCompetitor: (record: RemoteBusinessRecord) => void;
  onWorldSyncUpdate?: (snapshot: WorldDbSyncSnapshot) => void;
  onRemoteInsert?: (record: RemoteBusinessRecord) => void;
  onRemoteUpdate?: (record: RemoteBusinessRecord) => void;
  onRemoteDelete?: (id: string) => void;
}

const TILE_URLS = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  cartoLight: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  cartoDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const TYPE_GLYPHS: Record<BusinessTypeId, string> = {
  kafe: '☕',
  internet_kafe: '🖥',
  ps_salonu: '🎮',
  oyun_merkezi: '🥽',
  restoran: '🍽',
  supermarket: '🛒',
  otel: '🏨',
  avm: '🏬',
  otopark: '🅿️',
  katli_otopark: '🚗',
  gida_fabrikasi: '🏭',
  elektronik_fabrikasi: '⚙️',
  tekstil_fabrikasi: '🧵',
  enerji_santrali: '⚡',
};

interface MapPinItem {
  id: string;
  lat: number;
  lng: number;
  level: number;
  type: BusinessTypeId;
  isOwn: boolean;
  isRealPlayer: boolean;
  readyRing: boolean;
  constructionDaysRemaining?: number;
  own?: OwnedBusiness;
  competitor?: RemoteBusinessRecord;
}

export function TurkeyMap({
  theme,
  mapStyle,
  activePlate,
  currentUserId,
  ownBusinesses,
  localSyncRecords,
  competitorBusinesses,
  syncRefreshNonce = 0,
  selectedBusinessId,
  selectedCompetitorId,
  droppedPin,
  droppedPinBlocked,
  pinDropMode,
  initialCenter,
  flyTarget,
  onMapClick,
  onSelectOwnBusiness,
  onSelectCompetitor,
  onWorldSyncUpdate,
  onRemoteInsert,
  onRemoteUpdate,
  onRemoteDelete,
}: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);
  const initialCenterRef = useRef(initialCenter);
  const [zoomLevel, setZoomLevel] = useState<number>(initialCenter?.zoom ?? 13);

  const onMapClickRef = useRef(onMapClick);
  const onSelectOwnRef = useRef(onSelectOwnBusiness);
  const onSelectCompetitorRef = useRef(onSelectCompetitor);
  const onWorldSyncUpdateRef = useRef(onWorldSyncUpdate);
  const onRemoteInsertRef = useRef(onRemoteInsert);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onRemoteDeleteRef = useRef(onRemoteDelete);
  const localSyncRecordsRef = useRef(localSyncRecords);
  const currentUserIdRef = useRef(currentUserId);
  const dbRecordsRef = useRef<RemoteBusinessRecord[]>([]);
  const roomStatusRef = useRef<RoomSyncStatus>('connecting');
  const syncErrorRef = useRef<string | null>(null);

  onMapClickRef.current = onMapClick;
  onSelectOwnRef.current = onSelectOwnBusiness;
  onSelectCompetitorRef.current = onSelectCompetitor;
  onWorldSyncUpdateRef.current = onWorldSyncUpdate;
  onRemoteInsertRef.current = onRemoteInsert;
  onRemoteUpdateRef.current = onRemoteUpdate;
  onRemoteDeleteRef.current = onRemoteDelete;
  localSyncRecordsRef.current = localSyncRecords;
  currentUserIdRef.current = currentUserId;

  // ============================================================================
  // SINGLE CENTRALIZED MULTIPLAYER MAP SYNC (UPSERT OWN -> SELECT '*' -> REALTIME)
  // ============================================================================
  const emitSnapshot = (loading = false) => {
    const ownIds = new Set(localSyncRecordsRef.current.map((r) => r.id));
    const stats = computeWorldDbStats(dbRecordsRef.current, currentUserIdRef.current, ownIds);
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

  const syncWorldNowRef = useRef<(() => Promise<void>) | null>(null);
  syncWorldNowRef.current = async () => {
    let latestError: string | null = null;
    const ownLocal = localSyncRecordsRef.current;

    // 1) Upsert all local player businesses into `public.businesses`
    if (ownLocal.length > 0) {
      const upsertRes = await syncPlayerBusinessesToWorld(ownLocal);
      if (!upsertRes.ok && upsertRes.error) {
        latestError = upsertRes.error;
      }
    }

    // 2) Fetch ALL businesses across Turkey (`select('*')` without city restriction)
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

  // Mount-level single unified sync + Realtime subscription + 15s fallback poll
  useEffect(() => {
    let active = true;
    emitSnapshot(true);

    const runSync = async () => {
      if (!active) return;
      await syncWorldNowRef.current?.();
    };

    runSync();

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
      onInsert: (rec) => {
        if (!active) return;
        onRemoteInsertRef.current?.(rec);
      },
      onUpdate: (rec) => {
        if (!active) return;
        onRemoteUpdateRef.current?.(rec);
      },
      onDelete: (id) => {
        if (!active) return;
        dbRecordsRef.current = applyRealtimeBusinessDelete(dbRecordsRef.current, id);
        emitSnapshot(false);
        onRemoteDeleteRef.current?.(id);
      },
      onStatus: (status) => {
        if (!active) return;
        roomStatusRef.current = status;
        emitSnapshot(false);
      },
      onReconnect: () => {
        if (!active) return;
        runSync();
      },
    });

    const pollTimer = window.setInterval(() => {
      if (active) runSync();
    }, 15_000);

    const handleOnline = () => {
      if (active) runSync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, []);

  // Re-sync whenever player builds/upgrades/acquires branches or clicks manual refresh
  const portfolioSyncSig = `${currentUserId ?? ''}|${syncRefreshNonce}|${localSyncRecords
    .map((r) => `${r.id}@${r.level}:${r.business_name}:${r.owner_name}`)
    .join(',')}`;
  const lastSigRef = useRef<string>('');
  useEffect(() => {
    if (lastSigRef.current === '') {
      lastSigRef.current = portfolioSyncSig;
      return;
    }
    if (lastSigRef.current === portfolioSyncSig) return;
    lastSigRef.current = portfolioSyncSig;
    syncWorldNowRef.current?.();
  }, [portfolioSyncSig]);

  // Mount Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialProv = getProvinceByPlate(DEFAULT_PROVINCE_PLATE);
    const startView = initialCenterRef.current ?? {
      lat: initialProv.lat,
      lng: initialProv.lng,
      zoom: initialProv.zoom,
    };
    const map = L.map(containerRef.current, {
      center: [startView.lat, startView.lng],
      zoom: startView.zoom,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: L.latLngBounds(
        L.latLng(TURKEY_BOUNDS[0][0] - 1.5, TURKEY_BOUNDS[0][1] - 2),
        L.latLng(TURKEY_BOUNDS[1][0] + 1.5, TURKEY_BOUNDS[1][1] + 2)
      ),
      zoomControl: false,
      attributionControl: true,
    });

    const circleLayer = L.layerGroup().addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    circleLayerRef.current = circleLayer;
    markerLayerRef.current = markerLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      circleLayerRef.current = null;
      markerLayerRef.current = null;
      droppedPinMarkerRef.current = null;
    };
  }, []);

  // Swap tile layer cleanly when theme or mapStyle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const isCarto = mapStyle === 'carto';
    const url = isCarto
      ? theme === 'dark'
        ? TILE_URLS.cartoDark
        : TILE_URLS.cartoLight
      : TILE_URLS.osm;

    const attribution = isCarto
      ? '&copy; OpenStreetMap &copy; CARTO'
      : '&copy; OpenStreetMap';

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      subdomains: isCarto ? 'abcd' : 'abc',
      maxZoom: 19,
    }).addTo(map);
  }, [theme, mapStyle]);

  // Smooth fly-to when requested
  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom, {
      duration: 0.75,
    });
  }, [flyTarget]);

  // Render dropped pin marker (Gold when valid/checking, Red when blocked by water or 75m rule)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (droppedPinMarkerRef.current) {
      map.removeLayer(droppedPinMarkerRef.current);
      droppedPinMarkerRef.current = null;
    }

    if (!droppedPin) return;

    const isBlocked =
      droppedPinBlocked ||
      droppedPin.landStatus === 'water' ||
      droppedPin.landStatus === 'invalid';
    const ringColor = isBlocked ? '#DC2626' : '#D97706';
    const bgGrad = isBlocked
      ? 'linear-gradient(135deg,#EF4444,#991B1B)'
      : 'linear-gradient(135deg,#F59E0B,#B45309)';
    const symbol = isBlocked ? '!' : '+';

    const icon = L.divIcon({
      className: 'custom-drop-pin',
      html: `
        <div style="position:relative;width:44px;height:44px;transform:translate(-50%,-100%);pointer-events:none;">
          <div class="pin-pulse-ring" style="position:absolute;left:50%;top:88%;width:30px;height:30px;border-radius:9999px;border:2.5px solid ${ringColor};background:${isBlocked ? 'rgba(220,38,38,0.22)' : 'rgba(217,119,6,0.2)'};"></div>
          <div style="position:absolute;left:50%;top:4px;transform:translateX(-50%);width:32px;height:32px;border-radius:9999px 9999px 9999px 0;background:${bgGrad};border:2.5px solid #FFFFFF;box-shadow:0 6px 16px rgba(15,23,42,0.45);transform-origin:center;rotate:-45deg;display:flex;align-items:center;justify-content:center;">
            <span style="rotate:45deg;font-size:14px;font-weight:800;color:#FFFFFF;">${symbol}</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    droppedPinMarkerRef.current = L.marker([droppedPin.lat, droppedPin.lng], {
      icon,
      interactive: false,
      zIndexOffset: 950,
    }).addTo(map);
  }, [droppedPin, droppedPinBlocked]);

  // Render own (Gold/Emerald) & other players' (Bright Red + Player Name) pins, 75m rings & clustering
  useEffect(() => {
    const map = mapRef.current;
    const circleLayer = circleLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !circleLayer || !markerLayer) return;

    circleLayer.clearLayers();
    markerLayer.clearLayers();

    const items: MapPinItem[] = [
      ...ownBusinesses.map((biz) => {
        const cap = calculateVaultCapacity(biz);
        const ratio = cap > 0 ? biz.pendingCash / cap : 0;
        const remDays = biz.constructionDaysRemaining ?? 0;
        return {
          id: biz.id,
          lat: biz.lat,
          lng: biz.lng,
          level: biz.level,
          type: biz.blueprintId,
          isOwn: true,
          isRealPlayer: false,
          readyRing: remDays === 0 && ratio >= 0.35,
          constructionDaysRemaining: remDays,
          own: biz,
        };
      }),
      ...competitorBusinesses.map((rec) => ({
        id: rec.id,
        lat: rec.lat,
        lng: rec.lng,
        level: rec.level,
        type: rec.business_type,
        isOwn: false,
        isRealPlayer: isRealPlayerBusiness(rec),
        readyRing: false,
        competitor: rec,
      })),
    ];

    // Draw subtle 75m protection circles when zoomed in
    if (zoomLevel >= 13) {
      for (const item of items) {
        const strokeCol = item.isOwn
          ? '#059669'
          : item.isRealPlayer
          ? '#DC2626'
          : '#991B1B';
        const fillCol = item.isOwn
          ? '#10B981'
          : item.isRealPlayer
          ? '#EF4444'
          : '#DC2626';
        L.circle([item.lat, item.lng], {
          radius: MIN_BUSINESS_DISTANCE_METERS,
          color: strokeCol,
          weight: item.isRealPlayer ? 1.8 : 1,
          opacity: 0.55,
          fillColor: fillCol,
          fillOpacity: item.isRealPlayer ? 0.14 : 0.1,
          interactive: false,
        }).addTo(circleLayer);
      }
    }

    // Cluster nearby pins only when zoomed out wide (zoom <= 10) so city-level red player pins stay clearly visible
    const shouldCluster = zoomLevel <= 10;
    const cellSizeDeg = zoomLevel <= 7 ? 0.85 : zoomLevel <= 9 ? 0.25 : 0.08;

    if (shouldCluster && items.length > 1) {
      const buckets = new Map<string, MapPinItem[]>();
      for (const item of items) {
        const key = `${Math.floor(item.lat / cellSizeDeg)}:${Math.floor(item.lng / cellSizeDeg)}`;
        const arr = buckets.get(key);
        if (arr) arr.push(item);
        else buckets.set(key, [item]);
      }

      for (const group of buckets.values()) {
        if (group.length > 1) {
          const avgLat = group.reduce((s, i) => s + i.lat, 0) / group.length;
          const avgLng = group.reduce((s, i) => s + i.lng, 0) / group.length;
          const ownCount = group.filter((g) => g.isOwn).length;
          const realCount = group.filter((g) => g.isRealPlayer).length;
          const borderCol =
            realCount > 0 ? '#FCA5A5' : ownCount > 0 ? '#10B981' : '#EF4444';
          const bgCol =
            ownCount === group.length
              ? '#065F46'
              : realCount > 0
              ? 'linear-gradient(135deg,#EF4444,#991B1B)'
              : ownCount > 0
              ? '#0F172A'
              : '#991B1B';

          const clusterIcon = L.divIcon({
            className: 'business-cluster-badge',
            html: `
              <div style="
                transform:translate(-50%,-50%);
                width:40px;height:40px;border-radius:9999px;
                background:${bgCol};color:#FFFFFF;
                border:3px solid ${borderCol};
                box-shadow:0 6px 18px rgba(15,23,42,0.48);
                display:flex;align-items:center;justify-content:center;
                font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;
                cursor:pointer;
              ">${group.length}</div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const marker = L.marker([avgLat, avgLng], { icon: clusterIcon, zIndexOffset: 600 });
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            map.flyTo([avgLat, avgLng], Math.min(15, zoomLevel + 2), { duration: 0.55 });
          });
          marker.addTo(markerLayer);
          continue;
        }

        renderSingleMarker(group[0], markerLayer);
      }
    } else {
      for (const item of items) {
        renderSingleMarker(item, markerLayer);
      }
    }

    function renderSingleMarker(item: MapPinItem, targetLayer: L.LayerGroup) {
      const glyph = TYPE_GLYPHS[item.type] ?? '🏢';
      const isSelected = item.isOwn
        ? item.id === selectedBusinessId
        : item.id === selectedCompetitorId;

      const markerSize = isSelected ? 44 : 38;
      const isUnderConstruction = item.isOwn && (item.constructionDaysRemaining ?? 0) > 0;
      const borderStyle = isSelected
        ? '3px solid #FEF08A'
        : isUnderConstruction
        ? '2.5px dashed #FEF08A'
        : item.isOwn
        ? '2.5px solid #ECFDF5'
        : item.isRealPlayer
        ? '2.5px solid #FFFFFF'
        : '2.5px solid #FCA5A5';

      const parsedOwner =
        !item.isOwn && item.competitor
          ? parseOwnerAndHolding(item.competitor.owner_name, item.competitor.company_name)
          : null;

      const innerContent = item.isOwn
        ? isUnderConstruction
          ? '<span>🏗️</span>'
          : `<span>${glyph}</span>`
        : item.isRealPlayer
        ? `<span>${glyph}</span>`
        : item.competitor
        ? getBrandLogoSvgString(parsedOwner?.holdingName || item.competitor.owner_name, markerSize - 8)
        : `<span>${glyph}</span>`;

      // Own Active = Gold/Emerald | Own Construction = Amber | Real Player = Bold Crimson Red | AI = Dark Red/Slate
      const bgStyle = isUnderConstruction
        ? 'linear-gradient(135deg,#F59E0B,#92400E)'
        : item.isOwn
        ? 'linear-gradient(135deg,#D97706,#059669)'
        : item.isRealPlayer
        ? 'linear-gradient(135deg,#EF4444,#B91C1C)'
        : 'linear-gradient(135deg,#7F1D1D,#0F172A)';

      const badgeBg = isUnderConstruction
        ? '#78350F'
        : item.isOwn
        ? '#064E3B'
        : item.isRealPlayer
        ? '#991B1B'
        : '#7F1D1D';

      const glowShadow = item.isRealPlayer
        ? '0 0 0 3px rgba(239,68,68,0.42), 0 6px 18px rgba(153,27,27,0.55)'
        : `0 6px 18px rgba(15,23,42,${isSelected ? '0.52' : '0.4'})`;

      // Real competitor player name tag sits prominently right above/on the red pin
      const realPlayerTopTagHtml =
        !item.isOwn && item.isRealPlayer && parsedOwner
          ? `<div
              data-testid="real-player-pin-label"
              style="
                margin-bottom:3px;
                max-width:142px;
                padding:2px 7px;
                border-radius:9999px;
                background:rgba(185,28,28,0.96);
                border:1.5px solid #FEE2E2;
                color:#FFFFFF;
                font-size:10px;
                font-weight:800;
                line-height:1.15;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                box-shadow:0 3px 8px rgba(0,0,0,0.45);
                pointer-events:none;
              ">${escapeHtml(truncateLabel(parsedOwner.playerName, 20))}</div>`
          : '';

      const bottomTagHtml = isUnderConstruction
        ? `<div style="
              margin-top:4px;
              padding:1.5px 6px;
              border-radius:9999px;
              background:rgba(120,53,15,0.95);
              border:1px solid rgba(251,191,36,0.9);
              color:#FEF3C7;
              font-size:9px;
              font-weight:800;
              line-height:1.2;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.45);
              pointer-events:none;
            ">🏗️ ${item.constructionDaysRemaining}g Kaldı</div>`
        : !item.isOwn && !item.isRealPlayer && parsedOwner
        ? `<div style="
              margin-top:4px;
              max-width:124px;
              padding:1.5px 6px;
              border-radius:9999px;
              background:rgba(15,23,42,0.9);
              border:1px solid rgba(248,113,113,0.6);
              color:#FEE2E2;
              font-size:9px;
              font-weight:800;
              line-height:1.2;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
              box-shadow:0 2px 6px rgba(0,0,0,0.45);
              pointer-events:none;
            ">${escapeHtml(truncateLabel(parsedOwner.holdingName || parsedOwner.playerName, 16))}</div>`
        : '';

      const pinTitle = item.isOwn
        ? isUnderConstruction
          ? `${item.own?.customName ?? 'Şubem'} (İnşaat: ${item.constructionDaysRemaining} gün kaldı)`
          : `${item.own?.customName ?? 'Şubem'} (S${item.level})`
        : `${item.competitor?.business_name ?? 'Rakip'} · ${parsedOwner?.playerName ?? ''}`;

      const icon = L.divIcon({
        className: item.isOwn
          ? 'own-business-marker'
          : item.isRealPlayer
          ? 'real-player-business-marker'
          : 'rival-business-marker',
        html: `
          <div
            data-player-type="${item.isOwn ? 'own' : item.isRealPlayer ? 'real' : 'ai'}"
            data-business-id="${escapeHtml(item.id)}"
            data-under-construction="${isUnderConstruction ? 'true' : 'false'}"
            style="position:relative;transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center;"
          >
            ${realPlayerTopTagHtml}
            <div style="
              width:${markerSize}px;
              height:${markerSize}px;
              border-radius:${item.isRealPlayer ? '9999px' : '12px'};
              background:${bgStyle};
              border:${borderStyle};
              box-shadow:${glowShadow};
              display:flex;align-items:center;justify-content:center;
              font-size:${isSelected ? '18px' : '16px'};
              position:relative;
              overflow:visible;
            ">
              ${innerContent}
              <span style="
                position:absolute;bottom:-6px;right:-6px;
                background:${badgeBg};color:#FEF08A;
                font-size:9px;font-weight:800;
                padding:1px 4px;border-radius:5px;
                border:1px solid rgba(255,255,255,0.85);
                line-height:1.1;
              ">${isUnderConstruction ? `${item.constructionDaysRemaining}g` : `S${item.level}`}</span>
              ${
                item.readyRing
                  ? `<span style="position:absolute;top:-5px;left:-5px;width:11px;height:11px;border-radius:9999px;background:#10B981;border:2px solid #FFFFFF;"></span>`
                  : item.isRealPlayer
                  ? `<span style="position:absolute;top:-4px;left:-4px;width:11px;height:11px;border-radius:9999px;background:#EF4444;border:2px solid #FFFFFF;box-shadow:0 0 8px #EF4444;"></span>`
                  : ''
              }
            </div>
            ${bottomTagHtml}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([item.lat, item.lng], {
        icon,
        title: pinTitle,
        alt: pinTitle,
        zIndexOffset: isSelected ? 820 : item.isRealPlayer ? 660 : item.isOwn ? 560 : 480,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (item.isOwn && item.own) {
          onSelectOwnRef.current(item.own.id);
        } else if (item.competitor) {
          onSelectCompetitorRef.current(item.competitor);
        }
      });

      marker.addTo(targetLayer);
    }
  }, [
    ownBusinesses,
    competitorBusinesses,
    activePlate,
    selectedBusinessId,
    selectedCompetitorId,
    zoomLevel,
  ]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetTurkey = () =>
    mapRef.current?.flyTo(TURKEY_CENTER, 6, { duration: 0.85 });

  return (
    <div
      className={`relative h-full w-full ${pinDropMode ? 'cursor-crosshair' : ''} ${
        mapStyle === 'osm' ? 'map-dark-osm' : ''
      }`}
      data-testid="turkey-map"
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Compact Left-Side Map Controls with Safe-Area Margin */}
      <div
        data-testid="map-zoom-controls"
        className="pointer-events-auto absolute left-[max(14px,calc(var(--safe-left)+12px))] top-1/2 z-[400] flex -translate-y-1/2 flex-col gap-1.5"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Haritayı Yakınlaştır"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-800 shadow-md transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Haritayı Uzaklaştır"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-800 shadow-md transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetTurkey}
          aria-label="Tüm Türkiye Haritasını Göster"
          title="Türkiye Geneli"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-amber-700 shadow-md transition-colors hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900/95 dark:text-amber-400 dark:hover:bg-slate-800"
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
