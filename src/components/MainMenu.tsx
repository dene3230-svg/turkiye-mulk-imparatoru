import { useEffect } from 'react';
import {
  Sun,
  Moon,
  Settings,
  RefreshCw,
  UserCheck,
  LogOut,
  Play,
  MapPin,
  Building2,
  Bell,
} from 'lucide-react';
import type { ThemeMode, UserProfile } from '../types/game';
import { APP_VERSION } from '../services/otaUpdate';

interface MainMenuProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  onGuestLogin: () => void;
  onGoogleLogin: () => void;
  onContinueLoggedIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onCheckUpdate: () => void;
  checkingUpdate: boolean;
  savedBusinessCount: number;
}

export function MainMenu({
  theme,
  onToggleTheme,
  user,
  authLoading,
  authError,
  onGuestLogin,
  onGoogleLogin,
  onContinueLoggedIn,
  onSignOut,
  onOpenSettings,
  onCheckUpdate,
  checkingUpdate,
  savedBusinessCount,
}: MainMenuProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT') return;
        e.preventDefault();
        if (user) {
          onContinueLoggedIn();
        } else {
          onGuestLogin();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, onContinueLoggedIn, onGuestLogin]);

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
      <div className="relative z-10 flex items-center justify-between px-[clamp(14px,3vw,36px)] pt-[clamp(10px,2vh,20px)] pb-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-amber-700 dark:text-amber-400">fu Games</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">v{APP_VERSION}</span>
          {savedBusinessCount > 0 && (
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
            className="flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
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
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Güncellemeleri Denetle"
          >
            <RefreshCw className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Ayarlar"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Ayarlar"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Landscape 2-Column Content */}
      <div className="relative z-10 mx-auto flex flex-1 w-full max-w-6xl items-center justify-center gap-[clamp(20px,4vw,56px)] px-[clamp(16px,3.5vw,44px)] py-[clamp(8px,2vh,20px)]">
        {/* Left Column: Framed Logo Showcase & Title */}
        <div className="flex flex-1 flex-col items-start justify-center">
          <div className="flex items-center gap-[clamp(14px,2.2vw,24px)]">
            <div className="shrink-0 rounded-[24px] p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_14px_34px_rgba(180,83,9,0.22)] dark:shadow-[0_14px_38px_rgba(217,119,6,0.24)]">
              <div className="h-[clamp(76px,17vh,124px)] w-[clamp(76px,17vh,124px)] overflow-hidden rounded-[20px] bg-[#0B1426]">
                <img
                  src="./icon.png"
                  alt="Türkiye Mülk İmparatoru Logosu"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.35rem,3.1vw,2.65rem)] font-bold leading-tight tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
                Türkiye Mülk İmparatoru
              </h1>
              <p className="mt-1.5 max-w-md text-[clamp(0.78rem,1.25vw,0.95rem)] leading-snug text-slate-600 dark:text-slate-300">
                Türkiye haritasında dilediğiniz noktaya pin bırakın, stratejik işletmeler kurun ve
                emlak imparatorluğunuzu büyütün.
              </p>
            </div>
          </div>

          {/* 3 Concise Gameplay Pillars — Clean unboxed typography */}
          <div className="mt-[clamp(14px,3vh,28px)] grid w-full max-w-lg grid-cols-3 gap-3 border-t border-slate-200/90 pt-[clamp(10px,2vh,18px)] dark:border-slate-800">
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
                <span>8 Sektör</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Fırından gökdelene yükseltme ve personel.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Bell className="h-3.5 w-3.5 shrink-0" />
                <span>Canlı OTA</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Anlık piyasa etkinlikleri ve canlı güncelleme.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Auth & Start Panel */}
        <section
          aria-label="Giriş Seçenekleri"
          className="w-[clamp(270px,34vw,380px)] shrink-0 rounded-2xl border border-slate-200 bg-white p-[clamp(16px,2.6vh,26px)] shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30"
        >
          {user && user.provider === 'google' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user.email || 'Google Hesabı Bağlı'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={onContinueLoggedIn}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-700 active:scale-[0.99] whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>OYUNA DEVAM ET</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Hesaptan Çıkış Yap</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  İmparatorluğuna Başla
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  İlerlemeniz cihazınızda güvenle saklanır; Google ile bulutta senkronize edin.
                </p>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={onGuestLogin}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-[clamp(0.78rem,1.15vw,0.88rem)] font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-amber-700 active:scale-[0.99] whitespace-nowrap"
              >
                <UserCheck className="h-4 w-4 shrink-0" />
                <span>MİSAFİR GİRİŞİ İLE OYNA</span>
              </button>

              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={authLoading}
                className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[clamp(0.78rem,1.15vw,0.88rem)] font-bold tracking-wide text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>{authLoading ? 'YÖNLENDİRİLİYOR...' : 'GOOGLE İLE GİRİŞ YAP'}</span>
              </button>

              {authError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {authError}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Subtle Bottom Hint Line */}
      <footer className="relative z-10 flex items-center justify-center px-4 pb-[clamp(8px,1.5vh,14px)] text-[11px] text-slate-400 dark:text-slate-500">
        <span>Yatay Ekran · Haritada Pin Bırak · İşletmeni Kur · İmparatorluğunu Yönet</span>
      </footer>
    </main>
  );
}
