import type { CityRegion, PinLocationInfo } from '../types/game';

export const TURKEY_CENTER: [number, number] = [39.15, 35.25];
export const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [35.4, 25.4],
  [42.4, 45.2],
];

export const TURKEY_CITIES: CityRegion[] = [
  {
    id: 'istanbul',
    name: 'İstanbul',
    region: 'Marmara',
    lat: 41.0082,
    lng: 28.9784,
    zoom: 12,
    districts: ['Beşiktaş', 'Kadıköy', 'Şişli', 'Levent', 'Beyoğlu', 'Üsküdar', 'Bakırköy', 'Ataşehir'],
    landMultiplier: 1.45,
    footTraffic: 1.5,
    tourism: 1.45,
    business: 1.55,
    logistics: 1.4,
  },
  {
    id: 'ankara',
    name: 'Ankara',
    region: 'İç Anadolu',
    lat: 39.9334,
    lng: 32.8597,
    zoom: 12,
    districts: ['Çankaya', 'Kızılay', 'Kavaklıdere', 'Söğütözü', 'Yenimahalle', 'Ümitköy'],
    landMultiplier: 1.2,
    footTraffic: 1.3,
    tourism: 1.0,
    business: 1.45,
    logistics: 1.35,
  },
  {
    id: 'izmir',
    name: 'İzmir',
    region: 'Ege',
    lat: 38.4237,
    lng: 27.1428,
    zoom: 12,
    districts: ['Alsancak', 'Konak', 'Karşıyaka', 'Bornova', 'Urla', 'Çeşme'],
    landMultiplier: 1.25,
    footTraffic: 1.35,
    tourism: 1.4,
    business: 1.25,
    logistics: 1.35,
  },
  {
    id: 'antalya',
    name: 'Antalya',
    region: 'Akdeniz',
    lat: 36.8969,
    lng: 30.7133,
    zoom: 12,
    districts: ['Konyaaltı', 'Lara', 'Muratpaşa', 'Kaleiçi', 'Belek', 'Alanya'],
    landMultiplier: 1.22,
    footTraffic: 1.3,
    tourism: 1.6,
    business: 1.1,
    logistics: 1.15,
  },
  {
    id: 'bursa',
    name: 'Bursa',
    region: 'Marmara',
    lat: 40.1885,
    lng: 29.061,
    zoom: 12,
    districts: ['Nilüfer', 'Osmangazi', 'Mudanya', 'Çekirge', 'Yıldırım'],
    landMultiplier: 1.1,
    footTraffic: 1.22,
    tourism: 1.15,
    business: 1.25,
    logistics: 1.4,
  },
  {
    id: 'bodrum',
    name: 'Muğla / Bodrum',
    region: 'Ege',
    lat: 37.0344,
    lng: 27.4305,
    zoom: 12,
    districts: ['Yalıkavak', 'Türkbükü', 'Gümbet', 'Bitez', 'Marmaris', 'Fethiye'],
    landMultiplier: 1.38,
    footTraffic: 1.25,
    tourism: 1.65,
    business: 1.05,
    logistics: 1.0,
  },
  {
    id: 'adana',
    name: 'Adana',
    region: 'Akdeniz',
    lat: 37.0,
    lng: 35.3213,
    zoom: 12,
    districts: ['Seyhan', 'Çukurova', 'Ziyapaşa', 'Barajyolu', 'Yüreğir'],
    landMultiplier: 1.02,
    footTraffic: 1.32,
    tourism: 1.08,
    business: 1.18,
    logistics: 1.38,
  },
  {
    id: 'gaziantep',
    name: 'Gaziantep',
    region: 'Güneydoğu Anadolu',
    lat: 37.0662,
    lng: 37.3833,
    zoom: 12,
    districts: ['Şehitkamil', 'Şahinbey', 'İbrahimli', 'Kalealtı', 'OSB'],
    landMultiplier: 1.04,
    footTraffic: 1.3,
    tourism: 1.25,
    business: 1.25,
    logistics: 1.45,
  },
  {
    id: 'trabzon',
    name: 'Trabzon',
    region: 'Karadeniz',
    lat: 41.0027,
    lng: 39.7168,
    zoom: 12,
    districts: ['Ortahisar', 'Meydan', 'Boztepe', 'Yomra', 'Akçaabat'],
    landMultiplier: 1.0,
    footTraffic: 1.2,
    tourism: 1.35,
    business: 1.12,
    logistics: 1.22,
  },
  {
    id: 'eskisehir',
    name: 'Eskişehir',
    region: 'İç Anadolu',
    lat: 39.7767,
    lng: 30.5206,
    zoom: 12,
    districts: ['Odunpazarı', 'Tepebaşı', 'Adalar', 'Bağlar'],
    landMultiplier: 0.98,
    footTraffic: 1.3,
    tourism: 1.22,
    business: 1.25,
    logistics: 1.2,
  },
  {
    id: 'konya',
    name: 'Konya',
    region: 'İç Anadolu',
    lat: 37.8746,
    lng: 32.4932,
    zoom: 12,
    districts: ['Selçuklu', 'Meram', 'Karatay', 'Bosna Hersek'],
    landMultiplier: 0.96,
    footTraffic: 1.2,
    tourism: 1.18,
    business: 1.2,
    logistics: 1.42,
  },
  {
    id: 'kapadokya',
    name: 'Nevşehir / Kapadokya',
    region: 'İç Anadolu',
    lat: 38.6431,
    lng: 34.8289,
    zoom: 12,
    districts: ['Göreme', 'Ürgüp', 'Avanos', 'Uçhisar'],
    landMultiplier: 1.15,
    footTraffic: 1.25,
    tourism: 1.62,
    business: 1.0,
    logistics: 1.02,
  },
  {
    id: 'kocaeli',
    name: 'Kocaeli',
    region: 'Marmara',
    lat: 40.7654,
    lng: 29.9408,
    zoom: 12,
    districts: ['İzmit', 'Gebze', 'Başiskele', 'Derince'],
    landMultiplier: 1.12,
    footTraffic: 1.2,
    tourism: 1.0,
    business: 1.35,
    logistics: 1.52,
  },
  {
    id: 'mersin',
    name: 'Mersin',
    region: 'Akdeniz',
    lat: 36.8121,
    lng: 34.6415,
    zoom: 12,
    districts: ['Yenişehir', 'Mezitli', 'Pozcu', 'Liman'],
    landMultiplier: 1.0,
    footTraffic: 1.22,
    tourism: 1.2,
    business: 1.18,
    logistics: 1.48,
  },
  {
    id: 'samsun',
    name: 'Samsun',
    region: 'Karadeniz',
    lat: 41.2867,
    lng: 36.33,
    zoom: 12,
    districts: ['Atakum', 'İlkadım', 'Canik', 'Tekkeköy'],
    landMultiplier: 0.96,
    footTraffic: 1.22,
    tourism: 1.15,
    business: 1.15,
    logistics: 1.32,
  },
  {
    id: 'kayseri',
    name: 'Kayseri',
    region: 'İç Anadolu',
    lat: 38.7312,
    lng: 35.4787,
    zoom: 12,
    districts: ['Melikgazi', 'Kocasinan', 'Talas', 'Erciyes'],
    landMultiplier: 0.95,
    footTraffic: 1.18,
    tourism: 1.22,
    business: 1.24,
    logistics: 1.35,
  },
  {
    id: 'diyarbakir',
    name: 'Diyarbakır',
    region: 'Güneydoğu Anadolu',
    lat: 37.9144,
    lng: 40.2306,
    zoom: 12,
    districts: ['Kayapınar', 'Sur', 'Yenişehir', 'Bağlar'],
    landMultiplier: 0.92,
    footTraffic: 1.22,
    tourism: 1.2,
    business: 1.15,
    logistics: 1.25,
  },
  {
    id: 'erzurum',
    name: 'Erzurum',
    region: 'Doğu Anadolu',
    lat: 39.9055,
    lng: 41.2658,
    zoom: 12,
    districts: ['Yakutiye', 'Palandöken', 'Aziziye'],
    landMultiplier: 0.9,
    footTraffic: 1.12,
    tourism: 1.3,
    business: 1.08,
    logistics: 1.18,
  },
];

