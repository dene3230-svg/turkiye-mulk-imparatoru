import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Clock,
  Home,
  MapPin,
  Pause,
  Settings,
  Sun,
  Moon,
  Globe2,
  Radio,
  Landmark,
  LayoutGrid,
  Link2,
  Newspaper,
  Store,
  Trophy,
  X,
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import type {
  AdCampaignTierId,
  BankRecord,
  BusinessTypeId,
  ChainCloneDraft,
  ChatMessage,
  EmpireState,
  FranchiseBrand,
  GameSettings,
  GameSpeed,
  MissionDef,
  NotificationItem,
  OtaCheckResult,
  PinLocationInfo,
  ProvinceInfo,
  RemoteBusinessRecord,
  ScreenState,
  StockQuote,
  UserProfile,
} from './types/game';
import {
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
  createHeadquartersForCity,
  createInitialEmpireState,
  formatGameClock,
  formatTL,
  getCompanyTier,
  getEffectiveSimSeconds,
  getMissionProgress,
  hireStaff,
  purchaseBusiness,
  resolveInitialFocusTarget,
  sellBusiness,
  takeoverCompetitorBusiness,
  tickEconomy,
  upgradeBusiness,
} from './game/economy';
import { ensureDynamicMissions } from './game/missionEngine';
import {
  dismissStaffMember,
  generateCandidatePool,
  hireCandidateFromPool,
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
  DEFAULT_PROVINCE_PLATE,
  getProvinceByPlate,
  resolvePinLocation,
} from './game/provinces81';
import { validateLandCoordinate } from './game/waterShield';
import {
  createOrLoadGuestProfile,
  loadEmpireStateLocal,
  saveEmpireStateLocal,
  sessionToUserProfile,
  signInWithGoogle,
  signOutAccount,
  supabase,
} from './lib/supabase';
import {
  applyRealtimeBusinessDelete,
  applyRealtimeBusinessPatch,
  applyRealtimeBusinessUpsert,
  fetchAllWorldBusinesses,
  findUnsyncedLocalBusinesses,
  formatOwnerDisplayName,
  generateSeedCityRivals,
  isRealPlayerBusiness,
  mergeWorldAndSeedRivals,
  ownedToRemoteRecord,
  publishBusinessToRoom,
  removeBusinessFromRoom,
  subscribeToGlobalBusinesses,
  syncPlayerBusinessesToWorld,
  updateBusinessInRoom,
  type RoomSyncStatus,
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
import { GameHubMenuModal } from './components/GameHubMenuModal';
import { AccountingModal } from './components/AccountingModal';
import { GameTutorialOverlay } from './components/GameTutorialOverlay';

const SETTINGS_STORAGE_KEY = 'tmi_settings_v1';
const TUTORIAL_STORAGE_KEY = 'tmi_tutorial_done_v122';
const HQ_CITY_STORAGE_KEY = 'tmi_hq_city_v1';

function loadSavedStartingCity(): number {
  try {
    const raw = Number(localStorage.getItem(HQ_CITY_STORAGE_KEY));
    if (Number.isInteger(raw) && raw >= 1 && raw <= 81) return raw;
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PROVINCE_PLATE;
}

function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        notificationsEnabled: parsed.notificationsEnabled ?? true,
        soundEnabled: parsed.soundEnabled ?? true,
        mapStyle: parsed.mapStyle === 'carto' ? 'carto' : 'osm',
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    theme: 'light',
    notificationsEnabled: true,
    soundEnabled: true,
    mapStyle: 'osm',
  };
}

