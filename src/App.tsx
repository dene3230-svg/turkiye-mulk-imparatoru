import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  CalendarCheck2,
  Crown,
  Globe2,
  Home,
  Link2,
  Map as MapIcon,
  Pause,
  Play,
  Radio,
  Settings,
  Store,
  Wallet,
  X,
} from 'lucide-react';

import type {
  AdCampaignTierId,
  BankRecord,
  BranchConceptIconId,
  BranchUpgradeTrackId,
  BusinessTypeId,
  ChainCloneDraft,
  CharacterProfile,
  ChatMessage,
  EmpireState,
  FranchiseBrand,
  GameSettings,
  GameSpeed,
  HoldingPromoTierId,
  JobListing,
  MissionDef,
  NotificationItem,
  OfficeEquipmentId,
  OfficeTierId,
  OtaCheckResult,
  PinLocationInfo,
  ProvinceInfo,
  RemoteBusinessRecord,
  ScreenState,
  StockQuote,
  UserProfile,
} from './types/game';
import {
  STARTING_BRAND_RECOGNITION,
  STARTING_CASH,
  STARTING_CREDIT_SCORE,
  isFactoryType,
  isValidBusinessType,
} from './game/catalog';
import {
  STARTING_GAME_MINUTES,
  activateMarketingBoost,
  calculateBusinessHourlyIncome,
  calculateBusinessValuation,
  calculateNetWorth,
  calculateTotalIncomePerSec,
  checkMinDistance75m,
  claimMissionReward,
  collectAllCash,
  collectBusinessCash,
  collectDayEndReport,
  createHeadquartersForCity,
  createInitialEmpireState,
  formatGameClock,
  formatTL,
  getCompanyTier,
  getEffectiveSimSeconds,
  getMissionProgress,
  hireDoubleShiftCrew,
  hireStaff,
  isBusinessUnderConstruction,
  purchaseBusiness,
  resolveInitialFocusTarget,
  sellBusiness,
  takeoverCompetitorBusiness,
  tickEconomy,
  upgradeBusiness,
} from './game/economy';
import {
  customizeBranchIdentity,
  launchBranchMarketingCampaign,
  upgradeBranchFacility,
} from './game/branchOpsEngine';
import {
  distributeHoldingStaffBonus,
  launchHoldingWideAdCampaign,
} from './game/holdingReportsEngine';
import { ensureDynamicMissions } from './game/missionEngine';
import {
  assignFirstCandidateForRole,
  dismissStaffMember,
  generateCandidatePool,
  hireCandidateFromPool,
  promoteBranchEmployee,
  refreshCandidatePool,
  resolveBusinessAutomation,
  restockAndMaintainBusiness,
} from './game/hrEngine';
import {
  dismissAccountant,
  dismissCeo,
  generateAccountantPool,
  generateCeoPool,
  hireAccountant,
  hireCeo,
  payPendingTaxBill,
  toggleCeoAutonomousGrowth,
} from './game/corporateEngine';
import {
  SEED_FRANCHISE_BRANDS,
  createFranchiseBrand,
  formSupermarketChain,
} from './game/holdingEngine';
import {
  approveFranchiseApplication,
  generateAiFranchiseApplication,
  getChainStatusForBusiness,
  launchBusinessAdCampaign,
  launchCompetitiveBlitz,
  prepareChainCloneDraft,
  toggleGeneralManagerAutoAds,
} from './game/strategyEngine';
import {
  buyStockShares,
  createInitialStockQuotes,
  launchPlayerIpo,
  sellStockShares,
  tickStockQuotes,
} from './game/stockMarket';
import {
  DEFAULT_SYSTEM_BANKS,
  createPlayerBank,
  payMonthlyLoanInstallment,
  repayLoan,
  takeLoanFromBank,
  updateOwnBankSettings,
} from './game/bankingEngine';
import {
  buyOfficeUpgrade,
  buyPersonalAsset,
  calculateOfficeBenefits,
  investInBranchQuality,
  upgradeOfficeEquipment,
  upgradeOfficeTier,
} from './game/officeEngine';
import {
  DEFAULT_PROVINCE_PLATE,
  getProvinceByPlate,
  resolvePinLocation,
} from './game/provinces81';
import { validateLandCoordinate } from './game/waterShield';
import {
  loadEmpireStateLocal,
  loadStoredPlayerSession,
  loginPlayerAccount,
  registerPlayerAccount,
  saveEmpireStateLocal,
  signOutAccount,
  startGuestPlayerSession,
  upgradeGuestToSupabaseAccount,
} from './lib/supabase';
import {
  collectShiftTip,
  completeCareerShift,
  createInitialCareerState,
  getUnlockedCityPlates,
  isProvinceUnlocked,
  unlockProvinceLicense,
} from './game/careerEngine';
import { getCharacterTraitModifiers } from './game/characterEngine';
import {
  runInBackground,
  safeReadStorageJson,
  safeStorageGetItem,
  safeStorageSetItem,
  withSafeTimeout,
} from './lib/safeStartup';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  deletePlayerBusinessesFromRoom,
  formatOwnerDisplayName,
  generateSeedCityRivals,
  isRealPlayerBusiness,
  mergeWorldAndSeedRivals,
  ownedToRemoteRecord,
  publishBusinessToRoom,
  removeBusinessFromRoom,
  updateBusinessInRoom,
  type RoomSyncStatus,
  type WorldDbSyncSnapshot,
} from './services/cityRoom';
import {
  fetchAllBanks,
  fetchAllFranchises,
  fetchPlayerIpoListings,
  incrementFranchiseUsage,
  publishBankRecord,
  publishFranchiseBrand,
  publishLoanRecord,
  publishPlayerIpoListing,
  subscribePatronChat,
} from './services/corporateSync';
import { applyOtaUpdate, checkForOtaUpdate } from './services/otaUpdate';
import {
  requestNotificationPermission,
  sendDeviceNotification,
} from './services/notifications';
import { soundEngine } from './services/soundEngine';

import { OrientationGuard } from './components/OrientationGuard';
import { StudioIntro } from './components/StudioIntro';
import { MainMenu } from './components/MainMenu';
import { TurkeyMap } from './components/TurkeyMap';
import { PinDropPanel } from './components/PinDropPanel';
import { BusinessInspector } from './components/BusinessInspector';
import { CompetitorInspector } from './components/CompetitorInspector';
import { BusinessInteriorModal } from './components/BusinessInteriorModal';
import { CityPickerModal } from './components/CityPickerModal';
import { SideDrawer, type DrawerTab } from './components/SideDrawer';
import { NotificationCenter, NotificationToasts } from './components/NotificationCenter';
import { SettingsModal } from './components/SettingsModal';
import { OtaUpdateModal } from './components/OtaUpdateModal';
import { HrManagementModal } from './components/HrManagementModal';
import { HoldingFranchiseModal } from './components/HoldingFranchiseModal';
import { RivalsStrategyModal, type ManagementTabId } from './components/RivalsStrategyModal';
import { BorsaModal } from './components/BorsaModal';
import { BankingModal } from './components/BankingModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PatronChatPanel } from './components/PatronChatPanel';
import { AccountingModal } from './components/AccountingModal';
import { GameTutorialOverlay } from './components/GameTutorialOverlay';
import { DayEndReportModal } from './components/DayEndReportModal';
import { OfficeModal, type OfficeModalTabId } from './components/OfficeModal';
import { ExecutiveDashboard, type QuickActionId } from './components/ExecutiveDashboard';
import {
  BusinessesWorkspace,
  FinansWorkspace,
  OfficeWorkspace,
} from './components/WorkspaceViews';
import { HoldingReportsModal } from './components/HoldingReportsModal';
import { BranchManagementModal } from './components/BranchOperationsModals';
import {
  AdsPromotionModal,
  DailyOffersModal,
  HoldingStoreModal,
  RentalListingsModal,
} from './components/QuickActionModals';
import {
  acceptDailyOffer,
  buyRentalProperty,
  declineDailyOffer,
  launchHoldingPromotion,
  purchaseStorePerk,
  signLeaseContract,
  terminateLeaseContract,
} from './game/quickActionsEngine';
import { computeExecutiveDashboardMetrics } from './game/dashboardMetrics';
import {
  CrisisDecisionModal,
  RaiseRequestsModal,
  StrategicHubModal,
} from './components/StrategicEconomyModals';
import {
  claimBoardContractReward,
  executePrestigeIpoExpansion,
  performBranchMaintenance,
  resolveOperationalCrisis,
  resolveRaiseRequest,
  startMegaProject,
  syncBranchMenuPricesToInflation,
  upgradeBranchEquipment,
} from './game/hardcoreEconomyEngine';
import type { MegaProjectId } from './types/game';
import { CareerWorkspace } from './components/CareerWorkspace';

type ExecutiveNavId = 'overview' | 'career' | 'map' | 'finance' | 'businesses' | 'office';

const SETTINGS_STORAGE_KEY = 'tmi_settings_v1';
const TUTORIAL_STORAGE_KEY = 'tmi_tutorial_done_v122';
const HQ_CITY_STORAGE_KEY = 'tmi_hq_city_v1';

function loadSavedStartingCity(): number {
  try {
    const rawStr = safeStorageGetItem(HQ_CITY_STORAGE_KEY);
    if (rawStr !== null) {
      const raw = Number(rawStr);
      if (Number.isInteger(raw) && raw >= 1 && raw <= 81) return raw;
    }
  } catch (err) {
    console.warn('[Startup] Kayıtlı başlangıç şehri okunamadı, varsayılan kullanılıyor:', err);
  }
  return DEFAULT_PROVINCE_PLATE;
}

