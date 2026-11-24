import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Coins,
  Home,
  MapPin,
  Settings,
  TrendingUp,
  Trophy,
  Sun,
  Moon,
  Globe2,
  Radio,
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import type {
  BusinessTypeId,
  EmpireState,
  GameSettings,
  MissionDef,
  NotificationItem,
  OtaCheckResult,
  PinLocationInfo,
  ProvinceInfo,
  RemoteBusinessRecord,
  ScreenState,
  UserProfile,
} from './types/game';
import { MISSION_CATALOG, isValidBusinessType } from './game/catalog';
import {
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

const SETTINGS_STORAGE_KEY = 'tmi_settings_v1';

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

// Clean migration for v1.0.0 saved games so players never lose progress on v1.1.0 update
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
    };
  });
  return {
    ...saved,
    businesses: migratedBusinesses,
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

  const [now, setNow] = useState<number>(() => Date.now());
  const [droppedPin, setDroppedPin] = useState<PinLocationInfo | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [interiorBusinessId, setInteriorBusinessId] = useState<string | null>(null);
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
      id: 'welcome-v110',
      title: 'Türkiye Mülk İmparatoru v1.1.0',
      body: '81 il canlı odalarla açıldı! 34 İstanbul odasındasınız — kara üzerinde bir noktaya pin bırakıp işletmenizi kurun.',
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
  const landCheckAbortRef = useRef<AbortController | null>(null);

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

  // Live 1Hz Economy Loop while playing
  useEffect(() => {
    if (screen !== 'playing') return;

    const timer = setInterval(() => {
      const tickNow = Date.now();
      setNow(tickNow);

      setEmpire((prev) => {
        const result = tickEconomy(prev, 1, tickNow);

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

        return result.state;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, pushNotification]);

  // Derived empire metrics
  const netWorth = useMemo(() => calculateNetWorth(empire, now), [empire, now]);
  const companyTier = useMemo(() => getCompanyTier(netWorth), [netWorth]);
  const totalIncomePerSec = useMemo(
    () => calculateTotalIncomePerSec(empire, now),
    [empire, now]
  );
  const totalPendingCash = useMemo(() => calculateTotalPendingCash(empire), [empire]);

  // Competitor records in current city room (excluding own businesses)
  const ownIds = useMemo(() => new Set(empire.businesses.map((b) => b.id)), [empire.businesses]);
  const competitorBusinesses = useMemo(
    () =>
      roomRecords.filter(
        (rec) => rec.owner_id !== user?.id && !ownIds.has(rec.id)
      ),
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

  const claimableMissionCount = useMemo(() => {
    return MISSION_CATALOG.filter(
      (m) =>
        !empire.claimedMissionIds.includes(m.id) &&
        getMissionProgress(empire, m, now) >= m.targetValue
    ).length;
  }, [empire, now]);

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

  const handleEstablishBusiness = (blueprintId: BusinessTypeId, customName: string) => {
    if (!droppedPin || !user) return;
    const res = purchaseBusiness(
      empire,
      blueprintId,
      droppedPin,
      customName,
      { id: user.id, name: user.name },
      competitorBusinesses.map((r) => ({ lat: r.lat, lng: r.lng, name: r.business_name })),
      Date.now()
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

    // Sync to Supabase public.businesses live city room
    const hourly = calculateBusinessHourlyIncome(
      created,
      res.state.activeEvent,
      Date.now(),
      res.state.businesses
    );
    const valuation = calculateBusinessValuation(created, res.state.activeEvent, Date.now());
    publishBusinessToRoom(ownedToRemoteRecord(created, hourly, valuation)).catch(() => {});

    pushNotification(
      'Yeni İşletme Açıldı!',
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
      if (res.error) {
        pushNotification('Devralma Başarısız', res.error, 'system', false);
      }
      return;
    }

    const acquired = res.business;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    setSelectedCompetitorId(null);
    setSelectedBusinessId(acquired.id);

    // Update ownership in Supabase live room
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
      res.state.businesses
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

  const handleHireStaff = (businessId: string) => {
    const res = hireStaff(empire, businessId, Date.now());
    if (!res.ok) return;
    soundEngine.playPurchase();
    setEmpire(res.state);
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
    if (!res.ok || !res.collectedAmount) return;
    soundEngine.playCashCollect();
    setEmpire(res.state);
    setSelectedBusinessId(null);
    if (interiorBusinessId === businessId) setInteriorBusinessId(null);
    spawnCashPopup(res.collectedAmount);
    removeBusinessFromRoom(businessId).catch(() => {});
  };

  const handleClaimMission = (mission: MissionDef) => {
    const res = claimMissionReward(empire, mission, Date.now());
    if (!res.ok || !res.collectedAmount) return;
    soundEngine.playUpgrade();
    setEmpire(res.state);
    spawnCashPopup(res.collectedAmount);
    pushNotification(
      'Görev Ödülü Alındı!',
      `"${mission.title}" görevi tamamlandı: +${formatTL(res.collectedAmount)}`,
      'milestone',
      true
    );
  };

  const handleResetGame = () => {
    const fresh = createInitialEmpireState();
    setEmpire(fresh);
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
      'Yeni bir başlangıç yapıldı. ₺250.000 başlangıç sermayesi hesabınızda.',
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

          {/* Top Compact Landscape HUD Overlay */}
          <header
            aria-label="Oyun Durum Çubuğu"
            className="pointer-events-none fixed inset-x-0 top-0 z-[600] flex items-center justify-between gap-2 px-[max(10px,var(--safe-left))] pr-[max(10px,var(--safe-right))] pt-[max(8px,var(--safe-top))]"
          >
            {/* Left Economy & Quota Cluster */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-slate-200/95 bg-white/95 px-2.5 py-1.5 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-amber-500/50 bg-[#0B1426]">
                <img
                  src="./icon.png"
                  alt="Türkiye Mülk İmparatoru"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative pr-1">
                <div className="text-[10px] font-semibold leading-none text-amber-700 dark:text-amber-400">
                  Sv.{companyTier.level} · {companyTier.title}
                </div>
                <div
                  data-testid="hud-cash"
                  className="mt-0.5 font-mono-num text-[clamp(0.86rem,1.4vw,1.08rem)] font-extrabold leading-none text-slate-900 dark:text-white"
                >
                  {formatTL(empire.cash)}
                </div>

                {cashPopups.map((p) => (
                  <span
                    key={p.id}
                    className="animate-float-cash pointer-events-none absolute -bottom-5 left-0 font-mono-num text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
                  >
                    +{formatTL(p.amount)}
                  </span>
                ))}
              </div>

              <div className="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

              <div className="hidden pr-1 sm:block">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Şube {empire.businesses.length}/{companyTier.maxBranches}
                </div>
                <div
                  data-testid="hud-income"
                  className="font-mono-num text-xs font-bold leading-none text-emerald-700 dark:text-emerald-400"
                >
                  +{formatTL(totalIncomePerSec)}/sn
                </div>
              </div>

              {totalPendingCash > 0 && (
                <button
                  type="button"
                  onClick={handleCollectAll}
                  className="flex min-h-[34px] items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 whitespace-nowrap"
                >
                  <Coins className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono-num">Topla {formatTL(totalPendingCash, true)}</span>
                </button>
              )}
            </div>

            {/* Right City Room Switcher & Utility Cluster */}
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-200/95 bg-white/95 p-1.5 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95">
              {/* 81-Province Live Room Switcher Button */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCityPickerOpen(true);
                }}
                aria-label="Şehir Seç veya Değiştir"
                data-testid="city-switcher-btn"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50/90 px-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50 whitespace-nowrap"
              >
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="font-mono-num">{activeProvince.code}</span>
                <span>{activeProvince.name}</span>
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
                className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Ana Menü</span>
              </button>
            </div>
          </header>

          {/* Bottom-Left Compact Dock */}
          <nav
            aria-label="Oyun Araç Çubuğu"
            className="pointer-events-auto fixed bottom-[max(10px,var(--safe-bottom))] left-[max(10px,var(--safe-left))] z-[600] flex items-center gap-1.5 rounded-2xl border border-slate-200/95 bg-white/95 p-1.5 shadow-xl dark:border-slate-700/90 dark:bg-slate-900/95"
          >
            <button
              type="button"
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
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                droppedPin || (!activeDrawer && !selectedBusiness && !selectedCompetitor)
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Pin Bırak</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setActiveDrawer((prev) => (prev === 'portfolio' ? null : 'portfolio'));
              }}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'portfolio'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>
                Portföy ({empire.businesses.length}/{companyTier.maxBranches})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setActiveDrawer((prev) => (prev === 'missions' ? null : 'missions'));
              }}
              className={`relative flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'missions'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span>Görevler</span>
              {claimableMissionCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 font-mono-num text-[10px] font-bold text-white">
                  {claimableMissionCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
                setSelectedCompetitorId(null);
                setActiveDrawer((prev) => (prev === 'market' ? null : 'market'));
              }}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'market'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Piyasa</span>
            </button>
          </nav>

          {/* Contextual Hint when empty */}
          {empire.businesses.length === 0 &&
            !droppedPin &&
            !activeDrawer &&
            !selectedCompetitor && (
              <div className="pointer-events-none fixed bottom-[max(62px,calc(58px+var(--safe-bottom)))] left-[max(10px,var(--safe-left))] z-[500] max-w-xs rounded-xl border border-amber-300/80 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md dark:border-amber-700/70 dark:bg-slate-900/95 dark:text-slate-200">
                <strong className="text-amber-700 dark:text-amber-400">
                  {activeProvince.code} {activeProvince.name}:
                </strong>{' '}
                Kara üzerinde bir caddeye tıklayıp pin bırakın (deniz/göl yasaktır, 75m mesafe
                korumalı).
              </div>
            )}

          {/* Right Contextual Side Panel Container */}
          {(droppedPin || selectedBusiness || selectedCompetitor || activeDrawer) && (
            <div className="pointer-events-none fixed bottom-[max(10px,var(--safe-bottom))] right-[max(10px,var(--safe-right))] top-[calc(66px+var(--safe-top))] z-[650] flex justify-end">
              {droppedPin ? (
                <PinDropPanel
                  location={droppedPin}
                  cash={empire.cash}
                  companyLevel={companyTier.level}
                  ownBranchCount={empire.businesses.length}
                  maxBranches={companyTier.maxBranches}
                  distanceCheck={droppedPinDistanceCheck}
                  onEstablish={handleEstablishBusiness}
                  onClose={() => setDroppedPin(null)}
                />
              ) : selectedBusiness ? (
                <BusinessInspector
                  business={selectedBusiness}
                  allOwnBusinesses={empire.businesses}
                  cash={empire.cash}
                  activeEvent={empire.activeEvent}
                  now={now}
                  onEnterInterior={(id) => setInteriorBusinessId(id)}
                  onCollect={handleCollectBusiness}
                  onUpgrade={handleUpgradeBusiness}
                  onHireStaff={handleHireStaff}
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
                  now={now}
                  onClose={() => setActiveDrawer(null)}
                  onSelectBusiness={handleSelectOwnBusiness}
                  onEnterInterior={(id) => setInteriorBusinessId(id)}
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
        onHireStaff={handleHireStaff}
        onBoost={handleBoostBusiness}
        onClose={() => setInteriorBusinessId(null)}
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
        onResetGame={handleResetGame}
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
