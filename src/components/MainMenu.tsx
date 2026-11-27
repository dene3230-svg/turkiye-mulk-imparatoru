import { useEffect, useState, type FormEvent } from 'react';
import {
  Crown,
  Settings,
  RefreshCw,
  LogIn,
  UserPlus,
  LogOut,
  Play,
  MapPin,
  Building2,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  User,
  Briefcase,
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
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#181F29] text-slate-100 safe-inset"
    >
      {/* Matte Top Utility Strip */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-[#334155]/70 px-[clamp(14px,3vw,32px)] py-2.5">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#C8AE7D]/60 bg-[#222B38]">
            <Crown className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
          </div>
          <span className="font-semibold tracking-[0.08em] text-slate-100">MÜLK İMPARATORLUĞU</span>
          <span aria-hidden="true" className="text-[#334155]">•</span>
          <span className="font-mono-num text-[#7E96B0]">v{APP_VERSION}</span>
          {user && savedBusinessCount > 0 && (
            <>
              <span aria-hidden="true" className="hidden sm:inline text-[#334155]">•</span>
              <span className="hidden sm:inline text-[#7A9E7E]">{savedBusinessCount} aktif şube</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCheckUpdate}
            disabled={checkingUpdate}
            aria-label="Güncellemeleri Denetle"
            className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#334155] bg-[#222B38] px-3 text-xs font-medium text-slate-200 hover:bg-[#2A3444] disabled:opacity-60"
            title="Güncellemeleri Denetle"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#7E96B0] ${checkingUpdate ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
            <span className="hidden sm:inline">Güncelleme</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ayarlar"
            className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#334155] bg-[#222B38] px-3 text-xs font-medium text-slate-200 hover:bg-[#2A3444]"
            title="Ayarlar"
          >
            <Settings className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
            <span className="hidden sm:inline">Ayarlar</span>
          </button>
        </div>
      </header>

      {/* Main Landscape 2-Column Content */}
      <div className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-6xl items-center justify-center gap-[clamp(16px,3.5vw,48px)] px-[clamp(14px,3vw,36px)] py-[clamp(8px,1.5vh,18px)]">
        {/* Left Column: Minimal Crown Emblem & Brand Pillars */}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex items-center gap-[clamp(14px,2vw,22px)]">
            <div className="flex h-[clamp(64px,13vh,92px)] w-[clamp(64px,13vh,92px)] shrink-0 items-center justify-center rounded-[20px] border border-[#C8AE7D]/55 bg-[#222B38]">
              <Crown className="h-[clamp(30px,6vh,44px)] w-[clamp(30px,6vh,44px)] text-[#C8AE7D]" strokeWidth={1.5} />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E96B0]">
                Holding Yönetim Simülasyonu
              </p>
              <h1 className="mt-1 text-[clamp(1.3rem,2.8vw,2.35rem)] font-bold leading-tight tracking-[0.04em] text-slate-100">
                MÜLK İMPARATORLUĞU
              </h1>
              <p className="mt-1.5 max-w-md text-[clamp(0.75rem,1.15vw,0.88rem)] leading-relaxed text-slate-400">
                Türkiye haritasında stratejik noktalara şubeler kurun, nakit akışını yönetin ve
                gerçek oyuncularla holdinginizi büyütün.
              </p>
            </div>
          </div>

          {/* 3 Matte Pillar Cards */}
          <div className="mt-[clamp(12px,2.4vh,24px)] grid w-full max-w-lg grid-cols-3 gap-2.5">
            <div className="rounded-[20px] border border-[#334155] bg-[#222B38] p-3">
              <MapPin className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
              <p className="mt-2 text-xs font-semibold text-slate-100">81 İl Harita</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                Dilediğiniz noktada şube ve mülk yatırımı.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#334155] bg-[#222B38] p-3">
              <Building2 className="h-4 w-4 text-[#7A9E7E]" strokeWidth={1.5} />
              <p className="mt-2 text-xs font-semibold text-slate-100">14 Sektör</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                Kafeden borsaya ve holding kulesine tam akış.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#334155] bg-[#222B38] p-3">
              <Globe className="h-4 w-4 text-[#7E96B0]" strokeWidth={1.5} />
              <p className="mt-2 text-xs font-semibold text-slate-100">Canlı Rekabet</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                Gerçek patron hesapları ve canlı piyasa.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Matte Save Slot / Account Card */}
        <section
          aria-label="Hesap Girişi ve Kayıt"
          className="max-h-full w-[clamp(320px,44vw,430px)] shrink-0 overflow-y-auto rounded-[20px] border border-[#334155] bg-[#222B38] p-[clamp(14px,2.2vh,22px)]"
        >
          {user ? (
            <div data-testid="logged-in-panel" className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-[16px] border border-[#334155] bg-[#181F29] p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C8AE7D]/50 bg-[#222B38] text-base font-bold text-[#C8AE7D]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    data-testid="menu-patron-name"
                    className="truncate text-sm font-bold text-slate-100"
                  >
                    {user.name}
                  </p>
                  <p
                    data-testid="menu-patron-username"
                    className="truncate text-xs text-slate-400"
                  >
                    @{user.username} · Kayıtlı Holding Slotu
                  </p>
                </div>
                <span className="rounded-full border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2.5 py-1 text-[10px] font-semibold text-[#7A9E7E]">
                  {savedBusinessCount > 0 ? `${savedBusinessCount} Şube` : 'Hazır'}
                </span>
              </div>

              {savedBusinessCount === 0 && (
                <div>
                  <label
                    htmlFor="hq-city-select-logged"
                    className="block text-[11px] font-semibold text-slate-300"
                  >
                    Merkez Şehir (Başlangıç İli)
                  </label>
                  <select
                    id="hq-city-select-logged"
                    data-testid="starting-city-select"
                    value={startingCityPlate}
                    onChange={(e) => onSelectStartingCity(Number(e.target.value))}
                    className="mt-1 min-h-[38px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] px-3 text-xs font-medium text-slate-100 focus:border-[#C8AE7D] focus:outline-none"
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
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 py-2.5 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E] whitespace-nowrap"
              >
                <Play className="h-4 w-4" strokeWidth={1.75} />
                <span>Devam Et</span>
              </button>

              <button
                type="button"
                data-testid="menu-signout-btn"
                onClick={onSignOut}
                className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#334155] bg-[#181F29] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-[#2A3444] whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5 text-[#B86B5E]" strokeWidth={1.5} />
                <span>Yeni Holding Kur / Hesap Değiştir</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2.5">
              {/* Segmented Matte Tabs: Giriş Yap / Yeni Holding Kur */}
              <div
                role="tablist"
                aria-label="Hesap Sekmeleri"
                className="grid grid-cols-2 gap-1.5 rounded-[14px] border border-[#334155] bg-[#181F29] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  data-testid="auth-tab-login"
                  onClick={() => handleSwitchTab('login')}
                  className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[10px] px-2 text-xs font-semibold whitespace-nowrap ${
                    activeTab === 'login'
                      ? 'bg-[#334155] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span>Giriş Yap</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  data-testid="auth-tab-register"
                  onClick={() => handleSwitchTab('register')}
                  className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[10px] px-2 text-xs font-semibold whitespace-nowrap ${
                    activeTab === 'register'
                      ? 'bg-[#334155] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span>Yeni Holding Kur</span>
                </button>
              </div>

              {activeTab === 'login' ? (
                <>
                  <div>
                    <label
                      htmlFor="auth-username"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Kullanıcı Adı <span className="text-[#B86B5E]">*</span>
                    </label>
                    <div className="relative mt-1">
                      <User
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        strokeWidth={1.5}
                      />
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
                        className="min-h-[38px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] pl-8 pr-3 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Şifre <span className="text-[#B86B5E]">*</span>
                    </label>
                    <div className="relative mt-1">
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
                        className="min-h-[38px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] pl-3 pr-9 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="auth-username"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Kullanıcı Adı <span className="text-[#B86B5E]">*</span>
                    </label>
                    <div className="relative mt-1">
                      <User
                        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        strokeWidth={1.5}
                      />
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
                        className="min-h-[36px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] pl-7 pr-2 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Şifre <span className="text-[#B86B5E]">*</span>
                    </label>
                    <div className="relative mt-1">
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
                        className="min-h-[36px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] pl-2.5 pr-8 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-displayname"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Patron / Görünen Ad <span className="text-[#B86B5E]">*</span>
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
                      className="mt-1 min-h-[36px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] px-2.5 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hq-city-select"
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Merkez Şehir
                    </label>
                    <select
                      id="hq-city-select"
                      data-testid="starting-city-select"
                      value={startingCityPlate}
                      onChange={(e) => onSelectStartingCity(Number(e.target.value))}
                      className="mt-1 min-h-[36px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] px-2 text-xs font-medium text-slate-100 focus:border-[#C8AE7D] focus:outline-none"
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
                  className="flex items-start gap-1.5 rounded-[14px] border border-[#B86B5E]/50 bg-[#B86B5E]/15 px-3 py-2 text-[11px] font-medium text-[#E8B4AA]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                  <span>{displayedError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                data-start="true"
                data-testid={activeTab === 'login' ? 'login-submit-btn' : 'register-submit-btn'}
                className="mt-1 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 py-2 text-xs font-bold tracking-wide text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-60 whitespace-nowrap"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" strokeWidth={1.5} />
                    <span>{activeTab === 'login' ? 'GİRİŞ YAPILIYOR...' : 'HOLDİNG KURULUYOR...'}</span>
                  </>
                ) : activeTab === 'login' ? (
                  <>
                    <LogIn className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>Giriş Yap ve Devam Et</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span>Yeni Holding Kur ve Başla</span>
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </div>

      {/* Subtle Matte Footer */}
      <footer className="relative z-10 flex shrink-0 items-center justify-center px-4 pb-[clamp(6px,1.2vh,12px)] text-[11px] text-slate-500">
        <span>fu Games · Yatay Yönetici Paneli · 81 İl Canlı Holding Simülasyonu</span>
      </footer>
    </main>
  );
}
