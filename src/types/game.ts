export type ThemeMode = 'light' | 'dark';

export type ScreenState = 'intro' | 'menu' | 'playing';

export type AuthProvider = 'account';

export interface UserProfile {
  id: string;
  username: string;
  name: string; // Always equals display_name (shown on map, chat, rankings & social)
  displayName: string;
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
  | 'tekstil_fabrikasi'
  | 'enerji_santrali';

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
  baseIncomePerSec: number; // Live gameplay income per second (exact 40s/day scale)
  constructionDays: number; // 3..18 in-game days of construction/renovation
  dailyRentBase: number; // Base daily commercial rent & utilities in TL
  unitProductName: string; // e.g. 'Latte / Kahve'
  unitSalePrice: number; // e.g. 200 TL
  baseCogsRatio: number; // Direct raw material / COGS ratio (e.g. 0.44 -> total costs ~70-80% incl. rent/payroll/tax)
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
  hourlySalary: number; // Employer total hourly cost (wage + SGK)
  dailyWage?: number; // Gross daily wage (Turkey min-wage indexed)
  dailyEmployerSgk?: number; // Employer SGK premium per day (22.5%)
  monthlyGrossSalary?: number; // Gross monthly salary
  hireCost: number;
}

export interface HiredStaff extends StaffCandidate {
  hiredAt: number;
  assignedBusinessId?: string; // for calisan, mudur_yardimcisi, sube_muduru
  assignedCityPlate?: number; // for bolge_sorumlusu, genel_mudur
  coveredBusinessIds?: string[]; // up to 4 for bolge_sorumlusu
  autoAdsEnabled?: boolean; // Genel Müdür automatic ad campaign renewal toggle
}

export type GameSpeed = 0 | 1 | 2 | 4 | 'day';

export type DaySimAutoStopReason =
  | 'critical_cash'
  | 'payment_due'
  | 'construction_completed';

export interface DaySimAutoStopAlert {
  reason: DaySimAutoStopReason;
  title: string;
  message: string;
  businessId?: string;
  businessName?: string;
  amount?: number;
  gameDay: number;
}

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

export interface DayEndBranchLine {
  businessId: string;
  name: string;
  cityLabel: string;
  sectorName: string;
  underConstruction: boolean;
  constructionDaysRemaining: number;
  grossRevenue: number;
  supplyCost: number;
  utilitiesAndRent: number;
  dailyStaffWages: number;
  netDailyProfit: number;
  isLoss: boolean;
  autoSettled: boolean;
}

export interface DayEndSummary {
  id: string;
  completedDay: number;
  month: number;
  dayOfMonth: number;
  dailyGrossRevenue: number;
  dailySupplyCost: number;
  dailyUtilitiesAndRent: number;
  dailySalariesPaid: number;
  dailyNetCashFlow: number;
  manualCollectibleNet: number;
  autoSettledNet: number;
  creditScoreDelta: number;
  weeklyDividendPaid: number;
  monthlyClosing: MonthlyClosingSummary | null;
  branchLines: DayEndBranchLine[];
  collected: boolean;
  // v1.7.1 Progressive corporate tax, HQ bureaucracy overhead & late penalties
  dailyCorporateTax?: number;
  corporateTaxBracketPct?: number;
  dailyHqBureaucracyCost?: number;
  dailyLatePenalty?: number;
  megaProjectIncome?: number;
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
  // Construction & Renovation (v1.4.0)
  constructionTotalDays?: number;
  constructionDaysRemaining?: number; // > 0 means still under construction (no revenue, rent & installments accrue)
  constructionDailyInstallment?: number; // Daily renovation installment cost during construction
  doubleShiftApplied?: boolean; // True once player hired Double Shift Crew (-35% remaining days)
  dailyAccruedGross?: number; // Sales accrued since 00:00 today, settled at midnight 00:00
  // v1.4.1 Service Quality (1.0..5.0★) & Staff Morale (0..100)
  serviceQuality?: number; // 1.0 .. 5.0 stars
  staffMorale?: number; // 0 .. 100
  qualityInvestmentLevel?: number; // 0 .. 5 training & hygiene investment tier
  customerTrafficPct?: number; // Derived % customer demand from service quality (20..125)
  // Franchise, Chain & Advertising metadata
  chainBrandName?: string; // Shared brand name across cloned branches (2+ = Zincir Marka)
  chainBranchNumber?: number; // 1, 2, 3...
  activeAdCampaign?: ActiveAdCampaign | null;
  franchiseId?: string;
  franchiseBrandName?: string;
  franchiseOwnerId?: string;
  franchiseRoyaltyRate?: number; // 0.10 .. 0.25
  pledgedLoanId?: string; // If currently pledged as collateral
  // v1.5.5 Branch Customization & Facility Upgrades
  brandColor?: string;
  conceptIcon?: BranchConceptIconId;
  capacityLevel?: number; // 1..10 Masa/Alan Kapasitesi
  equipmentLevel?: number; // 1..10 Mutfak/Ekipman Altyapısı
  ambianceLevel?: number; // 1..10 Konsept & Müşteri Deneyimi
  // v1.7.1 Depreciation, inflation price sync & morale penalties
  priceAdjustmentIndex?: number; // Default 1.0; must track EmpireState.inflationIndex to preserve margin
  suspendedForMaintenance?: boolean; // True when maintenanceLevel < 25% -> 0 revenue until repaired
  moralePenaltyUntilDay?: number; // Set when a wage raise request is rejected -> caps branch efficiency to 30%
}

