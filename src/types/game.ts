export type ThemeMode = 'light' | 'dark';

export type ScreenState = 'intro' | 'menu' | 'playing';

export type AuthProvider = 'guest' | 'google';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  provider: AuthProvider;
}

export type GeographicRegion =
  | 'Marmara'
  | 'Ege'
  | 'Akdeniz'
  | 'İç Anadolu'
  | 'Karadeniz'
  | 'Doğu Anadolu'
  | 'Güneydoğu Anadolu';

export type BusinessTypeId =
  | 'kafe'
  | 'internet_kafe'
  | 'ps_salonu'
  | 'oyun_merkezi'
  | 'restoran'
  | 'supermarket'
  | 'otel'
  | 'avm';

export type BusinessCategory =
  | 'cafe'
  | 'gaming'
  | 'food'
  | 'retail'
  | 'tourism'
  | 'mall';

export interface BusinessBlueprint {
  id: BusinessTypeId;
  name: string;
  shortName: string;
  category: BusinessCategory;
  description: string;
  upgradeFocus: string;
  baseCost: number;
  baseHourlyIncome: number; // Real-world scale hourly income (displayed prominently)
  baseIncomePerSec: number; // Live gameplay income per second
  baseCapacity: number; // Customer capacity inside the venue
  vaultCapacitySec: number;
  minCompanyLevel: number;
  maxLevel: number;
  maxStaff: number;
  staffCostBase: number;
  accentColor: string;
  interiorTheme: string;
  iconKey:
    | 'coffee'
    | 'monitor'
    | 'gamepad'
    | 'sparkles'
    | 'utensils'
    | 'shopping-cart'
    | 'hotel'
    | 'building';
  zoneAffinity: 'footTraffic' | 'tourism' | 'business';
}

export interface ProvinceInfo {
  plate: number; // 1..81
  code: string; // '01'..'81'
  name: string;
  region: GeographicRegion;
  lat: number;
  lng: number;
  zoom: number;
  districts: string[];
  landMultiplier: number;
  footTraffic: number;
  tourism: number;
  business: number;
}

export type LandValidationStatus = 'checking' | 'valid' | 'water' | 'invalid';

export interface LandValidationResult {
  status: Exclude<LandValidationStatus, 'checking'>;
  isLand: boolean;
  reason?: string;
  waterBodyName?: string;
  resolvedAddress?: string;
  resolvedDistrict?: string;
  source: 'local-shield' | 'nominatim' | 'fallback';
}

export interface PinLocationInfo {
  lat: number;
  lng: number;
  cityPlate: number;
  cityCode: string;
  cityName: string;
  districtName: string;
  regionName: GeographicRegion;
  landMultiplier: number;
  footTraffic: number;
  tourism: number;
  business: number;
  isWithinTurkey: boolean;
  landStatus: LandValidationStatus;
  landMessage?: string;
  resolvedAddress?: string;
}

export interface OwnedBusiness {
  id: string;
  ownerId: string;
  ownerName: string;
  blueprintId: BusinessTypeId;
  customName: string;
  lat: number;
  lng: number;
  cityPlate: number;
  cityName: string;
  districtName: string;
  level: number;
  staffCount: number;
  purchaseCost: number;
  landMultiplier: number;
  affinityMultiplier: number;
  pendingCash: number;
  totalEarned: number;
  boostEndsAt: number;
  createdAt: number;
  notifiedHighVault?: boolean;
}

export interface RemoteBusinessRecord {
  id: string;
  owner_id: string;
  owner_name: string;
  city_plate: number;
  city_name: string;
  district: string;
  business_name: string;
  business_type: BusinessTypeId;
  lat: number;
  lng: number;
  level: number;
  hourly_income: number;
  valuation: number;
  created_at: string;
}

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  category: BusinessCategory | 'all';
  incomeMultiplier: number;
  valuationMultiplier: number;
  durationSec: number;
  startedAt: number;
  endsAt: number;
}

export interface CompanyTier {
  level: number;
  title: string;
  minNetWorth: number;
  maxBranches: number;
  badgeColor: string;
  unlocksText: string;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  rewardCash: number;
  targetType: 'businessCount' | 'cityCount' | 'netWorth' | 'maxLevel' | 'totalEarned' | 'staffTotal';
  targetValue: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'revenue' | 'event' | 'update' | 'milestone' | 'system';
  timestamp: number;
  read: boolean;
}

export interface GameSettings {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  mapStyle: 'osm' | 'carto';
}

export interface EmpireState {
  cash: number;
  totalEarnedLifetime: number;
  businesses: OwnedBusiness[];
  claimedMissionIds: string[];
  activeEvent: MarketEvent | null;
  lastSavedAt: number;
}

export interface OtaVersionManifest {
  version: string;
  buildDate: string;
  mandatory: boolean;
  notes: string[];
}

export interface OtaCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  remoteManifest: OtaVersionManifest | null;
  checkedAt: number;
  error?: string;
}