// Backward-compatible migration for v1.0/v1.1 saved games -> v1.2.0 holding state
function migrateSavedEmpire(
  saved: EmpireState | null,
  owner: UserProfile,
  fallbackCityPlate = DEFAULT_PROVINCE_PLATE
): EmpireState {
  if (!saved) return createInitialEmpireState(Date.now(), fallbackCityPlate);
  const migratedBusinesses = saved.businesses.map((raw) => {
    const legacy = raw as unknown as Record<string, unknown>;
    const rawType = String(legacy.blueprintId ?? 'kafe');
    const blueprintId: BusinessTypeId = isValidBusinessType(rawType) ? rawType : 'kafe';
    const plate =
      typeof legacy.cityPlate === 'number' && legacy.cityPlate >= 1 && legacy.cityPlate <= 81
        ? legacy.cityPlate
        : DEFAULT_PROVINCE_PLATE;
    const prov = getProvinceByPlate(plate);
    return {
      ...raw,
      ownerId: (legacy.ownerId as string) || owner.id,
      ownerName: (legacy.ownerName as string) || owner.name,
      blueprintId,
      cityPlate: plate,
      cityName: (legacy.cityName as string) || prov.name,
      districtName: (legacy.districtName as string) || prov.districts[0] || prov.name,
      employees: Array.isArray(legacy.employees) ? raw.employees : [],
      stockLevel: typeof legacy.stockLevel === 'number' ? raw.stockLevel : 100,
      maintenanceLevel: typeof legacy.maintenanceLevel === 'number' ? raw.maintenanceLevel : 100,
    };
  });

  const derivedHq =
    saved.hq ??
    (migratedBusinesses.length > 0
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
      : createHeadquartersForCity(fallbackCityPlate));

  const baseMigrated: EmpireState = {
    ...saved,
    hq: derivedHq,
    businesses: migratedBusinesses,
    cityManagers: Array.isArray(saved.cityManagers) ? saved.cityManagers : [],
    candidatePool:
      Array.isArray(saved.candidatePool) && saved.candidatePool.length > 0
        ? saved.candidatePool
        : generateCandidatePool(Date.now(), 'kafe'),
    supermarketChain: saved.supermarketChain ?? null,
    ownFranchises: Array.isArray(saved.ownFranchises) ? saved.ownFranchises : [],
    franchiseApplications: Array.isArray(saved.franchiseApplications)
      ? saved.franchiseApplications
      : [],
    autoApproveFranchiseApps: saved.autoApproveFranchiseApps ?? true,
    franchiseRoyaltiesEarned: saved.franchiseRoyaltiesEarned ?? 0,
    competitiveBlitzes: Array.isArray(saved.competitiveBlitzes) ? saved.competitiveBlitzes : [],
    acquiredRivalIds: Array.isArray(saved.acquiredRivalIds) ? saved.acquiredRivalIds : [],
    stockPortfolio: Array.isArray(saved.stockPortfolio) ? saved.stockPortfolio : [],
    playerIpo: saved.playerIpo ?? null,
    creditScore: typeof saved.creditScore === 'number' ? saved.creditScore : STARTING_CREDIT_SCORE,
    ownBank: saved.ownBank ?? null,
    activeLoans: Array.isArray(saved.activeLoans) ? saved.activeLoans : [],
    accountant: saved.accountant ?? null,
    accountantPool:
      Array.isArray(saved.accountantPool) && saved.accountantPool.length > 0
        ? saved.accountantPool
        : generateAccountantPool(Date.now()),
    ceo: saved.ceo ?? null,
    ceoPool:
      Array.isArray(saved.ceoPool) && saved.ceoPool.length > 0
        ? saved.ceoPool
        : generateCeoPool(Date.now()),
    pendingTaxes: Array.isArray(saved.pendingTaxes) ? saved.pendingTaxes : [],
    totalTaxesPaid: typeof saved.totalTaxesPaid === 'number' ? saved.totalTaxesPaid : 0,
    lastCeoActionGameDay:
      typeof saved.lastCeoActionGameDay === 'number' ? saved.lastCeoActionGameDay : 0,
    companyXp: typeof saved.companyXp === 'number' ? saved.companyXp : 0,
    gameMinutes:
      typeof saved.gameMinutes === 'number' ? saved.gameMinutes : STARTING_GAME_MINUTES,
    completedMissionsCount:
      typeof saved.completedMissionsCount === 'number'
        ? saved.completedMissionsCount
        : saved.claimedMissionIds?.length ?? 0,
    activeMissions: Array.isArray(saved.activeMissions) ? saved.activeMissions : [],
  };

  return {
    ...baseMigrated,
    activeMissions: ensureDynamicMissions(baseMigrated, Date.now()),
  };
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

  const [screen, setScreen] = useState<ScreenState>(() => (autostart ? 'playing' : 'intro'));
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [user, setUser] = useState<UserProfile | null>(() =>
    autostart ? createOrLoadGuestProfile() : null
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [startingCityPlate, setStartingCityPlate] = useState<number>(() =>
    loadSavedStartingCity()
  );

  const [empire, setEmpire] = useState<EmpireState>(() => {
    const startPlate = loadSavedStartingCity();
    const initialUser = autostart ? createOrLoadGuestProfile() : null;
    if (initialUser) {
      return migrateSavedEmpire(loadEmpireStateLocal(initialUser.id), initialUser, startPlate);
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
  const [accountingModalOpen, setAccountingModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [patronChatOpen, setPatronChatOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(() => !isTutorialCompleted());

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
      id: 'welcome-v132',
      title: 'Türkiye Mülk İmparatoru v1.3.2',
      body: 'Mevcut yerel işletmelerin Supabase ortak haritasına otomatik aktarımı, çift koordinat desteği ve canlı rakip pin senkronizasyonu aktif!',
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
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
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

  // Request notification permissions & check OTA updates on startup
  useEffect(() => {
    if (settingsRef.current.notificationsEnabled) {
      requestNotificationPermission().catch(() => {});
    }

    checkForOtaUpdate().then((res) => {
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
    });
  }, [pushNotification]);

  // Listen to Supabase Auth session & Capacitor OAuth deep link callback
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted || !data.session) return;
        const profile = sessionToUserProfile(data.session);
        const loaded = migrateSavedEmpire(
          loadEmpireStateLocal(profile.id),
          profile,
          loadSavedStartingCity()
        );
        const focus = resolveInitialFocusTarget(loaded);
        setUser(profile);
        setEmpire(loaded);
        setActivePlate(focus.cityPlate);
        setFlyTarget({ lat: focus.lat, lng: focus.lng, zoom: focus.zoom, nonce: Date.now() });
      })
      .catch(() => {});

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = sessionToUserProfile(session);
        const loaded = migrateSavedEmpire(
          loadEmpireStateLocal(profile.id),
          profile,
          loadSavedStartingCity()
        );
        const focus = resolveInitialFocusTarget(loaded);
        setUser(profile);
        setEmpire(loaded);
        setActivePlate(focus.cityPlate);
        setFlyTarget({ lat: focus.lat, lng: focus.lng, zoom: focus.zoom, nonce: Date.now() });
        setScreen('playing');
      }
    });

    let capHandle: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        if (event.url?.includes('login-callback')) {
          const url = new URL(event.url);
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }).then((h) => {
        capHandle = h;
      });
    }

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
      capHandle?.remove().catch(() => {});
    };
  }, []);

  // Fetch global Supabase corporate tables (franchises, banks, player IPOs) on play
  useEffect(() => {
    if (screen !== 'playing') return;
    let active = true;

    fetchAllFranchises().then((list) => {
      if (active) setRemoteFranchises(list);
    });
    fetchAllBanks().then((list) => {
      if (active) setRemoteBanks(list);
    });
    fetchPlayerIpoListings().then((ipos) => {
      if (!active) return;
      setStockQuotes((prev) => {
        const bist = prev.filter((q) => !q.isPlayerIpo);
        const existingTickers = new Set(bist.map((b) => b.ticker));
        const mergedIpos = ipos.filter((i) => !existingTickers.has(i.ticker));
        return [...bist, ...mergedIpos];
      });
    });

    return () => {
      active = false;
    };
  }, [screen]);

  // Subscribe to Patron Chat (global + active city channel)
  useEffect(() => {
    if (screen !== 'playing') return;
    const onIncoming = (msg: ChatMessage) => {
      setChatMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev.slice(-60), msg]
      );
    };

    const globalSub = subscribePatronChat('global', onIncoming);
    const citySub = subscribePatronChat(`city-${activePlate}`, onIncoming);
    chatSendersRef.current = { global: globalSub.send, city: citySub.send };

    return () => {
      globalSub.unsubscribe();
      citySub.unsubscribe();
    };
  }, [screen, activePlate]);

  // Subscribe nationwide to Supabase Realtime (`public.businesses`) across all 81 provinces
  const lastLiveAlertAtRef = useRef<number>(0);
  const lastSyncErrorRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const lastPortfolioSyncSigRef = useRef<string>('');
  const serverWorldRecordsRef = useRef<RemoteBusinessRecord[]>([]);

  const reportSupabaseSyncError = useCallback(
    (context: string, errorMsg?: string) => {
      const msg = (errorMsg ?? 'Bilinmeyen bağlantı hatası').trim();
      console.error(`[Supabase Sync] ${context}:`, msg);
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

  const buildLocalRemoteRecords = useCallback((): RemoteBusinessRecord[] => {
    const currentEmpire = empireRef.current;
    const currentUser = userRef.current;
    if (!currentUser || currentEmpire.businesses.length === 0) return [];
    const holdingName =
      currentEmpire.playerIpo?.holdingName ||
      currentEmpire.supermarketChain?.name ||
      getCompanyTier(calculateNetWorth(currentEmpire, Date.now(), stockQuotesRef.current)).title;

    return currentEmpire.businesses.map((biz) => {
      const hourly = calculateBusinessHourlyIncome(
        biz,
        currentEmpire.activeEvent,
        Date.now(),
        currentEmpire.businesses,
        currentEmpire
      );
      const valuation = calculateBusinessValuation(biz, currentEmpire.activeEvent, Date.now());
      return ownedToRemoteRecord(biz, hourly, valuation, holdingName, {
        id: currentUser.id,
        name: currentUser.name,
      });
    });
  }, []);

  const syncMissingLocalBusinesses = useCallback(
    async (remoteBaseline?: RemoteBusinessRecord[]) => {
      const localRecords = buildLocalRemoteRecords();
      if (localRecords.length === 0) return;
      const baseline = remoteBaseline ?? serverWorldRecordsRef.current;
      const missingOrOutdated = findUnsyncedLocalBusinesses(localRecords, baseline);
      if (missingOrOutdated.length === 0) return;

      const res = await syncPlayerBusinessesToWorld(missingOrOutdated);
      if (!res.ok) {
        reportSupabaseSyncError(
          `${missingOrOutdated.length} yerel işletme Supabase'e aktarılamadı`,
          res.error
        );
        return;
      }
      serverWorldRecordsRef.current = missingOrOutdated.reduce(
        (acc, rec) => applyRealtimeBusinessUpsert(acc, rec),
        baseline
      );
      setRoomRecords((prev) =>
        missingOrOutdated.reduce((acc, rec) => applyRealtimeBusinessUpsert(acc, rec), prev)
      );
    },
    [buildLocalRemoteRecords, reportSupabaseSyncError]
  );

  useEffect(() => {
    if (screen !== 'playing') return;
    let active = true;
    setRoomStatus('connecting');

    const loadAllWorldAndSync = async () => {
      const { records, connected, error } = await fetchAllWorldBusinesses();
      if (!active) return;

      if (error) {
        setRoomStatus('offline');
        reportSupabaseSyncError('Ortak harita verileri okunamadı', error);
      } else {
        serverWorldRecordsRef.current = records;
        setRoomRecords((prev) => {
          // Merge fetched server truth (`select('*')`) with any pending local real records idempotently
          let next = [...records];
          for (const existing of prev) {
            if (!next.some((r) => r.id === existing.id) && isRealPlayerBusiness(existing)) {
              next = applyRealtimeBusinessUpsert(next, existing);
            }
          }
          return next;
        });
        if (!connected) {
          setRoomStatus('offline');
        }
      }

      // Always verify & upsert any local businesses missing from `public.businesses`
      await syncMissingLocalBusinesses(records);
    };

    loadAllWorldAndSync();

    const unsubscribe = subscribeToGlobalBusinesses({
      onUpsert: (rec) => {
        if (!active) return;
        serverWorldRecordsRef.current = applyRealtimeBusinessUpsert(
          serverWorldRecordsRef.current,
          rec
        );
        setRoomRecords((prev) => applyRealtimeBusinessUpsert(prev, rec));
      },
      onPatch: (id, patch) => {
        if (!active) return;
        serverWorldRecordsRef.current = applyRealtimeBusinessPatch(
          serverWorldRecordsRef.current,
          id,
          patch
        );
        setRoomRecords((prev) => applyRealtimeBusinessPatch(prev, id, patch));
      },
      onInsert: (rec) => {
        if (!active) return;
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
      onUpdate: (rec) => {
        if (!active) return;
        const currentUserId = userRef.current?.id;
        if (!currentUserId || rec.owner_id === currentUserId) return;
        // If another player acquired one of our own branches via buyout, reconcile portfolio & credit proceeds
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
      onDelete: (id) => {
        if (!active) return;
        serverWorldRecordsRef.current = applyRealtimeBusinessDelete(
          serverWorldRecordsRef.current,
          id
        );
        setRoomRecords((prev) => applyRealtimeBusinessDelete(prev, id));
        setSelectedCompetitorId((cur) => (cur === id ? null : cur));
      },
      onStatus: (status) => {
        if (!active) return;
        setRoomStatus(status);
      },
      onError: (errMsg) => {
        if (!active) return;
        reportSupabaseSyncError('Canlı harita bağlantısı', errMsg);
      },
      onReconnect: () => {
        if (!active) return;
        loadAllWorldAndSync();
      },
    });

    const handleOnline = () => {
      if (!active) return;
      loadAllWorldAndSync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [screen, pushNotification, reportSupabaseSyncError, syncMissingLocalBusinesses]);

  // Also ensure pre-existing local businesses sync automatically once `user` or `empire` finishes hydrating
  useEffect(() => {
    if (screen !== 'playing' || !user || empire.businesses.length === 0) return;
    const sig = `${user.id}:${empire.businesses.map((b) => `${b.id}@${b.level}`).join(',')}`;
    if (lastPortfolioSyncSigRef.current === sig) return;
    lastPortfolioSyncSigRef.current = sig;
    syncMissingLocalBusinesses();
  }, [screen, user, empire.businesses, syncMissingLocalBusinesses]);

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

          pushNotification(
            `Gün Sonu Özeti · Gün ${summary.completedDay} (${summary.month}. Ay)`,
            `Günlük Net: ${netLabel} · Maaşlar: ${formatTL(
              summary.dailySalariesPaid,
              true
            )} · Kredi Puanı: ${scoreDeltaLabel}`,
            'finance',
            false
          );

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

  // Live Borsa Ticker Loop (freezes on Pause, flows 2x/4x faster on high speed)
  useEffect(() => {
    if (screen !== 'playing' || gameSpeed === 0) return;
    const intervalMs = Math.max(750, Math.round(3000 / gameSpeed));
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
    try {
      localStorage.setItem(HQ_CITY_STORAGE_KEY, String(plate));
    } catch {
      // ignore storage errors
    }
  };

  const focusHeadquarters = useCallback((targetState: EmpireState) => {
    const focus = resolveInitialFocusTarget(targetState);
    setActivePlate(focus.cityPlate);
    setFlyTarget({ lat: focus.lat, lng: focus.lng, zoom: focus.zoom, nonce: Date.now() });
  }, []);

  const handleGuestLogin = () => {
    soundEngine.playClick();
    setAuthError(null);
    const guest = createOrLoadGuestProfile();
    const loaded = migrateSavedEmpire(
      loadEmpireStateLocal(guest.id),
      guest,
      startingCityPlate
    );
    setUser(guest);
    setEmpire(loaded);
    focusHeadquarters(loaded);
    setScreen('playing');
  };

  const handleGoogleLogin = async () => {
    soundEngine.playClick();
    setAuthLoading(true);
    setAuthError(null);
    const res = await signInWithGoogle();
    setAuthLoading(false);
    if (res.error) {
      setAuthError(res.error);
    }
  };

  const handleSignOut = async () => {
    soundEngine.playClick();
    await signOutAccount();
    setUser(null);
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
    setActivePlate(prov.plate);
    setDroppedPin(null);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    if (empire.businesses.length === 0) {
      setEmpire((prev) => ({ ...prev, hq: createHeadquartersForCity(prov.plate) }));
      handleSelectStartingCity(prov.plate);
    }
    setFlyTarget({ lat: prov.lat, lng: prov.lng, zoom: prov.zoom, nonce: Date.now() });
    pushNotification(
      `${prov.code} ${prov.name} Odasına Geçildi`,
      `${prov.region} bölgesi canlı harita odası yüklendi.`,
      'system',
      false
    );
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      landCheckAbortRef.current?.abort();
      const abort = new AbortController();
      landCheckAbortRef.current = abort;

      const info = resolvePinLocation(lat, lng, activePlate);
      setDroppedPin(info);
      setSelectedBusinessId(null);
      setSelectedCompetitorId(null);
      setActiveDrawer(null);
      setPinDropMode(true);
      soundEngine.playPinDrop();

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
      setHubMenuOpen(false);
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

  const handleHireStaffQuick = (businessId: string) => {
    const res = hireStaff(empire, businessId, Date.now());
    if (!res.ok) return;
    soundEngine.playPurchase();
    setEmpire(res.state);
  };

  // --- v1.2.0 HR & 5-Tier Automation Handlers ---
  const handleHireCandidate = (
    candidateId: string,
    businessId: string | null,
    cityPlate: number
  ) => {
    const res = hireCandidateFromPool(empire, candidateId, businessId, cityPlate, Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('İşe Alım Başarısız', res.error, 'system', false);
      return;
    }
    soundEngine.playUpgrade();
    setEmpire(res.state);
    pushNotification('Yeni Personel / Yönetici Atandı', 'Kadro ve otomasyon güncellendi.', 'milestone', false);
  };

  const handleDismissStaff = (staffId: string, businessId?: string) => {
    const res = dismissStaffMember(empire, staffId, businessId, Date.now());
    if (res.ok) {
      soundEngine.playClick();
      setEmpire(res.state);
    }
  };

  const handleRefreshCandidatePool = () => {
    const targetBiz = empire.businesses.find((b) => b.id === hrTargetBusinessId);
    const res = refreshCandidatePool(empire, targetBiz?.blueprintId ?? 'kafe', Date.now());
    if (!res.ok) {
      if (res.error) pushNotification('Havuz Yenilenemedi', res.error, 'system', false);
      return;
    }
    soundEngine.playClick();
    setEmpire(res.state);
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
      senderId: user?.id ?? 'guest',
      senderName: user?.name ?? 'Misafir Yatırımcı',
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
    setGameSpeed(nextSpeed);
  };

  const handleCompleteTutorial = () => {
    soundEngine.playUpgrade();
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setTutorialOpen(false);
  };

  const handleSkipTutorial = () => {
    soundEngine.playClick();
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setTutorialOpen(false);
  };

  const handleReplayTutorial = () => {
    soundEngine.playClick();
    setSettingsOpen(false);
    if (screen !== 'playing') {
      if (!user) {
        const guest = createOrLoadGuestProfile();
        setUser(guest);
        setEmpire(migrateSavedEmpire(loadEmpireStateLocal(guest.id), guest));
      }
      setScreen('playing');
    }
    setTutorialOpen(true);
  };

  const handleResetGame = () => {
    const fresh = createInitialEmpireState(Date.now(), startingCityPlate);
    setEmpire(fresh);
    setGameSpeed(1);
    setDroppedPin(null);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    setInteriorBusinessId(null);
    setActiveDrawer(null);
    setHrModalOpen(false);
    setHoldingModalOpen(false);
    setRivalsModalOpen(false);
    setChainCloneDraft(null);
    setPreselectedFranchise(null);
    focusHeadquarters(fresh);
    if (user) {
      saveEmpireStateLocal(user.id, fresh);
    }
    pushNotification(
      'İmparatorluk Sıfırlandı',
      'Yeni bir başlangıç yapıldı. ₺250.000 başlangıç sermayesi ve 1100 kredi puanı hesabınızda.',
      'system',
      false
    );
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
    if (empire.businesses.length > 0) return empire.businesses.length;
    const guest = createOrLoadGuestProfile();
    return loadEmpireStateLocal(guest.id)?.businesses.length ?? 0;
  }, [empire.businesses.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#0B1221] dark:text-slate-100">
      <OrientationGuard />

      {screen === 'intro' && <StudioIntro onComplete={() => setScreen('menu')} />}

      {screen === 'menu' && (
        <MainMenu
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          user={user}
          authLoading={authLoading}
          authError={authError}
          startingCityPlate={startingCityPlate}
          onSelectStartingCity={handleSelectStartingCity}
          onGuestLogin={handleGuestLogin}
          onGoogleLogin={handleGoogleLogin}
          onContinueLoggedIn={() => {
            focusHeadquarters(empire);
            setScreen('playing');
          }}
          onSignOut={handleSignOut}
          onOpenSettings={() => setSettingsOpen(true)}
          onCheckUpdate={handleManualOtaCheck}
          checkingUpdate={checkingOta}
          savedBusinessCount={menuSavedCount}
        />
      )}

      {screen === 'playing' && (
        <div className="relative h-full w-full overflow-hidden">
          <TurkeyMap
            theme={settings.theme}
            mapStyle={settings.mapStyle}
            activePlate={activePlate}
            ownBusinesses={empire.businesses}
            competitorBusinesses={competitorBusinesses}
            selectedBusinessId={selectedBusinessId}
            selectedCompetitorId={selectedCompetitorId}
            droppedPin={droppedPin}
            droppedPinBlocked={!droppedPinDistanceCheck.allowed}
            pinDropMode={pinDropMode}
            initialCenter={initialMapFocus}
            flyTarget={flyTarget}
            onMapClick={handleMapClick}
            onSelectOwnBusiness={handleSelectOwnBusiness}
            onSelectCompetitor={handleSelectCompetitor}
          />

          {/* Top Clean Landscape HUD Overlay (Zero-Overlap: No "Topla" Button) */}
          <header
            aria-label="Oyun Durum Çubuğu"
            data-testid="top-hud"
            className="pointer-events-none fixed inset-x-0 top-0 z-[600] flex items-center justify-between gap-1.5 pl-[var(--hud-left-gap)] pr-[var(--hud-right-gap)] pt-[var(--hud-top-gap)]"
          >
            {/* Left Economy & Quota Cluster — Clean 2-Row Layout, Zero Overlap */}
            <div
              data-testid="hud-left-cluster"
              className="compact-short-hud pointer-events-auto flex min-w-0 items-center gap-[clamp(6px,1vw,10px)] rounded-2xl border border-slate-200/95 bg-white/95 px-[clamp(8px,1.2vw,12px)] py-1.5 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95"
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-amber-500/50 bg-[#0B1426] sm:h-8 sm:w-8">
                <img
                  src="./icon.png"
                  alt="Türkiye Mülk İmparatoru"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative min-w-0">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="max-w-[clamp(96px,15vw,170px)] truncate text-[clamp(9.5px,1.15vw,11px)] font-bold leading-none text-amber-700 dark:text-amber-400">
                    Sv.{companyTier.level} · {empire.playerIpo?.holdingName ?? companyTier.title}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-2 whitespace-nowrap">
                  <span
                    data-testid="hud-cash"
                    className="font-mono-num text-[clamp(12px,1.55vw,15.5px)] font-extrabold leading-none text-slate-900 dark:text-white"
                  >
                    {formatTL(empire.cash)}
                  </span>
                  <span className="font-mono-num text-[clamp(9.5px,1.1vw,11px)] font-semibold leading-none text-slate-500 dark:text-slate-400">
                    Şube {empire.businesses.length}/{companyTier.maxBranches} · Puan {empire.creditScore}
                  </span>
                  <span
                    data-testid="hud-income"
                    className="hidden font-mono-num text-[11px] font-bold leading-none text-emerald-700 dark:text-emerald-400 min-[1060px]:inline"
                  >
                    +{formatTL(totalIncomePerSec, true)}/sn
                  </span>
                </div>

                {cashPopups.map((p) => (
                  <span
                    key={p.id}
                    className="animate-float-cash pointer-events-none absolute -bottom-5 left-0 font-mono-num text-xs font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
                  >
                    +{formatTL(p.amount)}
                  </span>
                ))}
              </div>
            </div>

            {/* Center Compact Game Calendar & Time Speed Capsule (Durdur / 1x / 2x / 4x) */}
            <div
              data-testid="time-speed-capsule"
              className={`pointer-events-auto flex shrink-0 items-center gap-1 rounded-2xl border px-1.5 py-1 shadow-lg transition-colors ${
                gameSpeed === 0
                  ? 'border-amber-400/90 bg-amber-50/95 dark:border-amber-500/70 dark:bg-amber-950/90'
                  : 'border-slate-200/95 bg-white/95 dark:border-slate-700/90 dark:bg-slate-900/95'
              }`}
            >
              <div
                data-testid="hud-game-clock"
                title={gameClock.totalDaysLabel}
                className="flex items-center gap-1 pl-1 pr-0.5 whitespace-nowrap"
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="hidden font-mono-num text-[clamp(10.5px,1.2vw,12px)] font-extrabold text-slate-900 dark:text-white min-[780px]:inline">
                  {gameClock.label}
                </span>
                <span className="font-mono-num text-[10px] font-extrabold text-slate-900 dark:text-white min-[780px]:hidden">
                  {gameClock.compactLabel}
                </span>
              </div>

              <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

              <div role="group" aria-label="Oyun Zaman Hızı" className="flex items-center gap-0.5">
                {(
                  [
                    { speed: 0 as GameSpeed, label: 'Durdur', short: '⏸' },
                    { speed: 1 as GameSpeed, label: 'Normal 1x', short: '1x' },
                    { speed: 2 as GameSpeed, label: 'Hızlı 2x', short: '2x' },
                    { speed: 4 as GameSpeed, label: 'Çok Hızlı 4x', short: '4x' },
                  ] as const
                ).map((item) => {
                  const active = gameSpeed === item.speed;
                  return (
                    <button
                      key={item.speed}
                      type="button"
                      data-testid={`speed-btn-${item.speed}`}
                      aria-label={item.label}
                      aria-pressed={active}
                      title={item.label}
                      onClick={() => handleSetGameSpeed(item.speed)}
                      className={`flex h-7 min-w-[24px] items-center justify-center rounded-lg px-1.5 font-mono-num text-[10.5px] font-extrabold transition-colors sm:h-8 sm:min-w-[28px] sm:text-[11px] whitespace-nowrap ${
                        active
                          ? item.speed === 0
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs dark:bg-amber-400 dark:text-slate-950 dark:font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      {item.speed === 0 ? <Pause className="h-3 w-3" /> : item.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right City Room Switcher & Utility Cluster */}
            <div
              data-testid="hud-right-cluster"
              className="pointer-events-auto flex shrink-0 items-center gap-[clamp(3px,0.6vw,6px)] rounded-2xl border border-slate-200/95 bg-white/95 p-1 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95 sm:p-1.5"
            >
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCityPickerOpen(true);
                }}
                aria-label="Şehir Seç veya Değiştir"
                data-testid="city-switcher-btn"
                className="flex h-9 items-center gap-1 rounded-xl border border-amber-300/80 bg-amber-50/90 px-[clamp(7px,1.2vw,10px)] text-[clamp(10.5px,1.35vw,12px)] font-bold text-slate-900 transition-colors hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50 whitespace-nowrap"
              >
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="font-mono-num">{activeProvince.code}</span>
                <span className="max-w-[74px] truncate sm:max-w-[115px]">
                  {activeProvince.name}
                </span>
                <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 xl:inline-flex">
                  · <Radio className="h-3 w-3" />
                  {roomStatus === 'live' ? 'Canlı' : 'Oda'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleTheme}
                aria-label={settings.theme === 'light' ? 'Karanlık Tema' : 'Açık Tema'}
                title={settings.theme === 'light' ? 'Karanlık Tema' : 'Açık Tema'}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {settings.theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setNotifOpen(true);
                }}
                aria-label={`Bildirim Merkezi (${unreadNotifCount} okunmamış)`}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-600 px-1 font-mono-num text-[9px] font-bold text-white">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSettingsOpen(true);
                }}
                aria-label="Ayarlar"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('menu');
                }}
                aria-label="Ana Menü"
                title="Ana Menü"
                className="hidden h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 xl:flex whitespace-nowrap"
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                <span>Ana Menü</span>
              </button>
            </div>
          </header>

          {/* Bottom Centered 6-Button Clean Navigation Bar: Harita · Yönetim · Finans · Haberler · Görevler · Menü */}
          <nav
            aria-label="Oyun Araç Çubuğu"
            data-testid="bottom-action-dock"
            className="compact-short-hud pointer-events-auto fixed bottom-[var(--hud-bottom-gap)] left-1/2 z-[600] flex max-w-[calc(100dvw-16px)] -translate-x-1/2 items-center gap-[clamp(3px,0.7vw,7px)] overflow-x-auto rounded-2xl border border-slate-200/95 bg-white/95 p-1.5 shadow-xl no-scrollbar dark:border-slate-700/90 dark:bg-slate-900/95"
          >
            {/* 1) Harita (Map view + Pin Drop active) */}
            <button
              type="button"
              data-testid="dock-map-btn"
              onClick={() => {
                soundEngine.playClick();
                setPinDropMode(true);
                setActiveDrawer(null);
                setHrModalOpen(false);
                setRivalsModalOpen(false);
                setBorsaModalOpen(false);
                setBankingModalOpen(false);
                setAccountingModalOpen(false);
                setHubMenuOpen(false);
                setHoldingModalOpen(false);
                setLeaderboardModalOpen(false);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                if (!droppedPin) {
                  focusHeadquarters(empire);
                }
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                !activeDrawer &&
                !hrModalOpen &&
                !holdingModalOpen &&
                !rivalsModalOpen &&
                !borsaModalOpen &&
                !bankingModalOpen &&
                !accountingModalOpen &&
                !hubMenuOpen
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm hover:bg-amber-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Harita</span>
            </button>

            {/* 2) Yönetim (İşletmelerim · İK & Çalışanlar · Franchise & Bayilik · Rakip İşletmeler) */}
            <button
              type="button"
              data-testid="dock-management-btn"
              onClick={() => {
                const isMgmtOpen =
                  activeDrawer === 'portfolio' ||
                  hrModalOpen ||
                  holdingModalOpen ||
                  rivalsModalOpen;
                if (isMgmtOpen) {
                  soundEngine.playClick();
                  setActiveDrawer(null);
                  setHrModalOpen(false);
                  setHoldingModalOpen(false);
                  setRivalsModalOpen(false);
                } else {
                  handleSelectManagementTab('portfolio');
                }
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'portfolio' || hrModalOpen || holdingModalOpen || rivalsModalOpen
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Yönetim</span>
            </button>

            {/* 3) Finans (Muhasebe · Banka & Kredi · Borsa & Yatırım · Yatırımlarım) */}
            <button
              type="button"
              data-testid="dock-finance-btn"
              onClick={() => {
                soundEngine.playClick();
                setActiveDrawer(null);
                setHrModalOpen(false);
                setHoldingModalOpen(false);
                setRivalsModalOpen(false);
                setHubMenuOpen(false);
                setBankingModalOpen(false);
                setBorsaModalOpen(false);
                setAccountingModalOpen(true);
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                accountingModalOpen || bankingModalOpen || borsaModalOpen
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Landmark className="h-4 w-4 shrink-0" />
              <span>Finans</span>
            </button>

            {/* 4) Haberler (Piyasa Haberleri) */}
            <button
              type="button"
              data-testid="dock-news-btn"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setHrModalOpen(false);
                setHoldingModalOpen(false);
                setRivalsModalOpen(false);
                setBorsaModalOpen(false);
                setBankingModalOpen(false);
                setAccountingModalOpen(false);
                setHubMenuOpen(false);
                setActiveDrawer((prev) => (prev === 'market' ? null : 'market'));
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'market'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Newspaper className="h-4 w-4 shrink-0" />
              <span>Haberler</span>
            </button>

            {/* 5) Görevler (Dinamik Görevler) */}
            <button
              type="button"
              data-testid="dock-missions-btn"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setHrModalOpen(false);
                setHoldingModalOpen(false);
                setRivalsModalOpen(false);
                setBorsaModalOpen(false);
                setBankingModalOpen(false);
                setAccountingModalOpen(false);
                setHubMenuOpen(false);
                setActiveDrawer((prev) => (prev === 'missions' ? null : 'missions'));
              }}
              className={`compact-short-btn relative flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'missions'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span>Görevler</span>
              {claimableMissionCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 font-mono-num text-[10px] font-black text-slate-950">
                  {claimableMissionCount}
                </span>
              )}
            </button>

            {/* 6) Menü (Liderlik Tablosu, Holding & Franchise, Patron Sohbeti, Oyun Rehberi, Ayarlar) */}
            <button
              type="button"
              data-testid="dock-menu-btn"
              onClick={() => {
                soundEngine.playClick();
                setActiveDrawer(null);
                setHrModalOpen(false);
                setHoldingModalOpen(false);
                setRivalsModalOpen(false);
                setBorsaModalOpen(false);
                setBankingModalOpen(false);
                setAccountingModalOpen(false);
                setHubMenuOpen(true);
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(9px,1.5vw,15px)] text-[clamp(11px,1.35vw,13px)] font-bold transition-colors whitespace-nowrap ${
                hubMenuOpen
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span>Menü</span>
            </button>
          </nav>

          {/* Controlled Patron Chat Panel (Launched via Menü -> Patron Sohbeti, never collides with 6-button dock) */}
          <PatronChatPanel
            activeProvince={activeProvince}
            messages={chatMessages}
            open={patronChatOpen}
            onOpenChange={setPatronChatOpen}
            hideFloatingButton={true}
            onSendMessage={handleSendChat}
          />

          {/* Active Chain Clone or Franchise Placement Banner above Bottom Dock */}
          {(chainCloneDraft || preselectedFranchise) &&
            !droppedPin &&
            !activeDrawer &&
            !hrModalOpen &&
            !holdingModalOpen &&
            !rivalsModalOpen && (
              <div
                data-testid="map-special-placement-banner"
                className="pointer-events-auto fixed bottom-[calc(var(--panel-bottom-offset)+4px)] left-1/2 z-[520] flex w-[min(92vw,470px)] -translate-x-1/2 items-center justify-between gap-2 rounded-xl border border-amber-400 bg-slate-950/95 px-3 py-2 text-xs text-white shadow-xl"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {chainCloneDraft ? (
                    <Link2 className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <Store className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                  <p className="truncate">
                    {chainCloneDraft ? (
                      <>
                        <strong className="text-amber-300">Zincir Şube:</strong>{' '}
                        {chainCloneDraft.suggestedName} için haritada kara üzerine tıklayın
                      </>
                    ) : (
                      <>
                        <strong className="text-emerald-300">Franchise:</strong>{' '}
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
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                >
                  <X className="h-3 w-3" /> İptal
                </button>
              </div>
            )}

          {/* Contextual Hint when empty — centered cleanly above the 6-button dock */}
          {empire.businesses.length === 0 &&
            !chainCloneDraft &&
            !preselectedFranchise &&
            !droppedPin &&
            !activeDrawer &&
            !selectedCompetitor && (
              <div className="pointer-events-none fixed bottom-[calc(var(--panel-bottom-offset)+4px)] left-1/2 z-[500] w-[min(90vw,430px)] -translate-x-1/2 rounded-xl border border-amber-300/80 bg-white/95 px-3 py-1.5 text-center text-[clamp(10.5px,1.3vw,12px)] text-slate-700 shadow-md dark:border-amber-700/70 dark:bg-slate-900/95 dark:text-slate-200">
                <strong className="text-amber-700 dark:text-amber-400">
                  {activeProvince.code} {activeProvince.name}:
                </strong>{' '}
                Kara üzerinde bir caddeye tıklayıp pin bırakın; ilk işletmeniz Merkez Üssünüz olur.
              </div>
            )}

          {/* Right Contextual Side Panel Container — pinned cleanly between Top HUD & Bottom Dock */}
          {(droppedPin || selectedBusiness || selectedCompetitor) && (
            <div
              data-testid="right-panel-container"
              className="pointer-events-none fixed bottom-[var(--panel-bottom-offset)] right-[var(--hud-right-gap)] top-[var(--panel-top-offset)] z-[650] flex justify-end overflow-hidden"
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
                  onCancelSpecialMode={() => {
                    setChainCloneDraft(null);
                    setPreselectedFranchise(null);
                  }}
                  onEstablish={handleEstablishBusiness}
                  onClose={() => {
                    setDroppedPin(null);
                  }}
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
                  onRestock={handleRestockBusiness}
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

          {/* Unified MobileGameModal for Yönetim (İşletmelerim), Haberler & Görevler */}
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
              onCollectBusiness={handleCollectBusiness}
              onCollectAll={handleCollectAll}
              onUpgradeBusiness={handleUpgradeBusiness}
              onRestockBusiness={handleRestockBusiness}
              onClaimMission={handleClaimMission}
              onEnablePinMode={() => {
                setActiveDrawer(null);
                setPinDropMode(true);
                handleMapClick(activeProvince.lat, activeProvince.lng);
              }}
            />
          )}
        </div>
      )}

      {/* Modals & Drawers */}
      <CityPickerModal
        open={cityPickerOpen}
        activePlate={activePlate}
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

      <GameHubMenuModal
        open={hubMenuOpen}
        companyLevel={companyTier.level}
        companyTitle={companyTier.title}
        netWorth={netWorth}
        activeCityLabel={`${activeProvince.code} ${activeProvince.name}`}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
        onOpenHolding={() => setHoldingModalOpen(true)}
        onOpenPatronChat={() => setPatronChatOpen(true)}
        onOpenGuide={handleReplayTutorial}
        onOpenSettings={() => setSettingsOpen(true)}
        onGoMainMenu={() => setScreen('menu')}
        onClose={() => setHubMenuOpen(false)}
      />

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
        onReplayTutorial={handleReplayTutorial}
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
