import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Clock,
  Coins,
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
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import type {
  BankRecord,
  BusinessTypeId,
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
  calculateTotalPendingCash,
  checkMinDistance75m,
  claimMissionReward,
  collectAllCash,
  collectBusinessCash,
  createInitialEmpireState,
  formatGameClock,
  formatTL,
  getCompanyTier,
  getMissionProgress,
  hireStaff,
  purchaseBusiness,
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
  SEED_FRANCHISE_BRANDS,
  createFranchiseBrand,
  formSupermarketChain,
} from './game/holdingEngine';
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
  fetchCityBusinesses,
  ownedToRemoteRecord,
  publishBusinessToRoom,
  removeBusinessFromRoom,
  subscribeToCityRoom,
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
import { BorsaModal } from './components/BorsaModal';
import { BankingModal } from './components/BankingModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PatronChatPanel } from './components/PatronChatPanel';
import { GameHubMenuModal } from './components/GameHubMenuModal';
import { AccountingModal } from './components/AccountingModal';
import { GameTutorialOverlay } from './components/GameTutorialOverlay';

const SETTINGS_STORAGE_KEY = 'tmi_settings_v1';
const TUTORIAL_STORAGE_KEY = 'tmi_tutorial_done_v122';

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
function migrateSavedEmpire(saved: EmpireState | null, owner: UserProfile): EmpireState {
  if (!saved) return createInitialEmpireState();
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

  const baseMigrated: EmpireState = {
    ...saved,
    businesses: migratedBusinesses,
    cityManagers: Array.isArray(saved.cityManagers) ? saved.cityManagers : [],
    candidatePool:
      Array.isArray(saved.candidatePool) && saved.candidatePool.length > 0
        ? saved.candidatePool
        : generateCandidatePool(Date.now(), 'kafe'),
    supermarketChain: saved.supermarketChain ?? null,
    ownFranchises: Array.isArray(saved.ownFranchises) ? saved.ownFranchises : [],
    franchiseRoyaltiesEarned: saved.franchiseRoyaltiesEarned ?? 0,
    stockPortfolio: Array.isArray(saved.stockPortfolio) ? saved.stockPortfolio : [],
    playerIpo: saved.playerIpo ?? null,
    creditScore: typeof saved.creditScore === 'number' ? saved.creditScore : STARTING_CREDIT_SCORE,
    ownBank: saved.ownBank ?? null,
    activeLoans: Array.isArray(saved.activeLoans) ? saved.activeLoans : [],
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

  const [empire, setEmpire] = useState<EmpireState>(() => {
    const initialUser = autostart ? createOrLoadGuestProfile() : null;
    if (initialUser) {
      return migrateSavedEmpire(loadEmpireStateLocal(initialUser.id), initialUser);
    }
    return createInitialEmpireState();
  });

  // Active 81-province live room state (default: 34 İstanbul)
  const [activePlate, setActivePlate] = useState<number>(DEFAULT_PROVINCE_PLATE);
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
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [borsaModalOpen, setBorsaModalOpen] = useState(false);
  const [bankingModalOpen, setBankingModalOpen] = useState(false);
  const [accountingModalOpen, setAccountingModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
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
      id: 'welcome-v123',
      title: 'Türkiye Mülk İmparatoru v1.2.3',
      body: 'Tüm telefon ve tablet ekranları için evrensel responsive panel düzeni ve kenardan kenara tam ekran modu aktif!',
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
        setUser(profile);
        setEmpire(migrateSavedEmpire(loadEmpireStateLocal(profile.id), profile));
      })
      .catch(() => {});

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = sessionToUserProfile(session);
        setUser(profile);
        setEmpire(migrateSavedEmpire(loadEmpireStateLocal(profile.id), profile));
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

  // Subscribe to Supabase Realtime city room (`public.businesses`) for the currently selected province
  useEffect(() => {
    if (screen !== 'playing') return;
    let active = true;

    setRoomRecords([]);
    setRoomStatus('connecting');

    fetchCityBusinesses(activePlate).then(({ records, connected }) => {
      if (!active) return;
      setRoomRecords(records);
      if (!connected) {
        setRoomStatus('offline');
      }
    });

    const unsubscribe = subscribeToCityRoom(activePlate, {
      onUpsert: (rec) => {
        if (!active) return;
        setRoomRecords((prev) => {
          const exists = prev.some((r) => r.id === rec.id);
          if (exists) {
            return prev.map((r) => (r.id === rec.id ? rec : r));
          }
          return [rec, ...prev];
        });
      },
      onDelete: (id) => {
        if (!active) return;
        setRoomRecords((prev) => prev.filter((r) => r.id !== id));
      },
      onStatus: (status) => {
        if (!active) return;
        setRoomStatus(status);
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [screen, activePlate]);

  // Persist empire state automatically
  useEffect(() => {
    if (!user) return;
    saveEmpireStateLocal(user.id, empire);
  }, [user, empire]);

  // Live Economy Loop (respects Pause / 1x / 2x / 4x gameSpeed & Hourly Auto-Collection)
  useEffect(() => {
    if (screen !== 'playing' || gameSpeed === 0) return;

    const timer = setInterval(() => {
      simNowRef.current += 1000 * gameSpeed;
      const tickNow = simNowRef.current;
      setNow(tickNow);

      setEmpire((prev) => {
        const result = tickEconomy(prev, gameSpeed, tickNow, undefined, stockQuotesRef.current);

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

        if (result.loanEnforcement.seizedLoans.length > 0) {
          for (const seized of result.loanEnforcement.seizedLoans) {
            pushNotification(
              'OTOMATİK HACİZ UYGULANDI!',
              `${seized.business.customName} ödenmeyen kredi nedeniyle ${seized.loan.bankName} mülkiyetine geçti!`,
              'finance',
              true
            );
            // Transfer ownership on Supabase public.businesses & update loan status
            updateBusinessInRoom(seized.business.id, {
              owner_id: seized.loan.lenderOwnerId,
              owner_name: seized.loan.bankName,
            }).catch(() => {});
            publishLoanRecord(seized.loan).catch(() => {});
          }
        }

        return result.state;
      });
    }, 1000);

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
  const totalPendingCash = useMemo(() => calculateTotalPendingCash(empire), [empire]);

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

  // Competitor records in current city room (excluding own businesses)
  const ownIds = useMemo(() => new Set(empire.businesses.map((b) => b.id)), [empire.businesses]);
  const competitorBusinesses = useMemo(
    () => roomRecords.filter((rec) => rec.owner_id !== user?.id && !ownIds.has(rec.id)),
    [roomRecords, user?.id, ownIds]
  );

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

  const handleGuestLogin = () => {
    soundEngine.playClick();
    setAuthError(null);
    const guest = createOrLoadGuestProfile();
    setUser(guest);
    setEmpire(migrateSavedEmpire(loadEmpireStateLocal(guest.id), guest));
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

  const handleEstablishBusiness = (
    blueprintId: BusinessTypeId,
    customName: string,
    franchiseBrand?: FranchiseBrand | null
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
      franchiseBrand
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
    setSelectedBusinessId(created.id);

    const hourly = calculateBusinessHourlyIncome(
      created,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses,
      res.state
    );
    const valuation = calculateBusinessValuation(created, res.state.activeEvent, Date.now());
    publishBusinessToRoom(ownedToRemoteRecord(created, hourly, valuation)).catch(() => {});

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

    pushNotification(
      franchiseBrand ? 'Franchise Şubesi Açıldı!' : 'Yeni İşletme Açıldı!',
      `${created.customName} (${String(created.cityPlate).padStart(2, '0')} ${created.cityName}) canlı haritada yayında.`,
      'milestone',
      true
    );
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

  const handleTakeoverCompetitor = (record: RemoteBusinessRecord) => {
    if (!user) return;
    const res = takeoverCompetitorBusiness(
      empire,
      record,
      { id: user.id, name: user.name },
      Date.now()
    );
    if (!res.ok || !res.business) {
      if (res.error) pushNotification('Devralma Başarısız', res.error, 'system', false);
      return;
    }

    const acquired = res.business;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    setSelectedCompetitorId(null);
    setSelectedBusinessId(acquired.id);

    updateBusinessInRoom(record.id, {
      owner_id: user.id,
      owner_name: user.name,
    }).catch(() => {});

    setRoomRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, owner_id: user.id, owner_name: user.name } : r
      )
    );

    pushNotification(
      'Rakip İşletme Devralındı!',
      `${acquired.customName} artık sizin portföyünüzde.`,
      'milestone',
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
    updateBusinessInRoom(res.business.id, {
      level: res.business.level,
      hourly_income: hourly,
      valuation,
    }).catch(() => {});

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
      `${res.brand.brandName} artık 81 ilde bayilik başvurularına açık.`,
      'milestone',
      true
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

  // --- v1.2.0 Banking & Loans Handlers ---
  const handleTakeLoan = (bankId: string, amount: number, collateralBusinessId: string) => {
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
      Date.now()
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
      `${bank.bankName} üzerinden ${formatTL(amount)} kredi kullanıldı. Teminat: ${biz.customName}`,
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
    removeBusinessFromRoom(businessId).catch(() => {});
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
    const fresh = createInitialEmpireState();
    setEmpire(fresh);
    setGameSpeed(1);
    setDroppedPin(null);
    setSelectedBusinessId(null);
    setSelectedCompetitorId(null);
    setInteriorBusinessId(null);
    setActiveDrawer(null);
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
          onGuestLogin={handleGuestLogin}
          onGoogleLogin={handleGoogleLogin}
          onContinueLoggedIn={() => setScreen('playing')}
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
            flyTarget={flyTarget}
            onMapClick={handleMapClick}
            onSelectOwnBusiness={handleSelectOwnBusiness}
            onSelectCompetitor={handleSelectCompetitor}
          />

          {/* Top Compact Landscape HUD Overlay (Universal Edge-to-Edge for Phones & Tablets) */}
          <header
            aria-label="Oyun Durum Çubuğu"
            data-testid="top-hud"
            className="pointer-events-none fixed inset-x-0 top-0 z-[600] flex items-center justify-between gap-1.5 pl-[var(--hud-left-gap)] pr-[var(--hud-right-gap)] pt-[var(--hud-top-gap)]"
          >
            {/* Left Economy & Quota Cluster */}
            <div
              data-testid="hud-left-cluster"
              className="compact-short-hud pointer-events-auto flex min-w-0 items-center gap-[clamp(6px,1vw,10px)] rounded-2xl border border-slate-200/95 bg-white/95 px-[clamp(7px,1.2vw,12px)] py-1.5 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95"
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-amber-500/50 bg-[#0B1426] sm:h-8 sm:w-8">
                <img
                  src="./icon.png"
                  alt="Türkiye Mülk İmparatoru"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative min-w-0 pr-0.5">
                <div className="max-w-[clamp(86px,13vw,165px)] truncate text-[clamp(9px,1.15vw,10.5px)] font-semibold leading-none text-amber-700 dark:text-amber-400">
                  Sv.{companyTier.level} · {companyTier.title}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
                  <span
                    data-testid="hud-cash"
                    className="font-mono-num text-[clamp(11.5px,1.55vw,15.5px)] font-extrabold leading-none text-slate-900 dark:text-white"
                  >
                    {formatTL(empire.cash)}
                  </span>
                  <span className="font-mono-num text-[9.5px] font-bold leading-none text-emerald-700 dark:text-emerald-400 min-[960px]:hidden">
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

              <div className="hidden h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700 min-[960px]:block" />

              <div className="hidden shrink-0 pr-0.5 min-[960px]:block whitespace-nowrap">
                <div className="text-[clamp(9px,1.15vw,10.5px)] text-slate-500 dark:text-slate-400">
                  Şube {empire.businesses.length}/{companyTier.maxBranches} · Puan{' '}
                  {empire.creditScore}
                </div>
                <div
                  data-testid="hud-income"
                  className="font-mono-num text-[clamp(11px,1.35vw,12px)] font-bold leading-none text-emerald-700 dark:text-emerald-400"
                >
                  +{formatTL(totalIncomePerSec)}/sn
                </div>
              </div>

              {totalPendingCash > 0 && (
                <button
                  type="button"
                  data-testid="hud-collect-btn"
                  onClick={handleCollectAll}
                  className="flex min-h-[32px] shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-[clamp(6px,1vw,10px)] text-[clamp(10px,1.2vw,12px)] font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 whitespace-nowrap"
                >
                  <Coins className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono-num">
                    Topla {formatTL(totalPendingCash, true)}
                  </span>
                </button>
              )}
            </div>

            {/* Center Compact Time & Speed Control Capsule (Durdur / 1x / 2x / 4x) */}
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
                className="flex items-center gap-1 pl-1 pr-0.5 whitespace-nowrap"
              >
                <Clock
                  className={`h-3.5 w-3.5 shrink-0 ${
                    gameSpeed === 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span className="hidden font-mono-num text-[clamp(10.5px,1.25vw,12px)] font-extrabold text-slate-900 dark:text-white min-[760px]:inline">
                  {gameClock.label}
                </span>
                <span className="font-mono-num text-[10.5px] font-extrabold text-slate-900 dark:text-white min-[760px]:hidden">
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
                      className={`flex h-7 min-w-[26px] items-center justify-center rounded-lg px-1.5 font-mono-num text-[10.5px] font-extrabold transition-colors sm:h-8 sm:min-w-[30px] sm:text-[11px] whitespace-nowrap ${
                        active
                          ? item.speed === 0
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs dark:bg-amber-500 dark:text-slate-950'
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
                <span className="max-w-[82px] truncate sm:max-w-[120px]">
                  {activeProvince.name}
                </span>
                <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 lg:inline-flex">
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
                className="hidden h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 min-[740px]:flex whitespace-nowrap"
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:inline">Ana Menü</span>
              </button>
            </div>
          </header>

          {/* Bottom Centered 4-Button Quick Action Dock (Universal Mobile & Tablet Landscape) */}
          <nav
            aria-label="Oyun Araç Çubuğu"
            data-testid="bottom-action-dock"
            className={`compact-short-hud pointer-events-auto fixed bottom-[var(--hud-bottom-gap)] z-[600] flex items-center gap-[clamp(4px,0.9vw,8px)] rounded-2xl border border-slate-200/95 bg-white/95 p-1.5 shadow-xl dark:border-slate-700/90 dark:bg-slate-900/95 ${
              droppedPin || selectedBusiness || selectedCompetitor || activeDrawer
                ? 'left-[var(--hud-left-gap)] lg:left-1/2 lg:-translate-x-1/2'
                : 'left-1/2 -translate-x-1/2'
            }`}
          >
            {/* 1) Pin Bırak (Primary Highlighted Button) */}
            <button
              type="button"
              data-testid="dock-pin-btn"
              onClick={() => {
                soundEngine.playClick();
                setPinDropMode(true);
                setActiveDrawer(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                if (!droppedPin) {
                  handleMapClick(activeProvince.lat, activeProvince.lng);
                }
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(10px,1.8vw,16px)] text-[clamp(11.5px,1.5vw,13px)] font-bold transition-colors whitespace-nowrap ${
                droppedPin || (!activeDrawer && !selectedBusiness && !selectedCompetitor)
                  ? 'bg-amber-600 text-white shadow-sm hover:bg-amber-700'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60'
              }`}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Pin Bırak</span>
            </button>

            {/* 2) Portföy (İşletmelerim & İK) */}
            <button
              type="button"
              data-testid="dock-portfolio-btn"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setActiveDrawer((prev) => (prev === 'portfolio' ? null : 'portfolio'));
              }}
              className={`compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(10px,1.7vw,15px)] text-[clamp(11.5px,1.5vw,13px)] font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'portfolio'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Portföy</span>
              <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {empire.businesses.length}/{companyTier.maxBranches}
              </span>
            </button>

            {/* 3) Finans (Unified Borsa + Banka + Muhasebe) */}
            <button
              type="button"
              data-testid="dock-finance-btn"
              onClick={() => {
                soundEngine.playClick();
                setBorsaModalOpen(true);
              }}
              className="compact-short-btn flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(10px,1.7vw,15px)] text-[clamp(11.5px,1.5vw,13px)] font-bold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Landmark className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Finans</span>
            </button>

            {/* 4) Menü (Holding & Franchise, Muhasebe, Liderlik Tablosu, Görevler, Piyasa Haberleri, Ayarlar) */}
            <button
              type="button"
              data-testid="dock-menu-btn"
              onClick={() => {
                soundEngine.playClick();
                setHubMenuOpen(true);
              }}
              className="compact-short-btn relative flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl px-[clamp(10px,1.7vw,15px)] text-[clamp(11.5px,1.5vw,13px)] font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Menü</span>
              {claimableMissionCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 font-mono-num text-[10px] font-bold text-white">
                  {claimableMissionCount}
                </span>
              )}
            </button>
          </nav>

          {/* Collapsible Patron Chat Panel (Bottom-Right with safe-area padding) */}
          {!droppedPin && !selectedBusiness && !selectedCompetitor && !activeDrawer && (
            <PatronChatPanel
              activeProvince={activeProvince}
              messages={chatMessages}
              onSendMessage={handleSendChat}
            />
          )}

          {/* Contextual Hint when empty — centered cleanly above the 4-button dock */}
          {empire.businesses.length === 0 &&
            !droppedPin &&
            !activeDrawer &&
            !selectedCompetitor && (
              <div className="pointer-events-none fixed bottom-[calc(var(--panel-bottom-offset)+4px)] left-1/2 z-[500] w-[min(90vw,410px)] -translate-x-1/2 rounded-xl border border-amber-300/80 bg-white/95 px-3 py-1.5 text-center text-[clamp(10.5px,1.3vw,12px)] text-slate-700 shadow-md dark:border-amber-700/70 dark:bg-slate-900/95 dark:text-slate-200">
                <strong className="text-amber-700 dark:text-amber-400">
                  {activeProvince.code} {activeProvince.name}:
                </strong>{' '}
                Kara üzerinde bir caddeye tıklayıp pin bırakın (13 sektör, Franchise, 75m koruması).
              </div>
            )}

          {/* Right Contextual Side Panel Container — pinned cleanly between Top HUD & Bottom Dock */}
          {(droppedPin || selectedBusiness || selectedCompetitor || activeDrawer) && (
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
                    setHrTargetBusinessId(id);
                    setHrModalOpen(true);
                  }}
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
                  onTakeover={handleTakeoverCompetitor}
                  onClose={() => setSelectedCompetitorId(null)}
                />
              ) : activeDrawer ? (
                <SideDrawer
                  tab={activeDrawer}
                  state={empire}
                  stockQuotes={stockQuotes}
                  now={now}
                  onClose={() => setActiveDrawer(null)}
                  onSelectBusiness={handleSelectOwnBusiness}
                  onEnterInterior={(id) => setInteriorBusinessId(id)}
                  onOpenHrModal={(id) => {
                    setHrTargetBusinessId(id);
                    setHrModalOpen(true);
                  }}
                  onCollectBusiness={handleCollectBusiness}
                  onClaimMission={handleClaimMission}
                  onEnablePinMode={() => {
                    setActiveDrawer(null);
                    handleMapClick(activeProvince.lat, activeProvince.lng);
                  }}
                />
              ) : null}
            </div>
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
        onHireCandidate={handleHireCandidate}
        onDismissStaff={handleDismissStaff}
        onRefreshPool={handleRefreshCandidatePool}
        onRestockBusiness={handleRestockBusiness}
        onClose={() => setHrModalOpen(false)}
      />

      <HoldingFranchiseModal
        open={holdingModalOpen}
        state={empire}
        allFranchises={allFranchises}
        onFormSupermarketChain={handleFormSupermarketChain}
        onCreateFranchise={handleCreateFranchise}
        onOpenHrCenter={() => {
          setHoldingModalOpen(false);
          setHrTargetBusinessId(selectedBusinessId);
          setHrModalOpen(true);
        }}
        onClose={() => setHoldingModalOpen(false)}
      />

      <BorsaModal
        open={borsaModalOpen}
        state={empire}
        quotes={stockQuotes}
        netWorth={netWorth}
        onBuyStock={handleBuyStock}
        onSellStock={handleSellStock}
        onLaunchIpo={handleLaunchIpo}
        onSwitchToBanking={() => {
          soundEngine.playClick();
          setBorsaModalOpen(false);
          setBankingModalOpen(true);
        }}
        onSwitchToAccounting={() => {
          soundEngine.playClick();
          setBorsaModalOpen(false);
          setAccountingModalOpen(true);
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
        onRepayLoan={handleRepayLoan}
        onCreateBank={handleCreateBank}
        onUpdateBank={handleUpdateBank}
        onSwitchToBorsa={() => {
          soundEngine.playClick();
          setBankingModalOpen(false);
          setBorsaModalOpen(true);
        }}
        onSwitchToAccounting={() => {
          soundEngine.playClick();
          setBankingModalOpen(false);
          setAccountingModalOpen(true);
        }}
        onClose={() => setBankingModalOpen(false)}
      />

      <AccountingModal
        open={accountingModalOpen}
        state={empire}
        quotes={stockQuotes}
        now={now}
        onSwitchToBorsa={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setBorsaModalOpen(true);
        }}
        onSwitchToBanking={() => {
          soundEngine.playClick();
          setAccountingModalOpen(false);
          setBankingModalOpen(true);
        }}
        onClose={() => setAccountingModalOpen(false)}
      />

      <GameHubMenuModal
        open={hubMenuOpen}
        companyLevel={companyTier.level}
        companyTitle={companyTier.title}
        netWorth={netWorth}
        activeCityLabel={`${activeProvince.code} ${activeProvince.name}`}
        claimableMissionCount={claimableMissionCount}
        onOpenHolding={() => setHoldingModalOpen(true)}
        onOpenAccounting={() => setAccountingModalOpen(true)}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
        onOpenMissions={() => {
          setDroppedPin(null);
          setSelectedBusinessId(null);
          setSelectedCompetitorId(null);
          setActiveDrawer('missions');
        }}
        onOpenMarket={() => {
          setDroppedPin(null);
          setSelectedBusinessId(null);
          setSelectedCompetitorId(null);
          setActiveDrawer('market');
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHrCenter={() => {
          setHrTargetBusinessId(selectedBusinessId ?? empire.businesses[0]?.id ?? null);
          setHrModalOpen(true);
        }}
        onGoMainMenu={() => setScreen('menu')}
        onClose={() => setHubMenuOpen(false)}
      />

      <LeaderboardModal
        open={leaderboardModalOpen}
        user={user}
        state={empire}
        netWorth={netWorth}
        activeProvince={activeProvince}
        roomRecords={roomRecords}
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
