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
  | 'avm'
  | 'otopark'
  | 'katli_otopark'
  | 'gida_fabrikasi'
  | 'elektronik_fabrikasi'
  | 'tekstil_fabrikasi';

export type BusinessCategory =
  | 'cafe'
  | 'gaming'
  | 'food'
  | 'retail'
  | 'tourism'
  | 'mall'
  | 'parking'
  | 'factory';

export interface BusinessBlueprint {
  id: BusinessTypeId;
  name: string;
  shortName: string;
  category: BusinessCategory;
  description: string;
  upgradeFocus: string;
  baseCost: number;
  baseHourlyIncome: number; // Real-world scale hourly income
  baseIncomePerSec: number; // Live gameplay income per second
  baseCapacity: number; // Customer / production capacity
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
    | 'building'
    | 'car'
    | 'factory';
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

// --- 5-Tier Corporate HR & Automation ---
export type StaffRole =
  | 'calisan'
  | 'mudur_yardimcisi'
  | 'sube_muduru'
  | 'bolge_sorumlusu'
  | 'genel_mudur';

export interface StaffCandidate {
  id: string;
  name: string;
  role: StaffRole;
  roleTitle: string; // e.g., Barista, Teknisyen, Şube Müdürü, Bölge Sorumlusu, Genel Müdür
  stars: 1 | 2 | 3 | 4 | 5;
  speed: number; // 20..100
  efficiency: number; // 20..100
  leadership: number; // 20..100
  hourlySalary: number;
  hireCost: number;
}

export interface HiredStaff extends StaffCandidate {
  hiredAt: number;
  assignedBusinessId?: string; // for calisan, mudur_yardimcisi, sube_muduru
  assignedCityPlate?: number; // for bolge_sorumlusu, genel_mudur
  coveredBusinessIds?: string[]; // up to 4 for bolge_sorumlusu
  autoAdsEnabled?: boolean; // Genel Müdür automatic ad campaign renewal toggle
}

export type GameSpeed = 0 | 1 | 2 | 4;

export type AdCampaignTierId = 'brochure' | 'social' | 'billboard';

export interface ActiveAdCampaign {
  tierId: AdCampaignTierId;
  label: string;
  cost: number;
  revenueBoost: number; // e.g. 0.20, 0.38, 0.65
  customerBoost: number; // e.g. 0.18, 0.35, 0.60
  startedAtGameMin: number;
  endsAtGameMin: number;
  autoRenewedByGm?: boolean;
}

export interface FranchiseApplication {
  id: string;
  franchiseId: string;
  brandName: string;
  businessType: BusinessTypeId;
  applicantName: string;
  applicantType: 'ai' | 'player';
  cityPlate: number;
  cityName: string;
  districtName: string;
  licenseFee: number;
  royaltyRate: number;
  status: 'pending' | 'approved';
  createdAt: number;
}

export interface CompetitiveBlitz {
  id: string;
  targetRivalId: string;
  targetOwnerName: string;
  cityPlate: number;
  cityName: string;
  businessType: BusinessTypeId;
  revenueBoost: number; // e.g. 0.25
  endsAtGameMin: number;
  startedAt: number;
}

export interface ChainCloneDraft {
  sourceBusinessId: string;
  brandName: string;
  nextBranchNumber: number;
  suggestedName: string;
  businessType: BusinessTypeId;
}

export interface AutomationStatus {
  autoStock: boolean;
  autoMaintenance: boolean;
  fullAutomation: boolean;
  autoCollectRevenue: boolean; // Şube Müdürü (tek şube), Bölge Sorumlusu (4 şube) & Genel Müdür (il geneli)
  autoAdsActive?: boolean; // Genel Müdür automatic ad campaign renewal active
  bulkSupplyDiscount: number; // 0..0.35
  efficiencyBonus: number; // e.g. +0.20 from Genel Müdür
  managerLabel: string | null;
  managerRole: StaffRole | null;
}

export interface BranchStaffSlots {
  workers: number;
  maxWorkers: number;
  assistantManagers: number;
  maxAssistantManagers: number;
  branchManagers: number;
  maxBranchManagers: number;
}

export interface DayEndSummary {
  completedDay: number;
  month: number;
  dayOfMonth: number;
  dailyGrossRevenue: number;
  dailySalariesPaid: number;
  dailyNetCashFlow: number;
  creditScoreDelta: number;
  weeklyDividendPaid: number;
  monthlyClosing: MonthlyClosingSummary | null;
}

export interface MonthlyClosingSummary {
  monthNumber: number;
  totalDays: number;
  netWorth: number;
  branchCount: number;
  estimatedMonthlyProfit: number;
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
  employees: HiredStaff[]; // Branch-level staff (calisan, mudur_yardimcisi, sube_muduru)
  stockLevel: number; // 0..100
  maintenanceLevel: number; // 0..100
  purchaseCost: number;
  landMultiplier: number;
  affinityMultiplier: number;
  pendingCash: number;
  totalEarned: number;
  boostEndsAt: number;
  createdAt: number;
  notifiedHighVault?: boolean;
  // Franchise, Chain & Advertising metadata
  chainBrandName?: string; // Shared brand name across cloned branches (2+ = Zincir Marka)
  chainBranchNumber?: number; // 1, 2, 3...
  activeAdCampaign?: ActiveAdCampaign | null;
  franchiseId?: string;
  franchiseBrandName?: string;
  franchiseOwnerId?: string;
  franchiseRoyaltyRate?: number; // 0.10 .. 0.25
  pledgedLoanId?: string; // If currently pledged as collateral
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

// --- Franchise & Chain Brand ---
export interface FranchiseBrand {
  id: string;
  ownerId: string;
  ownerName: string;
  brandName: string;
  businessType: BusinessTypeId;
  licenseFee: number; // One-time fee
  royaltyRate: number; // 0.10 .. 0.25 (10% - 25%)
  branchCount: number;
  totalRoyaltyEarned: number;
  createdAt: number;
  isSeed?: boolean;
}

export interface SupermarketChainBrand {
  name: string;
  formedAt: number;
  discountRate: number; // 0.20 (20% bulk supply discount)
}

// --- Stock Market (BIST Devleri & Player Holding IPO) ---
export interface StockQuote {
  ticker: string;
  name: string;
  sector: string;
  isPlayerIpo: boolean;
  ownerId?: string;
  ownerName?: string;
  price: number;
  previousPrice: number;
  openPrice: number;
  dividendYieldAnnual: number; // e.g., 0.065 = 6.5%
  history: number[]; // last 24 ticks for sparkline
  marketCap: number;
  businessCount?: number;
  factoryCount?: number;
}

export interface StockHolding {
  ticker: string;
  shares: number;
  avgCost: number;
}

export interface PlayerIpoInfo {
  ticker: string; // 4 letters e.g. FUGM
  holdingName: string;
  listedAt: number;
  initialPrice: number;
  totalSharesIssued: number;
  publicFloatShares: number;
  raisedCapital: number;
}

// --- Player-Controlled Banking, Credit Score (0-1900) & Auto-Seizure ---
export type CreditTierKey = 'blacklist' | 'high_risk' | 'standard' | 'good_boss' | 'vip_holding';

export interface CreditTierRule {
  key: CreditTierKey;
  label: string;
  minScore: number;
  maxScore: number;
  maxLoanAmount: number;
  rateSpread: number; // e.g., +0.12, +0.04, 0, -0.03
  collateralMultiplier: number; // 1.5, 1.2, 1.0, 0.8
  badgeColor: string;
}

export interface BankRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  bankName: string;
  brandColor: string;
  emblem: string;
  hqCityPlate: number;
  hqCityName: string;
  hqLat: number;
  hqLng: number;
  poolCapital: number;
  baseInterestRate: number; // 0.05 .. 0.30 (5% - 30%)
  minCreditScore: number; // 700 .. 1600
  totalLoansIssued: number;
  totalInterestEarned: number;
  seizedAssetsCount: number;
  createdAt: number;
  isSystemBank?: boolean;
}

export type LoanStatus = 'active' | 'garnishing' | 'paid' | 'seized';

export interface LoanRecord {
  id: string;
  bankId: string;
  bankName: string;
  lenderOwnerId: string;
  borrowerId: string;
  borrowerName: string;
  principal: number;
  interestRate: number; // Effective annual/term rate
  totalDue: number;
  remainingAmount: number;
  collateralBusinessId: string;
  collateralBusinessName: string;
  collateralValuation: number;
  createdAt: number;
  dueAt: number; // Term end timestamp
  seizureAt: number; // Grace period end timestamp -> triggers auto-seizure
  status: LoanStatus;
}

// --- Patron Chat ---
export interface ChatMessage {
  id: string;
  channel: 'global' | string; // 'global' or 'city-34'
  senderId: string;
  senderName: string;
  senderBadge: string;
  text: string;
  timestamp: number;
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

export type MissionTargetType =
  | 'businessCount'
  | 'cityCount'
  | 'netWorth'
  | 'maxLevel'
  | 'totalEarned'
  | 'staffTotal'
  | 'factoryCount'
  | 'kafeCount'
  | 'parkingCount'
  | 'autoCollectManagerCount'
  | 'stockSharesTotal'
  | 'creditScore';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  rewardCash: number;
  rewardXp?: number;
  targetType: MissionTargetType;
  targetValue: number;
  tier?: number;
}

export interface AccountingSectorBreakdown {
  sectorId: BusinessTypeId;
  sectorName: string;
  branchCount: number;
  hourlyGross: number;
}

export interface AccountingBranchRow {
  businessId: string;
  name: string;
  cityLabel: string;
  sectorName: string;
  level: number;
  hourlyGross: number;
  hourlyExpenses: number;
  hourlyNet: number;
  marginPct: number;
  autoCollectActive: boolean;
}

export interface AccountingReport {
  // Revenue items (hourly)
  hourlyBranchGross: number;
  hourlySectorBreakdown: AccountingSectorBreakdown[];
  hourlyFranchiseRoyaltyIncome: number;
  hourlyBankInterestIncome: number;
  hourlyStockDividendIncome: number;
  hourlyTotalRevenue: number;
  // Expense items (hourly)
  hourlyStaffPayroll: number;
  hourlySupplyGross: number;
  hourlySupplyDiscountSaved: number;
  hourlySupplyNet: number;
  hourlyFranchiseRoyaltyPaid: number;
  hourlyLoanInstallments: number;
  hourlyMaintenanceCost: number;
  hourlyTotalExpenses: number;
  // Summary
  hourlyNetProfit: number;
  profitMarginPct: number;
  // Per-branch profitability comparison
  branches: AccountingBranchRow[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'revenue' | 'event' | 'update' | 'milestone' | 'system' | 'finance';
  timestamp: number;
  read: boolean;
}

export interface GameSettings {
  theme: ThemeMode;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  mapStyle: 'osm' | 'carto';
}

export interface HeadquartersInfo {
  cityPlate: number;
  cityName: string;
  lat: number;
  lng: number;
  zoom: number;
  businessId?: string;
}

export interface EmpireState {
  cash: number;
  totalEarnedLifetime: number;
  companyXp: number;
  gameMinutes: number; // In-game clock in minutes (starts at 540 = Day 1 09:00)
  hq?: HeadquartersInfo | null; // Permanent HQ city & first business coordinates
  businesses: OwnedBusiness[];
  cityManagers: HiredStaff[]; // bolge_sorumlusu & genel_mudur executives
  candidatePool: StaffCandidate[]; // Renewable 1-5 star HR pool
  supermarketChain: SupermarketChainBrand | null;
  ownFranchises: FranchiseBrand[];
  franchiseApplications?: FranchiseApplication[];
  autoApproveFranchiseApps?: boolean;
  franchiseRoyaltiesEarned: number;
  competitiveBlitzes?: CompetitiveBlitz[];
  acquiredRivalIds?: string[];
  stockPortfolio: StockHolding[];
  playerIpo: PlayerIpoInfo | null;
  creditScore: number; // 0..1900, default 1100
  ownBank: BankRecord | null;
  activeLoans: LoanRecord[]; // Loans borrowed by this player
  activeMissions: MissionDef[]; // Self-renewing dynamic mission pool (always 4 active)
  claimedMissionIds: string[];
  completedMissionsCount: number;
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
