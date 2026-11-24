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
import { DEFAULT_PROVINCE_PLATE, TURKEY_BOUNDS, TURKEY_CENTER, getProvinceByPlate } from '../game/provinces81';

interface TurkeyMapProps {
  theme: ThemeMode;
  mapStyle: 'osm' | 'carto';
  activePlate: number;
  ownBusinesses: OwnedBusiness[];
  competitorBusinesses: RemoteBusinessRecord[];
  selectedBusinessId: string | null;
  selectedCompetitorId: string | null;
  droppedPin: PinLocationInfo | null;
  droppedPinBlocked: boolean;
  pinDropMode: boolean;
  flyTarget: { lat: number; lng: number; zoom: number; nonce: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectOwnBusiness: (businessId: string) => void;
  onSelectCompetitor: (record: RemoteBusinessRecord) => void;
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
};

interface MapPinItem {
  id: string;
  lat: number;
  lng: number;
  level: number;
  type: BusinessTypeId;
  isOwn: boolean;
  readyRing: boolean;
  own?: OwnedBusiness;
  competitor?: RemoteBusinessRecord;
}

export function TurkeyMap({
  theme,
  mapStyle,
  activePlate,
  ownBusinesses,
  competitorBusinesses,
  selectedBusinessId,
  selectedCompetitorId,
  droppedPin,
  droppedPinBlocked,
  pinDropMode,
  flyTarget,
  onMapClick,
  onSelectOwnBusiness,
  onSelectCompetitor,
}: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const circleLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(13);

  const onMapClickRef = useRef(onMapClick);
  const onSelectOwnRef = useRef(onSelectOwnBusiness);
  const onSelectCompetitorRef = useRef(onSelectCompetitor);
  onMapClickRef.current = onMapClick;
  onSelectOwnRef.current = onSelectOwnBusiness;
  onSelectCompetitorRef.current = onSelectCompetitor;

  // Mount Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialProv = getProvinceByPlate(DEFAULT_PROVINCE_PLATE);
    const map = L.map(containerRef.current, {
      center: [initialProv.lat, initialProv.lng],
      zoom: initialProv.zoom,
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

  // Render own (Gold/Emerald) & competitor (Crimson/Navy) pins, 75m protection rings, and zoom clustering
  useEffect(() => {
    const map = mapRef.current;
    const circleLayer = circleLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !circleLayer || !markerLayer) return;

    circleLayer.clearLayers();
    markerLayer.clearLayers();

    // Combine businesses in the active city room (plus own businesses across Turkey when zoomed out)
    const visibleOwn =
      zoomLevel <= 9
        ? ownBusinesses
        : ownBusinesses.filter((b) => b.cityPlate === activePlate);

    const items: MapPinItem[] = [
      ...visibleOwn.map((biz) => {
        const cap = calculateVaultCapacity(biz);
        const ratio = cap > 0 ? biz.pendingCash / cap : 0;
        return {
          id: biz.id,
          lat: biz.lat,
          lng: biz.lng,
          level: biz.level,
          type: biz.blueprintId,
          isOwn: true,
          readyRing: ratio >= 0.35,
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
        readyRing: false,
        competitor: rec,
      })),
    ];

    // Draw subtle 75m protection circles when zoomed in enough to read them
    if (zoomLevel >= 13) {
      for (const item of items) {
        L.circle([item.lat, item.lng], {
          radius: MIN_BUSINESS_DISTANCE_METERS,
          color: item.isOwn ? '#059669' : '#DC2626',
          weight: 1,
          opacity: 0.45,
          fillColor: item.isOwn ? '#10B981' : '#EF4444',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(circleLayer);
      }
    }

    // Cluster nearby pins when zoomed out (zoom <= 12)
    const shouldCluster = zoomLevel <= 12;
    const cellSizeDeg = zoomLevel <= 7 ? 0.85 : zoomLevel <= 9 ? 0.25 : zoomLevel <= 11 ? 0.06 : 0.025;

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
          const borderCol = ownCount > 0 ? '#10B981' : '#EF4444';
          const bgCol = ownCount === group.length ? '#065F46' : ownCount > 0 ? '#0F172A' : '#991B1B';

          const clusterIcon = L.divIcon({
            className: 'business-cluster-badge',
            html: `
              <div style="
                transform:translate(-50%,-50%);
                width:40px;height:40px;border-radius:9999px;
                background:${bgCol};color:#FEF08A;
                border:3px solid ${borderCol};
                box-shadow:0 6px 18px rgba(15,23,42,0.45);
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

      // Own = Gold / Emerald, Rival = Crimson Red / Deep Navy
      const bgStyle = item.isOwn
        ? 'linear-gradient(135deg,#D97706,#059669)'
        : 'linear-gradient(135deg,#DC2626,#1E293B)';
      const borderStyle = isSelected
        ? '3px solid #FEF08A'
        : item.isOwn
        ? '2.5px solid #ECFDF5'
        : '2.5px solid #FEE2E2';

      const icon = L.divIcon({
        className: item.isOwn ? 'own-business-marker' : 'rival-business-marker',
        html: `
          <div style="position:relative;transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:${isSelected ? '44px' : '38px'};
              height:${isSelected ? '44px' : '38px'};
              border-radius:12px;
              background:${bgStyle};
              border:${borderStyle};
              box-shadow:0 6px 18px rgba(15,23,42,${isSelected ? '0.52' : '0.38'});
              display:flex;align-items:center;justify-content:center;
              font-size:${isSelected ? '18px' : '16px'};
              position:relative;
            ">
              <span>${glyph}</span>
              <span style="
                position:absolute;bottom:-6px;right:-6px;
                background:${item.isOwn ? '#064E3B' : '#7F1D1D'};color:#FEF08A;
                font-size:9px;font-weight:800;
                padding:1px 4px;border-radius:5px;
                border:1px solid rgba(255,255,255,0.75);
                line-height:1.1;
              ">S${item.level}</span>
              ${
                item.readyRing
                  ? `<span style="position:absolute;top:-5px;left:-5px;width:11px;height:11px;border-radius:9999px;background:#10B981;border:2px solid #FFFFFF;"></span>`
                  : ''
              }
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([item.lat, item.lng], {
        icon,
        zIndexOffset: isSelected ? 800 : item.isOwn ? 560 : 480,
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
