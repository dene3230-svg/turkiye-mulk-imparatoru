import type { GeographicRegion, PinLocationInfo, ProvinceInfo } from '../types/game';

export const TURKEY_CENTER: [number, number] = [39.15, 35.25];
export const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [35.75, 25.65],
  [42.15, 44.85],
];

export const GEOGRAPHIC_REGIONS: GeographicRegion[] = [
  'Marmara',
  'Ege',
  'Akdeniz',
  'İç Anadolu',
  'Karadeniz',
  'Doğu Anadolu',
  'Güneydoğu Anadolu',
];

type RawProvince = [
  number,
  string,
  GeographicRegion,
  number,
  number,
  number, // landMultiplier
  number, // footTraffic
  number, // tourism
  number, // business
  string[]
];

const RAW_PROVINCES: RawProvince[] = [
  [1, 'Adana', 'Akdeniz', 37.0, 35.3213, 1.08, 1.32, 1.12, 1.24, ['Seyhan', 'Çukurova', 'Yüreğir', 'Ziyapaşa']],
  [2, 'Adıyaman', 'Güneydoğu Anadolu', 37.7648, 38.2786, 0.9, 1.12, 1.25, 1.06, ['Merkez', 'Kahta', 'Besni']],
  [3, 'Afyonkarahisar', 'Ege', 38.7507, 30.5567, 0.94, 1.16, 1.28, 1.14, ['Merkez', 'Sandıklı', 'Dinar']],
  [4, 'Ağrı', 'Doğu Anadolu', 39.7191, 43.0503, 0.86, 1.08, 1.15, 1.02, ['Merkez', 'Doğubayazıt', 'Patnos']],
  [5, 'Amasya', 'Karadeniz', 40.6499, 35.8353, 0.92, 1.14, 1.26, 1.08, ['Merkez', 'Merzifon', 'Suluova']],
  [6, 'Ankara', 'İç Anadolu', 39.9208, 32.8541, 1.28, 1.38, 1.1, 1.48, ['Çankaya', 'Kızılay', 'Kavaklıdere', 'Söğütözü', 'Yenimahalle', 'Ümitköy']],
  [7, 'Antalya', 'Akdeniz', 36.8969, 30.7133, 1.26, 1.34, 1.65, 1.18, ['Muratpaşa', 'Konyaaltı', 'Lara', 'Kaleiçi', 'Alanya', 'Belek']],
  [8, 'Artvin', 'Karadeniz', 41.1828, 41.8183, 0.9, 1.08, 1.32, 1.02, ['Merkez', 'Hopa', 'Arhavi']],
  [9, 'Aydın', 'Ege', 37.856, 27.8416, 1.06, 1.22, 1.48, 1.12, ['Efeler', 'Kuşadası', 'Didim', 'Nazilli']],
  [10, 'Balıkesir', 'Marmara', 39.6484, 27.8826, 1.04, 1.2, 1.36, 1.16, ['Karesi', 'Altıeylül', 'Bandırma', 'Ayvalık']],
  [11, 'Bilecik', 'Marmara', 40.1451, 29.9799, 0.92, 1.1, 1.12, 1.14, ['Merkez', 'Bozüyük', 'Söğüt']],
  [12, 'Bingöl', 'Doğu Anadolu', 38.8855, 40.498, 0.86, 1.08, 1.08, 1.02, ['Merkez', 'Genç', 'Solhan']],
  [13, 'Bitlis', 'Doğu Anadolu', 38.4006, 42.1095, 0.88, 1.08, 1.2, 1.02, ['Merkez', 'Tatvan', 'Ahlat']],
  [14, 'Bolu', 'Karadeniz', 40.7392, 31.6089, 0.98, 1.16, 1.38, 1.12, ['Merkez', 'Gerede', 'Abant']],
  [15, 'Burdur', 'Akdeniz', 37.7203, 30.2908, 0.92, 1.12, 1.24, 1.06, ['Merkez', 'Bucak', 'Yeşilova']],
  [16, 'Bursa', 'Marmara', 40.1885, 29.061, 1.16, 1.3, 1.22, 1.34, ['Nilüfer', 'Osmangazi', 'Mudanya', 'Çekirge', 'Yıldırım']],
  [17, 'Çanakkale', 'Marmara', 40.1553, 26.4142, 1.05, 1.2, 1.42, 1.12, ['Merkez', 'Kepez', 'Gelibolu', 'Biga']],
  [18, 'Çankırı', 'İç Anadolu', 40.6013, 33.6134, 0.88, 1.08, 1.08, 1.04, ['Merkez', 'Çerkeş', 'Ilgaz']],
  [19, 'Çorum', 'Karadeniz', 40.5506, 34.9556, 0.92, 1.14, 1.14, 1.16, ['Merkez', 'Sungurlu', 'Osmancık']],
  [20, 'Denizli', 'Ege', 37.7765, 29.0864, 1.04, 1.22, 1.42, 1.24, ['Pamukkale', 'Merkezefendi', 'Çivril']],
  [21, 'Diyarbakır', 'Güneydoğu Anadolu', 37.9144, 40.2306, 0.98, 1.26, 1.24, 1.18, ['Kayapınar', 'Yenişehir', 'Sur', 'Bağlar']],
  [22, 'Edirne', 'Marmara', 41.6771, 26.5557, 1.0, 1.2, 1.32, 1.14, ['Merkez', 'Keşan', 'Uzunköprü']],
  [23, 'Elazığ', 'Doğu Anadolu', 38.681, 39.2264, 0.92, 1.16, 1.14, 1.12, ['Merkez', 'Harput', 'Kovancılar']],
  [24, 'Erzincan', 'Doğu Anadolu', 39.75, 39.5, 0.9, 1.12, 1.18, 1.08, ['Merkez', 'Üzümlü', 'Kemaliye']],
  [25, 'Erzurum', 'Doğu Anadolu', 39.9055, 41.2658, 0.94, 1.18, 1.34, 1.12, ['Yakutiye', 'Palandöken', 'Aziziye']],
  [26, 'Eskişehir', 'İç Anadolu', 39.7767, 30.5206, 1.06, 1.32, 1.26, 1.28, ['Odunpazarı', 'Tepebaşı', 'Adalar', 'Bağlar']],
  [27, 'Gaziantep', 'Güneydoğu Anadolu', 37.0662, 37.3833, 1.08, 1.32, 1.3, 1.34, ['Şehitkamil', 'Şahinbey', 'İbrahimli', 'Nizip']],
  [28, 'Giresun', 'Karadeniz', 40.9128, 38.3895, 0.92, 1.14, 1.22, 1.08, ['Merkez', 'Bulancak', 'Görele']],
  [29, 'Gümüşhane', 'Karadeniz', 40.4603, 39.4814, 0.86, 1.06, 1.14, 1.02, ['Merkez', 'Kelkit', 'Torul']],
  [30, 'Hakkari', 'Doğu Anadolu', 37.5744, 43.7408, 0.85, 1.06, 1.1, 1.0, ['Merkez', 'Yüksekova', 'Şemdinli']],
  [31, 'Hatay', 'Akdeniz', 36.2023, 36.1613, 0.98, 1.24, 1.24, 1.22, ['Antakya', 'İskenderun', 'Defne', 'Arsuz']],
  [32, 'Isparta', 'Akdeniz', 37.7648, 30.5566, 0.98, 1.22, 1.3, 1.14, ['Merkez', 'Çünür', 'Eğirdir', 'Yalvaç']],
  [33, 'Mersin', 'Akdeniz', 36.8121, 34.6415, 1.06, 1.26, 1.28, 1.28, ['Yenişehir', 'Mezitli', 'Toroslar', 'Tarsus']],
  [34, 'İstanbul', 'Marmara', 41.0422, 29.0067, 1.48, 1.55, 1.5, 1.6, ['Beşiktaş', 'Kadıköy', 'Şişli', 'Levent', 'Beyoğlu', 'Üsküdar', 'Bakırköy', 'Ataşehir']],
  [35, 'İzmir', 'Ege', 38.4237, 27.1428, 1.28, 1.4, 1.45, 1.34, ['Konak', 'Alsancak', 'Karşıyaka', 'Bornova', 'Urla', 'Çeşme']],
  [36, 'Kars', 'Doğu Anadolu', 40.6013, 43.0975, 0.9, 1.1, 1.32, 1.04, ['Merkez', 'Sarıkamış', 'Kağızman']],
  [37, 'Kastamonu', 'Karadeniz', 41.3887, 33.7827, 0.9, 1.1, 1.24, 1.06, ['Merkez', 'Tosya', 'İnebolu']],
  [38, 'Kayseri', 'İç Anadolu', 38.7312, 35.4787, 1.02, 1.24, 1.26, 1.3, ['Melikgazi', 'Kocasinan', 'Talas', 'Erciyes']],
  [39, 'Kırklareli', 'Marmara', 41.7333, 27.2167, 0.96, 1.14, 1.18, 1.14, ['Merkez', 'Lüleburgaz', 'Babaeski']],
  [40, 'Kırşehir', 'İç Anadolu', 39.1425, 34.1709, 0.9, 1.12, 1.1, 1.06, ['Merkez', 'Kaman', 'Mucur']],
  [41, 'Kocaeli', 'Marmara', 40.7654, 29.9408, 1.18, 1.28, 1.12, 1.44, ['İzmit', 'Gebze', 'Başiskele', 'Kartepe']],
  [42, 'Konya', 'İç Anadolu', 37.8746, 32.4932, 1.02, 1.26, 1.24, 1.28, ['Selçuklu', 'Meram', 'Karatay', 'Bosna Hersek']],
  [43, 'Kütahya', 'Ege', 39.4167, 29.9833, 0.94, 1.16, 1.18, 1.14, ['Merkez', 'Tavşanlı', 'Simav']],
  [44, 'Malatya', 'Doğu Anadolu', 38.3552, 38.3095, 0.95, 1.18, 1.15, 1.16, ['Yeşilyurt', 'Battalgazi', 'Doğanşehir']],
  [45, 'Manisa', 'Ege', 38.6191, 27.4289, 1.04, 1.22, 1.16, 1.32, ['Yunusemre', 'Şehzadeler', 'Akhisar', 'Turgutlu']],
  [46, 'Kahramanmaraş', 'Akdeniz', 37.5858, 36.9371, 0.96, 1.2, 1.16, 1.22, ['Onikişubat', 'Dulkadiroğlu', 'Elbistan']],
  [47, 'Mardin', 'Güneydoğu Anadolu', 37.3212, 40.7245, 0.96, 1.18, 1.45, 1.12, ['Artuklu', 'Kızıltepe', 'Midyat']],
  [48, 'Muğla', 'Ege', 37.2153, 28.3636, 1.32, 1.28, 1.7, 1.14, ['Menteşe', 'Bodrum', 'Fethiye', 'Marmaris', 'Datça']],
  [49, 'Muş', 'Doğu Anadolu', 38.7432, 41.5064, 0.86, 1.08, 1.08, 1.02, ['Merkez', 'Bulanık', 'Malazgirt']],
  [50, 'Nevşehir', 'İç Anadolu', 38.6244, 34.7239, 1.12, 1.24, 1.64, 1.08, ['Merkez', 'Ürgüp', 'Göreme', 'Avanos']],
  [51, 'Niğde', 'İç Anadolu', 37.9667, 34.6833, 0.9, 1.12, 1.14, 1.08, ['Merkez', 'Bor', 'Ulukışla']],
  [52, 'Ordu', 'Karadeniz', 40.9839, 37.8764, 0.96, 1.18, 1.26, 1.12, ['Altınordu', 'Ünye', 'Fatsa']],
  [53, 'Rize', 'Karadeniz', 41.0201, 40.5234, 0.96, 1.16, 1.38, 1.1, ['Merkez', 'Çayeli', 'Ardeşen', 'Ayder']],
  [54, 'Sakarya', 'Marmara', 40.7569, 30.3783, 1.06, 1.24, 1.22, 1.28, ['Serdivan', 'Adapazarı', 'Sapanca', 'Erenler']],
  [55, 'Samsun', 'Karadeniz', 41.2867, 36.33, 1.04, 1.26, 1.22, 1.24, ['Atakum', 'İlkadım', 'Canik', 'Bafra']],
  [56, 'Siirt', 'Güneydoğu Anadolu', 37.9333, 41.95, 0.88, 1.1, 1.12, 1.04, ['Merkez', 'Kurtalan', 'Tillo']],
  [57, 'Sinop', 'Karadeniz', 42.0231, 35.1531, 0.92, 1.1, 1.3, 1.04, ['Merkez', 'Boyabat', 'Gerze']],
  [58, 'Sivas', 'İç Anadolu', 39.7477, 37.0179, 0.94, 1.16, 1.18, 1.12, ['Merkez', 'Divriği', 'Şarkışla']],
  [59, 'Tekirdağ', 'Marmara', 40.9833, 27.5167, 1.1, 1.24, 1.22, 1.34, ['Süleymanpaşa', 'Çorlu', 'Çerkezköy', 'Kapaklı']],
  [60, 'Tokat', 'Karadeniz', 40.3167, 36.55, 0.92, 1.14, 1.18, 1.08, ['Merkez', 'Erbaa', 'Turhal', 'Niksar']],
  [61, 'Trabzon', 'Karadeniz', 41.0027, 39.7168, 1.06, 1.26, 1.44, 1.18, ['Ortahisar', 'Yomra', 'Akçaabat', 'Boztepe']],
  [62, 'Tunceli', 'Doğu Anadolu', 39.1079, 39.5401, 0.88, 1.06, 1.22, 1.02, ['Merkez', 'Ovacık', 'Pertek']],
  [63, 'Şanlıurfa', 'Güneydoğu Anadolu', 37.1674, 38.7955, 0.98, 1.26, 1.42, 1.16, ['Haliliye', 'Karaköprü', 'Eyyübiye', 'Siverek']],
  [64, 'Uşak', 'Ege', 38.6823, 29.4082, 0.94, 1.14, 1.14, 1.16, ['Merkez', 'Banaz', 'Eşme']],
  [65, 'Van', 'Doğu Anadolu', 38.4942, 43.38, 0.96, 1.22, 1.34, 1.14, ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş']],
  [66, 'Yozgat', 'İç Anadolu', 39.8181, 34.8147, 0.88, 1.1, 1.1, 1.06, ['Merkez', 'Sorgun', 'Yerköy']],
  [67, 'Zonguldak', 'Karadeniz', 41.4564, 31.7987, 0.96, 1.16, 1.16, 1.2, ['Merkez', 'Ereğli', 'Çaycuma']],
  [68, 'Aksaray', 'İç Anadolu', 38.3687, 34.037, 0.94, 1.16, 1.22, 1.16, ['Merkez', 'Ihlara', 'Ortaköy']],
  [69, 'Bayburt', 'Karadeniz', 40.2552, 40.2249, 0.85, 1.05, 1.1, 1.0, ['Merkez', 'Demirözü', 'Aydıntepe']],
  [70, 'Karaman', 'İç Anadolu', 37.1759, 33.2287, 0.92, 1.14, 1.12, 1.16, ['Merkez', 'Ermenek', 'Sarıveliler']],
  [71, 'Kırıkkale', 'İç Anadolu', 39.8468, 33.5153, 0.94, 1.16, 1.06, 1.18, ['Merkez', 'Yahşihan', 'Keskin']],
  [72, 'Batman', 'Güneydoğu Anadolu', 37.8812, 41.1351, 0.94, 1.2, 1.22, 1.14, ['Merkez', 'Hasankeyf', 'Kozluk']],
  [73, 'Şırnak', 'Güneydoğu Anadolu', 37.5164, 42.4611, 0.88, 1.12, 1.12, 1.1, ['Merkez', 'Cizre', 'Silopi']],
  [74, 'Bartın', 'Karadeniz', 41.6344, 32.3375, 0.94, 1.12, 1.34, 1.06, ['Merkez', 'Amasra', 'Ulus']],
  [75, 'Ardahan', 'Doğu Anadolu', 41.1105, 42.7022, 0.85, 1.05, 1.16, 1.0, ['Merkez', 'Çıldır', 'Göle']],
  [76, 'Iğdır', 'Doğu Anadolu', 39.9167, 44.0333, 0.88, 1.1, 1.12, 1.08, ['Merkez', 'Tuzluca', 'Aralık']],
  [77, 'Yalova', 'Marmara', 40.65, 29.2667, 1.1, 1.22, 1.36, 1.18, ['Merkez', 'Çınarcık', 'Termal', 'Altınova']],
  [78, 'Karabük', 'Karadeniz', 41.2061, 32.6204, 0.94, 1.14, 1.34, 1.16, ['Merkez', 'Safranbolu', 'Yenice']],
  [79, 'Kilis', 'Güneydoğu Anadolu', 36.7184, 37.1212, 0.88, 1.12, 1.1, 1.06, ['Merkez', 'Elbeyli', 'Musabeyli']],
  [80, 'Osmaniye', 'Akdeniz', 37.0742, 36.2478, 0.94, 1.16, 1.12, 1.16, ['Merkez', 'Kadirli', 'Düziçi']],
  [81, 'Düzce', 'Karadeniz', 40.8438, 31.1565, 0.98, 1.18, 1.24, 1.2, ['Merkez', 'Akçakoca', 'Kaynaşlı']],
];

export const TURKEY_PROVINCES: ProvinceInfo[] = RAW_PROVINCES.map(
  ([plate, name, region, lat, lng, landMultiplier, footTraffic, tourism, business, districts]) => ({
    plate,
    code: String(plate).padStart(2, '0'),
    name,
    region,
    lat,
    lng,
    zoom: plate === 34 || plate === 6 || plate === 35 ? 13 : 13,
    districts,
    landMultiplier,
    footTraffic,
    tourism,
    business,
  })
);

export const DEFAULT_PROVINCE_PLATE = 34; // 34 İstanbul

export function getProvinceByPlate(plate: number): ProvinceInfo {
  return (
    TURKEY_PROVINCES.find((p) => p.plate === plate) ??
    TURKEY_PROVINCES.find((p) => p.plate === DEFAULT_PROVINCE_PLATE)!
  );
}

export function isPointInTurkey(lat: number, lng: number): boolean {
  return lat >= 35.75 && lat <= 42.15 && lng >= 25.65 && lng <= 44.85;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolvePinLocation(
  lat: number,
  lng: number,
  activeProvincePlate?: number
): PinLocationInfo {
  const within = isPointInTurkey(lat, lng);

  let nearest = TURKEY_PROVINCES[33]; // İstanbul fallback
  let bestDistMeters = Infinity;

  for (const prov of TURKEY_PROVINCES) {
    const d = haversineMeters(lat, lng, prov.lat, prov.lng);
    if (d < bestDistMeters) {
      bestDistMeters = d;
      nearest = prov;
    }
  }

  // If the player is inside their active city room and within 65km of its center, prefer that province
  if (activeProvincePlate) {
    const activeProv = getProvinceByPlate(activeProvincePlate);
    const activeDist = haversineMeters(lat, lng, activeProv.lat, activeProv.lng);
    if (activeDist < 65_000 && activeDist < bestDistMeters * 1.45) {
      nearest = activeProv;
      bestDistMeters = activeDist;
    }
  }

  const bestDistKm = bestDistMeters / 1000;
  const hash = Math.abs(Math.round(lat * 1000) * 31 + Math.round(lng * 1000) * 17);
  const districtName =
    bestDistKm < 45
      ? nearest.districts[hash % nearest.districts.length]
      : `${nearest.name} Çevresi`;

  const proximityFactor = bestDistKm < 18 ? 1 : bestDistKm < 60 ? 0.93 : 0.85;

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    cityPlate: nearest.plate,
    cityCode: nearest.code,
    cityName: nearest.name,
    districtName,
    regionName: nearest.region,
    landMultiplier: Number((nearest.landMultiplier * proximityFactor).toFixed(2)),
    footTraffic: Number((nearest.footTraffic * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    tourism: Number((nearest.tourism * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    business: Number((nearest.business * (0.9 + proximityFactor * 0.1)).toFixed(2)),
    isWithinTurkey: within,
    landStatus: 'checking',
  };
}

export function suggestBusinessName(districtName: string, shortName: string): string {
  return `${districtName} ${shortName}`;
}
