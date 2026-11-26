import { useEffect, useState, type FormEvent } from 'react';
import {
  Sun,
  Moon,
  Settings,
  RefreshCw,
  LogIn,
  UserPlus,
  LogOut,
  Play,
  MapPin,
  Building2,
  Bell,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';
import type { ThemeMode, UserProfile } from '../types/game';
import { TURKEY_PROVINCES } from '../game/provinces81';
import { APP_VERSION } from '../services/otaUpdate';
import { validateLoginInput, validateRegistrationInput } from '../lib/playerAuth';

interface MainMenuProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  onClearAuthError: () => void;
  startingCityPlate: number;
  onSelectStartingCity: (plate: number) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string, displayName: string) => Promise<void>;
  onContinueLoggedIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onCheckUpdate: () => void;
  checkingUpdate: boolean;
  savedBusinessCount: number;
}

type AuthTab = 'login' | 'register';

export function MainMenu({
  theme,
  onToggleTheme,
  user,
  authLoading,
  authError,
  onClearAuthError,
  startingCityPlate,
  onSelectStartingCity,
  onLogin,
  onRegister,
  onContinueLoggedIn,
  onSignOut,
  onOpenSettings,
  onCheckUpdate,
  checkingUpdate,
  savedBusinessCount,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && user) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT' || activeTag === 'SELECT') return;
        e.preventDefault();
        onContinueLoggedIn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, onContinueLoggedIn]);

  const handleSwitchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setLocalError(null);
    onClearAuthError();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    setLocalError(null);
    onClearAuthError();

    if (activeTab === 'login') {
      const check = validateLoginInput({ username, password });
      if (!check.ok) {
        setLocalError(check.error ?? 'Lütfen kullanıcı adı ve şifrenizi kontrol edin.');
        return;
      }
      await onLogin(check.username, password);
    } else {
      const check = validateRegistrationInput({ username, password, displayName });
      if (!check.ok) {
        setLocalError(check.error ?? 'Lütfen tüm zorunlu alanları eksiksiz doldurun.');
        return;
      }
      await onRegister(check.username, password, check.displayName);
    }
  };

  const displayedError = localError || authError;

  return (
    <main
      data-testid="main-menu"
      className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#0B1221] dark:text-slate-100 safe-inset"
    >
      {/* Subtle architectural topographic grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 24%, rgba(217,119,6,0.14), transparent 44%), radial-gradient(circle at 82% 76%, rgba(15,23,42,0.12), transparent 48%)',
        }}
      />

      {/* Compact Top Utility Strip */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-[clamp(14px,3vw,36px)] pt-[clamp(8px,1.5vh,18px)] pb-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-amber-700 dark:text-amber-400">fu Games</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">v{APP_VERSION}</span>
          {user && savedBusinessCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{savedBusinessCount} kayıtlı işletme</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Karanlık Temaya Geç' : 'Açık Temaya Geç'}
            className="flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4 text-slate-600" />
                <span>Karanlık Tema</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Açık Tema</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCheckUpdate}
            disabled={checkingUpdate}
            aria-label="Güncellemeleri Denetle"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Güncellemeleri Denetle"
          >
            <RefreshCw className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ayarlar"
            className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Ayarlar"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Landscape 2-Column Content */}
      <div className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-6xl items-center justify-center gap-[clamp(16px,3.5vw,52px)] px-[clamp(14px,3vw,42px)] py-[clamp(6px,1.5vh,18px)]">
        {/* Left Column: Framed Logo Showcase & Title */}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex items-center gap-[clamp(12px,2vw,24px)]">
            <div className="shrink-0 rounded-[22px] p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_14px_34px_rgba(180,83,9,0.22)] dark:shadow-[0_14px_38px_rgba(217,119,6,0.24)]">
              <div className="h-[clamp(68px,16vh,118px)] w-[clamp(68px,16vh,118px)] overflow-hidden rounded-[18px] bg-[#0B1426]">
                <img
                  src="./icon.png"
                  alt="Türkiye Mülk İmparatoru Logosu"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.25rem,2.9vw,2.55rem)] font-bold leading-tight tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
                Türkiye Mülk İmparatoru
              </h1>
              <p className="mt-1 max-w-md text-[clamp(0.74rem,1.2vw,0.92rem)] leading-snug text-slate-600 dark:text-slate-300">
                Türkiye haritasında dilediğiniz noktaya pin bırakın, stratejik işletmeler kurun ve
                gerçek oyuncularla emlak imparatorluğunuzu büyütün.
              </p>
            </div>
          </div>

          {/* 3 Concise Gameplay Pillars */}
          <div className="mt-[clamp(12px,2.5vh,24px)] grid w-full max-w-lg grid-cols-3 gap-3 border-t border-slate-200/90 pt-[clamp(8px,1.8vh,16px)] dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Serbest Pin</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                81 ilde dilediğiniz noktaya işletme kurun.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>14 Sektör</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Kafeden holding gökdelenine tam ekonomi.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Bell className="h-3.5 w-3.5 shrink-0" />
                <span>Canlı Dünya</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Gerçek patron hesapları ve canlı harita.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Real Account Auth / Active Patron Panel */}
        <section
          aria-label="Hesap Girişi ve Kayıt"
          className="max-h-full w-[clamp(320px,44vw,430px)] shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-[clamp(12px,2vh,20px)] shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30"
        >
          {user ? (
            <div data-testid="logged-in-panel" className="flex flex-col gap-3">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-base font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    data-testid="menu-patron-name"
                    className="truncate text-sm font-bold text-slate-900 dark:text-white"
                  >
                    {user.name}
                  </p>
                  <p
                    data-testid="menu-patron-username"
                    className="truncate text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    @{user.username} · Kayıtlı Patron Hesabı
                  </p>
                </div>
              </div>

              {savedBusinessCount === 0 && (
                <div>
                  <label
                    htmlFor="hq-city-select-logged"
                    className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                  >
                    Merkez Şehir (Başlangıç İli)
                  </label>
                  <select
                    id="hq-city-select-logged"
                    data-testid="starting-city-select"
                    value={startingCityPlate}
                    onChange={(e) => onSelectStartingCity(Number(e.target.value))}
                    className="mt-1 min-h-[38px] w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {TURKEY_PROVINCES.map((prov) => (
                      <option key={prov.plate} value={prov.plate}>
                        {prov.code} {prov.name} ({prov.region})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                data-start="true"
                data-testid="continue-game-btn"
                onClick={onContinueLoggedIn}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 active:scale-[0.99] whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>OYUNA DEVAM ET</span>
              </button>

              <button
                type="button"
                data-testid="menu-signout-btn"
                onClick={onSignOut}
                className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Hesaptan Çıkış Yap</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
              {/* Segmented Tabs: Giriş Yap / Yeni Hesap Oluştur */}
              <div
                role="tablist"
                aria-label="Hesap Sekmeleri"
                className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  data-testid="auth-tab-login"
                  onClick={() => handleSwitchTab('login')}
                  className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-amber-500 dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0" />
                  <span>Giriş Yap</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  data-testid="auth-tab-register"
                  onClick={() => handleSwitchTab('register')}
                  className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-amber-500 dark:text-slate-950'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 shrink-0" />
                  <span>Yeni Hesap Oluştur</span>
                </button>
              </div>

              {activeTab === 'login' ? (
                <>
                  <div>
                    <label
                      htmlFor="auth-username"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Kullanıcı Adı <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-0.5">
                      <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-username"
                        data-testid="login-username-input"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase());
                          if (localError) setLocalError(null);
                          if (authError) onClearAuthError();
                        }}
                        placeholder="orn: patron34"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={24}
                        className="min-h-[38px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Şifre <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-0.5">
                      <input
                        id="auth-password"
                        data-testid="login-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError(null);
                          if (authError) onClearAuthError();
                        }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        maxLength={64}
                        className="min-h-[38px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-3 pr-9 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="auth-username"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Kullanıcı Adı <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-0.5">
                      <User className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-username"
                        data-testid="register-username-input"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase());
                          if (localError) setLocalError(null);
                          if (authError) onClearAuthError();
                        }}
                        placeholder="patron34"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={24}
                        className="min-h-[36px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-7 pr-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Şifre <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-0.5">
                      <input
                        id="auth-password"
                        data-testid="register-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError(null);
                          if (authError) onClearAuthError();
                        }}
                        placeholder="En az 4 krk."
                        autoComplete="new-password"
                        maxLength={64}
                        className="min-h-[36px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-2.5 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-displayname"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Patron / Görünen Ad <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="auth-displayname"
                      data-testid="register-displayname-input"
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (localError) setLocalError(null);
                        if (authError) onClearAuthError();
                      }}
                      placeholder="Kemal Holding"
                      maxLength={32}
                      className="mt-0.5 min-h-[36px] w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hq-city-select"
                      className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      Merkez Şehir
                    </label>
                    <select
                      id="hq-city-select"
                      data-testid="starting-city-select"
                      value={startingCityPlate}
                      onChange={(e) => onSelectStartingCity(Number(e.target.value))}
                      className="mt-0.5 min-h-[36px] w-full rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {TURKEY_PROVINCES.map((prov) => (
                        <option key={prov.plate} value={prov.plate}>
                          {prov.code} {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Validation / Auth Error Message */}
              {displayedError && (
                <div
                  role="alert"
                  data-testid="auth-error-alert"
                  className="flex items-start gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{displayedError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                data-start="true"
                data-testid={activeTab === 'login' ? 'login-submit-btn' : 'register-submit-btn'}
                className="mt-0.5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-amber-700 active:scale-[0.99] disabled:opacity-60 whitespace-nowrap"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>{activeTab === 'login' ? 'GİRİŞ YAPILIYOR...' : 'HESAP OLUŞTURULUYOR...'}</span>
                  </>
                ) : activeTab === 'login' ? (
                  <>
                    <LogIn className="h-4 w-4 shrink-0" />
                    <span>GİRİŞ YAP</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span>HESAP OLUŞTUR VE BAŞLA</span>
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </div>

      {/* Subtle Bottom Hint Line */}
      <footer className="relative z-10 flex shrink-0 items-center justify-center px-4 pb-[clamp(6px,1.2vh,12px)] text-[11px] text-slate-400 dark:text-slate-500">
        <span>Yatay Ekran · Haritada Pin Bırak · İşletmeni Kur · İmparatorluğunu Yönet</span>
      </footer>
    </main>
  );
}
