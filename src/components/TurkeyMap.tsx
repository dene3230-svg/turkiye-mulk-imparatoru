import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Plus, Minus, Compass } from 'lucide-react';
import type { OwnedBusiness, PinLocationInfo, ThemeMode } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import { calculateVaultCapacity } from '../game/economy';
import { TURKEY_BOUNDS, TURKEY_CENTER } from '../game/turkeyGeo';

interface TurkeyMapProps {
  theme: ThemeMode;
  mapStyle: 'osm' | 'carto';
  businesses: OwnedBusiness[];
  selectedBusinessId: string | null;
  droppedPin: PinLocationInfo | null;
  pinDropMode: boolean;
  flyTarget: { lat: number; lng: number; zoom: number; nonce: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  onSelectBusiness: (businessId: string) => void;
}

const TILE_URLS = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  cartoLight: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  cartoDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

const ICON_GLYPHS: Record<string, string> = {
  coffee: '☕',
  utensils: '🍽',
  home: '🏢',
  laptop: '💻',
  'shopping-bag': '🛍',
  hotel: '🏨',
  truck: '🚛',
  building: '🏛',
};

export function TurkeyMap({
  theme,
  mapStyle,
  businesses,
  selectedBusinessId,
  droppedPin,
  pinDropMode,
  flyTarget,
  onMapClick,
  onSelectBusiness,
}: TurkeyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const businessLayerRef = useRef<L.LayerGroup | null>(null);
  const droppedPinMarkerRef = useRef<L.Marker | null>(null);

  const onMapClickRef = useRef(onMapClick);
  const onSelectBusinessRef = useRef(onSelectBusiness);
  onMapClickRef.current = onMapClick;
  onSelectBusinessRef.current = onSelectBusiness;

  // Mount Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [41.015, 28.985], // Start cleanly centered on Istanbul for immediate rich street detail
      zoom: 12,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: L.latLngBounds(
        L.latLng(TURKEY_BOUNDS[0][0] - 1.5, TURKEY_BOUNDS[0][1] - 2),
        L.latLng(TURKEY_BOUNDS[1][0] + 1.5, TURKEY_BOUNDS[1][1] + 2)
      ),
      zoomControl: false,
      attributionControl: true,
    });

    const businessLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    businessLayerRef.current = businessLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClickRef.current(e.latlng.lat, e.latlng.lng);
    });

    // Resize observer so landscape transitions / split panels keep map tiles crisp
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      businessLayerRef.current = null;
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

  // Smooth fly-to when requested by city jump or portfolio selection
  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom, {
      duration: 0.75,
    });
  }, [flyTarget]);

  // Render dropped pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (droppedPinMarkerRef.current) {
      map.removeLayer(droppedPinMarkerRef.current);
      droppedPinMarkerRef.current = null;
    }

    if (!droppedPin) return;

    const icon = L.divIcon({
      className: 'custom-drop-pin',
      html: `
        <div style="position:relative;width:44px;height:44px;transform:translate(-50%,-100%);pointer-events:none;">
          <div class="pin-pulse-ring" style="position:absolute;left:50%;top:88%;width:30px;height:30px;border-radius:9999px;border:2.5px solid #D97706;background:rgba(217,119,6,0.2);"></div>
          <div style="position:absolute;left:50%;top:4px;transform:translateX(-50%);width:32px;height:32px;border-radius:9999px 9999px 9999px 0;background:linear-gradient(135deg,#F59E0B,#B45309);border:2.5px solid #FFFFFF;box-shadow:0 6px 16px rgba(15,23,42,0.45);transform-origin:center;rotate:-45deg;display:flex;align-items:center;justify-content:center;">
            <span style="rotate:45deg;font-size:13px;font-weight:800;color:#FFFFFF;">+</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    droppedPinMarkerRef.current = L.marker([droppedPin.lat, droppedPin.lng], {
      icon,
      interactive: false,
      zIndexOffset: 900,
    }).addTo(map);
  }, [droppedPin]);

  // Render owned business markers
  useEffect(() => {
    const layer = businessLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const biz of businesses) {
      const bp = getBlueprintById(biz.blueprintId);
      const color = bp?.accentColor ?? '#D97706';
      const glyph = ICON_GLYPHS[bp?.iconKey ?? 'building'] ?? '🏢';
      const isSelected = biz.id === selectedBusinessId;
      const cap = calculateVaultCapacity(biz);
      const ratio = cap > 0 ? biz.pendingCash / cap : 0;
      const readyRing = ratio >= 0.35;

      const icon = L.divIcon({
        className: 'owned-business-marker',
        html: `
          <div style="position:relative;transform:translate(-50%,-50%);cursor:pointer;display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:${isSelected ? '42px' : '36px'};
              height:${isSelected ? '42px' : '36px'};
              border-radius:12px;
              background:${color};
              border:${isSelected ? '3px solid #FEF08A' : '2px solid #FFFFFF'};
              box-shadow:0 6px 18px rgba(15,23,42,${isSelected ? '0.5' : '0.35'});
              display:flex;align-items:center;justify-content:center;
              font-size:${isSelected ? '18px' : '16px'};
              position:relative;
            ">
              <span>${glyph}</span>
              <span style="
                position:absolute;bottom:-6px;right:-6px;
                background:#0F172A;color:#FDE68A;
                font-size:9px;font-weight:700;
                padding:1px 4px;border-radius:5px;
                border:1px solid rgba(255,255,255,0.65);
                line-height:1.1;
              ">S${biz.level}</span>
              ${
                readyRing
                  ? `<span style="position:absolute;top:-5px;left:-5px;width:12px;height:12px;border-radius:9999px;background:#10B981;border:2px solid #FFFFFF;box-shadow:0 0 0 2px rgba(16,185,129,0.35);"></span>`
                  : ''
              }
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([biz.lat, biz.lng], {
        icon,
        zIndexOffset: isSelected ? 750 : 500,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectBusinessRef.current(biz.id);
      });

      marker.addTo(layer);
    }
  }, [businesses, selectedBusinessId]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetTurkey = () =>
    mapRef.current?.flyTo(TURKEY_CENTER, 6, { duration: 0.85 });

  return (
    <div
      className={`relative h-full w-full ${pinDropMode ? 'cursor-crosshair' : ''}`}
      data-testid="turkey-map"
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Compact Left-Side Map Controls */}
      <div className="pointer-events-auto absolute left-[max(12px,var(--safe-left))] top-1/2 z-[400] flex -translate-y-1/2 flex-col gap-1.5">
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
