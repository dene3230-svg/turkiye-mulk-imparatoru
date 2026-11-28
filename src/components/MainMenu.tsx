import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Briefcase,
  Check,
  Crown,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Play,
  RefreshCw,
  Search,
  Settings,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import type { ThemeMode, UserProfile } from '../types/game';
import { TURKEY_PROVINCES, getProvinceByPlate } from '../game/provinces81';
import { APP_VERSION } from '../services/otaUpdate';
import { validateLoginInput, validateRegistrationInput } from '../lib/playerAuth';
import { STARTING_CASH } from '../game/catalog';
import { formatTL } from '../game/economy';

interface MainMenuProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  onClearAuthError: () => void;
  startingCityPlate: number;
  onSelectStartingCity: (plate: number) => void;
  onStartGuest: (characterName: string, cityPlate: number) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (
    username: string,
    password: string,
    displayName: string,
    cityPlate: number
  ) => Promise<void>;
  onContinueLoggedIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  onCheckUpdate: () => void;
  checkingUpdate: boolean;
  savedBusinessCount: number;
  savedCash?: number;
}

type ModalMode = null | 'guest_setup' | 'auth' | 'help';
type AuthTab = 'login' | 'register';

/** Card 1: Animated 2D Cafe Barista Scene — ÇALIŞ VE BİRİKTİR */
function Step1WorkArt() {
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="170" rx="12" fill="#D4C09B" />
      <rect x="0" y="0" width="320" height="106" rx="12" fill="#CBB48C" />
      {/* Menu Chalkboard */}
      <rect x="18" y="14" width="128" height="44" rx="4" fill="#263141" stroke="#181F29" strokeWidth="2" />
      <circle cx="42" cy="36" r="10" fill="#181F29" stroke="#C8AE7D" strokeWidth="1.5" />
      <rect x="37" y="34" width="10" height="7" rx="1.5" fill="#C8AE7D" />
      <line x1="60" y1="26" x2="132" y2="26" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="36" x2="122" y2="36" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="46" x2="128" y2="46" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

      {/* Hanging Lamp */}
      <line x1="250" y1="0" x2="250" y2="22" stroke="#181F29" strokeWidth="2.5" />
      <path d="M 232 32 Q 250 16 268 32 Z" fill="#8C6D46" stroke="#181F29" strokeWidth="2" />
      <ellipse cx="250" cy="33" rx="8" ry="2.5" fill="#F2DDA6" />

      {/* Espresso Machine */}
      <rect x="20" y="76" width="54" height="34" rx="4" fill="#7E96B0" stroke="#181F29" strokeWidth="2" />
      <rect x="28" y="84" width="38" height="9" rx="2" fill="#222B38" />
      <rect x="34" y="98" width="9" height="10" rx="1" fill="#F8FAFC" />
      <rect x="52" y="98" width="9" height="10" rx="1" fill="#F8FAFC" />

      {/* Animated Barista */}
      <g className="animate-onboarding-bob">
        <circle cx="122" cy="64" r="12" fill="#F1D5B5" stroke="#181F29" strokeWidth="2" />
        <path d="M 110 61 Q 116 49 128 52 Q 134 54 133 62 Q 124 57 110 61 Z" fill="#263141" />
        <rect x="108" y="76" width="28" height="36" rx="6" fill="#E2E8F0" stroke="#181F29" strokeWidth="2" />
        <rect x="113" y="82" width="18" height="30" rx="2" fill="#2A3444" stroke="#181F29" strokeWidth="1.5" />
        <line x1="136" y1="88" x2="162" y2="94" stroke="#F1D5B5" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Coffee Bag & Cup on Counter */}
      <rect x="160" y="86" width="18" height="22" rx="3" fill="#8D6E4E" stroke="#181F29" strokeWidth="2" />
      <rect x="218" y="92" width="13" height="16" rx="2" fill="#F8FAFC" stroke="#181F29" strokeWidth="1.8" />
      <rect x="218" y="97" width="13" height="5" fill="#9E7E5B" />

      {/* Customer */}
      <circle cx="268" cy="78" r="11" fill="#EBC9A6" stroke="#181F29" strokeWidth="2" />
      <path d="M 258 75 Q 266 63 278 72 L 278 82 Q 272 74 258 75 Z" fill="#1E293B" />
      <path d="M 250 112 Q 268 88 286 112 L 288 156 L 246 156 Z" fill="#7A9E7E" stroke="#181F29" strokeWidth="2" />

      {/* Counter */}
      <rect x="8" y="108" width="228" height="10" rx="3" fill="#9B7956" stroke="#181F29" strokeWidth="2" />
      <rect x="14" y="118" width="216" height="44" rx="4" fill="#7B5E42" stroke="#181F29" strokeWidth="2" />

      {/* Animated Floating +TL and +XP Bubbles */}
      <g className="animate-onboarding-float-1">
        <circle cx="192" cy="36" r="14" fill="#F8FAFC" stroke="#181F29" strokeWidth="2" />
        <text x="192" y="40" textAnchor="middle" fill="#181F29" fontSize="11" fontWeight="800">
          +₺
        </text>
      </g>
      <g className="animate-onboarding-float-2">
        <circle cx="228" cy="54" r="15" fill="#F2DDA6" stroke="#181F29" strokeWidth="2" />
        <text x="228" y="58" textAnchor="middle" fill="#181F29" fontSize="9.5" fontWeight="800">
          +XP
        </text>
      </g>
      <g className="animate-onboarding-float-3">
        <circle cx="174" cy="72" r="13" fill="#F2DDA6" stroke="#181F29" strokeWidth="1.8" />
        <text x="174" y="75.5" textAnchor="middle" fill="#181F29" fontSize="8.5" fontWeight="800">
          +XP
        </text>
      </g>
    </svg>
  );
}

