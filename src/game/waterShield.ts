import type { LandValidationResult } from '../types/game';
import { isPointInTurkey } from './provinces81';

interface WaterEllipse {
  name: string;
  lat: number;
  lng: number;
  rLat: number;
  rLng: number;
}

interface WaterPolygon {
  name: string;
  points: [number, number][]; // [lat, lng]
}

// Major Turkish lakes & coastal basins (fast local offline shield)
const WATER_ELLIPSES: WaterEllipse[] = [
  { name: 'Marmara Denizi', lat: 40.72, lng: 28.25, rLat: 0.25, rLng: 0.98 },
  { name: 'Marmara Denizi (Doğu)', lat: 40.82, lng: 28.98, rLat: 0.14, rLng: 0.34 },
  { name: 'İzmit Körfezi', lat: 40.735, lng: 29.66, rLat: 0.04, rLng: 0.23 },
  { name: 'Gemlik Körfezi', lat: 40.44, lng: 28.95, rLat: 0.06, rLng: 0.19 },
  { name: 'Büyükçekmece Gölü', lat: 41.045, lng: 28.56, rLat: 0.032, rLng: 0.032 },
  { name: 'Küçükçekmece Gölü', lat: 41.008, lng: 28.755, rLat: 0.025, rLng: 0.022 },
  { name: 'Terkos (Durusu) Gölü', lat: 41.318, lng: 28.555, rLat: 0.028, rLng: 0.065 },
  { name: 'Sapanca Gölü', lat: 40.716, lng: 30.26, rLat: 0.024, rLng: 0.072 },
  { name: 'İznik Gölü', lat: 40.435, lng: 29.52, rLat: 0.048, rLng: 0.145 },
  { name: 'Ulubat Gölü', lat: 40.165, lng: 28.59, rLat: 0.055, rLng: 0.095 },
  { name: 'Manyas (Kuş) Gölü', lat: 40.19, lng: 27.97, rLat: 0.055, rLng: 0.085 },
  { name: 'Van Gölü', lat: 38.63, lng: 42.92, rLat: 0.34, rLng: 0.56 },
  { name: 'Van Gölü (Tatvan Koyu)', lat: 38.52, lng: 42.48, rLat: 0.16, rLng: 0.24 },
  { name: 'Tuz Gölü', lat: 38.76, lng: 33.41, rLat: 0.34, rLng: 0.22 },
  { name: 'Eğirdir Gölü', lat: 38.04, lng: 30.87, rLat: 0.21, rLng: 0.085 },
  { name: 'Beyşehir Gölü', lat: 37.78, lng: 31.52, rLat: 0.16, rLng: 0.14 },
  { name: 'Burdur Gölü', lat: 37.74, lng: 30.18, rLat: 0.09, rLng: 0.075 },
  { name: 'Salda Gölü', lat: 37.545, lng: 29.68, rLat: 0.032, rLng: 0.035 },
  { name: 'Acıgöl', lat: 37.82, lng: 29.88, rLat: 0.045, rLng: 0.08 },
  { name: 'Akşehir Gölü', lat: 38.55, lng: 31.42, rLat: 0.075, rLng: 0.1 },
  { name: 'Eber Gölü', lat: 38.66, lng: 31.15, rLat: 0.045, rLng: 0.075 },
  { name: 'Bafa Gölü', lat: 37.503, lng: 27.455, rLat: 0.032, rLng: 0.068 },
  { name: 'Köyceğiz Gölü', lat: 36.915, lng: 28.65, rLat: 0.045, rLng: 0.045 },
  { name: 'Çıldır Gölü', lat: 41.04, lng: 43.255, rLat: 0.072, rLng: 0.065 },
  { name: 'Hazar Gölü', lat: 38.495, lng: 39.42, rLat: 0.035, rLng: 0.095 },
  { name: 'İzmir Körfezi', lat: 38.45, lng: 26.95, rLat: 0.08, rLng: 0.17 },
  { name: 'Antalya Körfezi', lat: 36.68, lng: 30.85, rLat: 0.18, rLng: 0.48 },
  { name: 'İskenderun Körfezi', lat: 36.65, lng: 35.85, rLat: 0.22, rLng: 0.28 },
  { name: 'Atatürk Baraj Gölü', lat: 37.65, lng: 38.52, rLat: 0.12, rLng: 0.22 },
  { name: 'Keban Baraj Gölü', lat: 38.82, lng: 39.18, rLat: 0.09, rLng: 0.22 },
  { name: 'Hirfanlı Baraj Gölü', lat: 39.21, lng: 33.58, rLat: 0.075, rLng: 0.07 },
];

