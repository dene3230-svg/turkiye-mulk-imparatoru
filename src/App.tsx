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
  ChevronDown,
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import type {
  EmpireState,
  GameSettings,
  MissionDef,
  NotificationItem,
  OtaCheckResult,
  PinLocationInfo,
  ScreenState,
  UserProfile,
} from './types/game';
import { MISSION_CATALOG } from './game/catalog';
import {
  activateMarketingBoost,
  calculateNetWorth,
  calculateTotalIncomePerSec,
  calculateTotalPendingCash,
  claimMissionReward,
  collectAllCash,
  collectBusinessCash,
  createInitialEmpireState,
  formatTL,
  getEmpireRank,
  getMissionProgress,
  hireStaff,
  purchaseBusiness,
  sellBusiness,
  tickEconomy,
  upgradeBusiness,
} from './game/economy';
import { TURKEY_CITIES, resolvePinLocation } from './game/turkeyGeo';
import {
  createOrLoadGuestProfile,
  loadEmpireStateLocal,
  saveEmpireStateLocal,
  sessionToUserProfile,
  signInWithGoogle,
  signOutAccount,
  supabase,
} from './lib/supabase';
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
    theme: 'light', // Default: crisp Light Theme
    notificationsEnabled: true,
    soundEnabled: true,
    mapStyle: 'osm',
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
      const saved = loadEmpireStateLocal(initialUser.id);
      if (saved) return saved;
    }
    return createInitialEmpireState();
  });

  const [now, setNow] = useState<number>(() => Date.now());
  const [droppedPin, setDroppedPin] = useState<PinLocationInfo | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
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
      id: 'welcome-1',
      title: 'Türkiye Mülk İmparatoru Hoş Geldiniz',
      body: 'Haritada istediğiniz noktaya tıklayıp pin bırakarak ilk işletmenizi kurabilirsiniz.',
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
  const prevRankIdRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Sync document.body data-state for reliable automation & accessibility
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Apply Light/Dark theme class to <html> and persist settings
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

  // Request native/web notification permissions on first launch & check OTA updates
  useEffect(() => {
    if (settingsRef.current.notificationsEnabled) {
      requestNotificationPermission().catch(() => {});
    }

    // Check OTA updates silently on startup
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
        const saved = loadEmpireStateLocal(profile.id);
        if (saved) setEmpire(saved);
      })
      .catch(() => {});

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = sessionToUserProfile(session);
        setUser(profile);
        const saved = loadEmpireStateLocal(profile.id);
        if (saved) {
          setEmpire(saved);
        } else {
          setEmpire(createInitialEmpireState());
        }
        setScreen('playing');
      }
    });

    // Native Android deep link listener for com.fugames.turkiyemulkimparatoru://login-callback
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

  // Persist empire state automatically whenever user & empire change
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

  // Watch empire rank promotion
  const netWorth = useMemo(() => calculateNetWorth(empire, now), [empire, now]);
  const empireRank = useMemo(() => getEmpireRank(netWorth), [netWorth]);
  const totalIncomePerSec = useMemo(
    () => calculateTotalIncomePerSec(empire, now),
    [empire, now]
  );
  const totalPendingCash = useMemo(() => calculateTotalPendingCash(empire), [empire]);

  useEffect(() => {
    if (screen !== 'playing') return;
    if (prevRankIdRef.current && prevRankIdRef.current !== empireRank.id) {
      pushNotification(
        'Yeni İmparatorluk Rütbesi!',
        `Tebrikler! "${empireRank.title}" rütbesine yükseldiniz.`,
        'milestone',
        true
      );
      soundEngine.playUpgrade();
    }
    prevRankIdRef.current = empireRank.id;
  }, [empireRank, screen, pushNotification]);

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
    const saved = loadEmpireStateLocal(guest.id);
    if (saved) {
      setEmpire(saved);
    } else {
      setEmpire(createInitialEmpireState());
    }
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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const info = resolvePinLocation(lat, lng);
    setDroppedPin(info);
    setSelectedBusinessId(null);
    setActiveDrawer(null);
    setPinDropMode(true);
    soundEngine.playPinDrop();
  }, []);

  const handleEstablishBusiness = (blueprintId: string, customName: string) => {
    if (!droppedPin) return;
    const res = purchaseBusiness(empire, blueprintId, droppedPin, customName, Date.now());
    if (!res.ok || !res.business) {
      if (res.error) {
        pushNotification('Kurulum Başarısız', res.error, 'system', false);
      }
      return;
    }

    soundEngine.playPurchase();
    setEmpire(res.state);
    setDroppedPin(null);
    setSelectedBusinessId(res.business.id);
    pushNotification(
      'Yeni İşletme Açıldı!',
      `${res.business.customName} (${res.business.cityName} · ${res.business.districtName}) hizmete başladı.`,
      'milestone',
      true
    );
  };

  const handleSelectBusiness = useCallback(
    (businessId: string) => {
      const target = empire.businesses.find((b) => b.id === businessId);
      setSelectedBusinessId(businessId);
      setDroppedPin(null);
      setActiveDrawer(null);
      soundEngine.playClick();
      if (target) {
        setFlyTarget({ lat: target.lat, lng: target.lng, zoom: 14, nonce: Date.now() });
      }
    },
    [empire.businesses]
  );

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
    spawnCashPopup(res.collectedAmount);
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

  const handleCityJump = (cityId: string) => {
    const city = TURKEY_CITIES.find((c) => c.id === cityId);
    if (!city) return;
    soundEngine.playClick();
    setFlyTarget({ lat: city.lat, lng: city.lng, zoom: city.zoom, nonce: Date.now() });
  };

  const selectedBusiness = useMemo(
    () => empire.businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [empire.businesses, selectedBusinessId]
  );

  // Check saved guest count for main menu metadata
  const menuSavedCount = useMemo(() => {
    if (empire.businesses.length > 0) return empire.businesses.length;
    const guest = createOrLoadGuestProfile();
    return loadEmpireStateLocal(guest.id)?.businesses.length ?? 0;
  }, [empire.businesses.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#0B1221] dark:text-slate-100">
      {/* Landscape-Only Guard (shown whenever device is held vertically) */}
      <OrientationGuard />

      {/* 1. Studio Intro */}
      {screen === 'intro' && <StudioIntro onComplete={() => setScreen('menu')} />}

      {/* 2. Main Menu */}
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

      {/* 3. Active Tycoon Map Gameplay Shell */}
      {screen === 'playing' && (
        <div className="relative h-full w-full overflow-hidden">
          {/* Full-bleed Interactive Turkey Map */}
          <TurkeyMap
            theme={settings.theme}
            mapStyle={settings.mapStyle}
            businesses={empire.businesses}
            selectedBusinessId={selectedBusinessId}
            droppedPin={droppedPin}
            pinDropMode={pinDropMode}
            flyTarget={flyTarget}
            onMapClick={handleMapClick}
            onSelectBusiness={handleSelectBusiness}
          />

          {/* Top Compact Landscape HUD Overlay */}
          <header
            aria-label="Oyun Durum Çubuğu"
            className="pointer-events-none fixed inset-x-0 top-0 z-[600] flex items-center justify-between gap-2 px-[max(10px,var(--safe-left))] pr-[max(10px,var(--safe-right))] pt-[max(8px,var(--safe-top))]"
          >
            {/* Left Economy Cluster */}
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
                  {empireRank.title}
                </div>
                <div
                  data-testid="hud-cash"
                  className="mt-0.5 font-mono-num text-[clamp(0.88rem,1.45vw,1.1rem)] font-extrabold leading-none text-slate-900 dark:text-white"
                >
                  {formatTL(empire.cash)}
                </div>

                {/* Floating +₺ animation */}
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
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Pasif Gelir</div>
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

            {/* Right Utility Cluster */}
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-200/95 bg-white/95 p-1.5 shadow-lg dark:border-slate-700/90 dark:bg-slate-900/95">
              {/* City Quick-Jump Selector */}
              <div className="relative flex items-center">
                <select
                  aria-label="Şehre Git"
                  defaultValue="istanbul"
                  onChange={(e) => handleCityJump(e.target.value)}
                  className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-2.5 pr-7 text-xs font-semibold text-slate-800 outline-none hover:bg-slate-100 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {TURKEY_CITIES.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-500" />
              </div>

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

          {/* Bottom-Left Compact Dock (Thumb-Friendly Landscape Navigation) */}
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
                if (!droppedPin) {
                  // Offer immediate pin at Istanbul center if player taps Pin button directly
                  handleMapClick(41.022, 29.005);
                }
              }}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                droppedPin || (!activeDrawer && !selectedBusiness)
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
                setActiveDrawer((prev) => (prev === 'portfolio' ? null : 'portfolio'));
              }}
              className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                activeDrawer === 'portfolio'
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Portföy ({empire.businesses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setDroppedPin(null);
                setSelectedBusinessId(null);
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

          {/* Subtle contextual helper when map is clean and player has 0 businesses */}
          {empire.businesses.length === 0 && !droppedPin && !activeDrawer && (
            <div className="pointer-events-none fixed bottom-[max(62px,calc(58px+var(--safe-bottom)))] left-[max(10px,var(--safe-left))] z-[500] max-w-xs rounded-xl border border-amber-300/80 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md dark:border-amber-700/70 dark:bg-slate-900/95 dark:text-slate-200">
              <strong className="text-amber-700 dark:text-amber-400">İpucu:</strong> Haritada
              istediğiniz caddeye veya şehre tıklayarak pin bırakın ve ilk işletmenizi kurun.
            </div>
          )}

          {/* Right Contextual Side Panel Container (never pushes or shrinks the map) */}
          {(droppedPin || selectedBusiness || activeDrawer) && (
            <div className="pointer-events-none fixed bottom-[max(10px,var(--safe-bottom))] right-[max(10px,var(--safe-right))] top-[calc(66px+var(--safe-top))] z-[650] flex justify-end">
              {droppedPin ? (
                <PinDropPanel
                  location={droppedPin}
                  cash={empire.cash}
                  onEstablish={handleEstablishBusiness}
                  onClose={() => setDroppedPin(null)}
                />
              ) : selectedBusiness ? (
                <BusinessInspector
                  business={selectedBusiness}
                  cash={empire.cash}
                  activeEvent={empire.activeEvent}
                  now={now}
                  onCollect={handleCollectBusiness}
                  onUpgrade={handleUpgradeBusiness}
                  onHireStaff={handleHireStaff}
                  onBoost={handleBoostBusiness}
                  onSell={handleSellBusiness}
                  onClose={() => setSelectedBusinessId(null)}
                />
              ) : activeDrawer ? (
                <SideDrawer
                  tab={activeDrawer}
                  state={empire}
                  now={now}
                  onClose={() => setActiveDrawer(null)}
                  onSelectBusiness={handleSelectBusiness}
                  onCollectBusiness={handleCollectBusiness}
                  onClaimMission={handleClaimMission}
                  onEnablePinMode={() => {
                    setActiveDrawer(null);
                    handleMapClick(41.022, 29.005);
                  }}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Global Overlays: Notification Center, Toasts, Settings, OTA Update Modal */}
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