/** Card 2: Animated 2D Storefront Scene — KENDİ İŞİNİ KUR */
function Step2ShopArt() {
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="170" rx="12" fill="#2A3546" />
      {/* Sidewalk */}
      <rect x="0" y="140" width="320" height="30" fill="#3B4758" />
      <line x1="0" y1="140" x2="320" y2="140" stroke="#181F29" strokeWidth="2" />

      {/* Decorative Trees */}
      <ellipse cx="44" cy="126" rx="16" ry="22" fill="#5E8565" stroke="#181F29" strokeWidth="2" />
      <ellipse cx="64" cy="134" rx="12" ry="15" fill="#7A9E7E" stroke="#181F29" strokeWidth="2" />
      <ellipse cx="286" cy="128" rx="16" ry="20" fill="#5E8565" stroke="#181F29" strokeWidth="2" />

      {/* Storefront Building */}
      <rect x="74" y="56" width="166" height="90" rx="4" fill="#9D7D5B" stroke="#181F29" strokeWidth="2" />
      {/* Striped Awning */}
      <polygon points="62,72 78,48 236,48 252,72" fill="#C8AE7D" stroke="#181F29" strokeWidth="2" />
      {[84, 114, 144, 174, 204].map((x) => (
        <rect key={x} x={x} y="49" width="15" height="22" fill="#222B38" opacity="0.85" />
      ))}

      {/* Shop Window + AÇIK Sign */}
      <rect x="86" y="84" width="84" height="48" rx="3" fill="#7E96B0" stroke="#181F29" strokeWidth="2" />
      <rect x="134" y="96" width="32" height="18" rx="2" fill="#F8FAFC" stroke="#181F29" strokeWidth="1.6" />
      <text x="150" y="108.5" textAnchor="middle" fill="#181F29" fontSize="8.5" fontWeight="800">
        AÇIK
      </text>

      {/* Glass Door */}
      <rect x="180" y="84" width="44" height="62" rx="2" fill="#6B839E" stroke="#181F29" strokeWidth="2" />

      {/* Smiling Owner */}
      <g className="animate-onboarding-bob">
        <circle cx="110" cy="96" r="10" fill="#F1D5B5" stroke="#181F29" strokeWidth="2" />
        <rect x="98" y="107" width="24" height="38" rx="4" fill="#2A3444" stroke="#181F29" strokeWidth="2" />
        <line x1="122" y1="116" x2="136" y2="110" stroke="#F1D5B5" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* Arriving Customers */}
      <g className="animate-onboarding-walk">
        <circle cx="222" cy="100" r="9" fill="#EBC9A6" stroke="#181F29" strokeWidth="2" />
        <rect x="212" y="110" width="20" height="36" rx="4" fill="#637E9C" stroke="#181F29" strokeWidth="2" />
        <circle cx="256" cy="102" r="9" fill="#F1D5B5" stroke="#181F29" strokeWidth="2" />
        <rect x="246" y="112" width="20" height="34" rx="4" fill="#B86B5E" stroke="#181F29" strokeWidth="2" />
      </g>

      {/* Seviye Atla + Animated Coins */}
      <g className="animate-onboarding-float-1">
        <path d="M 156 12 L 164 22 L 159 22 L 159 30 L 153 30 L 153 22 L 148 22 Z" fill="#C8AE7D" />
        <text x="156" y="42" textAnchor="middle" fill="#E2E8F0" fontSize="10.5" fontWeight="700">
          Seviye Atla
        </text>
      </g>
      <g className="animate-onboarding-float-2">
        <circle cx="242" cy="24" r="13" fill="#C8AE7D" stroke="#181F29" strokeWidth="2" />
        <text x="242" y="28" textAnchor="middle" fill="#181F29" fontSize="10" fontWeight="800">
          +₺
        </text>
      </g>
      <g className="animate-onboarding-float-3">
        <circle cx="212" cy="36" r="12" fill="#D2BB8E" stroke="#181F29" strokeWidth="2" />
        <text x="212" y="40" textAnchor="middle" fill="#181F29" fontSize="9.5" fontWeight="800">
          +₺
        </text>
      </g>
    </svg>
  );
}

