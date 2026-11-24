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

export type BusinessCategory =
  | 'food'
  | 'residential'
  | 'office'
  | 'retail'
  | 'tourism'
  | 'logistics'
  | 'landmark';

export interface BusinessBlueprint {
  id: string;
  name: string;
  shortName: string;
  category: BusinessCategory;
  description: string;
  baseCost: number;
  baseIncomePerSec: number;
  vaultCapacitySec: number; // How many seconds of revenue fit before full
  maxLevel: number;
  maxStaff: number;
  staffCostBase: number;
  accentColor: string;
  iconKey:
    | 'coffee'
    | 'utensils'
    | 'home'
    | 'laptop'
    | 'shopping-bag'
    | 'hotel'
    | 'truck'
    | 'building';
  zoneAffinity: 'footTraffic' | 'tourism' | 'business' | 'logistics';
}

export interface CityRegion {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  zoom: number;
  districts: string[];
  landMultiplier: number;
  footTraffic: number; // 0.8 - 1.5
  tourism: number; // 0.8 - 1.6
  business: number; // 0.8 - 1.55
  logistics: number; // 0.8 - 1.5
}

export interface PinLocationInfo {
  lat: number;
  lng: number;
  cityId: string;
  cityName: string;
  districtName: string;
  regionName: string;
  landMultiplier: number;
  footTraffic: number;
  tourism: number;
  business: number;
  logistics: number;
  isWithinTurkey: boolean;
}

export interface OwnedBusiness {
  id: string;
  blueprintId: string;
  customName: string;
  lat: number;
  lng: number;
  cityId: string;
  cityName: string;
  districtName: string;
  level: number;
  staffCount: number;
  purchaseCost: number;
  landMultiplier: number;
  affinityMultiplier: number;
  pendingCash: number;
  totalEarned: number;
  boostEndsAt: number; // timestamp ms
  createdAt: number;
  notifiedHighVault?: boolean;
}

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  category: BusinessCategory | 'all';
  incomeMultiplier: number; // e.g., 1.35 for +35%
  valuationMultiplier: number; // e.g., 1.15 for +15%
  durationSec: number;
  startedAt: number;
  endsAt: number;
}

export interface EmpireRank {
  id: string;
  title: string;
  minNetWorth: number;
  badgeColor: string;
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