export type BranchConceptIconId =
  | 'coffee'
  | 'utensils'
  | 'store'
  | 'building'
  | 'crown'
  | 'sparkles';

export type BranchUpgradeTrackId = 'capacity' | 'equipment' | 'ambiance';

export interface RemoteBusinessRecord {
  id: string;
  owner_id: string;
  owner_name: string;
  company_name?: string;
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
  dueAt: number; // Legacy timestamp fallback
  seizureAt: number; // Legacy grace window fallback
  termMonths?: number; // Monthly installment count (default 6 months)
  paidMonths?: number; // Number of paid monthly installments
  monthlyInstallment?: number; // TL per 30-day in-game month
  nextDueGameDay?: number; // Next due total in-game day (e.g. Day 31, 61...)
  overdueDays?: number; // Days overdue past nextDueGameDay (15d = warning, 30d = foreclosure)
  defaultInterestAccrued?: number; // Total penalty interest accrued while overdue
  legalWarningSent?: boolean; // Set true once overdueDays >= 15
  status: LoanStatus;
}

export interface LoanEligibilityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface LoanEligibilityResult {
  eligible: boolean;
  reasons: string[];
  checks: LoanEligibilityCheck[];
  effectiveMaxLoan: number;
  effectiveInterestRate: number;
  requiredCollateral: number;
}

// --- v1.4.1 Ofisim (Office Tiers, Equipment, Prestige, Personal Assets & Service Quality) ---
export type OfficeTierId =
  | 'home_office'
  | 'plaza_floor'
  | 'bosphorus_suite'
  | 'holding_tower';

export interface OfficeTierDef {
  id: OfficeTierId;
  level: 1 | 2 | 3 | 4;
  name: string;
  subtitle: string;
  description: string;
  cost: number;
  minBrandRecognition: number;
  basePrestige: number;
  supplyDiscountRate: number;
  loanInterestDiscount: number;
  maxHireableExecutive: 'sube_muduru' | 'bolge_sorumlusu' | 'genel_mudur' | 'ceo';
  accentColor: string;
}

export interface OfficeUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  minOfficeLevel: 1 | 2 | 3 | 4;
  prestigeBonus: number;
  supplyDiscountBonus: number;
  loanInterestDiscountBonus: number;
  brandBonus: number;
}

export type OfficeEquipmentId =
  | 'exec_desk'
  | 'meeting_room'
  | 'guest_hospitality'
  | 'security_secretariat';

export interface OfficeEquipmentDef {
  id: OfficeEquipmentId;
  name: string;
  shortBenefit: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  prestigePerLevel: number;
  supplyDiscountPerLevel: number;
  loanInterestDiscountPerLevel: number;
  loanLimitBonusPerLevel: number;
  brandBonusPerLevel: number;
}

export interface PersonalAssetDef {
  id: string;
  name: string;
  category: string;
  description: string;
  cost: number;
  prestigeBonus: number;
  brandBonus: number;
}

export interface OfficeBenefits {
  tier: OfficeTierDef;
  officePrestige: number; // 0 .. 100
  supplyDiscountRate: number; // 0 .. 0.15
  loanInterestDiscount: number; // 0 .. 0.05
  loanLimitMultiplier: number; // 1.0 .. 1.8
  maxHireableExecutive: 'sube_muduru' | 'bolge_sorumlusu' | 'genel_mudur' | 'ceo';
}

export interface ServiceQualityReport {
  stars: number; // 1.0 .. 5.0
  customerTrafficMultiplier: number; // 0.20 .. 1.25
  customerTrafficPct: number; // 20 .. 125
  staffMorale: number; // 0 .. 100
  statusLabel: string;
  issues: string[];
}