function isTutorialCompleted(): boolean {
  try {
    return safeStorageGetItem(TUTORIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const DEFAULT_GAME_SETTINGS: GameSettings = {
  theme: 'dark',
  notificationsEnabled: true,
  soundEnabled: true,
  mapStyle: 'carto',
};

function loadSettings(): GameSettings {
  try {
    const parsed = safeReadStorageJson<Partial<GameSettings> | null>(
      SETTINGS_STORAGE_KEY,
      null,
      (val): val is Partial<GameSettings> =>
        typeof val === 'object' && val !== null && !Array.isArray(val)
    );
    if (parsed) {
      return {
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        notificationsEnabled:
          typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : true,
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
        mapStyle: parsed.mapStyle === 'carto' ? 'carto' : 'osm',
      };
    }
  } catch (err) {
    console.warn('[Startup] Ayarlar okunamadı, varsayılan ayarlar yükleniyor:', err);
  }
  return { ...DEFAULT_GAME_SETTINGS };
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// Backward-compatible & crash-proof migration for saved games -> v1.4.1 state
function migrateSavedEmpire(
  saved: EmpireState | null,
  owner: UserProfile,
  fallbackCityPlate = DEFAULT_PROVINCE_PLATE
): EmpireState {
  const safePlate =
    Number.isInteger(fallbackCityPlate) && fallbackCityPlate >= 1 && fallbackCityPlate <= 81
      ? fallbackCityPlate
      : DEFAULT_PROVINCE_PLATE;
  if (!saved || typeof saved !== 'object') {
    return createInitialEmpireState(Date.now(), safePlate);
  }
  try {
    const nowTs = Date.now();
    const rawBusinesses = Array.isArray(saved.businesses) ? saved.businesses : [];
    const migratedBusinesses = rawBusinesses
      .filter((raw): raw is EmpireState['businesses'][number] => Boolean(raw && typeof raw === 'object'))
      .map((raw, idx) => {
        const legacy = raw as unknown as Record<string, unknown>;
        const rawType = String(legacy.blueprintId ?? 'kafe');
        const blueprintId: BusinessTypeId = isValidBusinessType(rawType) ? rawType : 'kafe';
        const plate =
          typeof legacy.cityPlate === 'number' &&
          Number.isInteger(legacy.cityPlate) &&
          legacy.cityPlate >= 1 &&
          legacy.cityPlate <= 81
            ? legacy.cityPlate
            : safePlate;
        const prov = getProvinceByPlate(plate);
        const lat = finiteOr(legacy.lat, prov.lat);
        const lng = finiteOr(legacy.lng, prov.lng);
        return {
          ...raw,
          id: typeof legacy.id === 'string' && legacy.id.trim() ? legacy.id : `biz-recovered-${idx}-${nowTs}`,
          customName:
            typeof legacy.customName === 'string' && legacy.customName.trim()
              ? legacy.customName
              : `${prov.name} Şubesi`,
          ownerId: (typeof legacy.ownerId === 'string' && legacy.ownerId) || owner.id,
          ownerName:
            !legacy.ownerId || legacy.ownerId === owner.id
              ? owner.name
              : (typeof legacy.ownerName === 'string' && legacy.ownerName) || owner.name,
          blueprintId,
          cityPlate: plate,
          cityName: (typeof legacy.cityName === 'string' && legacy.cityName) || prov.name,
          districtName:
            (typeof legacy.districtName === 'string' && legacy.districtName) ||
            prov.districts[0] ||
            prov.name,
          lat,
          lng,
          level: Math.max(1, Math.floor(finiteOr(legacy.level, 1))),
          purchaseCost: Math.max(0, finiteOr(legacy.purchaseCost, 50_000)),
          pendingCash: Math.max(0, finiteOr(legacy.pendingCash, 0)),
          totalEarned: Math.max(0, finiteOr(legacy.totalEarned, 0)),
          createdAt: finiteOr(legacy.createdAt, nowTs),
          employees: Array.isArray(legacy.employees) ? raw.employees : [],
          stockLevel: Math.min(100, Math.max(0, finiteOr(legacy.stockLevel, 100))),
          maintenanceLevel: Math.min(100, Math.max(0, finiteOr(legacy.maintenanceLevel, 100))),
          constructionTotalDays: Math.max(0, finiteOr(legacy.constructionTotalDays, 0)),
          constructionDaysRemaining: Math.max(0, finiteOr(legacy.constructionDaysRemaining, 0)),
          constructionDailyInstallment: Math.max(0, finiteOr(legacy.constructionDailyInstallment, 0)),
          doubleShiftApplied: Boolean(legacy.doubleShiftApplied),
          dailyAccruedGross: Math.max(0, finiteOr(legacy.dailyAccruedGross, 0)),
          serviceQuality: Math.min(5, Math.max(1, finiteOr(legacy.serviceQuality, 3.6))),
          staffMorale: Math.min(100, Math.max(15, finiteOr(legacy.staffMorale, 74))),
          qualityInvestmentLevel: Math.max(0, Math.floor(finiteOr(legacy.qualityInvestmentLevel, 0))),
          customerTrafficPct: Math.min(140, Math.max(15, finiteOr(legacy.customerTrafficPct, 75))),
        };
      });

    const rawHq = saved.hq as unknown as Record<string, unknown> | undefined;
    const hasValidHq =
      Boolean(rawHq && typeof rawHq === 'object') &&
      typeof rawHq?.cityPlate === 'number' &&
      Number.isInteger(rawHq.cityPlate) &&
      rawHq.cityPlate >= 1 &&
      rawHq.cityPlate <= 81 &&
      typeof rawHq.lat === 'number' &&
      Number.isFinite(rawHq.lat) &&
      typeof rawHq.lng === 'number' &&
      Number.isFinite(rawHq.lng);

    const derivedHq = hasValidHq
      ? {
          cityPlate: rawHq!.cityPlate as number,
          cityName:
            typeof rawHq!.cityName === 'string' && rawHq!.cityName
              ? (rawHq!.cityName as string)
              : getProvinceByPlate(rawHq!.cityPlate as number).name,
          lat: rawHq!.lat as number,
          lng: rawHq!.lng as number,
          zoom: finiteOr(rawHq!.zoom, 13),
          businessId: typeof rawHq!.businessId === 'string' ? rawHq!.businessId : undefined,
        }
      : migratedBusinesses.length > 0
      ? (() => {
          const first = [...migratedBusinesses].sort((a, b) => a.createdAt - b.createdAt)[0];
          return {
            cityPlate: first.cityPlate,
            cityName: first.cityName,
            lat: first.lat,
            lng: first.lng,
            zoom: 15,
            businessId: first.id,
          };
        })()
      : createHeadquartersForCity(safePlate);

    const baseMigrated: EmpireState = {
      ...saved,
      cash: finiteOr(saved.cash, STARTING_CASH),
      totalEarnedLifetime: Math.max(0, finiteOr(saved.totalEarnedLifetime, 0)),
      hq: derivedHq,
      businesses: migratedBusinesses,
      cityManagers: Array.isArray(saved.cityManagers) ? saved.cityManagers : [],
      candidatePool:
        Array.isArray(saved.candidatePool) && saved.candidatePool.length > 0
          ? saved.candidatePool
          : generateCandidatePool(nowTs, 'kafe'),
      supermarketChain: saved.supermarketChain ?? null,
      ownFranchises: Array.isArray(saved.ownFranchises) ? saved.ownFranchises : [],
      franchiseApplications: Array.isArray(saved.franchiseApplications)
        ? saved.franchiseApplications
        : [],
      autoApproveFranchiseApps: saved.autoApproveFranchiseApps ?? true,
      franchiseRoyaltiesEarned: Math.max(0, finiteOr(saved.franchiseRoyaltiesEarned, 0)),
      competitiveBlitzes: Array.isArray(saved.competitiveBlitzes) ? saved.competitiveBlitzes : [],
      acquiredRivalIds: Array.isArray(saved.acquiredRivalIds) ? saved.acquiredRivalIds : [],
      stockPortfolio: Array.isArray(saved.stockPortfolio) ? saved.stockPortfolio : [],
      playerIpo: saved.playerIpo ?? null,
      creditScore: finiteOr(saved.creditScore, STARTING_CREDIT_SCORE),
      ownBank: saved.ownBank ?? null,
      activeLoans: Array.isArray(saved.activeLoans) ? saved.activeLoans : [],
      accountant: saved.accountant ?? null,
      accountantPool:
        Array.isArray(saved.accountantPool) && saved.accountantPool.length > 0
          ? saved.accountantPool
          : generateAccountantPool(nowTs),
      ceo: saved.ceo ?? null,
      ceoPool:
        Array.isArray(saved.ceoPool) && saved.ceoPool.length > 0
          ? saved.ceoPool
          : generateCeoPool(nowTs),
      pendingTaxes: Array.isArray(saved.pendingTaxes) ? saved.pendingTaxes : [],
      totalTaxesPaid: Math.max(0, finiteOr(saved.totalTaxesPaid, 0)),
      lastCeoActionGameDay: Math.max(0, finiteOr(saved.lastCeoActionGameDay, 0)),
      companyXp: Math.max(0, finiteOr(saved.companyXp, 0)),
      gameMinutes: Math.max(0, finiteOr(saved.gameMinutes, STARTING_GAME_MINUTES)),
      completedMissionsCount: Math.max(
        0,
        finiteOr(
          saved.completedMissionsCount,
          Array.isArray(saved.claimedMissionIds) ? saved.claimedMissionIds.length : 0
        )
      ),
      claimedMissionIds: Array.isArray(saved.claimedMissionIds) ? saved.claimedMissionIds : [],
      activeMissions: Array.isArray(saved.activeMissions) ? saved.activeMissions : [],
      pendingDayEndReports: Array.isArray(saved.pendingDayEndReports)
        ? saved.pendingDayEndReports
        : [],
      dayEndHistory: Array.isArray(saved.dayEndHistory) ? saved.dayEndHistory : [],
      brandRecognition: Math.min(
        100,
        Math.max(0, finiteOr(saved.brandRecognition, STARTING_BRAND_RECOGNITION))
      ),
      officeTierId:
        saved.officeTierId === 'home_office' ||
        saved.officeTierId === 'plaza_floor' ||
        saved.officeTierId === 'bosphorus_suite' ||
        saved.officeTierId === 'holding_tower'
          ? saved.officeTierId
          : 'home_office',
      officeUpgradeIds: Array.isArray(saved.officeUpgradeIds) ? saved.officeUpgradeIds : [],
      officeEquipmentLevels:
        saved.officeEquipmentLevels &&
        typeof saved.officeEquipmentLevels === 'object' &&
        !Array.isArray(saved.officeEquipmentLevels)
          ? saved.officeEquipmentLevels
          : {},
      personalAssetIds: Array.isArray(saved.personalAssetIds) ? saved.personalAssetIds : [],
      rentalProperties: Array.isArray(saved.rentalProperties) ? saved.rentalProperties : undefined,
      dailyOffers: Array.isArray(saved.dailyOffers) ? saved.dailyOffers : undefined,
      dailyOffersDay:
        typeof saved.dailyOffersDay === 'number' && Number.isFinite(saved.dailyOffersDay)
          ? saved.dailyOffersDay
          : undefined,
      activeHoldingPromo: saved.activeHoldingPromo ?? null,
      supplyDiscountUntilDay:
        typeof saved.supplyDiscountUntilDay === 'number' && Number.isFinite(saved.supplyDiscountUntilDay)
          ? saved.supplyDiscountUntilDay
          : undefined,
      supplyDiscountPct:
        typeof saved.supplyDiscountPct === 'number' && Number.isFinite(saved.supplyDiscountPct)
          ? saved.supplyDiscountPct
          : undefined,
      storePurchasedIds: Array.isArray(saved.storePurchasedIds) ? saved.storePurchasedIds : [],
      unlockedCityPlates: (() => {
        const set = new Set<number>();
        if (Array.isArray(saved.unlockedCityPlates)) {
          for (const p of saved.unlockedCityPlates) {
            if (typeof p === 'number' && Number.isInteger(p) && p >= 1 && p <= 81) {
              set.add(p);
            }
          }
        }
        set.add(derivedHq.cityPlate);
        for (const biz of migratedBusinesses) {
          set.add(biz.cityPlate);
        }
        return Array.from(set).sort((a, b) => a - b);
      })(),
      career:
        saved.career && typeof saved.career === 'object'
          ? {
              ...createInitialCareerState(),
              ...saved.career,
              shiftsCompleted: Math.max(0, finiteOr(saved.career.shiftsCompleted, 0)),
              totalWagesEarned: Math.max(0, finiteOr(saved.career.totalWagesEarned, 0)),
              totalTipsEarned: Math.max(0, finiteOr(saved.career.totalTipsEarned, 0)),
              careerXp: Math.max(0, finiteOr(saved.career.careerXp, 0)),
            }
          : createInitialCareerState(),
      lastSavedAt: finiteOr(saved.lastSavedAt, nowTs),
    };

    return {
      ...baseMigrated,
      activeMissions: ensureDynamicMissions(baseMigrated, nowTs),
    };
  } catch (err) {
    console.warn('[Startup] Kayıtlı oyun verisi bozuk, varsayılan oyun durumuyla devam ediliyor:', err);
    return createInitialEmpireState(Date.now(), safePlate);
  }
}

interface FloatingCashPopup {
  id: string;
  amount: number;
}

export default function App() {
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [initialSession] = useState<UserProfile | null>(() => loadStoredPlayerSession());
  const [screen, setScreen] = useState<ScreenState>(() =>
    autostart ? (initialSession ? 'playing' : 'menu') : 'intro'
  );
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [user, setUser] = useState<UserProfile | null>(() => initialSession);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [startingCityPlate, setStartingCityPlate] = useState<number>(() =>
    loadSavedStartingCity()
  );

  const [empire, setEmpire] = useState<EmpireState>(() => {
    const startPlate = loadSavedStartingCity();
    if (initialSession) {
      return migrateSavedEmpire(
        loadEmpireStateLocal(initialSession.id),
        initialSession,
        startPlate
      );
    }
    return createInitialEmpireState(Date.now(), startPlate);
  });

  // Active 81-province live room state — automatically locked to HQ city / first business
  const [activePlate, setActivePlate] = useState<number>(
    () => resolveInitialFocusTarget(empire).cityPlate
  );
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [roomRecords, setRoomRecords] = useState<RemoteBusinessRecord[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomSyncStatus>('connecting');
  const [syncRefreshNonce, setSyncRefreshNonce] = useState(0);
  const [worldDbStats, setWorldDbStats] = useState<{
    dbTotal: number;
    rivalCount: number;
    error: string | null;
    loading: boolean;
  }>({
    dbTotal: 0,
    rivalCount: 0,
    error: null,
    loading: true,
  });

  // v1.2.0 Live Corporate World State (Franchises, BIST + IPOs, Banks, Patron Chat)
  const [remoteFranchises, setRemoteFranchises] = useState<FranchiseBrand[]>(SEED_FRANCHISE_BRANDS);
  const [remoteBanks, setRemoteBanks] = useState<BankRecord[]>(DEFAULT_SYSTEM_BANKS);
  const [stockQuotes, setStockQuotes] = useState<StockQuote[]>(() => createInitialStockQuotes());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-chat-global',
      channel: 'global',
      senderId: 'sys',
      senderName: 'Borsa & Holding Haberleri',
      senderBadge: 'Sistem',
      text: 'Türkiye geneli Patron Sohbetine hoş geldiniz! Franchise, IPO ve banka fırsatlarını paylaşın.',
      timestamp: Date.now() - 120_000,
    },
    {
      id: 'welcome-chat-34',
      channel: 'city-34',
      senderId: 'sys',
      senderName: 'İstanbul Ticaret Odası',
      senderBadge: '34 İstanbul',
      text: '34 İstanbul canlı odası aktif. Otopark, fabrika ve AVM sinerjileriyle kârınızı katlayın!',
      timestamp: Date.now() - 60_000,
    },
  ]);

  // Modals, Time Speed & Inspectors
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>(1);
  const [now, setNow] = useState<number>(() => Date.now());
  const simNowRef = useRef<number>(now);
  const [droppedPin, setDroppedPin] = useState<PinLocationInfo | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [interiorBusinessId, setInteriorBusinessId] = useState<string | null>(null);
  const [hrModalOpen, setHrModalOpen] = useState(false);
  const [hrTargetBusinessId, setHrTargetBusinessId] = useState<string | null>(null);
  const [hrInitialSubView, setHrInitialSubView] = useState<'branches' | 'hq'>('branches');
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [rivalsModalOpen, setRivalsModalOpen] = useState(false);
  const [chainCloneDraft, setChainCloneDraft] = useState<ChainCloneDraft | null>(null);
  const [preselectedFranchise, setPreselectedFranchise] = useState<FranchiseBrand | null>(null);
  const [borsaModalOpen, setBorsaModalOpen] = useState(false);
  const [borsaMode, setBorsaMode] = useState<'market' | 'portfolio'>('market');
  const [bankingModalOpen, setBankingModalOpen] = useState(false);
  const [bankingInitialTab, setBankingInitialTab] = useState<'loans' | 'own-bank'>('loans');
  const [accountingModalOpen, setAccountingModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [dayEndModalOpen, setDayEndModalOpen] = useState(false);
  const [officeModalOpen, setOfficeModalOpen] = useState(false);
  const [officeModalTab, setOfficeModalTab] = useState<OfficeModalTabId>('design');
  const [patronChatOpen, setPatronChatOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(() => !isTutorialCompleted());
  const [adsModalOpen, setAdsModalOpen] = useState(false);
  const [rentalsModalOpen, setRentalsModalOpen] = useState(false);
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [overviewReportsOpen, setOverviewReportsOpen] = useState(false);
  const [overviewManagedBranchId, setOverviewManagedBranchId] = useState<string | null>(null);
  const [crisisModalOpen, setCrisisModalOpen] = useState(false);
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [strategicHubOpen, setStrategicHubOpen] = useState(false);

  const [activeNav, setActiveNav] = useState<ExecutiveNavId>('overview');
  const [careerDistrictFilter, setCareerDistrictFilter] = useState<{
    plate: number;
    district: string;
  } | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab | null>(null);
  const [pinDropMode, setPinDropMode] = useState<boolean>(true);
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    nonce: number;
  } | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: 'welcome-v180',
      title: 'Mülk İmparatorluğu v1.8.0',
      body: '₺2.500 ile çalışan olarak başla, vardiyalardan sermaye biriktir, vektörel 81 il haritasında kendi holdingini kur!',
      category: 'system',
      timestamp: Date.now(),
      read: false,
    },
  ]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [otaResult, setOtaResult] = useState<OtaCheckResult | null>(null);
  const [checkingOta, setCheckingOta] = useState(false);
  const [otaModalOpen, setOtaModalOpen] = useState(false);
  const [otaUpdating, setOtaUpdating] = useState(false);

  const [cashPopups, setCashPopups] = useState<FloatingCashPopup[]>([]);
  const prevTierLevelRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const stockQuotesRef = useRef(stockQuotes);
  stockQuotesRef.current = stockQuotes;
  const empireRef = useRef(empire);
  empireRef.current = empire;
  const landCheckAbortRef = useRef<AbortController | null>(null);
  const chatSendersRef = useRef<{
    global?: (msg: ChatMessage) => Promise<void>;
    city?: (msg: ChatMessage) => Promise<void>;
  }>({});

  const activeProvince = useMemo(() => getProvinceByPlate(activePlate), [activePlate]);

  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    soundEngine.setEnabled(settings.soundEnabled);
    safeStorageSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const pushNotification = useCallback(
    (
      title: string,
      body: string,
      category: NotificationItem['category'],
      sendNative = true
    ) => {
      const item: NotificationItem = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        title,
        body,
        category,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 40));
      setToasts((prev) => [item, ...prev].slice(0, 3));
      soundEngine.playNotification();

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 4200);

      if (sendNative && settingsRef.current.notificationsEnabled) {
        sendDeviceNotification(title, body, true);
      }
    },
    []
  );

  const spawnCashPopup = useCallback((amount: number) => {
    const id = `cash-${Date.now()}-${Math.random()}`;
    setCashPopups((prev) => [...prev.slice(-3), { id, amount }]);
    setTimeout(() => {
      setCashPopups((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  }, []);

  // Request notification permissions & check OTA updates in background so splash screen never blocks
  useEffect(() => {
    let active = true;
    const cancelBg = runInBackground(
      async () => {
        try {
          if (settingsRef.current.notificationsEnabled) {
            await withSafeTimeout(
              requestNotificationPermission(),
              3000,
              'unsupported' as const,
              'requestNotificationPermission'
            );
          }
        } catch (err) {
          console.warn('[Startup] Bildirim izni kontrolü atlandı:', err);
        }

        try {
          const res = await withSafeTimeout(
            checkForOtaUpdate(),
            5500,
            null,
            'checkForOtaUpdate'
          );
          if (!active || !res) return;
          setOtaResult(res);
          if (res.hasUpdate && res.remoteManifest) {
            setOtaModalOpen(true);
            pushNotification(
              `Yeni Güncelleme v${res.remoteManifest.version}`,
              res.remoteManifest.notes[0] || 'Yeni içerik ve iyileştirmeler hazır.',
              'update',
              true
            );
          }
        } catch (err) {
          console.warn('[Startup] OTA kontrolü sessizce atlandı:', err);
        }
      },
      'startup-ota-and-permissions',
      450
    );

    return () => {
      active = false;
      cancelBg();
    };
  }, [pushNotification]);

  // Session is restored synchronously from localStorage (tmi_player_session_v1) on startup without blocking UI.

  // Fetch global Supabase corporate tables (franchises, banks, player IPOs) in non-blocking background
  useEffect(() => {
    if (screen !== 'playing') return;
    let active = true;

    const cancelBg = runInBackground(
      async () => {
        try {
          const [franchises, banks, ipos] = await Promise.all([
            fetchAllFranchises().catch((err) => {
              console.warn('[BackgroundSync] Franchise verileri alınamadı, yerel liste kullanılıyor:', err);
              return SEED_FRANCHISE_BRANDS;
            }),
            fetchAllBanks().catch((err) => {
              console.warn('[BackgroundSync] Banka verileri alınamadı, yerel liste kullanılıyor:', err);
              return DEFAULT_SYSTEM_BANKS;
            }),
            fetchPlayerIpoListings().catch((err) => {
              console.warn('[BackgroundSync] IPO verileri alınamadı, yerel borsa kullanılıyor:', err);
              return [];
            }),
          ]);
          if (!active) return;
          setRemoteFranchises(franchises);
          setRemoteBanks(banks);
          if (ipos.length > 0) {
            setStockQuotes((prev) => {
              const bist = prev.filter((q) => !q.isPlayerIpo);
              const existingTickers = new Set(bist.map((b) => b.ticker));
              const mergedIpos = ipos.filter((i) => !existingTickers.has(i.ticker));
              return [...bist, ...mergedIpos];
            });
          }
        } catch (err) {
          console.warn('[BackgroundSync] Kurumsal veriler yüklenemedi, yerel mod aktif:', err);
        }
      },
      'corporate-world-fetch',
      250
    );

    return () => {
      active = false;
      cancelBg();
    };
  }, [screen]);

  // Subscribe to Patron Chat (global + active city channel) safely in background
  useEffect(() => {
    if (screen !== 'playing') return;
    let disposed = false;
    let globalSub: { send: (msg: ChatMessage) => Promise<void>; unsubscribe: () => void } | null =
      null;
    let citySub: { send: (msg: ChatMessage) => Promise<void>; unsubscribe: () => void } | null =
      null;

    const onIncoming = (msg: ChatMessage) => {
      setChatMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev.slice(-60), msg]
      );
    };

    const cancelBg = runInBackground(
      () => {
        if (disposed) return;
        try {
          globalSub = subscribePatronChat('global', onIncoming);
          citySub = subscribePatronChat(`city-${activePlate}`, onIncoming);
          chatSendersRef.current = { global: globalSub.send, city: citySub.send };
        } catch (err) {
          console.warn('[BackgroundSync] Patron sohbet kanalı açılamadı, yerel modda devam:', err);
        }
      },
      'patron-chat-subscribe',
      350
    );

    return () => {
      disposed = true;
      cancelBg();
      try {
        globalSub?.unsubscribe();
        citySub?.unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [screen, activePlate]);

  // Centralized multiplayer map sync callbacks (driven by TurkeyMap single sync hub)
  const lastLiveAlertAtRef = useRef<number>(0);
  const lastSyncErrorRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const serverWorldRecordsRef = useRef<RemoteBusinessRecord[]>([]);

  const reportSupabaseSyncError = useCallback(
    (context: string, errorMsg?: string, silent = false) => {
      const msg = (errorMsg ?? 'Bilinmeyen bağlantı hatası').trim();
      console.warn(`[Supabase Sync] ${context}:`, msg);
      setWorldDbStats((prev) => ({
        ...prev,
        error: `${context}: ${msg}`,
        loading: false,
      }));
      if (silent) return;
      const key = `${context}:${msg}`;
      const nowTs = Date.now();
      if (lastSyncErrorRef.current.key === key && nowTs - lastSyncErrorRef.current.at < 15_000) {
        return;
      }
      lastSyncErrorRef.current = { key, at: nowTs };
      pushNotification('Supabase Senkronizasyon Hatası', `${context}: ${msg}`, 'system', true);
    },
    [pushNotification]
  );

  const localSyncRecords = useMemo<RemoteBusinessRecord[]>(() => {
    if (!user || empire.businesses.length === 0) return [];
    const holdingName =
      empire.playerIpo?.holdingName ||
      empire.supermarketChain?.name ||
      getCompanyTier(calculateNetWorth(empire, Date.now(), stockQuotesRef.current)).title;

    return empire.businesses.map((biz) => {
      const hourly = calculateBusinessHourlyIncome(
        biz,
        empire.activeEvent,
        Date.now(),
        empire.businesses,
        empire
      );
      const valuation = calculateBusinessValuation(biz, empire.activeEvent, Date.now());
      return ownedToRemoteRecord(biz, hourly, valuation, holdingName, {
        id: user.id,
        name: user.name,
      });
    });
  }, [user, empire.businesses, empire.playerIpo, empire.supermarketChain, empire.activeEvent]);

  const handleWorldSyncUpdate = useCallback((snapshot: WorldDbSyncSnapshot) => {
    serverWorldRecordsRef.current = snapshot.records;
    setRoomRecords(snapshot.records);
    setRoomStatus(snapshot.status);
    setWorldDbStats({
      dbTotal: snapshot.dbTotal,
      rivalCount: snapshot.rivalCount,
      error: snapshot.error,
      loading: snapshot.loading,
    });
  }, []);

  const handleRemoteInsert = useCallback(
    (rec: RemoteBusinessRecord) => {
      const currentUserId = userRef.current?.id;
      if (rec.owner_id !== currentUserId && isRealPlayerBusiness(rec)) {
        const nowTs = Date.now();
        if (nowTs - lastLiveAlertAtRef.current > 4000) {
          lastLiveAlertAtRef.current = nowTs;
          pushNotification(
            'Canlı Harita · Yeni Rakip Şube!',
            `${rec.owner_name}, ${String(rec.city_plate).padStart(2, '0')} ${rec.city_name} ilinde "${rec.business_name}" açtı.`,
            'event',
            false
          );
        }
      }
    },
    [pushNotification]
  );

  const handleRemoteUpdate = useCallback(
    (rec: RemoteBusinessRecord) => {
      const currentUserId = userRef.current?.id;
      if (!currentUserId || rec.owner_id === currentUserId) return;
      const ownBranch = empireRef.current.businesses.find((b) => b.id === rec.id);
      if (ownBranch) {
        const buyoutProceeds = Math.round(rec.valuation * 1.35);
        setEmpire((prev) => ({
          ...prev,
          cash: prev.cash + buyoutProceeds,
          businesses: prev.businesses.filter((b) => b.id !== rec.id),
          lastSavedAt: Date.now(),
        }));
        pushNotification(
          'Şubeniz Devralındı!',
          `${rec.owner_name}, "${ownBranch.customName}" şubenizi satın aldı (+${formatTL(
            buyoutProceeds
          )}).`,
          'finance',
          true
        );
      }
    },
    [pushNotification]
  );

  const handleRemoteDelete = useCallback((id: string) => {
    setSelectedCompetitorId((cur) => (cur === id ? null : cur));
  }, []);

  // Persist empire state automatically
  useEffect(() => {
    if (!user) return;
    saveEmpireStateLocal(user.id, empire);
  }, [user, empire]);

  // Live Economy Loop (respects Pause / 1x / 2x / 4x gameSpeed & Hourly Auto-Collection)
  const competitorBusinessesRef = useRef<RemoteBusinessRecord[]>([]);
  const userRef = useRef<UserProfile | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (screen !== 'playing' || gameSpeed === 0) return;

    const REAL_TICK_MS = 250;
    const REAL_TICK_SEC = REAL_TICK_MS / 1000;

    const timer = setInterval(() => {
      const effectiveDt = getEffectiveSimSeconds(REAL_TICK_SEC, gameSpeed);
      simNowRef.current += Math.round(effectiveDt * 1000);
      const tickNow = simNowRef.current;
      setNow(tickNow);

      setEmpire((prev) => {
        const ownerCtx = userRef.current
          ? {
              owner: { id: userRef.current.id, name: userRef.current.name },
              rivalRecords: competitorBusinessesRef.current,
            }
          : undefined;
        const result = tickEconomy(
          prev,
          effectiveDt,
          tickNow,
          undefined,
          stockQuotesRef.current,
          ownerCtx
        );

        if (result.autoCollectedHourlyAmount > 0) {
          spawnCashPopup(result.autoCollectedHourlyAmount);
        }

        if (result.highVaultBusinessIds.length > 0) {
          for (const id of result.highVaultBusinessIds) {
            const biz = result.state.businesses.find((b) => b.id === id);
            if (biz) {
              pushNotification(
                'Yüksek Ciro Birikti!',
                `${biz.customName} kasasında ${formatTL(biz.pendingCash)} sizi bekliyor.`,
                'revenue',
                true
              );
            }
          }
        }

        if (result.newMarketEvent) {
          pushNotification(
            result.newMarketEvent.title,
            result.newMarketEvent.description,
            'event',
            true
          );
        }

        if (result.completedConstructions.length > 0) {
          soundEngine.playUpgrade();
          for (const doneBiz of result.completedConstructions) {
            pushNotification(
              'İnşaat Tamamlandı — Açıldı!',
              `"${doneBiz.customName}" tadilatı bitti ve müşteri kabul etmeye başladı!`,
              'milestone',
              true
            );
          }
        }

        if (result.hardcoreSettlement) {
          const hs = result.hardcoreSettlement;
          if (hs.foreclosedBranchName) {
            const remainingIds = new Set(result.state.businesses.map((b) => b.id));
            const foreclosedBranches = prev.businesses.filter((b) => !remainingIds.has(b.id));
            for (const fb of foreclosedBranches) {
              setRoomRecords((cur) => applyRealtimeBusinessDelete(cur, fb.id));
              serverWorldRecordsRef.current = applyRealtimeBusinessDelete(
                serverWorldRecordsRef.current,
                fb.id
              );
              void removeBusinessFromRoom(fb.id);
            }
            pushNotification(
              'Otomatik Haciz Uygulandı!',
              `3 gün üst üste eksi kasa nedeniyle "${hs.foreclosedBranchName}" şubesi haczedilip tasfiye edildi.`,
              'finance',
              true
            );
          }
          if (hs.inflationWaveTriggered) {
            pushNotification(
              'Periyodik Enflasyon Dalgası',
              `Tedarik ve kira maliyetleri arttı (Endeks: x${hs.inflationIndex.toFixed(2)}). Şube YÖNET ekranından fiyatlarınızı güncelleyin.`,
              'event',
              true
            );
          }
          if (hs.newRaiseRequestsCount > 0) {
            pushNotification(
              'Personel Zam Talebi Geldi',
              `${hs.newRaiseRequestsCount} personel 15 günlük kıdem/enflasyon zammı talep etti.`,
              'system',
              true
            );
          }
          if (hs.newCrisisTriggered && hs.activeCrisisEvent) {
            pushNotification(
              `Acil Kriz: ${hs.activeCrisisEvent.title}`,
              hs.activeCrisisEvent.description,
              'event',
              true
            );
          }
          for (const doneProj of hs.completedMegaProjectNames) {
            soundEngine.playUpgrade();
            pushNotification(
              'Mega Proje Tamamlandı!',
              `${doneProj} inşaatı bitti ve günlük net gelir üretmeye başladı!`,
              'milestone',
              true
            );
          }
        }

        if (result.dayEndSummary) {
          const summary = result.dayEndSummary;
          const netLabel = `${summary.dailyNetCashFlow >= 0 ? '+' : ''}${formatTL(
            summary.dailyNetCashFlow,
            true
          )}`;
          const scoreDeltaLabel =
            summary.creditScoreDelta >= 0
              ? `+${summary.creditScoreDelta}`
              : `${summary.creditScoreDelta}`;

          if (gameSpeed !== 'day') {
            pushNotification(
              `00:00 Gün Sonu Raporu · Gün ${summary.completedDay} (${summary.month}. Ay)`,
              `Net Kâr: ${netLabel} · Kira/Tedarik/SGK düşüldü · Kredi Puanı: ${scoreDeltaLabel}`,
              'finance',
              false
            );
            if (!summary.collected && summary.branchLines.length > 0) {
              setDayEndModalOpen(true);
            }
          }

          if (summary.weeklyDividendPaid > 0) {
            spawnCashPopup(summary.weeklyDividendPaid);
            pushNotification(
              `Haftalık Temettü Ödendi! (${summary.completedDay}. Gün)`,
              `Borsa portföyünüzden +${formatTL(
                summary.weeklyDividendPaid
              )} haftalık temettü kasanıza aktarıldı.`,
              'revenue',
              true
            );
          }

          if (summary.monthlyClosing) {
            pushNotification(
              `${summary.monthlyClosing.monthNumber}. Ay Bilanço Kapanışı`,
              `${summary.monthlyClosing.totalDays} gün tamamlandı · ${summary.monthlyClosing.branchCount} şube · Net Varlık: ${formatTL(
                summary.monthlyClosing.netWorth,
                true
              )}`,
              'milestone',
              true
            );
          }
        }

        if (result.newTaxBillAmount > 0 && !result.state.accountant) {
          pushNotification(
            'Aylık Vergi Tahakkuku Oluştu',
            `${formatTL(result.newTaxBillAmount)} tutarında aylık KDV/SGK/Kurumlar vergisi Finans > Muhasebe ekranında ödeme bekliyor.`,
            'finance',
            true
          );
        }

        if (
          result.accountantAutoPay.autoPaidLoanCount > 0 ||
          result.accountantAutoPay.autoPaidTaxCount > 0
        ) {
          const parts: string[] = [];
          if (result.accountantAutoPay.autoPaidLoanCount > 0) {
            parts.push(
              `${result.accountantAutoPay.autoPaidLoanCount} kredi taksiti (${formatTL(
                result.accountantAutoPay.autoPaidLoanAmount,
                true
              )})`
            );
          }
          if (result.accountantAutoPay.autoPaidTaxCount > 0) {
            parts.push(
              `${result.accountantAutoPay.autoPaidTaxCount} vergi faturası (${formatTL(
                result.accountantAutoPay.autoPaidTaxAmount,
                true
              )})`
            );
          }
          pushNotification(
            'Muhasebeci Otomatik Ödeme Yaptı',
            `${result.state.accountant?.name ?? 'Muhasebe Departmanı'} vadesi gelen ${parts.join(
              ' ve '
            )} ödemesini zamanında tamamladı!`,
            'finance',
            false
          );
        }

        if (result.loanEnforcement.legalWarnings.length > 0) {
          for (const warnLoan of result.loanEnforcement.legalWarnings) {
            pushNotification(
              'YASAL TAKİP UYARISI (15 Gün Gecikme!)',
              `${warnLoan.bankName} krediniz ${warnLoan.overdueDays} gündür gecikmede! 30. günde nakit ve ${warnLoan.collateralBusinessName} haczedilecektir.`,
              'finance',
              true
            );
          }
        }

        if (result.autoRenewedAdsCount > 0) {
          pushNotification(
            'Genel Müdür Otomatik Reklam Yeniledi',
            `${result.autoAdBranchNames.slice(0, 2).join(', ')}${
              result.autoAdBranchNames.length > 2
                ? ` ve +${result.autoAdBranchNames.length - 2} şube`
                : ''
            } için kampanya başlatıldı (-${formatTL(result.autoAdsSpent, true)}).`,
            'event',
            false
          );
        }

        if (result.ceoActionsLog.length > 0) {
          pushNotification(
            'Holding CEO Otonom Kararı',
            result.ceoActionsLog.join(' · '),
            'milestone',
            true
          );
          // Sync any newly opened or upgraded branches created by Autonomous CEO to Supabase
          const prevBizMap = new Map(prev.businesses.map((b) => [b.id, b]));
          const holdingLabel =
            result.state.playerIpo?.holdingName ||
            result.state.supermarketChain?.name ||
            'Anadolu Holdingi';
          for (const biz of result.state.businesses) {
            const oldBiz = prevBizMap.get(biz.id);
            if (!oldBiz) {
              const hourly = calculateBusinessHourlyIncome(
                biz,
                result.state.activeEvent,
                tickNow,
                result.state.businesses,
                result.state
              );
              const valuation = calculateBusinessValuation(biz, result.state.activeEvent, tickNow);
              publishBusinessToRoom(
                ownedToRemoteRecord(biz, hourly, valuation, holdingLabel)
              ).then((syncRes) => {
                if (!syncRes.ok) {
                  reportSupabaseSyncError('CEO yeni şubesi kaydedilemedi', syncRes.error);
                }
              });
            } else if (oldBiz.level !== biz.level) {
              const hourly = calculateBusinessHourlyIncome(
                biz,
                result.state.activeEvent,
                tickNow,
                result.state.businesses,
                result.state
              );
              const valuation = calculateBusinessValuation(biz, result.state.activeEvent, tickNow);
              updateBusinessInRoom(biz.id, {
                level: biz.level,
                hourly_income: Math.round(hourly),
                valuation: Math.round(valuation),
              }).then((syncRes) => {
                if (!syncRes.ok) {
                  reportSupabaseSyncError('CEO şube güncellemesi kaydedilemedi', syncRes.error);
                }
              });
            }
          }
        }

        if (result.newFranchiseOpenings.length > 0) {
          const totalLicense = result.newFranchiseOpenings.reduce(
            (sum, app) => sum + (app.status === 'approved' ? app.licenseFee : 0),
            0
          );
          if (totalLicense > 0) {
            spawnCashPopup(totalLicense);
          }
          const firstApp = result.newFranchiseOpenings[0];
          pushNotification(
            firstApp.status === 'approved'
              ? 'Yeni Bayilik Şubesi Açıldı!'
              : 'Yeni Bayilik Başvurusu Geldi!',
            firstApp.status === 'approved'
              ? `${firstApp.applicantName}, ${firstApp.cityName} ilinde ${firstApp.brandName} bayisi açtı (+${formatTL(
                  firstApp.licenseFee
                )} isim hakkı).`
              : `${firstApp.applicantName}, ${firstApp.cityName} için ${firstApp.brandName} bayiliği istiyor. Yönetim > Franchise'tan onaylayın!`,
            'revenue',
            true
          );
        }

        if (result.loanEnforcement.seizedLoans.length > 0) {
          for (const seized of result.loanEnforcement.seizedLoans) {
            pushNotification(
              'OTOMATİK HACİZ UYGULANDI!',
              `${seized.business.customName} ödenmeyen kredi nedeniyle ${seized.loan.bankName} mülkiyetine geçti!`,
              'finance',
              true
            );
            updateBusinessInRoom(seized.business.id, {
              owner_id: seized.loan.lenderOwnerId,
              owner_name: seized.loan.bankName,
            }).then((syncRes) => {
              if (!syncRes.ok) {
                reportSupabaseSyncError('Haciz mülkiyet devri kaydedilemedi', syncRes.error);
              }
            });
            setRoomRecords((prevRecs) =>
              applyRealtimeBusinessPatch(prevRecs, seized.business.id, {
                owner_id: seized.loan.lenderOwnerId,
                owner_name: seized.loan.bankName,
              })
            );
            publishLoanRecord(seized.loan).catch(() => {});
          }
        }

        return result.state;
      });
    }, REAL_TICK_MS);

    return () => clearInterval(timer);
  }, [screen, gameSpeed, pushNotification, spawnCashPopup]);

  // Live Borsa Ticker Loop (strictly 2-state: paused when 0, steady 1x flow when 1)
  useEffect(() => {
    if (screen !== 'playing' || gameSpeed === 0) return;
    const intervalMs = 3000;
    const tickerTimer = setInterval(() => {
      setStockQuotes((prev) => {
        const currentEmpire = empireRef.current;
        const ownTicker = currentEmpire.playerIpo?.ticker;
        const ownNw = calculateNetWorth(currentEmpire, simNowRef.current, prev);
        const ownFactories = currentEmpire.businesses.filter((b) =>
          isFactoryType(b.blueprintId)
        ).length;
        return tickStockQuotes(
          prev,
          ownTicker,
          ownNw,
          currentEmpire.businesses.length,
          ownFactories
        );
      });
    }, intervalMs);

    return () => clearInterval(tickerTimer);
  }, [screen, gameSpeed]);

  // Derived empire metrics
  const netWorth = useMemo(
    () => calculateNetWorth(empire, now, stockQuotes),
    [empire, now, stockQuotes]
  );
  const companyTier = useMemo(() => getCompanyTier(netWorth), [netWorth]);
  const totalIncomePerSec = useMemo(
    () => calculateTotalIncomePerSec(empire, now),
    [empire, now]
  );
  const initialMapFocus = useMemo(() => resolveInitialFocusTarget(empire), [empire]);

  // Merged Franchises & Banks (Own + Remote + Seed)
  const allFranchises = useMemo(() => {
    const map = new Map<string, FranchiseBrand>();
    for (const f of remoteFranchises) map.set(f.id, f);
    for (const f of empire.ownFranchises ?? []) map.set(f.id, f);
    return Array.from(map.values());
  }, [remoteFranchises, empire.ownFranchises]);

  const allBanks = useMemo(() => {
    const map = new Map<string, BankRecord>();
    for (const b of remoteBanks) map.set(b.id, b);
    if (empire.ownBank) map.set(empire.ownBank.id, empire.ownBank);
    return Array.from(map.values());
  }, [remoteBanks, empire.ownBank]);

  // Merge ALL nationwide real-player businesses + active city AI seed rivals
  const ownIds = useMemo(() => new Set(empire.businesses.map((b) => b.id)), [empire.businesses]);
  const acquiredRivalSet = useMemo(
    () => new Set(empire.acquiredRivalIds ?? []),
    [empire.acquiredRivalIds]
  );
  const seedCityRivals = useMemo(() => generateSeedCityRivals(activePlate), [activePlate]);
  const competitorBusinesses = useMemo(
    () =>
      mergeWorldAndSeedRivals(
        roomRecords,
        seedCityRivals,
        user?.id,
        ownIds,
        acquiredRivalSet
      ),
    [roomRecords, seedCityRivals, user?.id, ownIds, acquiredRivalSet]
  );

  useEffect(() => {
    competitorBusinessesRef.current = competitorBusinesses;
  }, [competitorBusinesses]);

  // 75m minimum distance check for currently dropped pin
  const allExistingPoints = useMemo(
    () => [
      ...empire.businesses.map((b) => ({ lat: b.lat, lng: b.lng, name: b.customName })),
      ...competitorBusinesses.map((r) => ({ lat: r.lat, lng: r.lng, name: r.business_name })),
    ],
    [empire.businesses, competitorBusinesses]
  );

  const droppedPinDistanceCheck = useMemo(() => {
    if (!droppedPin) return { allowed: true, nearestMeters: null };
    return checkMinDistance75m(droppedPin.lat, droppedPin.lng, allExistingPoints);
  }, [droppedPin, allExistingPoints]);

  // Company level promotion alert
  useEffect(() => {
    if (screen !== 'playing') return;
    if (prevTierLevelRef.current !== null && companyTier.level > prevTierLevelRef.current) {
      pushNotification(
        `Şirket Seviyesi ${companyTier.level}!`,
        `"${companyTier.title}" oldunuz. ${companyTier.unlocksText}`,
        'milestone',
        true
      );
      soundEngine.playUpgrade();
    }
    prevTierLevelRef.current = companyTier.level;
  }, [companyTier, screen, pushNotification]);

  const activeMissions = useMemo(
    () => ensureDynamicMissions(empire, now, stockQuotes),
    [empire, now, stockQuotes]
  );

  const claimableMissionCount = useMemo(() => {
    return activeMissions.filter(
      (m) =>
        !empire.claimedMissionIds.includes(m.id) &&
        getMissionProgress(empire, m, now, stockQuotes) >= m.targetValue
    ).length;
  }, [activeMissions, empire, now, stockQuotes]);

  const gameClock = useMemo(
    () => formatGameClock(empire.gameMinutes ?? STARTING_GAME_MINUTES),
    [empire.gameMinutes]
  );

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Handlers
  const handleToggleTheme = () => {
    soundEngine.playClick();
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const handleUpdateSettings = (patch: Partial<GameSettings>) => {
    soundEngine.playClick();
    if (patch.notificationsEnabled) {
      requestNotificationPermission().catch(() => {});
    }
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectStartingCity = (plate: number) => {
    setStartingCityPlate(plate);
    safeStorageSetItem(HQ_CITY_STORAGE_KEY, String(plate));
  };

  const focusHeadquarters = useCallback((targetState: EmpireState) => {
    const focus = resolveInitialFocusTarget(targetState);
    setActivePlate(focus.cityPlate);
    setFlyTarget({ lat: focus.lat, lng: focus.lng, zoom: focus.zoom, nonce: Date.now() });
  }, []);

  const enterEmpireForUser = useCallback(
    (profile: UserProfile, explicitCityPlate?: number) => {
      const targetPlate = explicitCityPlate ?? startingCityPlate;
      const loaded = migrateSavedEmpire(
        loadEmpireStateLocal(profile.id),
        profile,
        targetPlate
      );
      setUser(profile);
      setEmpire(loaded);
      focusHeadquarters(loaded);
      setScreen('playing');
    },
    [focusHeadquarters, startingCityPlate]
  );

  const handleStartGuest = (character: CharacterProfile, cityPlate: number) => {
    soundEngine.playClick();
    setAuthError(null);
    const guestRes = startGuestPlayerSession(character.name);
    if (!guestRes.ok || !guestRes.user) {
      setAuthError(guestRes.error ?? 'Lütfen geçerli bir karakter adı girin.');
      return;
    }
    const guestProfile = guestRes.user;
    handleSelectStartingCity(cityPlate);
    const fresh = createInitialEmpireState(Date.now(), cityPlate, character);
    saveEmpireStateLocal(guestProfile.id, fresh);
    setUser(guestProfile);
    setEmpire(fresh);
    setActiveNav('overview');
    setCareerDistrictFilter(null);
    focusHeadquarters(fresh);
    setScreen('playing');
    const prov = getProvinceByPlate(cityPlate);
    pushNotification(
      `Hoş Geldin, ${guestProfile.name}!`,
      `${prov.code} ${prov.name} ilinde ₺2.500 ile Çalışan olarak kariyerine başladın. İlk dükkanın için İş Hayatı sekmesinde vardiya çalışabilirsin.`,
      'milestone',
      false
    );
  };

  const handleLoginAccount = async (username: string, password: string) => {
    soundEngine.playClick();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginPlayerAccount({ username, password });
      if (!res.ok || !res.user) {
        setAuthError(res.error ?? 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
        return;
      }
      enterEmpireForUser(res.user);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterAccount = async (
    username: string,
    password: string,
    character: CharacterProfile,
    cityPlate: number
  ) => {
    soundEngine.playClick();
    setAuthLoading(true);
    setAuthError(null);
    try {
      handleSelectStartingCity(cityPlate);
      const res = await registerPlayerAccount({
        username,
        password,
        displayName: character.name,
      });
      if (!res.ok || !res.user) {
        setAuthError(res.error ?? 'Hesap oluşturulamadı. Lütfen bilgilerinizi kontrol edin.');
        return;
      }
      const fresh = createInitialEmpireState(Date.now(), cityPlate, character);
      saveEmpireStateLocal(res.user.id, fresh);
      setUser(res.user);
      setEmpire(fresh);
      setActiveNav('overview');
      setCareerDistrictFilter(null);
      focusHeadquarters(fresh);
      setScreen('playing');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpgradeGuestAccount = async (input: {
    username: string;
    password: string;
    displayName: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!user || user.provider !== 'guest') {
      return { ok: false, error: 'Zaten kalıcı bir hesapla oturum açtınız.' };
    }
    const res = await upgradeGuestToSupabaseAccount(user, input);
    if (!res.ok || !res.user) {
      return { ok: false, error: res.error ?? 'Hesap bağlanamadı.' };
    }
    // Keep all current cash, unlocked provinces, career progress & branches seamlessly
    saveEmpireStateLocal(res.user.id, empireRef.current);
    setUser(res.user);
    soundEngine.playUpgrade();
    pushNotification(
      'Hesabınız Kalıcı Olarak Kaydedildi!',
      `@${res.user.username} kullanıcı adıyla tüm ilerlemeniz (nakit, şehirler, kariyer ve şubeler) güvenle bağlandı.`,
      'milestone',
      true
    );
    return { ok: true };
  };

  const handleUnlockProvince = (plate: number) => {
    const res = unlockProvinceLicense(empire, plate, companyTier.level, Date.now());
    if (!res.ok) {
      if (res.error) {
        pushNotification('İl Kilidi Açılamadı', res.error, 'finance', false);
      }
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const prov = getProvinceByPlate(plate);
    setActivePlate(plate);
    pushNotification(
      `${prov.code} ${prov.name} Kilidi Açıldı!`,
      `${formatTL(res.costPaid)} lisans ücretiyle ${prov.name} ilinde iş ilanları ve şube yatırımları açıldı.`,
      'milestone',
      true
    );
  };

  const handleCollectCareerTip = (amount: number) => {
    if (amount <= 0) return;
    soundEngine.playCashCollect();
    const mult = getCharacterTraitModifiers(empireRef.current).tipMultiplier;
    const credited = Math.round(amount * mult);
    setEmpire((prev) => collectShiftTip(prev, amount, Date.now()));
    spawnCashPopup(credited);
  };

  const handleCompleteCareerShift = (job: JobListing, uncollectedTips: number) => {
    const outcome = completeCareerShift(empireRef.current, job, uncollectedTips, Date.now());
    soundEngine.playUpgrade();
    setEmpire(outcome.state);
    const totalEarned = outcome.wagePaid + outcome.tipsIncluded + outcome.promotionBonus;
    spawnCashPopup(totalEarned);
    if (outcome.promotedTo) {
      pushNotification(
        `Terfi Ettiniz: ${outcome.promotedTo.title}!`,
        `Vardiya maaş çarpanınız x${outcome.promotedTo.wageMultiplier.toFixed(2)} oldu ve +${formatTL(
          outcome.promotionBonus
        )} terfi ikramiyesi kazandınız!`,
        'milestone',
        true
      );
    } else {
      pushNotification(
        'Vardiya Tamamlandı',
        `${job.workplaceName} (${job.districtName}): +${formatTL(totalEarned)} ve +${outcome.xpEarned} XP hesabınıza işlendi.`,
        'revenue',
        false
      );
    }
    return outcome;
  };

  const closeAllInGameOverlays = useCallback(() => {
    setSettingsOpen(false);
    setNotifOpen(false);
    setActiveDrawer(null);
    setDroppedPin(null);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    setInteriorBusinessId(null);
    setHrModalOpen(false);
    setHoldingModalOpen(false);
    setRivalsModalOpen(false);
    setBorsaModalOpen(false);
    setBankingModalOpen(false);
    setAccountingModalOpen(false);
    setLeaderboardModalOpen(false);
    setDayEndModalOpen(false);
    setOfficeModalOpen(false);
    setPatronChatOpen(false);
    setCityPickerOpen(false);
    setAdsModalOpen(false);
    setRentalsModalOpen(false);
    setOffersModalOpen(false);
    setStoreModalOpen(false);
    setOverviewReportsOpen(false);
    setOverviewManagedBranchId(null);
    setCrisisModalOpen(false);
    setRaiseModalOpen(false);
    setStrategicHubOpen(false);
    setOtaModalOpen(false);
  }, []);

  const handleReturnToMainMenu = useCallback(() => {
    soundEngine.playClick();
    if (user) {
      saveEmpireStateLocal(user.id, empireRef.current);
    }
    closeAllInGameOverlays();
    setScreen('menu');
  }, [closeAllInGameOverlays, user]);

  const handleSignOut = async () => {
    soundEngine.playClick();
    if (user) {
      saveEmpireStateLocal(user.id, empireRef.current);
    }
    await signOutAccount();
    closeAllInGameOverlays();
    setAuthError(null);
    setUser(null);
    setEmpire(createInitialEmpireState(Date.now(), startingCityPlate));
    setScreen('menu');
  };

  const handleManualOtaCheck = async () => {
    soundEngine.playClick();
    setCheckingOta(true);
    const res = await checkForOtaUpdate();
    setOtaResult(res);
    setCheckingOta(false);
    if (res.hasUpdate && res.remoteManifest) {
      setOtaModalOpen(true);
      pushNotification(
        `Yeni Sürüm v${res.remoteManifest.version}`,
        'Canlı güncelleme indirilebilir durumda.',
        'update',
        true
      );
    } else if (!res.error) {
      pushNotification(
        'Sürüm Güncel',
        `Türkiye Mülk İmparatoru v${res.remoteManifest?.version ?? res.currentVersion} en güncel sürümdedir.`,
        'update',
        false
      );
    }
  };

  const handleApplyOtaUpdate = async () => {
    setOtaUpdating(true);
    await applyOtaUpdate();
  };

  const handleSelectProvince = (prov: ProvinceInfo) => {
    soundEngine.playClick();
    if (!isProvinceUnlocked(empireRef.current, prov.plate)) {
      pushNotification(
        `${prov.code} ${prov.name} Kilitli`,
        'Bu ili açmak için Türkiye haritasında üzerine tıklayıp il lisansını satın alabilirsiniz.',
        'system',
        false
      );
      return;
    }
    setActivePlate(prov.plate);
    setDroppedPin(null);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    setFlyTarget({ lat: prov.lat, lng: prov.lng, zoom: prov.zoom, nonce: Date.now() });
    pushNotification(
      `${prov.code} ${prov.name} Odasına Geçildi`,
      `${prov.region} bölgesi vektörel harita ve ilçe odası yüklendi.`,
      'system',
      false
    );
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number, explicitDistrictName?: string) => {
      landCheckAbortRef.current?.abort();
      const abort = new AbortController();
      landCheckAbortRef.current = abort;

      const baseInfo = resolvePinLocation(lat, lng, activePlate);
      // Vector district clicks are guaranteed inside the province's real land district polygon
      const info: PinLocationInfo = explicitDistrictName
        ? {
            ...baseInfo,
            districtName: explicitDistrictName,
            landStatus: 'valid',
            landMessage: `${baseInfo.cityName} / ${explicitDistrictName} ticari imar bölgesi doğrulandı.`,
          }
        : baseInfo;

      setDroppedPin(info);
      setSelectedBusinessId(null);
      setSelectedCompetitorId(null);
      setActiveDrawer(null);
      setPinDropMode(true);
      soundEngine.playPinDrop();

      if (explicitDistrictName) {
        return;
      }

      validateLandCoordinate(lat, lng, abort.signal).then((validation) => {
        if (abort.signal.aborted) return;
        setDroppedPin((current) => {
          if (!current || current.lat !== info.lat || current.lng !== info.lng) {
            return current;
          }
          return {
            ...current,
            districtName: validation.resolvedDistrict || current.districtName,
            landStatus: validation.status,
            landMessage: validation.reason,
            resolvedAddress: validation.resolvedAddress,
          };
        });
      });
    },
    [activePlate]
  );

  const handleSelectManagementTab = useCallback(
    (tab: ManagementTabId) => {
      soundEngine.playClick();
      setDroppedPin(null);
      setSelectedBusinessId(null);
      setSelectedCompetitorId(null);
      setBorsaModalOpen(false);
      setBankingModalOpen(false);
      setAccountingModalOpen(false);
      setOfficeModalOpen(false);
      setActiveDrawer(tab === 'portfolio' ? 'portfolio' : null);
      setHrModalOpen(tab === 'hr');
      setHoldingModalOpen(tab === 'franchise');
      setRivalsModalOpen(tab === 'rivals');
      if (tab === 'hr' && !hrTargetBusinessId && empire.businesses.length > 0) {
        setHrTargetBusinessId(empire.businesses[0].id);
      }
    },
    [hrTargetBusinessId, empire.businesses]
  );

  const handleStartCloneBusiness = useCallback(
    (businessId: string) => {
      const source = empire.businesses.find((b) => b.id === businessId);
      if (!source) return;
      const draft = prepareChainCloneDraft(source, empire.businesses);
      soundEngine.playClick();
      setChainCloneDraft(draft);
      setPreselectedFranchise(null);
      setActiveDrawer(null);
      setHrModalOpen(false);
      setHoldingModalOpen(false);
      setRivalsModalOpen(false);
      setSelectedBusinessId(null);
      setSelectedCompetitorId(null);
      setDroppedPin(null);
      setPinDropMode(true);
      setActiveNav('map');
      pushNotification(
        'Zincir Şube Yerleştirme Modu',
        `"${draft.suggestedName}" için haritada (aynı il veya 81 ilden biri) kara üzerine tıklayın.`,
        'system',
        false
      );
    },
    [empire.businesses, pushNotification]
  );

  const handleEstablishBusiness = (
    blueprintId: BusinessTypeId,
    customName: string,
    franchiseBrand?: FranchiseBrand | null,
    chainCloneMeta?: {
      chainBrandName: string;
      chainBranchNumber: number;
      sourceBusinessId?: string;
    } | null
  ) => {
    if (!droppedPin || !user) return;
    const res = purchaseBusiness(
      empire,
      blueprintId,
      droppedPin,
      customName,
      { id: user.id, name: user.name },
      competitorBusinesses.map((r) => ({ lat: r.lat, lng: r.lng, name: r.business_name })),
      Date.now(),
      franchiseBrand,
      chainCloneMeta
    );
    if (!res.ok || !res.business) {
      if (res.error) {
        pushNotification('Kurulum Engellendi', res.error, 'system', false);
      }
      return;
    }

    const created = res.business;
    soundEngine.playPurchase();
    setEmpire(res.state);
    setDroppedPin(null);
    setChainCloneDraft(null);
    setPreselectedFranchise(null);
    setSelectedBusinessId(created.id);

    const hourly = calculateBusinessHourlyIncome(
      created,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses,
      res.state
    );
    const valuation = calculateBusinessValuation(created, res.state.activeEvent, Date.now());
    const holdingLabel =
      res.state.playerIpo?.holdingName ||
      res.state.supermarketChain?.name ||
      companyTier.title;
    const remoteRec = ownedToRemoteRecord(created, hourly, valuation, holdingLabel, {
      id: user.id,
      name: user.name,
    });
    setRoomRecords((prev) => applyRealtimeBusinessUpsert(prev, remoteRec));
    publishBusinessToRoom(remoteRec).then((syncRes) => {
      if (!syncRes.ok) {
        reportSupabaseSyncError('Yeni işletme Supabase veritabanına yazılamadı', syncRes.error);
      } else {
        serverWorldRecordsRef.current = applyRealtimeBusinessUpsert(
          serverWorldRecordsRef.current,
          remoteRec
        );
      }
    });

    if (franchiseBrand) {
      const nextCount = franchiseBrand.branchCount + 1;
      const nextRoyalty = franchiseBrand.totalRoyaltyEarned + franchiseBrand.licenseFee;
      incrementFranchiseUsage(franchiseBrand.id, nextCount, nextRoyalty).catch(() => {});
      setRemoteFranchises((prev) =>
        prev.map((f) =>
          f.id === franchiseBrand.id
            ? { ...f, branchCount: nextCount, totalRoyaltyEarned: nextRoyalty }
            : f
        )
      );
    }

    const chainInfo = getChainStatusForBusiness(created, res.state.businesses);
    if (chainInfo.isChain && chainCloneMeta) {
      pushNotification(
        `Zincir Marka Büyüdü! (${chainInfo.branchCount} Şube)`,
        `${chainInfo.brandName} artık Zincir Marka: -%${Math.round(
          chainInfo.supplyDiscount * 100
        )} tedarik indirimi ve +%${Math.round(chainInfo.revenueBonus * 100)} ciro bonusu aktif!`,
        'milestone',
        true
      );
    } else {
      pushNotification(
        franchiseBrand ? 'Franchise Şubesi Açıldı!' : 'Yeni İşletme Açıldı!',
        `${created.customName} (${String(created.cityPlate).padStart(2, '0')} ${created.cityName}) canlı haritada yayında.`,
        'milestone',
        true
      );
    }
  };

  const handleSelectOwnBusiness = useCallback(
    (businessId: string) => {
      const target = empire.businesses.find((b) => b.id === businessId);
      setSelectedBusinessId(businessId);
      setSelectedCompetitorId(null);
      setDroppedPin(null);
      setActiveDrawer(null);
      setActiveNav('map');
      soundEngine.playClick();
      if (target) {
        if (target.cityPlate !== activePlate) {
          setActivePlate(target.cityPlate);
        }
        setFlyTarget({ lat: target.lat, lng: target.lng, zoom: 15, nonce: Date.now() });
      }
    },
    [empire.businesses, activePlate]
  );

  const handleSelectCompetitor = useCallback((record: RemoteBusinessRecord) => {
    setSelectedCompetitorId(record.id);
    setSelectedBusinessId(null);
    setDroppedPin(null);
    setActiveDrawer(null);
    setActiveNav('map');
    soundEngine.playClick();
    setFlyTarget({ lat: record.lat, lng: record.lng, zoom: 15, nonce: Date.now() });
  }, []);

  const handleTakeoverCompetitor = (record: RemoteBusinessRecord, customMultiplier?: number) => {
    if (!user) return;
    const res = takeoverCompetitorBusiness(
      empire,
      record,
      { id: user.id, name: user.name },
      Date.now(),
      customMultiplier
    );
    if (!res.ok || !res.business) {
      if (res.error) pushNotification('Devralma Başarısız', res.error, 'system', false);
      return;
    }

    const acquired = res.business;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    setSelectedCompetitorId(null);
    setRivalsModalOpen(false);
    setSelectedBusinessId(acquired.id);

    const holdingLabel =
      res.state.playerIpo?.holdingName ||
      res.state.supermarketChain?.name ||
      companyTier.title;
    const ownerDisplay = formatOwnerDisplayName(user.name, holdingLabel);
    const acquiredHourly = calculateBusinessHourlyIncome(
      acquired,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses,
      res.state
    );
    const acquiredVal = calculateBusinessValuation(acquired, res.state.activeEvent, Date.now());

    if (isRealPlayerBusiness(record)) {
      updateBusinessInRoom(record.id, {
        owner_id: user.id,
        owner_name: ownerDisplay,
        level: acquired.level,
        hourly_income: Math.round(acquiredHourly),
        valuation: Math.round(acquiredVal),
      }).then((syncRes) => {
        if (!syncRes.ok) {
          reportSupabaseSyncError('Devralma kaydı Supabase üzerinde güncellenemedi', syncRes.error);
        }
      });
      setRoomRecords((prev) =>
        applyRealtimeBusinessPatch(prev, record.id, {
          owner_id: user.id,
          owner_name: ownerDisplay,
          level: acquired.level,
          hourly_income: Math.round(acquiredHourly),
          valuation: Math.round(acquiredVal),
        })
      );
    } else {
      // Newly acquired AI seed branch is published to public.businesses so other players see your new ownership
      const publishedAcquired = ownedToRemoteRecord(
        acquired,
        acquiredHourly,
        acquiredVal,
        holdingLabel,
        { id: user.id, name: user.name }
      );
      setRoomRecords((prev) => applyRealtimeBusinessUpsert(prev, publishedAcquired));
      publishBusinessToRoom(publishedAcquired).then((syncRes) => {
        if (!syncRes.ok) {
          reportSupabaseSyncError('Devralınan işletme Supabase veritabanına yazılamadı', syncRes.error);
        }
      });
    }

    pushNotification(
      'Rakip İşletme Devralındı!',
      `${acquired.customName} (%${Math.round((customMultiplier ?? 1.5) * 100)} değerleme) artık sizin portföyünüzde.`,
      'milestone',
      true
    );
  };

  const handleFocusRivalOnMap = (rival: RemoteBusinessRecord) => {
    soundEngine.playClick();
    setRivalsModalOpen(false);
    setActiveDrawer(null);
    setSelectedBusinessId(null);
    setDroppedPin(null);
    if (rival.city_plate !== activePlate) {
      setActivePlate(rival.city_plate);
    }
    setSelectedCompetitorId(rival.id);
    setActiveNav('map');
    setFlyTarget({ lat: rival.lat, lng: rival.lng, zoom: 16, nonce: Date.now() });
  };

  const handleLaunchCompetitiveBlitz = (rival: RemoteBusinessRecord) => {
    const res = launchCompetitiveBlitz(empire, rival, Date.now());
    if (!res.ok || !res.blitz) {
      if (res.error) pushNotification('Rekabet Hamlesi Başarısız', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Rekabetçi Fiyat Hamlesi Başladı!',
      `${rival.city_name} ilindeki tüm şubeleriniz 6 oyun saati boyunca +%25 ciro bonusu kazandı!`,
      'event',
      true
    );
  };

  const handleCollectBusiness = (businessId: string) => {
    const res = collectBusinessCash(empire, businessId, Date.now());
    if (!res.ok || !res.collectedAmount) return;
    soundEngine.playCashCollect();
    setEmpire(res.state);
    spawnCashPopup(res.collectedAmount);
  };

  const handleCollectAll = () => {
    const res = collectAllCash(empire, Date.now());
    if (!res.ok || !res.collectedAmount) return;
    soundEngine.playCashCollect();
    setEmpire(res.state);
    spawnCashPopup(res.collectedAmount);
  };

  const handleHireDoubleShift = (businessId: string) => {
    const res = hireDoubleShiftCrew(empire, businessId, Date.now());
    if (!res.ok || !res.business) {
      if (res.error) pushNotification('Çift Vardiya Başlatılamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Çift Vardiya Ekibi İş Başında!',
      `${res.business.customName} inşaat süresi %35 kısaltıldı! Kalan süre: ${res.business.constructionDaysRemaining} gün.`,
      'milestone',
      false
    );
  };

  const handleCollectDayEndAll = () => {
    const res = collectDayEndReport(empire, undefined, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Gün Sonu Tahsilatı', res.error, 'finance', false);
      return;
    }
    soundEngine.playCashCollect();
    setEmpire(res.state);
    if ((res.collectedAmount ?? 0) > 0) {
      spawnCashPopup(res.collectedAmount!);
    }
    pushNotification(
      'Gün Sonu Hasılatı Kasaya Aktarıldı',
      `Net ${res.collectedAmount && res.collectedAmount >= 0 ? '+' : ''}${formatTL(
        res.collectedAmount ?? 0
      )} ana şirket kasasına işlendi.`,
      'revenue',
      false
    );
    setDayEndModalOpen(false);
  };

  const handleCollectDayEndSingle = (reportId: string) => {
    const res = collectDayEndReport(empire, reportId, Date.now());
    if (!res.ok) return;
    soundEngine.playCashCollect();
    setEmpire(res.state);
    if ((res.collectedAmount ?? 0) > 0) {
      spawnCashPopup(res.collectedAmount!);
    }
    if ((res.state.pendingDayEndReports ?? []).length === 0) {
      setDayEndModalOpen(false);
    }
  };

  const handleUpgradeBusiness = (businessId: string) => {
    const res = upgradeBusiness(empire, businessId, Date.now());
    if (!res.ok || !res.business) return;
    soundEngine.playUpgrade();
    setEmpire(res.state);

    const hourly = calculateBusinessHourlyIncome(
      res.business,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses,
      res.state
    );
    const valuation = calculateBusinessValuation(res.business, res.state.activeEvent, Date.now());
    const holdingLabel =
      res.state.playerIpo?.holdingName ||
      res.state.supermarketChain?.name ||
      companyTier.title;
    const ownerDisplay = user ? formatOwnerDisplayName(user.name, holdingLabel) : undefined;
    const patch = {
      level: res.business.level,
      hourly_income: Math.round(hourly),
      valuation: Math.round(valuation),
      ...(ownerDisplay ? { owner_name: ownerDisplay } : {}),
    };
    setRoomRecords((prev) => applyRealtimeBusinessPatch(prev, res.business!.id, patch));
    updateBusinessInRoom(res.business.id, patch).then((syncRes) => {
      if (!syncRes.ok) {
        reportSupabaseSyncError('Şube yükseltmesi Supabase üzerinde güncellenemedi', syncRes.error);
      }
    });

    pushNotification(
      'İşletme Yükseltildi',
      `${res.business.customName} Seviye ${res.business.level} oldu!`,
      'milestone',
      false
    );
  };

  const handleCustomizeBranch = (
    businessId: string,
    updates: {
      customName: string;
      brandColor: string;
      conceptIcon: BranchConceptIconId;
    }
  ): boolean => {
    const res = customizeBranchIdentity(empire, businessId, updates, Date.now());
    if (!res.ok || !res.business) {
      if (res.error) {
        pushNotification('Özelleştirme Hatası', res.error, 'system', false);
      }
      return false;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);

    const patch = {
      business_name: res.business.customName,
    };
    setRoomRecords((prev) => applyRealtimeBusinessPatch(prev, res.business!.id, patch));
    updateBusinessInRoom(res.business.id, patch).then((syncRes) => {
      if (!syncRes.ok) {
        reportSupabaseSyncError('Şube adı Supabase üzerinde güncellenemedi', syncRes.error);
      }
    });

    pushNotification(
      'Şube Özelleştirildi',
      `${res.business.customName} kimliği ve konsepti kaydedildi.`,
      'milestone',
      false
    );
    return true;
  };

  const handleLaunchBranchMarketing = (
    businessId: string,
    tierId: AdCampaignTierId
  ): boolean => {
    const res = launchBranchMarketingCampaign(empire, businessId, tierId, Date.now());
    if (!res.ok || !res.campaign) {
      if (res.error) {
        pushNotification('Reklam Başlatılamadı', res.error, 'system', false);
      }
      return false;
    }
    soundEngine.playPurchase();
    setEmpire(res.state);
    const biz = res.state.businesses.find((b) => b.id === businessId);
    pushNotification(
      'Reklam Kampanyası Yayında',
      `${biz?.customName ?? 'Şube'} için ${res.campaign.label} başlatıldı (+%${Math.round(
        res.campaign.customerBoost * 100
      )} müşteri).`,
      'milestone',
      false
    );
    return true;
  };

  const handleUpgradeBranchFacility = (
    businessId: string,
    trackId: BranchUpgradeTrackId
  ): boolean => {
    const res = upgradeBranchFacility(empire, businessId, trackId, Date.now());
    if (!res.ok || !res.business) {
      if (res.error) {
        pushNotification('Geliştirme Başarısız', res.error, 'system', false);
      }
      return false;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);

    const hourly = calculateBusinessHourlyIncome(
      res.business,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses,
      res.state
    );
    const valuation = calculateBusinessValuation(res.business, res.state.activeEvent, Date.now());
    const holdingLabel =
      res.state.playerIpo?.holdingName ||
      res.state.supermarketChain?.name ||
      companyTier.title;
    const ownerDisplay = user ? formatOwnerDisplayName(user.name, holdingLabel) : undefined;
    const patch = {
      level: res.business.level,
      hourly_income: Math.round(hourly),
      valuation: Math.round(valuation),
      ...(ownerDisplay ? { owner_name: ownerDisplay } : {}),
    };
    setRoomRecords((prev) => applyRealtimeBusinessPatch(prev, res.business!.id, patch));
    updateBusinessInRoom(res.business.id, patch).then((syncRes) => {
      if (!syncRes.ok) {
        reportSupabaseSyncError('Şube geliştirmesi Supabase üzerinde güncellenemedi', syncRes.error);
      }
    });

    pushNotification(
      'Şube Geliştirildi',
      `${res.business.customName} altyapısı Sv. ${res.newLevel} oldu!`,
      'milestone',
      false
    );
    return true;
  };

  const handlePerformBranchMaintenance = (businessId: string) => {
    const res = performBranchMaintenance(empire, businessId);
    if (!res.ok) {
      if (res.error) pushNotification('Bakım Yapılamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Şube Bakımı Tamamlandı',
      `Kondisyon %${res.newCondition} seviyesine çıkarıldı (-${formatTL(res.cost ?? 0, true)}).`,
      'system',
      false
    );
  };

  const handleRenewBranchEquipment = (businessId: string) => {
    const res = upgradeBranchEquipment(empire, businessId);
    if (!res.ok) {
      if (res.error) pushNotification('Ekipman Yenilenemedi', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Ekipman Yenilendi',
      `Ekipman Sv. ${res.nextLevel} oldu ve şube kondisyonu %100 yenilendi.`,
      'milestone',
      false
    );
  };

  const handleSyncBranchPrices = (businessId: string) => {
    const res = syncBranchMenuPricesToInflation(empire, businessId);
    if (!res.ok) {
      if (res.error) pushNotification('Fiyat Güncellenemedi', res.error, 'system', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      'Menü Fiyatları Güncellendi',
      `Şube fiyatları güncel enflasyon endeksine (x${res.nextIndex?.toFixed(2)}) uyarlandı.`,
      'finance',
      false
    );
  };

  const handleResolveCrisis = (choiceId: string) => {
    const currentDay = Math.max(1, Math.floor((empire.gameMinutes ?? 540) / 1440) + 1);
    const res = resolveOperationalCrisis(empire, choiceId, currentDay);
    if (!res.ok) {
      if (res.error) pushNotification('Kriz Kararı Uygulanamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
    setCrisisModalOpen(false);
    pushNotification('Operasyonel Kriz Yönetildi', res.summary, 'event', false);
  };

  const handleResolveRaiseRequest = (requestId: string, decision: 'approve' | 'reject') => {
    const currentDay = Math.max(1, Math.floor((empire.gameMinutes ?? 540) / 1440) + 1);
    const res = resolveRaiseRequest(empire, requestId, decision, currentDay);
    if (!res.ok) return;
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      decision === 'approve' ? 'Zam Talebi Onaylandı' : 'Zam Talebi Reddedildi',
      res.summary,
      'system',
      false
    );
  };

  const handleStartMegaProject = (projectId: MegaProjectId) => {
    const currentDay = Math.max(1, Math.floor((empire.gameMinutes ?? 540) / 1440) + 1);
    const res = startMegaProject(empire, projectId, currentDay);
    if (!res.ok) {
      if (res.error) pushNotification('Mega Proje Başlatılamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Mega Proje İnşaatı Başladı',
      `${res.project?.name} temeli atıldı (${res.project?.totalDays} oyun günü sürecek).`,
      'milestone',
      true
    );
  };

  const handleClaimBoardContract = (contractId: string) => {
    const currentDay = Math.max(1, Math.floor((empire.gameMinutes ?? 540) / 1440) + 1);
    const res = claimBoardContractReward(empire, contractId, currentDay);
    if (!res.ok) {
      if (res.error) pushNotification('Ödül Alınamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    if (res.rewardCash) spawnCashPopup(res.rewardCash);
    pushNotification(
      'Yönetim Kurulu Kontrat Ödülü Alındı',
      `+${formatTL(res.rewardCash ?? 0, true)} kasaya aktarıldı ve yeni kontrat açıldı.`,
      'milestone',
      false
    );
  };

  const handleTriggerPrestigeIpo = () => {
    const res = executePrestigeIpoExpansion(empire, netWorth);
    if (!res.ok) {
      if (res.error) pushNotification('Halka Arz Prestiji Kilitli', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    if (res.ipoCashBonus) spawnCashPopup(res.ipoCashBonus);
    pushNotification(
      `Halka Arz & Yeni Pazar Kademe ${res.nextTier}!`,
      `+${formatTL(res.ipoCashBonus ?? 0, true)} halka arz sermayesi ve kalıcı prestij geliri eklendi.`,
      'milestone',
      true
    );
  };

  const handleLaunchHoldingBulkAds = (): boolean => {
    const res = launchHoldingWideAdCampaign(empire, Date.now());
    if (!res.ok) {
      if (res.error) {
        pushNotification('Toplu Reklam Başlatılamadı', res.error, 'system', false);
      }
      return false;
    }
    soundEngine.playPurchase();
    setEmpire(res.state);
    pushNotification(
      'Toplu Holding Reklamı Yayında',
      `${res.affectedBranches ?? 0} aktif şubede 24 saatlik müşteri ve ciro artışı başlatıldı.`,
      'milestone',
      false
    );
    return true;
  };

  const handleDistributeHoldingBonus = (): boolean => {
    const res = distributeHoldingStaffBonus(empire, Date.now());
    if (!res.ok) {
      if (res.error) {
        pushNotification('Prim Dağıtılamadı', res.error, 'system', false);
      }
      return false;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Tüm Personele Prim Dağıtıldı',
      'Çalışan yorgunluğu azaldı, ekip morali ve verimliliği yükseldi!',
      'milestone',
      false
    );
    return true;
  };

  const handleHireStaffQuick = (businessId: string) => {
    const res = hireStaff(empire, businessId, Date.now());
    if (!res.ok) return;
    soundEngine.playPurchase();
    setEmpire(res.state);
  };

  // --- v1.5.8 HR & Strict Branch Staffing Handlers ---
  const handleHireCandidate = (
    candidateId: string,
    businessId: string | null,
    cityPlate: number
  ): { ok: boolean; error?: string } => {
    const res = hireCandidateFromPool(empire, candidateId, businessId, cityPlate, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('İşe Alım Başarısız', res.error, 'system', false);
      return { ok: false, error: res.error };
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification('Yeni Personel / Yönetici Atandı', 'Kadro ve otomasyon güncellendi.', 'milestone', false);
    return { ok: true };
  };

  const handleAssignRoleSlot = (
    businessId: string,
    role: 'calisan' | 'mudur_yardimcisi' | 'sube_muduru'
  ): { ok: boolean; error?: string } => {
    const res = assignFirstCandidateForRole(empire, businessId, role, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Atama Başarısız', res.error, 'system', false);
      return { ok: false, error: res.error };
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification('Kadro Ataması Tamamlandı', 'Şube kadrosu ve bordro güncellendi.', 'milestone', false);
    return { ok: true };
  };

  const handlePromoteStaff = (
    businessId: string,
    staffId: string
  ): { ok: boolean; error?: string } => {
    const res = promoteBranchEmployee(empire, businessId, staffId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Terfi Başarısız', res.error, 'system', false);
      return { ok: false, error: res.error };
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification('Personel Terfi Etti', 'Yeni yetki ve verimlilik artışı aktif edildi.', 'milestone', false);
    return { ok: true };
  };

  const handleDismissStaff = (staffId: string, businessId?: string) => {
    const res = dismissStaffMember(empire, staffId, businessId, Date.now());
    if (res.ok) {
      soundEngine.playClick();
      setEmpire(res.state);
    }
  };

  const handleRefreshCandidatePool = (): { ok: boolean; error?: string } => {
    const targetBiz = empire.businesses.find((b) => b.id === hrTargetBusinessId);
    const res = refreshCandidatePool(empire, targetBiz?.blueprintId ?? 'kafe', Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Havuz Yenilenemedi', res.error, 'system', false);
      return { ok: false, error: res.error };
    }
    soundEngine.playClick();
    setEmpire(res.state);
    return { ok: true };
  };

  const handleRestockBusiness = (businessId: string) => {
    const target = empire.businesses.find((b) => b.id === businessId);
    const auto = target
      ? resolveBusinessAutomation(target, empire.cityManagers ?? [], empire.businesses)
      : null;
    const res = restockAndMaintainBusiness(
      empire,
      businessId,
      auto?.bulkSupplyDiscount ?? 0,
      Date.now()
    );
    if (!res.ok) {
      if (res.error) pushNotification('Tedarik', res.error, 'system', false);
      return;
    }
    soundEngine.playPurchase();
    setEmpire(res.state);
  };

  // --- v1.2.0 Holding, Chain & Franchise Handlers ---
  const handleFormSupermarketChain = (chainName: string) => {
    const res = formSupermarketChain(empire, chainName, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Zincir Market', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Zincir Market Markası Kuruldu!',
      `${chainName} markasıyla %20 toplu tedarik indirimi aktif.`,
      'milestone',
      true
    );
  };

  const handleCreateFranchise = (params: {
    brandName: string;
    businessType: BusinessTypeId;
    licenseFee: number;
    royaltyRate: number;
  }) => {
    if (!user) return;
    const res = createFranchiseBrand(empire, params, { id: user.id, name: user.name }, Date.now());
    if (!res.ok || !res.brand) {
      if (res.error) pushNotification('Franchise Açılamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    publishFranchiseBrand(res.brand).catch(() => {});
    pushNotification(
      'Franchise Markası Yayında!',
      `${res.brand.brandName} artık 81 ilde hem oyuncuların hem AI girişimcilerin başvurularına açık.`,
      'milestone',
      true
    );
  };

  const handleLaunchAdCampaign = (businessId: string, tierId: AdCampaignTierId) => {
    const res = launchBusinessAdCampaign(empire, businessId, tierId, Date.now(), false);
    if (!res.ok || !res.campaign) {
      if (res.error) pushNotification('Reklam Başlatılamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const biz = res.state.businesses.find((b) => b.id === businessId);
    pushNotification(
      `${res.campaign.label} Başladı!`,
      `${biz?.customName ?? 'Şube'} için +%${Math.round(
        res.campaign.revenueBoost * 100
      )} ciro ve +%${Math.round(res.campaign.customerBoost * 100)} müşteri akışı aktif.`,
      'event',
      false
    );
  };

  const handleToggleGmAutoAds = (managerId: string, enabled: boolean) => {
    const res = toggleGeneralManagerAutoAds(empire, managerId, enabled, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Otomasyon Güncellenemedi', res.error, 'system', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      enabled ? 'Otomatik Reklam Aktif Edildi' : 'Otomatik Reklam Kapatıldı',
      enabled
        ? 'Genel Müdür şehirdeki şubelerin kârlılığını analiz edip biten kampanyaları otomatik yenileyecek.'
        : 'Genel Müdür artık reklam kampanyalarını otomatik yenilemeyecek.',
      'system',
      false
    );
  };

  const handleApproveFranchiseApp = (appId: string) => {
    const res = approveFranchiseApplication(empire, appId, Date.now());
    if (!res.ok || !res.application) {
      if (res.error) pushNotification('Başvuru Onaylanamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playCashCollect();
    setEmpire(res.state);
    spawnCashPopup(res.application.licenseFee);
    const updatedBrand = res.state.ownFranchises.find(
      (f) => f.id === res.application!.franchiseId
    );
    if (updatedBrand) {
      incrementFranchiseUsage(
        updatedBrand.id,
        updatedBrand.branchCount,
        updatedBrand.totalRoyaltyEarned
      ).catch(() => {});
    }
    pushNotification(
      'Bayilik Başvurusu Onaylandı!',
      `${res.application.applicantName} (${res.application.cityName}) yeni ${res.application.brandName} şubesini açtı! +${formatTL(
        res.application.licenseFee
      )} isim hakkı kasaya aktarıldı.`,
      'revenue',
      true
    );
  };

  const handleToggleAutoApproveApps = (enabled: boolean) => {
    soundEngine.playClick();
    setEmpire((prev) => ({
      ...prev,
      autoApproveFranchiseApps: enabled,
      lastSavedAt: Date.now(),
    }));
  };

  const handleScanAiApplicant = (franchiseId: string) => {
    const brand = (empire.ownFranchises ?? []).find((f) => f.id === franchiseId);
    if (!brand) return;
    const nowTs = Date.now();
    const seed =
      nowTs +
      (empire.franchiseApplications?.length ?? 0) * 97 +
      brand.branchCount * 31;
    const newApp = generateAiFranchiseApplication(brand, seed, nowTs);
    soundEngine.playClick();
    setEmpire((prev) => ({
      ...prev,
      franchiseApplications: [newApp, ...(prev.franchiseApplications ?? [])].slice(0, 20),
      lastSavedAt: nowTs,
    }));
    pushNotification(
      'Yeni AI Girişimci Başvurusu!',
      `${newApp.applicantName}, ${newApp.cityName} / ${newApp.districtName} için ${brand.brandName} bayiliği başvurusu yaptı.`,
      'revenue',
      false
    );
  };

  const handleOpenFranchiseOnMap = (brand: FranchiseBrand) => {
    soundEngine.playClick();
    setPreselectedFranchise(brand);
    setChainCloneDraft(null);
    setHoldingModalOpen(false);
    setRivalsModalOpen(false);
    setActiveDrawer(null);
    setHrModalOpen(false);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    setDroppedPin(null);
    setPinDropMode(true);
    setActiveNav('map');
    pushNotification(
      `${brand.brandName} Franchise Modu`,
      'Haritada kara üzerine tıklayarak bu markanın bayilik şubesini (+%35 ciro bonusu ile) kurun.',
      'system',
      false
    );
  };

  // --- v1.2.0 Borsa & IPO Handlers ---
  const handleBuyStock = (ticker: string, qty: number) => {
    const quote = stockQuotes.find((q) => q.ticker === ticker);
    if (!quote) return;
    const res = buyStockShares(empire, quote, qty, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Borsa Emri Reddedildi', res.error, 'finance', false);
      return;
    }
    soundEngine.playPurchase();
    setEmpire(res.state);
  };

  const handleSellStock = (ticker: string, qty: number) => {
    const quote = stockQuotes.find((q) => q.ticker === ticker);
    if (!quote) return;
    const res = sellStockShares(empire, quote, qty, Date.now());
    if (!res.ok || !res.proceeds) return;
    soundEngine.playCashCollect();
    setEmpire(res.state);
    spawnCashPopup(res.proceeds);
  };

  const handleLaunchIpo = (ticker: string, holdingName: string) => {
    if (!user) return;
    const res = launchPlayerIpo(
      empire,
      ticker,
      holdingName,
      netWorth,
      { id: user.id, name: user.name },
      stockQuotes.map((q) => q.ticker),
      Date.now()
    );
    if (!res.ok || !res.quote) {
      if (res.error) pushNotification('Halka Arz Reddedildi', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    setStockQuotes((prev) => [res.quote!, ...prev]);
    publishPlayerIpoListing(res.quote).catch(() => {});
    pushNotification(
      `HALKA ARZ TAMAMLANDI (${res.quote.ticker})!`,
      `${res.quote.name} Borsa'da işlem görmeye başladı! +${formatTL(
        res.state.playerIpo?.raisedCapital ?? 0
      )} sermaye girişi.`,
      'milestone',
      true
    );
  };

  // --- v1.2.0 / v1.3.0 Banking, Monthly Installments, Tax & Corporate HQ Handlers ---
  const handleTakeLoan = (
    bankId: string,
    amount: number,
    collateralBusinessId: string,
    termMonths = 6
  ) => {
    if (!user) return;
    const bank = allBanks.find((b) => b.id === bankId);
    const biz = empire.businesses.find((b) => b.id === collateralBusinessId) ?? null;
    if (!bank || !biz) return;
    const val = calculateBusinessValuation(biz, empire.activeEvent, now);
    const res = takeLoanFromBank(
      empire,
      bank,
      amount,
      biz,
      val,
      { id: user.id, name: user.name },
      180,
      Date.now(),
      termMonths
    );
    if (!res.ok || !res.loan) {
      if (res.error) pushNotification('Kredi Reddedildi', res.error, 'finance', false);
      return;
    }
    soundEngine.playCashCollect();
    setEmpire(res.state);
    spawnCashPopup(amount);
    publishLoanRecord(res.loan).catch(() => {});
    pushNotification(
      'Kredi Hesabınıza Aktarıldı',
      `${bank.bankName} üzerinden ${formatTL(amount)} (${termMonths} ay taksit · Aylık ${formatTL(
        res.loan.monthlyInstallment ?? 0
      )}) kredi kullanıldı.`,
      'finance',
      true
    );
  };

  const handlePayLoanInstallment = (loanId: string) => {
    const res = payMonthlyLoanInstallment(empire, loanId, Date.now());
    if (!res.ok || !res.loan) {
      if (res.error) pushNotification('Taksit Ödenemedi', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    publishLoanRecord(res.loan).catch(() => {});
    pushNotification(
      res.paidInFull ? 'Kredi Tamamen Kapatıldı!' : 'Aylık Kredi Taksiti Ödendi',
      `${formatTL(res.paidAmount ?? 0)} ödendi · Kredi Puanı +${res.creditScoreDelta ?? 0} (Yeni Puan: ${
        res.state.creditScore
      })`,
      'finance',
      true
    );
  };

  const handleRepayLoan = (loanId: string) => {
    const res = repayLoan(empire, loanId, undefined, Date.now());
    if (!res.ok || !res.loan) {
      if (res.error) pushNotification('Ödeme Başarısız', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    publishLoanRecord(res.loan).catch(() => {});
    pushNotification(
      'Kredi Kapatıldı!',
      `Kredi puanınız ${res.state.creditScore} seviyesine yükseldi ve teminat kaldırıldı.`,
      'finance',
      true
    );
  };

  const handlePayTaxBill = (taxId: string) => {
    const res = payPendingTaxBill(empire, taxId, Date.now());
    if (!res.ok || !res.paidBill) {
      if (res.error) pushNotification('Vergi Ödenemedi', res.error, 'finance', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      'Vergi Tahakkuku Ödendi',
      `${res.paidBill.monthNumber}. Ay Vergi Tahakkuku (${formatTL(res.paidBill.amount)}) ödendi. Kredi Puanı: ${res.state.creditScore}`,
      'finance',
      false
    );
  };

  const handleHireAccountant = (accountantId: string) => {
    const res = hireAccountant(empire, accountantId, Date.now());
    if (!res.ok || !res.accountant) {
      if (res.error) pushNotification('Muhasebeci Atanamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Muhasebe Departmanı Aktif!',
      `${res.accountant.name} (${res.accountant.title}) işe alındı. Aylık vergi ve kredi taksitleriniz otomatik ödenecek!`,
      'milestone',
      true
    );
  };

  const handleDismissAccountant = () => {
    const res = dismissAccountant(empire, Date.now());
    if (!res.ok) return;
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      'Muhasebeci Görevden Alındı',
      'Artık aylık vergi ve kredi taksitlerini manuel takip etmelisiniz.',
      'system',
      false
    );
  };

  const handleRefreshAccountantPool = () => {
    if (empire.cash < 2500) {
      pushNotification('Yetersiz Nakit', 'Aday havuzunu yenilemek için ₺2.500 gerekir.', 'finance', false);
      return;
    }
    soundEngine.playClick();
    const seed = Date.now();
    setEmpire((prev) => ({
      ...prev,
      cash: prev.cash - 2500,
      accountantPool: generateAccountantPool(seed),
      ceoPool: generateCeoPool(seed + 77),
      lastSavedAt: seed,
    }));
  };

  const handleHireCeo = (ceoId: string) => {
    const res = hireCeo(empire, ceoId, companyTier.level, netWorth, Date.now());
    if (!res.ok || !res.ceo) {
      if (res.error) pushNotification('CEO Atanamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Holding CEO Atandı!',
      `${res.ceo.name} (${res.ceo.title}) göreve başladı. Otonom Büyüme anahtarını açarak holdingi otomatik büyütebilirsiniz!`,
      'milestone',
      true
    );
  };

  const handleDismissCeo = () => {
    const res = dismissCeo(empire, Date.now());
    if (!res.ok) return;
    soundEngine.playClick();
    setEmpire(res.state);
  };

  const handleToggleCeoAutonomous = (enabled: boolean) => {
    const res = toggleCeoAutonomousGrowth(empire, enabled, Date.now());
    if (!res.ok) return;
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification(
      enabled ? 'CEO Otonom Büyüme Açıldı' : 'CEO Otonom Büyüme Kapatıldı',
      enabled
        ? 'CEO, nakdinizin %40 rezervini koruyarak şube açma, yönetici atama ve reklam kararlarını otonom yürütecek.'
        : 'Otonom CEO hamleleri duraklatıldı.',
      'milestone',
      false
    );
  };

  const handleCreateBank = (params: {
    bankName: string;
    brandColor: string;
    emblem: string;
    hqCityPlate: number;
    hqCityName: string;
    hqLat: number;
    hqLng: number;
    initialPoolCapital: number;
    baseInterestRate: number;
    minCreditScore: number;
  }) => {
    if (!user) return;
    const res = createPlayerBank(
      empire,
      params,
      netWorth,
      { id: user.id, name: user.name },
      Date.now()
    );
    if (!res.ok || !res.bank) {
      if (res.error) pushNotification('Banka Kurulamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    publishBankRecord(res.bank).catch(() => {});
    pushNotification(
      `${res.bank.bankName} Kuruldu!`,
      'BDDK lisansınız onaylandı. Artık diğer oyunculara kredi verebilirsiniz.',
      'milestone',
      true
    );
  };

  const handleUpdateBank = (params: {
    addCapital?: number;
    baseInterestRate?: number;
    minCreditScore?: number;
  }) => {
    const res = updateOwnBankSettings(empire, params, Date.now());
    if (!res.ok || !res.bank) {
      if (res.error) pushNotification('Banka Güncellenemedi', res.error, 'finance', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
    publishBankRecord(res.bank).catch(() => {});
    pushNotification('Banka Politikası Güncellendi', 'Faiz oranı ve kredi havuzu kaydedildi.', 'finance', false);
  };

  // --- Patron Chat Handler ---
  const handleSendChat = (channel: 'global' | string, text: string) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      channel,
      senderId: user?.id ?? 'patron',
      senderName: user?.name ?? 'Patron',
      senderBadge: empire.playerIpo
        ? `[${empire.playerIpo.ticker}]`
        : `Sv.${companyTier.level}`,
      text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-60), msg]);
    if (channel === 'global') {
      chatSendersRef.current.global?.(msg).catch(() => {});
    } else {
      chatSendersRef.current.city?.(msg).catch(() => {});
    }
  };

  const handleBoostBusiness = (businessId: string) => {
    const res = activateMarketingBoost(empire, businessId, Date.now());
    if (!res.ok || !res.business) return;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Reklam Kampanyası Başladı',
      `${res.business.customName} 60 saniye boyunca 2x gelir üretiyor.`,
      'event',
      false
    );
  };

  const handleSellBusiness = (businessId: string) => {
    const res = sellBusiness(empire, businessId, Date.now());
    if (!res.ok || !res.collectedAmount) {
      if (res.error) pushNotification('Satış Engellendi', res.error, 'finance', false);
      return;
    }
    soundEngine.playCashCollect();
    setEmpire(res.state);
    setSelectedBusinessId(null);
    if (interiorBusinessId === businessId) setInteriorBusinessId(null);
    spawnCashPopup(res.collectedAmount);
    setRoomRecords((prev) => applyRealtimeBusinessDelete(prev, businessId));
    serverWorldRecordsRef.current = applyRealtimeBusinessDelete(
      serverWorldRecordsRef.current,
      businessId
    );
    removeBusinessFromRoom(businessId).then((syncRes) => {
      if (!syncRes.ok) {
        reportSupabaseSyncError('Satılan şube Supabase üzerinden silinemedi', syncRes.error);
      }
    });
  };

  const handleClaimMission = (mission: MissionDef) => {
    const res = claimMissionReward(empire, mission, simNowRef.current, stockQuotes);
    if (!res.ok || !res.collectedAmount) return;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    spawnCashPopup(res.collectedAmount);
    const xpGain = mission.rewardXp ?? 150;
    pushNotification(
      'Görev Tamamlandı & Yenilendi!',
      `"${mission.title}" ödülü: +${formatTL(res.collectedAmount)} ve +${xpGain} XP. Yeni bir görev açıldı!`,
      'milestone',
      true
    );
  };

  const handleSetGameSpeed = (nextSpeed: GameSpeed) => {
    soundEngine.playClick();
    // Strict 2-state time control: ONLY Paused (0) or Normal Play (1 — 30s = 1 full day)
    setGameSpeed(nextSpeed === 0 ? 0 : 1);
  };

  const handleTogglePlayPause = () => {
    soundEngine.playClick();
    setGameSpeed((prev) => (prev === 0 ? 1 : 0));
  };

  const handleLaunchHoldingPromo = (tierId: HoldingPromoTierId) => {
    const res = launchHoldingPromotion(empire, tierId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Kampanya Başlatılamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Holding Reklam Kampanyası Başladı',
      `${res.campaign?.name ?? 'Kampanya'} aktif! +${Math.round(
        (res.campaign?.revenueBoost ?? 0) * 100
      )}% müşteri trafiği ve +%${res.campaign?.brandGain ?? 0} tanınırlık.`,
      'milestone',
      true
    );
  };

  const handleBuyRentalProperty = (catalogId: string) => {
    const res = buyRentalProperty(empire, catalogId, undefined, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Mülk Satın Alınamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Kiralık Mülk Portföye Eklendi',
      `${res.property?.name ?? 'Mülk'} satın alındı. Kiracı tekliflerini onaylayarak pasif kira başlatabilirsiniz.`,
      'milestone',
      false
    );
  };

  const handleSignRentalLease = (catalogId: string, offerId: string) => {
    const res = signLeaseContract(empire, catalogId, offerId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Sözleşme Onaylanamadı', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Kira Sözleşmesi İmzalandı',
      `${res.property?.leasedTenantName ?? 'Kiracı'} ile anlaşma tamam! Günlük +${formatTL(
        Math.round((res.property?.activeMonthlyRent ?? 0) / 30)
      )} pasif kira hesabınıza yatacak.`,
      'revenue',
      true
    );
  };

  const handleTerminateRentalLease = (catalogId: string) => {
    const res = terminateLeaseContract(empire, catalogId, Date.now());
    if (!res.ok) return;
    soundEngine.playClick();
    setEmpire(res.state);
    pushNotification('Kira Sözleşmesi Feshedildi', 'Mülk yeniden kiracı tekliflerine açıldı.', 'system', false);
  };

  const handleAcceptDailyOffer = (offerId: string) => {
    const res = acceptDailyOffer(empire, offerId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Teklif Onaylanamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification('Fırsat Teklifi Onaylandı', res.summary ?? 'Anlaşma başarıyla uygulandı.', 'milestone', true);
  };

  const handleDeclineDailyOffer = (offerId: string) => {
    soundEngine.playClick();
    const res = declineDailyOffer(empire, offerId, Date.now());
    setEmpire(res.state);
  };

  const handlePurchaseStorePerk = (itemId: string) => {
    const res = purchaseStorePerk(empire, itemId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Satın Alınamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Mağaza Paketi Aktifleştirildi',
      `${res.item?.name ?? 'Paket'}: ${res.item?.effectLabel ?? 'Holding bonusu uygulandı.'}`,
      'milestone',
      true
    );
  };

  const handleOverviewQuickAction = (action: QuickActionId) => {
    soundEngine.playClick();
    closeAllInGameOverlays();
    if (action === 'ads') {
      setAdsModalOpen(true);
    } else if (action === 'rentals') {
      setRentalsModalOpen(true);
    } else if (action === 'franchise') {
      setHoldingModalOpen(true);
    } else if (action === 'offers') {
      setOffersModalOpen(true);
    } else if (action === 'borsa') {
      setBorsaMode('market');
      setBorsaModalOpen(true);
    } else if (action === 'bank') {
      setBankingInitialTab('loans');
      setBankingModalOpen(true);
    } else if (action === 'hr') {
      setHrInitialSubView('branches');
      setHrModalOpen(true);
    } else if (action === 'reports') {
      setOverviewReportsOpen(true);
    }
  };

  const handleCompleteTutorial = () => {
    soundEngine.playUpgrade();
    safeStorageSetItem(TUTORIAL_STORAGE_KEY, '1');
    setTutorialOpen(false);
  };

  const handleSkipTutorial = () => {
    soundEngine.playClick();
    safeStorageSetItem(TUTORIAL_STORAGE_KEY, '1');
    setTutorialOpen(false);
  };

  const handleReplayTutorial = () => {
    soundEngine.playClick();
    setSettingsOpen(false);
    if (!user) {
      setScreen('menu');
      return;
    }
    if (screen !== 'playing') {
      focusHeadquarters(empire);
      setScreen('playing');
    }
    setTutorialOpen(true);
  };

  const handleUpgradeOfficeTier = (tierId: OfficeTierId) => {
    const res = upgradeOfficeTier(empire, tierId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Ofis Yükseltme Reddedildi', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const benefits = calculateOfficeBenefits(res.state);
    pushNotification(
      'Yeni Merkez Ofise Taşındınız!',
      `${benefits.tier.name} aktif. Prestij ${benefits.officePrestige}/100 · Tedarik İndirimi -%${Math.round(
        benefits.supplyDiscountRate * 100
      )}.`,
      'milestone',
      true
    );
  };

  const handleBuyOfficeUpgrade = (upgradeId: string) => {
    const res = buyOfficeUpgrade(empire, upgradeId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Ofis Donanımı Alınamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const benefits = calculateOfficeBenefits(res.state);
    pushNotification(
      'Ofis Donanımı Kuruldu',
      `${res.upgrade?.name ?? 'Donanım'} eklendi. Yeni Prestij: ${benefits.officePrestige}/100.`,
      'milestone',
      false
    );
  };

  const handleUpgradeOfficeEquipment = (equipmentId: OfficeEquipmentId) => {
    const res = upgradeOfficeEquipment(empire, equipmentId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Donanım Yükseltilemedi', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const benefits = calculateOfficeBenefits(res.state);
    pushNotification(
      'Ofis Donanımı Yükseltildi',
      `${res.item?.name ?? 'Donanım'} Sv. ${res.newLevel ?? 2} oldu! Yeni Prestij: ${benefits.officePrestige}/100.`,
      'milestone',
      false
    );
  };

  const handleBuyPersonalAsset = (assetId: string) => {
    const res = buyPersonalAsset(empire, assetId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Kişisel Varlık Alınamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification(
      'Kişisel Varlık Portföyünüze Eklendi',
      `${res.asset?.name ?? 'Varlık'} satın alındı. Prestij ve banka itibarı arttı.`,
      'milestone',
      true
    );
  };

  const handleInvestBranchQuality = (businessId: string) => {
    const res = investInBranchQuality(empire, businessId, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Kalite Yatırımı Yapılamadı', res.error, 'finance', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    const updatedBiz = res.state.businesses.find((b) => b.id === businessId);
    pushNotification(
      'Hizmet Kalitesi & Eğitim Yatırımı',
      `${updatedBiz?.customName ?? 'Şube'} için personel eğitimi ve hijyen yatırımı tamamlandı.`,
      'milestone',
      false
    );
  };

  const handleResetGame = () => {
    const previousOwnIds = empireRef.current.businesses.map((b) => b.id);
    const prevIdSet = new Set(previousOwnIds);
    const ownerId = user?.id ?? '';

    const fresh = createInitialEmpireState(Date.now(), startingCityPlate);
    closeAllInGameOverlays();
    setEmpire(fresh);
    setGameSpeed(1);
    setActiveNav('overview');
    setHrTargetBusinessId(null);
    setChainCloneDraft(null);
    setPreselectedFranchise(null);
    const stripOwnRecords = (list: RemoteBusinessRecord[]) =>
      list.filter((r) => (ownerId ? r.owner_id !== ownerId : true) && !prevIdSet.has(r.id));
    setRoomRecords(stripOwnRecords);
    serverWorldRecordsRef.current = stripOwnRecords(serverWorldRecordsRef.current);
    focusHeadquarters(fresh);
    if (user) {
      saveEmpireStateLocal(user.id, fresh);
      void deletePlayerBusinessesFromRoom(user.id, previousOwnIds).finally(() => {
        setSyncRefreshNonce((n) => n + 1);
      });
    } else if (previousOwnIds.length > 0) {
      void deletePlayerBusinessesFromRoom('', previousOwnIds).finally(() => {
        setSyncRefreshNonce((n) => n + 1);
      });
    }
    pushNotification(
      'İmparatorluk Sıfırlandı',
      'Yeni bir başlangıç yapıldı. ₺2.500 başlangıç sermayesi ile Çalışan olarak kariyerinize yeniden başlayın!',
      'system',
      false
    );
  };

  const officeBenefits = useMemo(
    () => calculateOfficeBenefits(empire),
    [
      empire.officeTierId,
      empire.officeUpgradeIds,
      empire.officeEquipmentLevels,
      empire.personalAssetIds,
    ]
  );

  const dashboardMetrics = useMemo(
    () => computeExecutiveDashboardMetrics(empire, stockQuotes, now, competitorBusinesses),
    [empire, stockQuotes, now, competitorBusinesses]
  );

  const handleSelectExecutiveNav = useCallback(
    (nav: ExecutiveNavId) => {
      soundEngine.playClick();
      closeAllInGameOverlays();
      setActiveNav(nav);
      if (nav === 'map') {
        setPinDropMode(true);
      }
    },
    [closeAllInGameOverlays]
  );

  const activeNavSubtitle: Record<ExecutiveNavId, string> = {
    overview: 'FİNANSAL GENEL BAKIŞ',
    career: 'KİŞİSEL & İŞ HAYATI · VARDİYA VE KARİYER',
    map: `VEKTÖREL TÜRKİYE HARİTASI · ${activeProvince.code} ${activeProvince.name.toLocaleUpperCase('tr-TR')}`,
    finance: 'FİNANS, BANKALAR & BORSA',
    businesses: 'İŞLETMELER & ŞUBE OPERASYONLARI',
    office: 'OFİSİM & PRESTİJ YÖNETİMİ',
  };

  const selectedBusiness = useMemo(
    () => empire.businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [empire.businesses, selectedBusinessId]
  );

  const selectedCompetitor = useMemo(
    () => competitorBusinesses.find((r) => r.id === selectedCompetitorId) ?? null,
    [competitorBusinesses, selectedCompetitorId]
  );

  const interiorBusiness = useMemo(
    () => empire.businesses.find((b) => b.id === interiorBusinessId) ?? null,
    [empire.businesses, interiorBusinessId]
  );

  const hrTargetBusiness = useMemo(
    () => empire.businesses.find((b) => b.id === hrTargetBusinessId) ?? null,
    [empire.businesses, hrTargetBusinessId]
  );

  const menuSavedCount = useMemo(() => {
    try {
      if (!user) return 0;
      if (empire.businesses.length > 0) return empire.businesses.length;
      return loadEmpireStateLocal(user.id)?.businesses.length ?? 0;
    } catch {
      return 0;
    }
  }, [empire.businesses.length, user]);

  const handleIntroComplete = useCallback(() => {
    setScreen('menu');
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#181F29] text-slate-100">
      <OrientationGuard />

      {screen === 'intro' && <StudioIntro onComplete={handleIntroComplete} />}

      {screen === 'menu' && (
        <MainMenu
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          user={user}
          authLoading={authLoading}
          authError={authError}
          onClearAuthError={() => setAuthError(null)}
          startingCityPlate={startingCityPlate}
          onSelectStartingCity={handleSelectStartingCity}
          onStartGuest={handleStartGuest}
          onLogin={handleLoginAccount}
          onRegister={handleRegisterAccount}
          onContinueLoggedIn={() => {
            if (!user) return;
            const loaded = migrateSavedEmpire(
              loadEmpireStateLocal(user.id),
              user,
              startingCityPlate
            );
            setEmpire(loaded);
            focusHeadquarters(loaded);
            setScreen('playing');
          }}
          onSignOut={handleSignOut}
          onOpenSettings={() => setSettingsOpen(true)}
          onCheckUpdate={handleManualOtaCheck}
          checkingUpdate={checkingOta}
          savedBusinessCount={menuSavedCount}
          savedCash={empire.cash}
          savedCharacter={empire.character}
        />
      )}

      {screen === 'playing' && (
        <div
          data-testid="executive-shell"
          className="relative flex h-full w-full flex-col overflow-hidden bg-[#181F29] text-slate-100"
        >
          {/* ================================================================
              TOP INFORMATION BAR — Matte Dark-Slate Reference Header
              Strict 2-State Clock (Pause ⏸ / Play ▶ — 30s = 1 full day)
             ================================================================ */}
          <header
            aria-label="Yönetici Üst Bilgi Şeridi"
            data-testid="top-hud"
            className="z-[600] flex h-[48px] shrink-0 items-center justify-between gap-2 border-b border-[#2A3444] bg-[#181F29] px-3 lg:h-[58px] lg:gap-3 lg:px-5"
          >
            {/* Left: Minimal Golden Crown Emblem + MÜLK İMPARATORLUĞU */}
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D8A338]/75 bg-[#222B38] text-[#D8A338] lg:h-9 lg:w-9">
                <Crown className="h-4.5 w-4.5 lg:h-5 lg:w-5" strokeWidth={1.5} />
              </div>
              <h1 className="hidden text-xs font-semibold tracking-wider text-slate-100 whitespace-nowrap min-[900px]:block lg:text-[15px]">
                MÜLK İMPARATORLUĞU
              </h1>
            </div>

            {/* Center & Right Matte Metric Pills + Mağaza + 2-State Day Clock */}
            <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto lg:gap-2.5">
              {/* Tanınırlık %X */}
              <button
                type="button"
                data-testid="topbar-brand-recognition"
                onClick={() => handleSelectExecutiveNav('office')}
                title="Firma Tanınırlığı"
                className="flex h-7 shrink-0 items-center rounded-full bg-[#C8AE7D] px-2.5 text-[10.5px] font-semibold text-[#181F29] hover:bg-[#D2BB8E] whitespace-nowrap lg:h-8 lg:px-3.5 lg:text-xs"
              >
                Tanınırlık <span className="ml-1 font-mono-num font-bold">%{dashboardMetrics.brandRecognitionPct}</span>
              </button>

              {/* Toplam Kasa (Matte Sage Green #7A9E7E Pill) */}
              <div className="relative shrink-0">
                <div
                  data-testid="hud-cash"
                  className={`flex h-7 items-center rounded-full px-2.5 font-mono-num text-[10.5px] font-bold whitespace-nowrap lg:h-8 lg:px-4 lg:text-xs ${
                    empire.cash < 0
                      ? 'bg-[#B86B5E] text-white'
                      : 'bg-[#7A9E7E] text-[#111C16]'
                  }`}
                >
                  <span className="mr-1 font-sans font-semibold hidden lg:inline">Toplam Kasa:</span>
                  <span className="mr-1 font-sans font-semibold lg:hidden">Kasa:</span>
                  {formatTL(empire.cash)}
                </div>
                {cashPopups.map((p) => (
                  <span
                    key={p.id}
                    className="animate-float-cash pointer-events-none absolute -bottom-5 right-2 font-mono-num text-[11px] font-bold text-[#7A9E7E] whitespace-nowrap"
                  >
                    +{formatTL(p.amount)}
                  </span>
                ))}
              </div>

              {/* Seviye N */}
              <div
                data-testid="topbar-level-pill"
                className="hidden h-7 shrink-0 items-center rounded-full bg-[#334155] px-3 text-[11px] font-semibold text-slate-100 whitespace-nowrap sm:flex lg:h-8 lg:px-3.5 lg:text-xs"
              >
                Seviye <span className="ml-1 font-mono-num font-bold">{companyTier.level}</span>
              </div>

              {/* XP / RP */}
              <div
                data-testid="topbar-rp-pill"
                title="Holding İtibar & Deneyim Puanı (XP)"
                className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full bg-[#C8AE7D] px-2.5 text-[11px] font-bold text-[#181F29] whitespace-nowrap md:flex lg:h-8 lg:px-3.5 lg:text-xs"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#181F29]/15 text-[9px] font-extrabold">
                  XP
                </span>
                <span className="font-mono-num">{(empire.companyXp ?? 0).toLocaleString('tr-TR')}</span>
              </div>

              {/* Mağaza (Matte Sand/Gold Button) */}
              <button
                type="button"
                data-testid="topbar-store-btn"
                onClick={() => {
                  soundEngine.playClick();
                  closeAllInGameOverlays();
                  setStoreModalOpen(true);
                }}
                className="flex h-7 shrink-0 items-center rounded-full bg-[#C8AE7D] px-3 text-[11px] font-bold text-[#181F29] hover:bg-[#D2BB8E] whitespace-nowrap lg:h-8 lg:px-4 lg:text-xs"
              >
                Mağaza
              </button>

              {/* Pending 00:00 Day-End Report Quick Trigger */}
              {(empire.pendingDayEndReports ?? []).length > 0 && (
                <button
                  type="button"
                  data-testid="day-end-report-pill"
                  onClick={() => {
                    soundEngine.playClick();
                    setDayEndModalOpen(true);
                  }}
                  title="00:00 Gün Sonu Hasılat Tahsilatı"
                  className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-[#6EB288]/65 bg-[#222B38] px-2.5 font-mono-num text-[10.5px] font-bold text-[#6EB288] hover:bg-[#2C3647] whitespace-nowrap lg:h-8 lg:px-3"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span>00:00 ({empire.pendingDayEndReports?.length})</span>
                </button>
              )}

              {/* Rightmost: STRICT 2-State Time Control (Pause ⏸ / Play ▶) + Gün X • Gün Adı + Thin 0-30s Progress Bar */}
              <div
                data-testid="time-speed-capsule"
                className="relative flex h-8 shrink-0 items-center gap-2 overflow-hidden rounded-full border border-[#334155] bg-[#222B38] pl-1.5 pr-3 lg:h-9 lg:pl-2 lg:pr-3.5"
                title={
                  gameSpeed === 0
                    ? 'Zaman Duraklatıldı · Başlatmak için tıklayın (1 Oyun Günü = 30 sn)'
                    : 'Normal Akış Aktif (1 Oyun Günü = 30 sn) · Duraklatmak için tıklayın'
                }
              >
                <button
                  type="button"
                  data-testid={gameSpeed === 0 ? 'speed-btn-1' : 'speed-btn-0'}
                  aria-label={gameSpeed === 0 ? 'Zamanı Başlat' : 'Zamanı Duraklat'}
                  aria-pressed={gameSpeed === 0}
                  onClick={handleTogglePlayPause}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    gameSpeed === 0
                      ? 'bg-[#D8A338] text-[#181F29] hover:bg-[#E2AF48]'
                      : 'bg-[#334155] text-slate-100 hover:bg-[#475569]'
                  }`}
                >
                  {gameSpeed === 0 ? (
                    <Play className="h-3.5 w-3.5 translate-x-[0.5px]" strokeWidth={1.75} />
                  ) : (
                    <Pause className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>

                <div
                  data-testid="hud-game-clock"
                  className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-200 lg:text-xs"
                >
                  <span>{gameClock.dayHeaderLabel}</span>
                  {gameSpeed === 0 && (
                    <span className="text-[10px] font-bold text-[#D8A338]">(Duraklatıldı)</span>
                  )}
                </div>

                {/* Thin 0-30s Day Progress Bar */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 bottom-0.5 h-[2px] overflow-hidden rounded-full bg-[#334155]/80"
                >
                  <div
                    data-testid="day-progress-bar"
                    className={`h-full rounded-full transition-all duration-200 ${
                      gameSpeed === 0 ? 'bg-[#D8A338]' : 'bg-[#6EB288]'
                    }`}
                    style={{ width: `${gameClock.dayProgressPct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* ================================================================
              BODY: FRAMELESS LEFT VERTICAL NAVIGATION RAIL + MAIN CANVAS
             ================================================================ */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Frameless Left Vertical Navigation Rail (Sits directly on #181F29) */}
            <nav
              aria-label="Ana Kontrol Paneli Menüsü"
              data-testid="left-nav-rail"
              className="z-[550] flex w-[76px] shrink-0 flex-col items-center justify-between bg-[#181F29] px-1.5 py-3 lg:w-[92px] lg:px-2 lg:py-4"
            >
              <div className="flex w-full flex-col items-center gap-1.5 lg:gap-2.5">
                {(
                  [
                    { id: 'overview' as const, label: 'Genel Bakış', icon: Home },
                    { id: 'career' as const, label: 'İş Hayatı', icon: Briefcase },
                    { id: 'map' as const, label: 'Harita', icon: MapIcon },
                    { id: 'finance' as const, label: 'Finans', icon: Wallet },
                    { id: 'businesses' as const, label: 'İşletmeler', icon: Store },
                    { id: 'office' as const, label: 'Ofisim', icon: Building2 },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`nav-rail-${item.id}`}
                      aria-label={item.id === 'career' ? 'Kişisel & İş Hayatı' : item.label}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => handleSelectExecutiveNav(item.id)}
                      className={`group flex w-full flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 text-center transition-colors lg:py-2.5 ${
                        isActive
                          ? 'bg-[#334155] text-white'
                          : 'bg-transparent text-slate-400 hover:bg-[#222B38] hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-5 w-5 lg:h-[22px] lg:w-[22px]" strokeWidth={1.5} />
                      <span className="w-full text-[10px] font-medium leading-tight whitespace-nowrap lg:text-[11px]">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="w-full">
                <button
                  type="button"
                  data-testid="nav-rail-settings"
                  onClick={() => {
                    soundEngine.playClick();
                    setSettingsOpen(true);
                  }}
                  className="flex w-full flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 text-center text-slate-400 transition-colors hover:bg-[#222B38] hover:text-slate-200 lg:py-2.5"
                >
                  <Settings className="h-5 w-5 lg:h-[22px] lg:w-[22px]" strokeWidth={1.5} />
                  <span className="w-full text-[10px] font-medium leading-tight whitespace-nowrap lg:text-[11px]">
                    Ayarlar
                  </span>
                </button>
              </div>
            </nav>

            {/* Main Content Viewport */}
            <main className="relative min-w-0 flex-1 overflow-hidden">
              {/* Persistent Mounted Vector TurkeyMap so Supabase Realtime public.businesses sync runs continuously */}
              <div
                className={
                  activeNav === 'map'
                    ? 'relative h-full w-full'
                    : 'pointer-events-none invisible absolute inset-0 -z-10'
                }
                aria-hidden={activeNav !== 'map'}
              >
                <TurkeyMap
                  theme={settings.theme}
                  mapStyle={settings.mapStyle}
                  activePlate={activePlate}
                  unlockedCityPlates={getUnlockedCityPlates(empire)}
                  playerLevel={companyTier.level}
                  playerCash={empire.cash}
                  currentUserId={user?.id}
                  ownBusinesses={empire.businesses}
                  localSyncRecords={localSyncRecords}
                  competitorBusinesses={competitorBusinesses}
                  syncRefreshNonce={syncRefreshNonce}
                  selectedBusinessId={selectedBusinessId}
                  selectedCompetitorId={selectedCompetitorId}
                  droppedPin={droppedPin}
                  droppedPinBlocked={!droppedPinDistanceCheck.allowed}
                  pinDropMode={pinDropMode}
                  initialCenter={initialMapFocus}
                  flyTarget={flyTarget}
                  isVisible={activeNav === 'map'}
                  onMapClick={handleMapClick}
                  onSelectProvince={handleSelectProvince}
                  onUnlockProvince={handleUnlockProvince}
                  onOpenDistrictJobs={(plate, districtName) => {
                    setCareerDistrictFilter({ plate, district: districtName });
                    setActiveNav('career');
                  }}
                  onSelectOwnBusiness={handleSelectOwnBusiness}
                  onSelectCompetitor={handleSelectCompetitor}
                  onWorldSyncUpdate={handleWorldSyncUpdate}
                  onRemoteInsert={handleRemoteInsert}
                  onRemoteUpdate={handleRemoteUpdate}
                  onRemoteDelete={handleRemoteDelete}
                />
              </div>

              {/* VIEW 1: Matte Dark-Slate Executive Dashboard ("Genel Bakış") */}
              {activeNav === 'overview' && (
                <ExecutiveDashboard
                  state={empire}
                  metrics={dashboardMetrics}
                  competitorBusinesses={competitorBusinesses}
                  now={now}
                  franchiseOfferCount={allFranchises.length}
                  onQuickAction={handleOverviewQuickAction}
                  onManageBranch={(id) => {
                    soundEngine.playClick();
                    setOverviewManagedBranchId(id);
                  }}
                  onDiscoverBranches={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveNav('map');
                    setPinDropMode(true);
                  }}
                  onOpenCareer={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveNav('career');
                  }}
                  onOpenSettings={() => {
                    soundEngine.playClick();
                    setSettingsOpen(true);
                  }}
                  onOpenCrisis={() => {
                    soundEngine.playClick();
                    setCrisisModalOpen(true);
                  }}
                  onOpenRaiseRequests={() => {
                    soundEngine.playClick();
                    setRaiseModalOpen(true);
                  }}
                  onOpenStrategicHub={() => {
                    soundEngine.playClick();
                    setStrategicHubOpen(true);
                  }}
                />
              )}

              {/* VIEW 1B: Kişisel & İş Hayatı (Job Listings + 2D Shift Scene) */}
              {activeNav === 'career' && (
                <CareerWorkspace
                  state={empire}
                  playerLevel={companyTier.level}
                  characterName={user?.name ?? 'Çalışan'}
                  initialCityPlate={careerDistrictFilter?.plate ?? activePlate}
                  initialDistrictName={careerDistrictFilter?.district ?? null}
                  onCollectTip={handleCollectCareerTip}
                  onCompleteShift={handleCompleteCareerShift}
                  onGoOpenFirstShop={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveNav('map');
                    setPinDropMode(true);
                  }}
                />
              )}

              {/* VIEW 2: Map Floating Minimal Toolbar (Only visible on Harita) */}
              {activeNav === 'map' && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-2.5 z-[520] flex flex-wrap items-center justify-between gap-2 px-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setCityPickerOpen(true);
                      }}
                      aria-label="Şehir Seç veya Değiştir"
                      data-testid="city-switcher-btn"
                      className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full border border-[#334155] bg-[#222B38] px-3 text-xs font-semibold text-slate-100 hover:bg-[#2A3444] whitespace-nowrap"
                    >
                      <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#C8AE7D]" strokeWidth={1.5} />
                      <span className="font-mono-num">{activeProvince.code}</span>
                      <span>{activeProvince.name}</span>
                      <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-[#7A9E7E] sm:inline-flex">
                        · <Radio className="h-3 w-3" strokeWidth={1.5} />
                        {roomStatus === 'live' ? 'Canlı' : 'Oda'}
                      </span>
                    </button>

                    {/* Live Multiplayer DB Status Box (Click to Refresh) */}
                    <button
                      type="button"
                      data-testid="map-db-status-box"
                      onClick={() => {
                        soundEngine.playClick();
                        setSyncRefreshNonce((n) => n + 1);
                      }}
                      title={
                        worldDbStats.error
                          ? worldDbStats.error
                          : 'Canlı çok oyunculu harita veritabanı durumu — yenilemek için tıklayın'
                      }
                      className={`pointer-events-auto flex max-w-[min(85vw,380px)] items-center gap-1.5 rounded-full border px-3 py-1 font-mono-num text-[11px] font-semibold transition-colors ${
                        worldDbStats.error
                          ? 'border-[#B86B5E] bg-[#B86B5E] text-white hover:bg-[#A65D51]'
                          : 'border-[#334155] bg-[#222B38] text-slate-100 hover:bg-[#2A3444]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          worldDbStats.error
                            ? 'bg-white'
                            : worldDbStats.loading
                            ? 'bg-[#C8AE7D]'
                            : 'bg-[#7A9E7E]'
                        }`}
                      />
                      <span className="truncate">
                        {worldDbStats.error
                          ? worldDbStats.error
                          : worldDbStats.loading
                          ? 'DB Eşitleniyor...'
                          : `DB Toplam: ${worldDbStats.dbTotal} | Rakip: ${worldDbStats.rivalCount}`}
                      </span>
                    </button>
                  </div>

                  {/* Active Chain Clone or Franchise Placement Banner */}
                  {(chainCloneDraft || preselectedFranchise) && !droppedPin && (
                    <div
                      data-testid="map-special-placement-banner"
                      className="pointer-events-auto absolute bottom-3 left-1/2 z-[520] flex w-[min(90%,470px)] -translate-x-1/2 items-center justify-between gap-2 rounded-[16px] border border-[#C8AE7D]/60 bg-[#222B38] px-3.5 py-2 text-xs text-slate-100"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {chainCloneDraft ? (
                          <Link2 className="h-4 w-4 shrink-0 text-[#C8AE7D]" strokeWidth={1.5} />
                        ) : (
                          <Store className="h-4 w-4 shrink-0 text-[#7A9E7E]" strokeWidth={1.5} />
                        )}
                        <p className="truncate">
                          {chainCloneDraft ? (
                            <>
                              <strong className="text-[#C8AE7D]">Zincir Şube:</strong>{' '}
                              {chainCloneDraft.suggestedName} için haritada kara üzerine tıklayın
                            </>
                          ) : (
                            <>
                              <strong className="text-[#7A9E7E]">Franchise:</strong>{' '}
                              {preselectedFranchise?.brandName} şubesi için haritada kara üzerine tıklayın
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setChainCloneDraft(null);
                          setPreselectedFranchise(null);
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-[10px] border border-[#334155] bg-[#181F29] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-[#2A3444]"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} /> İptal
                      </button>
                    </div>
                  )}

                  {/* Contextual Hint when no business built yet */}
                  {empire.businesses.length === 0 &&
                    !chainCloneDraft &&
                    !preselectedFranchise &&
                    !droppedPin &&
                    !selectedCompetitor && (
                      <div className="pointer-events-none absolute bottom-3 left-1/2 z-[500] w-[min(90%,470px)] -translate-x-1/2 rounded-[16px] border border-[#334155] bg-[#222B38] px-3.5 py-2 text-center text-xs text-slate-200">
                        <strong className="text-[#C8AE7D]">
                          {activeProvince.code} {activeProvince.name}:
                        </strong>{' '}
                        İlçeleri görmek, iş ilanlarına ulaşmak veya şube kurmak için şehre tıklayın ya da &quot;Sadece Seçili Şehir&quot; moduna geçin.
                      </div>
                    )}

                  {/* Right Contextual Map Inspector (Pin Drop / Own Business / Competitor) */}
                  {(droppedPin || selectedBusiness || selectedCompetitor) && (
                    <div
                      data-testid="right-panel-container"
                      className="pointer-events-none absolute bottom-2.5 right-2.5 top-12 z-[650] flex justify-end overflow-hidden"
                    >
                      {droppedPin ? (
                        <PinDropPanel
                          location={droppedPin}
                          cash={empire.cash}
                          companyLevel={companyTier.level}
                          ownBranchCount={empire.businesses.length}
                          maxBranches={companyTier.maxBranches}
                          distanceCheck={droppedPinDistanceCheck}
                          availableFranchises={allFranchises}
                          chainCloneDraft={chainCloneDraft}
                          preselectedFranchise={preselectedFranchise}
                          rentDiscountRate={getCharacterTraitModifiers(empire).rentDiscountRate}
                          onCancelSpecialMode={() => {
                            setChainCloneDraft(null);
                            setPreselectedFranchise(null);
                          }}
                          onEstablish={handleEstablishBusiness}
                          onClose={() => setDroppedPin(null)}
                        />
                      ) : selectedBusiness ? (
                        <BusinessInspector
                          business={selectedBusiness}
                          state={empire}
                          now={now}
                          onEnterInterior={(id) => setInteriorBusinessId(id)}
                          onOpenHrModal={(id) => {
                            setHrInitialSubView('branches');
                            setHrTargetBusinessId(id);
                            handleSelectManagementTab('hr');
                          }}
                          onCloneBusiness={handleStartCloneBusiness}
                          onLaunchAdCampaign={handleLaunchAdCampaign}
                          onHireDoubleShift={handleHireDoubleShift}
                          onOpenDayEndReport={() => setDayEndModalOpen(true)}
                          onRestock={handleRestockBusiness}
                          onInvestQuality={handleInvestBranchQuality}
                          onCollect={handleCollectBusiness}
                          onUpgrade={handleUpgradeBusiness}
                          onBoost={handleBoostBusiness}
                          onSell={handleSellBusiness}
                          onClose={() => setSelectedBusinessId(null)}
                        />
                      ) : selectedCompetitor ? (
                        <CompetitorInspector
                          competitor={selectedCompetitor}
                          cash={empire.cash}
                          ownBranchCount={empire.businesses.length}
                          maxBranches={companyTier.maxBranches}
                          hasBranchInCity={empire.businesses.some(
                            (b) => b.cityPlate === selectedCompetitor.city_plate
                          )}
                          blitzActive={(empire.competitiveBlitzes ?? []).some(
                            (bl) =>
                              bl.targetRivalId === selectedCompetitor.id &&
                              bl.endsAtGameMin > (empire.gameMinutes ?? 540)
                          )}
                          onTakeover={handleTakeoverCompetitor}
                          onLaunchBlitz={handleLaunchCompetitiveBlitz}
                          onOpenRivalsModal={() => {
                            setSelectedCompetitorId(null);
                            handleSelectManagementTab('rivals');
                          }}
                          onClose={() => setSelectedCompetitorId(null)}
                        />
                      ) : null}
                    </div>
                  )}
                </>
              )}

              {/* VIEW 3: Finans Workspace */}
              {activeNav === 'finance' && (
                <FinansWorkspace
                  state={empire}
                  metrics={dashboardMetrics}
                  stockQuotes={stockQuotes}
                  now={now}
                  onOpenBanking={(tab = 'loans') => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setBankingInitialTab(tab);
                    setBankingModalOpen(true);
                  }}
                  onOpenAccounting={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setAccountingModalOpen(true);
                  }}
                  onOpenBorsa={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setBorsaMode('market');
                    setBorsaModalOpen(true);
                  }}
                  onOpenInvestments={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setBorsaMode('portfolio');
                    setBorsaModalOpen(true);
                  }}
                  onOpenDayEnd={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setDayEndModalOpen(true);
                  }}
                  onCollectDayEndAll={handleCollectDayEndAll}
                />
              )}

              {/* VIEW 4: İşletmeler Workspace (3-Step Glassmorphism Operations Flow) */}
              {activeNav === 'businesses' && (
                <BusinessesWorkspace
                  state={empire}
                  stockQuotes={stockQuotes}
                  competitorBusinesses={competitorBusinesses}
                  now={now}
                  onGoMapNewBranch={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveNav('map');
                    setPinDropMode(true);
                  }}
                  onOpenHr={(id) => {
                    soundEngine.playClick();
                    setHrInitialSubView('branches');
                    if (id) setHrTargetBusinessId(id);
                    handleSelectManagementTab('hr');
                  }}
                  onOpenFranchise={() => handleSelectManagementTab('franchise')}
                  onOpenRivals={() => handleSelectManagementTab('rivals')}
                  onFocusBusinessOnMap={handleSelectOwnBusiness}
                  onEnterInterior={(id) => setInteriorBusinessId(id)}
                  onCustomizeBranch={handleCustomizeBranch}
                  onLaunchBranchMarketing={handleLaunchBranchMarketing}
                  onUpgradeBranchFacility={handleUpgradeBranchFacility}
                  onLaunchHoldingBulkAds={handleLaunchHoldingBulkAds}
                  onDistributeHoldingBonus={handleDistributeHoldingBonus}
                  onPerformBranchMaintenance={handlePerformBranchMaintenance}
                  onRenewBranchEquipment={handleRenewBranchEquipment}
                  onSyncBranchPrices={handleSyncBranchPrices}
                />
              )}

              {/* VIEW 5: Ofisim & Prestij Yönetimi 3-Column Workspace */}
              {activeNav === 'office' && (
                <OfficeWorkspace
                  state={empire}
                  metrics={dashboardMetrics}
                  unreadNotifCount={unreadNotifCount}
                  claimableMissionCount={claimableMissionCount}
                  chatCount={chatMessages.length}
                  onUpgradeEquipment={handleUpgradeOfficeEquipment}
                  onUpgradeOfficeTier={handleUpgradeOfficeTier}
                  onOpenOfficeModal={(tab) => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setOfficeModalTab(tab);
                    setOfficeModalOpen(true);
                  }}
                  onOpenPatronChat={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setPatronChatOpen(true);
                  }}
                  onOpenMarketNews={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveDrawer('market');
                  }}
                  onOpenMissions={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setActiveDrawer('missions');
                  }}
                  onOpenNotifications={() => {
                    soundEngine.playClick();
                    setNotifOpen(true);
                  }}
                  onOpenLeaderboard={() => {
                    soundEngine.playClick();
                    closeAllInGameOverlays();
                    setLeaderboardModalOpen(true);
                  }}
                />
              )}

              {/* Controlled Patron Chat Panel */}
              <PatronChatPanel
                activeProvince={activeProvince}
                messages={chatMessages}
                open={patronChatOpen}
                onOpenChange={setPatronChatOpen}
                hideFloatingButton={true}
                onSendMessage={handleSendChat}
              />

              {/* Unified Modal Drawer for Piyasa Haberleri & Görevler */}
              {activeDrawer && (
                <SideDrawer
                  tab={activeDrawer}
                  state={empire}
                  stockQuotes={stockQuotes}
                  allBanks={allBanks}
                  competitorBusinesses={competitorBusinesses}
                  now={now}
                  onClose={() => setActiveDrawer(null)}
                  onSelectManagementTab={handleSelectManagementTab}
                  onSelectBusiness={handleSelectOwnBusiness}
                  onEnterInterior={(id) => setInteriorBusinessId(id)}
                  onOpenHrModal={(id) => {
                    setHrInitialSubView('branches');
                    setHrTargetBusinessId(id);
                    handleSelectManagementTab('hr');
                  }}
                  onCloneBusiness={handleStartCloneBusiness}
                  onLaunchAdCampaign={handleLaunchAdCampaign}
                  onHireDoubleShift={handleHireDoubleShift}
                  onOpenDayEndReport={() => {
                    setActiveDrawer(null);
                    setDayEndModalOpen(true);
                  }}
                  onCollectBusiness={handleCollectBusiness}
                  onCollectAll={handleCollectAll}
                  onUpgradeBusiness={handleUpgradeBusiness}
                  onRestockBusiness={handleRestockBusiness}
                  onClaimMission={handleClaimMission}
                  onEnablePinMode={() => {
                    setActiveDrawer(null);
                    setActiveNav('map');
                    setPinDropMode(true);
                    handleMapClick(activeProvince.lat, activeProvince.lng);
                  }}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <CityPickerModal
        open={cityPickerOpen}
        activePlate={activePlate}
        unlockedCityPlates={getUnlockedCityPlates(empire)}
        ownBusinesses={empire.businesses}
        onSelectProvince={handleSelectProvince}
        onClose={() => setCityPickerOpen(false)}
      />

      <BusinessInteriorModal
        business={interiorBusiness}
        allOwnBusinesses={empire.businesses}
        cash={empire.cash}
        activeEvent={empire.activeEvent}
        now={now}
        onCollect={handleCollectBusiness}
        onUpgrade={handleUpgradeBusiness}
        onHireStaff={handleHireStaffQuick}
        onBoost={handleBoostBusiness}
        onClose={() => setInteriorBusinessId(null)}
      />

      <HrManagementModal
        open={hrModalOpen}
        business={hrTargetBusiness}
        state={empire}
        activeCityPlate={activeProvince.plate}
        activeCityName={activeProvince.name}
        founderName={user?.name ?? 'Kurucu Yatırımcı'}
        companyLevel={companyTier.level}
        netWorth={netWorth}
        initialSubView={hrInitialSubView}
        onSelectBranch={(id) => setHrTargetBusinessId(id)}
        onSelectManagementTab={handleSelectManagementTab}
        onToggleGmAutoAds={handleToggleGmAutoAds}
        onHireCandidate={handleHireCandidate}
        onAssignRoleSlot={handleAssignRoleSlot}
        onPromoteStaff={handlePromoteStaff}
        onDistributeBulkBonus={handleDistributeHoldingBonus}
        onDismissStaff={handleDismissStaff}
        onRefreshPool={handleRefreshCandidatePool}
        onRestockBusiness={handleRestockBusiness}
        onHireAccountant={handleHireAccountant}
        onDismissAccountant={handleDismissAccountant}
        onRefreshAccountantPool={handleRefreshAccountantPool}
        onHireCeo={handleHireCeo}
        onDismissCeo={handleDismissCeo}
        onToggleCeoAutonomous={handleToggleCeoAutonomous}
        onClose={() => setHrModalOpen(false)}
      />

      <HoldingFranchiseModal
        open={holdingModalOpen}
        state={empire}
        allFranchises={allFranchises}
        onSelectManagementTab={handleSelectManagementTab}
        onFormSupermarketChain={handleFormSupermarketChain}
        onCreateFranchise={handleCreateFranchise}
        onApproveFranchiseApp={handleApproveFranchiseApp}
        onToggleAutoApproveApps={handleToggleAutoApproveApps}
        onScanAiApplicant={handleScanAiApplicant}
        onOpenFranchiseOnMap={handleOpenFranchiseOnMap}
        onClose={() => setHoldingModalOpen(false)}
      />

      <RivalsStrategyModal
        open={rivalsModalOpen}
        state={empire}
        activeCityPlate={activeProvince.plate}
        activeCityName={activeProvince.name}
        playerOwnerId={user?.id}
        competitorBusinesses={competitorBusinesses}
        allFranchises={allFranchises}
        onSelectManagementTab={handleSelectManagementTab}
        onFocusRivalOnMap={handleFocusRivalOnMap}
        onTakeoverRival={handleTakeoverCompetitor}
        onLaunchBlitz={handleLaunchCompetitiveBlitz}
        onTakeRivalFranchise={handleOpenFranchiseOnMap}
        onClose={() => setRivalsModalOpen(false)}
      />

      <BorsaModal
        open={borsaModalOpen}
        mode={borsaMode}
        state={empire}
        quotes={stockQuotes}
        netWorth={netWorth}
        onBuyStock={handleBuyStock}
        onSellStock={handleSellStock}
        onLaunchIpo={handleLaunchIpo}
        onSwitchToAccounting={() => {
          soundEngine.playClick();
          setBorsaModalOpen(false);
          setAccountingModalOpen(true);
        }}
        onSwitchToBanking={() => {
          soundEngine.playClick();
          setBorsaModalOpen(false);
          setBankingModalOpen(true);
        }}
        onSwitchMode={(nextMode) => {
          soundEngine.playClick();
          setBorsaMode(nextMode);
        }}
        onClose={() => setBorsaModalOpen(false)}
      />

      <BankingModal
        open={bankingModalOpen}
        initialSubTab={bankingInitialTab}
        state={empire}
        allBanks={allBanks}
        activeProvince={activeProvince}
        netWorth={netWorth}
        now={now}
        onTakeLoan={handleTakeLoan}
        onPayInstallment={handlePayLoanInstallment}
        onRepayLoan={handleRepayLoan}
        onCreateBank={handleCreateBank}
        onUpdateBank={handleUpdateBank}
        onSwitchToAccounting={() => {
          soundEngine.playClick();
          setBankingModalOpen(false);
          setAccountingModalOpen(true);
        }}
        onSwitchToBorsa={() => {
          soundEngine.playClick();
          setBankingModalOpen(false);
          setBorsaMode('market');
          setBorsaModalOpen(true);
        }}
        onSwitchToInvestments={() => {
          soundEngine.playClick();
          setBankingModalOpen(false);
          setBorsaMode('portfolio');
          setBorsaModalOpen(true);
        }}
        onClose={() => setBankingModalOpen(false)}
      />

      <AccountingModal
        open={accountingModalOpen}
        state={empire}
        quotes={stockQuotes}
        now={now}
        onPayTaxBill={handlePayTaxBill}
        onOpenHrAccounting={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setHrInitialSubView('hq');
          handleSelectManagementTab('hr');
        }}
        onOpenDayEndReport={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setDayEndModalOpen(true);
        }}
        onSwitchToBanking={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setBankingModalOpen(true);
        }}
        onSwitchToBorsa={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setBorsaMode('market');
          setBorsaModalOpen(true);
        }}
        onSwitchToInvestments={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setBorsaMode('portfolio');
          setBorsaModalOpen(true);
        }}
        onClose={() => setAccountingModalOpen(false)}
      />

      <OfficeModal
        open={officeModalOpen}
        initialTab={officeModalTab}
        state={empire}
        companyName={empire.playerIpo?.holdingName ?? companyTier.title}
        netWorth={netWorth}
        onUpgradeOfficeTier={handleUpgradeOfficeTier}
        onBuyOfficeUpgrade={handleBuyOfficeUpgrade}
        onBuyPersonalAsset={handleBuyPersonalAsset}
        onQuickNavigate={(target) => {
          soundEngine.playClick();
          setOfficeModalOpen(false);
          if (target === 'banking') {
            setBankingModalOpen(true);
          } else if (target === 'hr') {
            setHrInitialSubView('branches');
            handleSelectManagementTab('hr');
          } else if (target === 'accounting') {
            setAccountingModalOpen(true);
          } else if (target === 'dayend') {
            setDayEndModalOpen(true);
          }
        }}
        onClose={() => setOfficeModalOpen(false)}
      />

      <DayEndReportModal
        open={dayEndModalOpen}
        onClose={() => setDayEndModalOpen(false)}
        pendingReports={empire.pendingDayEndReports ?? []}
        historyReports={empire.dayEndHistory ?? []}
        onCollectAll={handleCollectDayEndAll}
        onCollectSingle={handleCollectDayEndSingle}
      />

      <AdsPromotionModal
        open={adsModalOpen}
        state={empire}
        onLaunchPromo={handleLaunchHoldingPromo}
        onClose={() => setAdsModalOpen(false)}
      />

      <RentalListingsModal
        open={rentalsModalOpen}
        state={empire}
        onBuyProperty={handleBuyRentalProperty}
        onSignLease={handleSignRentalLease}
        onTerminateLease={handleTerminateRentalLease}
        onClose={() => setRentalsModalOpen(false)}
      />

      <DailyOffersModal
        open={offersModalOpen}
        state={empire}
        onAcceptOffer={handleAcceptDailyOffer}
        onDeclineOffer={handleDeclineDailyOffer}
        onClose={() => setOffersModalOpen(false)}
      />

      <HoldingStoreModal
        open={storeModalOpen}
        state={empire}
        onPurchaseItem={handlePurchaseStorePerk}
        onClose={() => setStoreModalOpen(false)}
      />

      {overviewReportsOpen && (
        <HoldingReportsModal
          state={empire}
          quotes={stockQuotes}
          competitorBusinesses={competitorBusinesses}
          now={now}
          onClose={() => setOverviewReportsOpen(false)}
          onNavigateToBranch={(id) => {
            setOverviewReportsOpen(false);
            setOverviewManagedBranchId(id);
          }}
          onLaunchBulkAds={handleLaunchHoldingBulkAds}
          onDistributeBulkBonus={handleDistributeHoldingBonus}
        />
      )}

      {overviewManagedBranchId &&
        (() => {
          const targetBranch = empire.businesses.find((b) => b.id === overviewManagedBranchId);
          if (!targetBranch) return null;
          return (
            <BranchManagementModal
              state={empire}
              business={targetBranch}
              now={now}
              onBackToSelector={() => {
                setOverviewManagedBranchId(null);
                setActiveNav('businesses');
              }}
              onClose={() => setOverviewManagedBranchId(null)}
              onCustomizeBranch={handleCustomizeBranch}
              onLaunchMarketing={handleLaunchBranchMarketing}
              onUpgradeFacility={handleUpgradeBranchFacility}
              onPerformMaintenance={handlePerformBranchMaintenance}
              onRenewEquipment={handleRenewBranchEquipment}
              onSyncPrices={handleSyncBranchPrices}
            />
          );
        })()}

      {crisisModalOpen && empire.activeCrisisEvent && (
        <CrisisDecisionModal
          crisis={empire.activeCrisisEvent}
          cash={empire.cash}
          onResolve={handleResolveCrisis}
          onClose={() => setCrisisModalOpen(false)}
        />
      )}

      {raiseModalOpen && (
        <RaiseRequestsModal
          requests={empire.pendingRaiseRequests ?? []}
          onResolve={handleResolveRaiseRequest}
          onClose={() => setRaiseModalOpen(false)}
        />
      )}

      {strategicHubOpen && (
        <StrategicHubModal
          state={empire}
          netWorth={netWorth}
          onStartMegaProject={handleStartMegaProject}
          onClaimBoardContract={handleClaimBoardContract}
          onTriggerPrestigeIpo={handleTriggerPrestigeIpo}
          onClose={() => setStrategicHubOpen(false)}
        />
      )}

      <LeaderboardModal
        open={leaderboardModalOpen}
        user={user}
        state={empire}
        netWorth={netWorth}
        activeProvince={activeProvince}
        roomRecords={competitorBusinesses}
        allFranchises={allFranchises}
        allBanks={allBanks}
        onClose={() => setLeaderboardModalOpen(false)}
      />

      <NotificationToasts
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      <NotificationCenter
        open={notifOpen}
        notifications={notifications}
        onClose={() => setNotifOpen(false)}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearAll={() => setNotifications([])}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        user={user}
        otaResult={otaResult}
        checkingOta={checkingOta}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onCheckUpdates={handleManualOtaCheck}
        onOpenUpdateModal={() => {
          setSettingsOpen(false);
          setOtaModalOpen(true);
        }}
        onUpgradeGuestAccount={handleUpgradeGuestAccount}
        onReplayTutorial={user ? handleReplayTutorial : undefined}
        onReturnToMainMenu={screen === 'playing' ? handleReturnToMainMenu : undefined}
        onSignOut={user ? handleSignOut : undefined}
        onResetGame={handleResetGame}
      />

      <GameTutorialOverlay
        open={screen === 'playing' && tutorialOpen}
        onComplete={handleCompleteTutorial}
        onSkip={handleSkipTutorial}
      />

      <OtaUpdateModal
        manifest={otaResult?.remoteManifest ?? null}
        open={otaModalOpen}
        updating={otaUpdating}
        onUpdateNow={handleApplyOtaUpdate}
        onLater={() => setOtaModalOpen(false)}
      />
    </div>
  );
}