export function isPointInTurkey(lat: number, lng: number): boolean {
  return lat >= 35.7 && lat <= 42.15 && lng >= 25.65 && lng <= 44.85;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolvePinLocation(lat: number, lng: number): PinLocationInfo {
  const within = isPointInTurkey(lat, lng);

  let nearest = TURKEY_CITIES[0];
  let bestDist = Infinity;

  for (const city of TURKEY_CITIES) {
    const d = haversineKm(lat, lng, city.lat, city.lng);
    if (d < bestDist) {
      bestDist = d;
      nearest = city;
    }
  }

  // Deterministic district pick based on coordinate hash
  const hash = Math.abs(Math.round(lat * 1000) * 31 + Math.round(lng * 1000) * 17);
  const districtName =
    bestDist < 45
      ? nearest.districts[hash % nearest.districts.length]
      : `${nearest.name} Çevresi`;

  // Slight proximity decay when far from metro center, keeping rural investments cheaper & viable
  const proximityFactor = bestDist < 20 ? 1 : bestDist < 80 ? 0.92 : 0.82;

  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    cityId: nearest.id,
    cityName: nearest.name,
    districtName,
    regionName: nearest.region,
    landMultiplier: Number((nearest.landMultiplier * proximityFactor).toFixed(2)),
    footTraffic: Number((nearest.footTraffic * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    tourism: Number((nearest.tourism * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    business: Number((nearest.business * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    logistics: Number((nearest.logistics * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    isWithinTurkey: within,
  };
}

export function suggestBusinessName(districtName: string, shortName: string): string {
  return `${districtName} ${shortName}`;
}