// Precise polygons for Istanbul Bosphorus, Golden Horn, Dardanelles & surrounding seas
const WATER_POLYGONS: WaterPolygon[] = [
  {
    name: 'İstanbul Boğazı',
    points: [
      [41.002, 28.993],
      [41.018, 28.995],
      [41.035, 29.008],
      [41.055, 29.044],
      [41.084, 29.059],
      [41.115, 29.064],
      [41.155, 29.067],
      [41.21, 29.108],
      [41.21, 29.135],
      [41.155, 29.089],
      [41.115, 29.085],
      [41.082, 29.077],
      [41.05, 29.064],
      [41.028, 29.027],
      [41.006, 29.013],
      [40.992, 29.012],
    ],
  },
  {
    name: 'Haliç',
    points: [
      [41.018, 28.976],
      [41.029, 28.959],
      [41.044, 28.943],
      [41.057, 28.944],
      [41.057, 28.952],
      [41.044, 28.951],
      [41.031, 28.967],
      [41.021, 28.983],
    ],
  },
  {
    name: 'Çanakkale Boğazı',
    points: [
      [40.04, 26.2],
      [40.14, 26.36],
      [40.25, 26.52],
      [40.42, 26.68],
      [40.4, 26.73],
      [40.22, 26.57],
      [40.11, 26.41],
      [40.01, 26.25],
    ],
  },
];