// --- v1.3.0 Genel Müdürlük: Muhasebe Departmanı (Level 1+) & Holding CEO ---
export interface AccountantStaff {
  id: string;
  name: string;
  stars: 1 | 2 | 3 | 4 | 5;
  title: string;
  taxOptimizationRate: number; // 0.02 .. 0.14 (higher star reduces effective tax legally)
  hireCost: number;
  hourlySalary: number;
  hiredAt?: number;
}

export interface CeoStaff {
  id: string;
  name: string;
  stars: 3 | 4 | 5;
  title: string;
  leadership: number; // 75 .. 99
  strategy: number; // 75 .. 99
  hireCost: number;
  hourlySalary: number;
  autonomousGrowthEnabled: boolean;
  autoBranchesOpened: number;
  autoTakeoversCount: number;
  hiredAt?: number;
}

export interface TaxRatesBreakdown {
  stageIndex: number; // 0..3
  stageLabel: string;
  kdvRate: number; // KDV (Katma Değer Vergisi)
  sgkRate: number; // Muhtasar / Stopaj + İşveren SGK
  corporateRate: number; // Kurumlar Vergisi
  municipalRate: number; // Çevre Temizlik & İlan Reklam Vergisi
  incentiveNote: string;
}

export interface TaxBreakdownValues {
  kdv: number; // KDV
  sgkStopaj: number; // Muhtasar / Stopaj
  corporateTax: number; // Kurumlar Vergisi
  municipalTax: number; // Çevre Temizlik & İlan Reklam Vergisi
  totalTax: number;
}

export interface PendingTaxObligation {
  id: string;
  monthNumber: number;
  dueGameDay: number;
  amount: number;
  breakdown: TaxBreakdownValues;
  overdueDays: number;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: number;
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
  underConstruction?: boolean;
  constructionDaysRemaining?: number;
  hourlyGross: number;
  hourlyRentAndUtilities?: number;
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
  hourlyEmployerSgk: number;
  hourlyRentAndUtilities: number;
  hourlySupplyGross: number;
  hourlySupplyDiscountSaved: number;
  hourlySupplyNet: number;
  hourlyFranchiseRoyaltyPaid: number;
  hourlyLoanInstallments: number;
  hourlyMaintenanceCost: number;
  // v1.4.0 Turkish Tax Ledger (hourly)
  taxRates: TaxRatesBreakdown;
  hourlyKdvTax: number;
  hourlySgkTax: number; // Muhtasar / Stopaj
  hourlyCorporateTax: number; // Kurumlar Vergisi
  hourlyMunicipalTax: number; // Çevre Temizlik & İlan Reklam Vergisi
  hourlyTotalTaxes: number;
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
  // v1.3.0 Genel Müdürlük (Level 1+ Muhasebe & Holding Board/CEO) + Tax Ledger
  accountant?: AccountantStaff | null;
  accountantPool?: AccountantStaff[];
  ceo?: CeoStaff | null;
  ceoPool?: CeoStaff[];
  pendingTaxes?: PendingTaxObligation[];
  totalTaxesPaid?: number;
  lastCeoActionGameDay?: number;
  // v1.4.0 Midnight 00:00 Day-End Reports & Ledger History
  pendingDayEndReports?: DayEndSummary[];
  dayEndHistory?: DayEndSummary[];
  // v1.4.1 Brand Recognition (0..100%), Office Tiers, Upgrades & Personal Assets
  brandRecognition?: number; // 0 .. 100
  officeTierId?: OfficeTierId;
  officeUpgradeIds?: string[];
  officeEquipmentLevels?: Partial<Record<OfficeEquipmentId, number>>;
  personalAssetIds?: string[];
  // v1.6.0 Quick Actions: Rentals (Passive Rent), Holding Promos, Daily Timed Offers & Store Perks
  rentalProperties?: RentalProperty[];
  dailyOffers?: DailyBusinessOffer[];
  dailyOffersDay?: number;
  activeHoldingPromo?: HoldingPromoCampaign | null;
  supplyDiscountUntilDay?: number;
  supplyDiscountPct?: number;
  storePurchasedIds?: string[];
  activeMissions: MissionDef[]; // Self-renewing dynamic mission pool (always 4 active)
  claimedMissionIds: string[];
  completedMissionsCount: number;
  activeEvent: MarketEvent | null;
  // v1.7.1 Hardcore Economy & Endgame Systems
  inflationIndex?: number; // Starts at 1.0, rises every 20 game days
  lastInflationDay?: number;
  lastRaiseCheckDay?: number;
  pendingRaiseRequests?: WageRaiseRequest[];
  activeCrisisEvent?: OperationalCrisisEvent | null;
  lastCrisisDay?: number;
  negativeCashStreakDays?: number; // 3 consecutive days -> foreclosure on lowest-profit branch
  totalLatePenaltiesPaid?: number;
  foreclosedBranchesCount?: number;
  megaProjects?: MegaProjectState[];
  boardContracts?: BoardContract[];
  prestigeMarketTier?: number; // 0 = Base, 1+ = Post-IPO / New Market expansion
  ipoPrestigeCount?: number;
  permanentPrestigeBonusPct?: number; // Permanent revenue/brand bonus from IPO prestiges
  lastSavedAt: number;
}