/** Card 3: Animated 2D Holding HQ & 81-Province Empire — HOLDİNGLEŞ VE YÖNET */
function Step3HoldingArt() {
  return (
    <svg viewBox="0 0 320 170" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="170" rx="12" fill="#232D3B" />

      {/* Skyline Towers */}
      <rect x="16" y="56" width="24" height="96" fill="#3B495C" stroke="#181F29" strokeWidth="1.8" />
      <rect x="44" y="28" width="26" height="124" fill="#4A5B72" stroke="#181F29" strokeWidth="1.8" />
      <polygon points="57,12 48,28 66,28" fill="#4A5B72" stroke="#181F29" strokeWidth="1.5" />
      <rect x="74" y="42" width="28" height="110" fill="#52657E" stroke="#181F29" strokeWidth="1.8" />

      {/* Classical Bank Facade */}
      <polygon points="22,114 58,96 94,114" fill="#CBD5E1" stroke="#181F29" strokeWidth="1.8" />
      <text x="58" y="111" textAnchor="middle" fill="#181F29" fontSize="9" fontWeight="800">
        ₺
      </text>
      <rect x="26" y="114" width="64" height="38" fill="#94A3B8" stroke="#181F29" strokeWidth="1.8" />
      {[34, 48, 62, 76].map((cx) => (
        <rect key={cx} x={cx} y="118" width="7" height="30" fill="#E2E8F0" stroke="#181F29" strokeWidth="1.2" />
      ))}

      {/* BIST Stock Board */}
      <rect x="150" y="14" width="66" height="46" rx="4" fill="#181F29" stroke="#334155" strokeWidth="1.8" />
      <text x="160" y="27" fill="#E2E8F0" fontSize="9" fontWeight="700">
        BIST
      </text>
      <rect x="158" y="46" width="7" height="10" fill="#B86B5E" />
      <rect x="169" y="42" width="7" height="14" fill="#7A9E7E" />
      <rect x="180" y="38" width="7" height="18" fill="#B86B5E" />
      <rect x="191" y="32" width="7" height="24" fill="#7A9E7E" />
      <rect x="202" y="25" width="7" height="31" fill="#7A9E7E" />

      {/* Mini Turkey Map Silhouette + Pulsing Pins */}
      <path
        d="M 218,52 L 246,44 L 284,48 L 306,62 L 296,86 L 264,90 L 232,86 L 214,70 Z"
        fill="#3B495C"
        stroke="#181F29"
        strokeWidth="1.8"
      />
      {[
        { cx: 236, cy: 62 },
        { cx: 262, cy: 56 },
        { cx: 282, cy: 70 },
        { cx: 254, cy: 78 },
      ].map((pin, idx) => (
        <g key={idx} className={idx % 2 === 0 ? 'animate-onboarding-float-1' : 'animate-onboarding-float-2'}>
          <circle cx={pin.cx} cy={pin.cy} r="5" fill="#B86B5E" stroke="#181F29" strokeWidth="1.5" />
          <circle cx={pin.cx} cy={pin.cy} r="1.8" fill="#F8FAFC" />
        </g>
      ))}

      {/* CEO at Executive Desk */}
      <g className="animate-onboarding-bob">
        <circle cx="164" cy="84" r="12" fill="#F1D5B5" stroke="#181F29" strokeWidth="2" />
        <path d="M 152 81 Q 160 68 176 78 L 175 84 Q 165 76 152 81 Z" fill="#181F29" />
        <path d="M 140 120 Q 164 96 188 120 L 188 130 L 140 130 Z" fill="#2A3444" stroke="#181F29" strokeWidth="2" />
        <polygon points="164,102 160,118 164,122 168,118" fill="#C8AE7D" />
      </g>

      {/* Executive Desk & Monitor */}
      <rect x="192" y="100" width="32" height="22" rx="2" fill="#CBD5E1" stroke="#181F29" strokeWidth="1.8" />
      <rect x="108" y="124" width="136" height="36" rx="4" fill="#8B6B49" stroke="#181F29" strokeWidth="2" />
      <rect x="102" y="120" width="148" height="8" rx="2" fill="#A6825B" stroke="#181F29" strokeWidth="2" />
    </svg>
  );
}