function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0];
    const xi = poly[i][1];
    const yj = poly[j][0];
    const xj = poly[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkLocalWaterShield(lat: number, lng: number): LandValidationResult | null {
  if (!isPointInTurkey(lat, lng)) {
    return {
      status: 'invalid',
      isLand: false,
      reason: 'Seçilen nokta Türkiye sınırları dışındadır.',
      source: 'local-shield',
    };
  }

  // Open sea offshore guards (Black Sea north, Aegean west, Mediterranean south)
  if (lat > 41.38 && lng < 31.2) {
    return {
      status: 'water',
      isLand: false,
      waterBodyName: 'Karadeniz',
      reason: 'Karadeniz üzerine inşaat yapılamaz! Lütfen kara üzerinde bir nokta seçin.',
      source: 'local-shield',
    };
  }
  if (lat > 41.78 && lng > 36.2) {
    return {
      status: 'water',
      isLand: false,
      waterBodyName: 'Karadeniz',
      reason: 'Karadeniz üzerine inşaat yapılamaz! Lütfen kara üzerinde bir nokta seçin.',
      source: 'local-shield',
    };
  }
  if (lng < 26.15 && lat < 39.8) {
    return {
      status: 'water',
      isLand: false,
      waterBodyName: 'Ege Denizi',
      reason: 'Ege Denizi üzerine inşaat yapılamaz! Lütfen kara üzerinde bir nokta seçin.',
      source: 'local-shield',
    };
  }
  if (lat < 36.02 && lng < 35.6) {
    return {
      status: 'water',
      isLand: false,
      waterBodyName: 'Akdeniz',
      reason: 'Akdeniz üzerine inşaat yapılamaz! Lütfen kara üzerinde bir nokta seçin.',
      source: 'local-shield',
    };
  }

  for (const poly of WATER_POLYGONS) {
    if (pointInPolygon(lat, lng, poly.points)) {
      return {
        status: 'water',
        isLand: false,
        waterBodyName: poly.name,
        reason: `${poly.name} su kütlesi üzerine inşaat yasaktır! Lütfen kara üzerinde bir nokta seçin.`,
        source: 'local-shield',
      };
    }
  }

  for (const body of WATER_ELLIPSES) {
    const dLat = (lat - body.lat) / body.rLat;
    const dLng = (lng - body.lng) / body.rLng;
    if (dLat * dLat + dLng * dLng <= 1.0) {
      return {
        status: 'water',
        isLand: false,
        waterBodyName: body.name,
        reason: `${body.name} üzerine inşaat yasaktır! Lütfen kara üzerinde bir nokta seçin.`,
        source: 'local-shield',
      };
    }
  }

  return null;
}

export interface NominatimReversePayload {
  error?: string;
  category?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  name?: string;
  display_name?: string;
  address?: {
    country_code?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    town?: string;
    city?: string;
    village?: string;
    hamlet?: string;
    city_district?: string;
    county?: string;
    province?: string;
    state?: string;
    residential?: string;
    commercial?: string;
    water?: string;
    sea?: string;
    bay?: string;
    lake?: string;
    river?: string;
    strait?: string;
  };
}

const WATER_KEYWORDS = [
  'water',
  'waterway',
  'bay',
  'strait',
  'sea',
  'ocean',
  'lake',
  'river',
  'canal',
  'reservoir',
  'pond',
  'lagoon',
  'wetland',
  'basin',
  'coastline',
];

const WATER_NAME_REGEX = /\b(denizi|gölü|boğazı|körfezi|nehri|baraj gölü|strait|sea|lake|bay)\b/i;

export function evaluateNominatimReverse(data: NominatimReversePayload): LandValidationResult {
  if (!data || data.error) {
    return {
      status: 'water',
      isLand: false,
      reason: 'Bu koordinatta geçerli bir kara adresi bulunamadı (deniz, göl veya ıssız su yüzeyi).',
      source: 'nominatim',
    };
  }

  const cat = (data.category || data.class || '').toLowerCase();
  const type = (data.type || '').toLowerCase();
  const addrType = (data.addresstype || '').toLowerCase();
  const addr = data.address ?? {};

  const isWaterTag =
    WATER_KEYWORDS.includes(cat) ||
    WATER_KEYWORDS.includes(type) ||
    WATER_KEYWORDS.includes(addrType) ||
    Boolean(addr.water || addr.sea || addr.bay || addr.lake || addr.river || addr.strait);

  if (isWaterTag) {
    const label = data.name || addr.water || addr.sea || addr.lake || addr.bay || 'Su kütlesi';
    return {
      status: 'water',
      isLand: false,
      waterBodyName: label,
      reason: `${label} üzerine inşaat yasaktır! Yalnızca kara üzerinde geçerli adreslere işletme kurulabilir.`,
      source: 'nominatim',
    };
  }

  if (addr.country_code && addr.country_code.toLowerCase() !== 'tr') {
    return {
      status: 'invalid',
      isLand: false,
      reason: 'Seçilen nokta Türkiye sınırları dışında görünüyor.',
      source: 'nominatim',
    };
  }

  const hasValidLandAddress = Boolean(
    addr.road ||
      addr.pedestrian ||
      addr.footway ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.town ||
      addr.city ||
      addr.village ||
      addr.hamlet ||
      addr.city_district ||
      addr.county ||
      addr.residential ||
      addr.commercial
  );

  if (!hasValidLandAddress) {
    return {
      status: 'water',
      isLand: false,
      reason: 'Seçilen noktada geçerli bir cadde veya yerleşim adresi doğrulanamadı.',
      source: 'nominatim',
    };
  }

  // Additional guard: if the primary object name itself is a sea/lake/strait and there's no road
  if (!addr.road && data.name && WATER_NAME_REGEX.test(data.name)) {
    return {
      status: 'water',
      isLand: false,
      waterBodyName: data.name,
      reason: `${data.name} üzerine inşaat yapılamaz!`,
      source: 'nominatim',
    };
  }

  const district =
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.city_district ||
    addr.town ||
    addr.county ||
    addr.village;

  const streetPart = addr.road || addr.pedestrian || district || '';
  const areaPart = [district, addr.city || addr.province || addr.state]
    .filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i)
    .join(', ');

  return {
    status: 'valid',
    isLand: true,
    resolvedDistrict: district,
    resolvedAddress: streetPart && areaPart && streetPart !== district
      ? `${streetPart} · ${areaPart}`
      : areaPart || data.display_name || 'Doğrulanmış Kara Noktası',
    source: 'nominatim',
  };
}

export async function validateLandCoordinate(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<LandValidationResult> {
  // Step 1: Instant local shield for Turkey seas, straits, and major lakes
  const localBlock = checkLocalWaterShield(lat, lng);
  if (localBlock) {
    return localBlock;
  }

  // Step 2: OpenStreetMap Nominatim reverse geocoding land verification
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(
      6
    )}&lon=${lng.toFixed(6)}&zoom=16&addressdetails=1&accept-language=tr`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);

    if (!res.ok) {
      // Rate limited or offline: local water shield already passed
      return {
        status: 'valid',
        isLand: true,
        resolvedAddress: 'Yerel kara doğrulaması onaylandı',
        source: 'fallback',
      };
    }

    const payload = (await res.json()) as NominatimReversePayload;
    return evaluateNominatimReverse(payload);
  } catch {
    // Offline or timeout: fall back cleanly after local water shield passed
    return {
      status: 'valid',
      isLand: true,
      resolvedAddress: 'Yerel kara doğrulaması onaylandı',
      source: 'fallback',
    };
  }
}