export type RentalPropertyKind = 'dukkan' | 'daire' | 'ofis';

export interface TenantOffer {
  id: string;
  tenantName: string;
  sectorLabel: string;
  monthlyRent: number;
  leaseDays: number;
  reliabilityPct: number; // 75..99
}

export interface RentalProperty {
  id: string;
  catalogId: string;
  name: string;
  cityLabel: string;
  kind: RentalPropertyKind;
  purchasePrice: number;
  baseMonthlyRent: number;
  owned: boolean;
  leasedTenantName?: string;
  leasedSectorLabel?: string;
  activeMonthlyRent?: number;
  leaseRemainingDays?: number;
  tenantOffers: TenantOffer[];
}

export type HoldingPromoTierId = 'local_poster' | 'social_media' | 'tv_digital';

export interface HoldingPromoCampaign {
  tierId: HoldingPromoTierId;
  name: string;
  revenueBoost: number; // e.g. 0.14, 0.28, 0.48
  brandGain: number;
  startedDay: number;
  endsAtGameMin: number;
  durationDays: number;
}

export type DailyOfferKind = 'supply_discount' | 'partnership_bonus' | 'discounted_property';

export interface DailyBusinessOffer {
  id: string;
  kind: DailyOfferKind;
  title: string;
  partnerName: string;
  description: string;
  cost: number;
  expiresOnDay: number;
  status: 'pending' | 'accepted' | 'declined';
  discountPct?: number; // for supply_discount
  durationDays?: number;
  cashReward?: number; // for partnership_bonus
  brandBonus?: number;
  xpBonus?: number;
  rentalCatalogId?: string; // for discounted_property
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
  fallbackLocal?: boolean;
  error?: string;
}

// ── v1.7.1 Realistic Economy & Endgame Replayability Types ───────────────────

export interface ProgressiveTaxResult {
  bracketPct: number; // 15, 25, 35, 42 (+ prestige modifier)
  baseBracketPct: number;
  prestigeTaxSurchargePct: number;
  taxAmount: number;
  effectiveRatePct: number;
  bracketLabel: string;
}

export interface WageRaiseRequest {
  id: string;
  businessId: string;
  businessName: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  currentDailyWage: number;
  requestedRaisePct: number; // e.g. 15..28
  proposedDailyWage: number;
  createdOnDay: number;
  reason: string;
}

export type OperationalCrisisType =
  | 'equipment_failure'
  | 'tax_health_audit'
  | 'supplier_hike'
  | 'nearby_rival_opened';

export interface CrisisChoiceOption {
  id: string;
  label: string;
  description: string;
  cost: number;
  effectSummary: string;
  tone: 'positive' | 'warning' | 'danger';
}

export interface OperationalCrisisEvent {
  id: string;
  type: OperationalCrisisType;
  title: string;
  description: string;
  targetBusinessId?: string;
  targetBusinessName?: string;
  createdOnDay: number;
  choices: CrisisChoiceOption[];
}

export type MegaProjectId = 'mega_avm' | 'grand_otel' | 'holding_gokdeleni' | 'lojistik_merkezi';

export interface MegaProjectDef {
  id: MegaProjectId;
  name: string;
  categoryLabel: string;
  description: string;
  capitalCost: number;
  buildDays: number; // 15..30 game days
  dailyNetIncome: number;
  prestigeBonus: number;
  brandBonus: number;
  supplyDiscountBonus: number;
}

export interface MegaProjectState {
  projectId: MegaProjectId;
  name: string;
  status: 'constructing' | 'completed';
  startedOnDay: number;
  totalDays: number;
  daysRemaining: number;
  capitalInvested: number;
  dailyNetIncome: number;
  completedOnDay?: number;
}

export type BoardContractKind =
  | 'maintain_profit_margin'
  | 'approve_franchises'
  | 'keep_high_condition'
  | 'grow_daily_revenue';

export interface BoardContract {
  id: string;
  kind: BoardContractKind;
  title: string;
  description: string;
  targetValue: number;
  currentProgress: number;
  startDay: number;
  deadlineDay: number;
  rewardCash: number;
  rewardBrand: number;
  rewardXp: number;
  status: 'active' | 'completed' | 'claimed' | 'failed';
}