export function MainMenu({
  user,
  authLoading,
  authError,
  onClearAuthError,
  startingCityPlate,
  onSelectStartingCity,
  onStartGuest,
  onLogin,
  onRegister,
  onContinueLoggedIn,
  onSignOut,
  onOpenSettings,
  onCheckUpdate,
  checkingUpdate,
  savedBusinessCount,
  savedCash,
}: MainMenuProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeTab, setActiveTab] = useState<AuthTab>('register');
  const [characterName, setCharacterName] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedPlate, setSelectedPlate] = useState<number>(startingCityPlate);

  // Account auth fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlate(startingCityPlate);
  }, [startingCityPlate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && user && !modalMode) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'INPUT' || activeTag === 'SELECT') return;
        e.preventDefault();
        onContinueLoggedIn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [user, modalMode, onContinueLoggedIn]);

  const filteredProvinces = useMemo(() => {
    const q = citySearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return TURKEY_PROVINCES;
    return TURKEY_PROVINCES.filter(
      (p) =>
        p.name.toLocaleLowerCase('tr-TR').includes(q) ||
        p.code.includes(q) ||
        p.region.toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [citySearch]);

  const selectedProvince = getProvinceByPlate(selectedPlate);

  const openGuestSetup = () => {
    setLocalError(null);
    onClearAuthError();
    setCitySearch('');
    setModalMode('guest_setup');
  };

  const openAuthModal = (tab: AuthTab = 'login') => {
    setLocalError(null);
    onClearAuthError();
    setActiveTab(tab);
    setCitySearch('');
    setModalMode('auth');
  };

  const handleGuestSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = characterName.trim();
    if (clean.length < 2) {
      setLocalError('Lütfen en az 2 karakterli bir karakter adı girin.');
      return;
    }
    setLocalError(null);
    onSelectStartingCity(selectedPlate);
    onStartGuest(clean, selectedPlate);
  };

  const handleAuthSubmit = async (e: FormEvent) => {
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
      onSelectStartingCity(selectedPlate);
      await onRegister(check.username, password, check.displayName, selectedPlate);
    }
  };

  const displayedError = localError || authError;

  return (
    <main
      data-testid="main-menu"
      className="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-[#181F29] text-slate-100 safe-inset panel-scroll"
    >
      {/* Subtle geometric dark-slate background lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 18%, rgba(200,174,125,0.08), transparent 55%)',
        }}
      />

      {/* Centered Content Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-4 lg:px-8 lg:py-5">
        {/* Top Centered Emblem + Title Lockup */}
        <header className="flex flex-col items-center text-center">
          <Crown
            className="h-9 w-9 text-[#C8AE7D] lg:h-11 lg:w-11"
            strokeWidth={1.5}
          />
          <div className="mt-1 font-display text-lg font-bold tracking-[0.22em] text-[#C8AE7D] lg:text-xl">
            MÜLK
          </div>
          <h1 className="text-2xl font-bold tracking-[0.14em] text-slate-100 sm:text-3xl lg:text-[36px]">
            İMPARATORLUĞU
          </h1>
          <p className="mt-1.5 text-xs font-medium text-slate-300 sm:text-sm">
            Cebinde <span className="font-mono-num font-bold text-[#C8AE7D]">{formatTL(STARTING_CASH)}</span> ile Başla, Kendi İmparatorluğunu Kur!
          </p>
          <p className="text-[11px] text-slate-400">
            Kariyer ve Mülk Simülasyonu · 81 İl Vektörel Harita &amp; Canlı Ekonomi
          </p>
        </header>

        {/* 3 Animated 2D Career Progression Cards (Matching Reference) */}
        <section
          aria-label="Oyun İlerleyiş Adımları"
          className="mt-5 grid w-full grid-cols-1 gap-3.5 md:grid-cols-3 lg:mt-6 lg:gap-5"
        >
          <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-[#334155]/70 bg-[#181F29]">
              <Step1WorkArt />
            </div>
            <h2 className="mt-3 text-center text-sm font-bold tracking-wide text-slate-100 lg:text-base">
              ÇALIŞ VE BİRİKTİR
            </h2>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-400">
              Vardiyalı işlerde çalış, maaş ve bahşiş biriktirerek ilk sermayeni kazan!
            </p>
          </article>

          <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-[#334155]/70 bg-[#181F29]">
              <Step2ShopArt />
            </div>
            <h2 className="mt-3 text-center text-sm font-bold tracking-wide text-slate-100 lg:text-base">
              KENDİ İŞİNİ KUR
            </h2>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-400">
              İlk dükkânını aç, personel al, şubelerini büyüt ve bölge lideri ol!
            </p>
          </article>

          <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-[12px] border border-[#334155]/70 bg-[#181F29]">
              <Step3HoldingArt />
            </div>
            <h2 className="mt-3 text-center text-sm font-bold tracking-wide text-slate-100 lg:text-base">
              HOLDİNGLEŞ VE YÖNET
            </h2>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-400">
              Türkiye&apos;nin 81 ilinde mülkler edin, borsada oyna, mega projelerle imparatorluğunu kur!
            </p>
          </article>
        </section>

        {/* Saved Game Resume Card (If an active session exists) */}
        {user && (
          <section
            data-testid="logged-in-panel"
            aria-label="Kayıtlı Oyuna Devam Et"
            className="mt-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#7A9E7E]/50 bg-[#222B38] px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C8AE7D]/60 bg-[#181F29] text-sm font-bold text-[#C8AE7D]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p data-testid="menu-patron-name" className="truncate text-sm font-bold text-slate-100">
                    {user.name}
                  </p>
                  <span className="text-[11px] font-medium text-[#7A9E7E]">
                    {user.provider === 'guest' ? 'Misafir Kayıt' : `@${user.username}`}
                  </span>
                </div>
                <p data-testid="menu-patron-username" className="text-xs text-slate-400">
                  Kasa: <span className="font-mono-num text-slate-200">{formatTL(savedCash ?? STARTING_CASH)}</span> ·{' '}
                  {savedBusinessCount > 0 ? `${savedBusinessCount} aktif şube` : 'Çalışan kariyeri'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-start="true"
                data-testid="continue-game-btn"
                onClick={onContinueLoggedIn}
                className="flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#7A9E7E] px-5 text-xs font-bold text-[#181F29] hover:bg-[#89AE8D] whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Kayıtlı Oyuna Devam Et</span>
              </button>
              <button
                type="button"
                data-testid="menu-signout-btn"
                onClick={onSignOut}
                aria-label="Oturumu Kapat"
                title="Farklı Hesap / Yeni Oyun"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
              >
                <LogOut className="h-4 w-4 text-[#B86B5E]" strokeWidth={1.5} />
              </button>
            </div>
          </section>
        )}

        {/* Two Equal-Status Main Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:mt-6 lg:gap-4">
          <button
            type="button"
            data-start={!user ? 'true' : undefined}
            data-testid="start-guest-btn"
            onClick={openGuestSetup}
            className="flex min-h-[48px] min-w-[230px] items-center justify-center gap-2 rounded-full bg-[#C8AE7D] px-7 py-2.5 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E] whitespace-nowrap"
          >
            <Play className="h-4 w-4" strokeWidth={1.75} />
            <span>Oynamaya Başla (Misafir)</span>
          </button>

          <button
            type="button"
            data-testid="open-auth-modal-btn"
            onClick={() => openAuthModal('login')}
            className="flex min-h-[48px] min-w-[230px] items-center justify-center gap-2 rounded-full border border-[#7E96B0] bg-[#181F29] px-7 py-2.5 text-sm font-semibold text-slate-100 hover:bg-[#222B38] whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
            <span>Hesap Oluştur / Giriş Yap</span>
          </button>
        </div>
      </div>

      {/* Bottom Corner Utility Footer */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between px-4 pb-3 pt-1 text-xs text-slate-500 lg:px-6">
        <span className="font-mono-num">v{APP_VERSION}</span>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCheckUpdate}
            disabled={checkingUpdate}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
            <span className="hidden sm:inline">Güncelleme</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
            <span>Ayarlar</span>
          </button>

          <button
            type="button"
            onClick={() => setModalMode('help')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            <span>Destek</span>
          </button>
        </div>
      </footer>

      {/* MODAL 1: Guest Character Creation & 1-of-81 Starting Province Picker */}
      {modalMode === 'guest_setup' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="guest-setup-modal"
          className="fixed inset-0 z-[1260] flex items-center justify-center bg-black/75 p-4"
        >
          <form
            onSubmit={handleGuestSubmit}
            noValidate
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                  Yeni Kariyer · Misafir Girişi
                </p>
                <h2 className="mt-0.5 text-base font-bold text-slate-100">
                  Karakterini Oluştur ve Başlangıç İlini Seç
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  81 ilden yalnızca 1 başlangıç ili açık başlar; cebinde {formatTL(STARTING_CASH)} ile
                  Çalışan olarak serüvene başlarsın.
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setModalMode(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto panel-scroll pr-1">
              <div>
                <label htmlFor="guest-character-name" className="block text-xs font-semibold text-slate-200">
                  Karakter Adı <span className="text-[#B86B5E]">*</span>
                </label>
                <div className="relative mt-1">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.5}
                  />
                  <input
                    id="guest-character-name"
                    data-testid="guest-character-name-input"
                    type="text"
                    value={characterName}
                    onChange={(e) => {
                      setCharacterName(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Örn: Emre Kaya"
                    maxLength={28}
                    autoFocus
                    className="min-h-[42px] w-full rounded-[14px] border border-[#334155] bg-[#181F29] pl-9 pr-3 text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="city-search-input" className="block text-xs font-semibold text-slate-200">
                    Başlangıç İli (1 / 81 Açık İl)
                  </label>
                  <span className="text-xs font-semibold text-[#C8AE7D]">
                    Seçili: {selectedProvince.code} {selectedProvince.name}
                  </span>
                </div>

                <div className="relative mt-1.5">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.5}
                  />
                  <input
                    id="city-search-input"
                    type="text"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Plaka, il veya bölge ara (ör. 34, Ankara, Ege)..."
                    className="min-h-[36px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                  />
                </div>

                <div
                  data-testid="province-picker-grid"
                  className="mt-2 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto rounded-[14px] border border-[#334155] bg-[#181F29] p-2 sm:grid-cols-3 panel-scroll"
                >
                  {filteredProvinces.map((prov) => {
                    const isSelected = prov.plate === selectedPlate;
                    return (
                      <button
                        key={prov.plate}
                        type="button"
                        data-testid={`pick-province-${prov.plate}`}
                        onClick={() => setSelectedPlate(prov.plate)}
                        className={`flex items-center justify-between rounded-[10px] border px-2.5 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'border-[#C8AE7D] bg-[#C8AE7D]/20 font-bold text-slate-100'
                            : 'border-[#334155]/70 bg-[#222B38] text-slate-300 hover:border-[#7E96B0]'
                        }`}
                      >
                        <span className="truncate">
                          <span className="mr-1 font-mono-num text-[10px] text-slate-400">
                            {prov.code}
                          </span>
                          {prov.name}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#C8AE7D]" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#334155] bg-[#181F29] px-3.5 py-2.5 text-xs">
                <span className="text-slate-400">
                  Statü: <strong className="text-slate-100">Çalışan</strong>
                </span>
                <span className="text-slate-400">
                  Başlangıç Parası: <strong className="font-mono-num text-[#7A9E7E]">{formatTL(STARTING_CASH)}</strong>
                </span>
                <span className="text-slate-400">
                  Açık İl: <strong className="font-mono-num text-[#C8AE7D]">1 / 81</strong>
                </span>
              </div>

              {displayedError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-[12px] border border-[#B86B5E]/50 bg-[#B86B5E]/15 px-3 py-2 text-xs text-[#E8B4AA]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                  <span>{displayedError}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="min-h-[42px] rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-300 hover:bg-[#2A3444]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                data-testid="confirm-guest-start-btn"
                className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                <span>{selectedProvince.name} İlinde Başla ({formatTL(STARTING_CASH)})</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Account Login / Register Modal */}
      {modalMode === 'auth' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="auth-modal"
          className="fixed inset-0 z-[1260] flex items-center justify-center bg-black/75 p-4"
        >
          <form
            onSubmit={handleAuthSubmit}
            noValidate
            className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-100">Hesap Oluştur / Giriş Yap</h2>
                <p className="text-xs text-slate-400">
                  Supabase bulut hesabınla tüm cihazlarda aynı kariyere devam et.
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setModalMode(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

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
                onClick={() => {
                  setActiveTab('login');
                  setLocalError(null);
                  onClearAuthError();
                }}
                className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold ${
                  activeTab === 'login' ? 'bg-[#334155] text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Giriş Yap</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'register'}
                data-testid="auth-tab-register"
                onClick={() => {
                  setActiveTab('register');
                  setLocalError(null);
                  onClearAuthError();
                }}
                className={`flex min-h-[34px] items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold ${
                  activeTab === 'register' ? 'bg-[#334155] text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Yeni Hesap</span>
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto panel-scroll pr-1">
              <div>
                <label htmlFor="auth-username" className="block text-xs font-semibold text-slate-300">
                  Kullanıcı Adı <span className="text-[#B86B5E]">*</span>
                </label>
                <input
                  id="auth-username"
                  data-testid={activeTab === 'login' ? 'login-username-input' : 'register-username-input'}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    setLocalError(null);
                    onClearAuthError();
                  }}
                  placeholder="orn: patron34"
                  autoComplete="username"
                  maxLength={24}
                  className="mt-1 min-h-[38px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300">
                  Şifre <span className="text-[#B86B5E]">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    id="auth-password"
                    data-testid={activeTab === 'login' ? 'login-password-input' : 'register-password-input'}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLocalError(null);
                      onClearAuthError();
                    }}
                    placeholder="En az 4 karakter"
                    autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                    maxLength={64}
                    className="min-h-[38px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] pl-3 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {activeTab === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-displayname" className="block text-xs font-semibold text-slate-300">
                      Karakter Adı <span className="text-[#B86B5E]">*</span>
                    </label>
                    <input
                      id="auth-displayname"
                      data-testid="register-displayname-input"
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setLocalError(null);
                        onClearAuthError();
                      }}
                      placeholder="Örn: Kemal Demir"
                      maxLength={32}
                      className="mt-1 min-h-[38px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="hq-city-select" className="block text-xs font-semibold text-slate-300">
                      Başlangıç İli (Diğer 80 İl Kilitli Başlar)
                    </label>
                    <select
                      id="hq-city-select"
                      data-testid="starting-city-select"
                      value={selectedPlate}
                      onChange={(e) => setSelectedPlate(Number(e.target.value))}
                      className="mt-1 min-h-[38px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-xs font-medium text-slate-100 focus:border-[#C8AE7D] focus:outline-none"
                    >
                      {TURKEY_PROVINCES.map((prov) => (
                        <option key={prov.plate} value={prov.plate}>
                          {prov.code} {prov.name} ({prov.region})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {displayedError && (
                <div
                  role="alert"
                  data-testid="auth-error-alert"
                  className="flex items-start gap-2 rounded-[12px] border border-[#B86B5E]/50 bg-[#B86B5E]/15 px-3 py-2 text-xs text-[#E8B4AA]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                  <span>{displayedError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              data-testid={activeTab === 'login' ? 'login-submit-btn' : 'register-submit-btn'}
              className="mt-1 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-60"
            >
              {authLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  <span>{activeTab === 'login' ? 'Giriş Yapılıyor...' : 'Hesap Oluşturuluyor...'}</span>
                </>
              ) : activeTab === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" strokeWidth={1.75} />
                  <span>Giriş Yap ve Devam Et</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                  <span>Hesap Oluştur ve Başla ({formatTL(STARTING_CASH)})</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MODAL 3: Help / Career Guide Modal */}
      {modalMode === 'help' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1260] flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Nasıl Oynanır?</h2>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setModalMode(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li>
                <strong className="text-[#C8AE7D]">1. Çalışan Olarak Başla:</strong> 81 ilden seçtiğin
                tek ilde ₺2.500 ile başla; sol menüdeki <em>Kişisel &amp; İş Hayatı</em> sekmesinden
                vardiyalı işlere girip maaş ve bahşiş topla.
              </li>
              <li>
                <strong className="text-[#7A9E7E]">2. İlk Dükkânını Kur:</strong> ₺20.000 biriktirince
                vektörel ilçe haritasından dilediğin ilçede ilk kafeni kur ve personel al.
              </li>
              <li>
                <strong className="text-[#7E96B0]">3. 81 İle Yayıl:</strong> Yeni il lisansları aç,
                canlı haritada diğer oyuncularla rekabet et, borsada yatırım yap ve holdingini büyüt.
              </li>
              <li>
                <strong className="text-slate-100">Misafir Hesabı:</strong> Misafir girişiyle tüm
                özelliklere eşit erişirsin; istediğin zaman <em>Ayarlar</em> menüsünden ilerlemeni
                sıfırlamadan kalıcı hesaba bağlayabilirsin.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="mt-4 min-h-[40px] w-full rounded-[14px] bg-[#C8AE7D] text-xs font-bold text-[#181F29]"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
