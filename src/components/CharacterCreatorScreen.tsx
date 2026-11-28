import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Check,
  Crown,
  Glasses,
  Handshake,
  HelpCircle,
  MapPin,
  Rocket,
  Search,
  Settings,
  Shirt,
  Sparkles,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import type {
  CharacterAccessoryId,
  CharacterGender,
  CharacterOutfitId,
  CharacterProfile,
  CharacterTraitId,
} from '../types/game';
import {
  ACCESSORY_OPTIONS,
  HAIR_COLOR_SWATCHES,
  OUTFIT_COLOR_SWATCHES,
  OUTFIT_OPTIONS,
  SKIN_TONE_SWATCHES,
  STARTING_TRAITS,
  createDefaultCharacterProfile,
  getHairStylesForGender,
  getTraitOption,
  sanitizeCharacterForGender,
} from '../game/characterEngine';
import { TURKEY_PROVINCES, getProvinceByPlate } from '../game/provinces81';
import { STARTING_CASH } from '../game/catalog';
import { formatTL } from '../game/economy';
import { APP_VERSION } from '../services/otaUpdate';
import { soundEngine } from '../services/soundEngine';
import { CharacterAvatar2D } from './CharacterAvatar2D';

type CreatorTabId = 'appearance' | 'outfit' | 'trait';

interface CharacterCreatorScreenProps {
  modeLabel?: string;
  initialName?: string;
  initialCityPlate: number;
  submitting?: boolean;
  externalError?: string | null;
  onBack: () => void;
  onOpenSettings: () => void;
  onComplete: (profile: CharacterProfile, cityPlate: number) => void;
}

function OutfitOutlineIcon({ outfit }: { outfit: Exclude<CharacterOutfitId, 'takim_elbise'> }) {
  if (outfit === 'barista_onlugu') {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
        <path
          d="M 11 4 L 11 10 M 21 4 L 21 10 M 8 10 L 24 10 L 26 27 L 6 27 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="12" y="15" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (outfit === 'gunluk_kiyafet') {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
        <path
          d="M 11 6 Q 16 11 21 6 L 27 11 L 24 16 L 22 14 L 22 26 L 10 26 L 10 14 L 8 16 L 5 11 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M 14 10 L 14 15 M 18 10 L 18 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (outfit === 'ofis_gomlegi') {
    return (
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
        <path
          d="M 11 6 L 16 11 L 21 6 L 27 10 L 24 16 L 22 14 L 22 26 L 10 26 L 10 14 L 8 16 L 5 10 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <line x1="16" y1="11" x2="16" y2="26" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" fill="none" aria-hidden="true">
      <path
        d="M 11 5 L 11 11 M 21 5 L 21 11 M 9 11 L 23 11 L 24 27 L 18 27 L 16 20 L 14 27 L 8 27 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="13" y="14" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TraitIcon({ id }: { id: CharacterTraitId }) {
  switch (id) {
    case 'sosyal':
      return <ThumbsUp className="h-5 w-5 shrink-0" strokeWidth={1.5} />;
    case 'hizli_ogrenen':
      return <Rocket className="h-5 w-5 shrink-0" strokeWidth={1.5} />;
    case 'pazarlikci':
      return <Handshake className="h-5 w-5 shrink-0" strokeWidth={1.5} />;
    case 'hesap_uzmani':
      return <Calculator className="h-5 w-5 shrink-0" strokeWidth={1.5} />;
  }
}

export function CharacterCreatorScreen({
  modeLabel,
  initialName = '',
  initialCityPlate,
  submitting = false,
  externalError = null,
  onBack,
  onOpenSettings,
  onComplete,
}: CharacterCreatorScreenProps) {
  const [profile, setProfile] = useState<CharacterProfile>(() =>
    createDefaultCharacterProfile(initialName, 'female')
  );
  const [activeTab, setActiveTab] = useState<CreatorTabId>('appearance');
  const [step, setStep] = useState<'customize' | 'select_city'>('customize');
  const [selectedPlate, setSelectedPlate] = useState<number>(initialCityPlate);
  const [citySearch, setCitySearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const genderHairStyles = useMemo(
    () => getHairStylesForGender(profile.gender),
    [profile.gender]
  );

  const activeTrait = useMemo(
    () => getTraitOption(profile.traitId),
    [profile.traitId]
  );

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

  const handleGenderChange = (nextGender: CharacterGender) => {
    soundEngine.playClick();
    setProfile((prev) => sanitizeCharacterForGender(prev, nextGender));
  };

  const handleSelectOutfit = (outfitId: Exclude<CharacterOutfitId, 'takim_elbise'>) => {
    soundEngine.playClick();
    const def = OUTFIT_OPTIONS.find((o) => o.id === outfitId);
    setProfile((prev) => ({
      ...prev,
      outfit: outfitId,
      outfitColor: def?.defaultColor ?? prev.outfitColor,
    }));
  };

  const handleProceedToCityStep = () => {
    const clean = profile.name.trim();
    if (clean.length < 2) {
      setValidationError('Lütfen devam etmeden önce en az 2 karakterli bir Karakter Adı girin.');
      return;
    }
    soundEngine.playClick();
    setValidationError(null);
    setProfile((prev) => ({ ...prev, name: clean }));
    setStep('select_city');
  };

  const handleFinishCitySelection = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const clean = profile.name.trim();
    if (clean.length < 2) {
      setStep('customize');
      setValidationError('Lütfen en az 2 karakterli bir Karakter Adı girin.');
      return;
    }
    soundEngine.playClick();
    onComplete({ ...profile, name: clean }, selectedPlate);
  };

  const displayedError = validationError || externalError;

  return (
    <main
      data-testid="character-creator-screen"
      className="relative flex h-full w-full flex-col justify-between overflow-y-auto bg-[#181F29] text-slate-100 safe-inset panel-scroll"
    >
      {/* Top Centered Header (Crown + Title + Subtitle) */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-4 lg:px-8 lg:py-5">
        <header className="relative flex flex-col items-center text-center">
          <button
            type="button"
            data-testid="creator-back-btn"
            onClick={() => {
              soundEngine.playClick();
              onBack();
            }}
            className="absolute left-0 top-1 flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#334155] bg-[#222B38] px-3.5 text-xs font-semibold text-slate-300 hover:bg-[#2A3546] hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Ana Menü</span>
          </button>

          <Crown className="h-8 w-8 text-[#C8AE7D] lg:h-9 lg:w-9" strokeWidth={1.5} />
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[0.12em] text-slate-100 sm:text-3xl lg:text-[34px]">
            KARAKTERİNİ OLUŞTUR
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Hayatına ilk adımını atmak için karakterini tasarla
            {modeLabel ? ` · ${modeLabel}` : ''}
          </p>
        </header>

        {/* Main 2-Column Character Creator Body */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-12 lg:gap-5">
          {/* LEFT PANEL: Gender Toggle + 2D Vector Avatar Preview + Character Name + Starter Badge */}
          <section className="flex flex-col lg:col-span-4">
            {/* Gender Switch Centered Above Left Card (Matching Reference) */}
            <div className="mb-3 flex flex-col items-center">
              <span className="text-xs font-semibold tracking-wide text-slate-200">Cinsiyet</span>
              <div
                role="group"
                aria-label="Cinsiyet Seçimi"
                className="mt-1.5 inline-flex items-center rounded-full border border-[#334155] bg-[#222B38] p-1"
              >
                <button
                  type="button"
                  data-testid="gender-male-btn"
                  aria-pressed={profile.gender === 'male'}
                  onClick={() => handleGenderChange('male')}
                  className={`min-h-[34px] min-w-[82px] rounded-full px-4 text-xs font-bold transition-colors whitespace-nowrap ${
                    profile.gender === 'male'
                      ? 'bg-[#C8AE7D] text-[#181F29]'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Erkek
                </button>
                <span aria-hidden="true" className="px-1 text-xs text-slate-500">
                  /
                </span>
                <button
                  type="button"
                  data-testid="gender-female-btn"
                  aria-pressed={profile.gender === 'female'}
                  onClick={() => handleGenderChange('female')}
                  className={`min-h-[34px] min-w-[82px] rounded-full px-4 text-xs font-bold transition-colors whitespace-nowrap ${
                    profile.gender === 'female'
                      ? 'bg-[#C8AE7D] text-[#181F29]'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Kadın
                </button>
              </div>
            </div>

            {/* Left Flat Card: Live 2D Preview + Name Input + Starter Badge */}
            <div className="flex flex-1 flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
              <div
                data-testid="character-preview-stage"
                className="relative mx-auto aspect-[240/258] w-full max-w-[300px] overflow-hidden rounded-[14px] border border-[#334155]/90 bg-[#1D2633]"
              >
                <CharacterAvatar2D
                  profile={profile}
                  mode="full"
                  showBackdrop
                  className="h-full w-full"
                />
              </div>

              <div className="mt-3.5 space-y-2.5">
                <div className="flex items-center gap-2 rounded-[14px] border border-[#334155] bg-[#181F29] px-3 py-2 focus-within:border-[#C8AE7D]">
                  <label
                    htmlFor="creator-character-name"
                    className="shrink-0 text-xs font-medium text-slate-400"
                  >
                    Karakter Adı:
                  </label>
                  <input
                    id="creator-character-name"
                    data-testid="creator-character-name-input"
                    type="text"
                    value={profile.name}
                    onChange={(e) => {
                      setProfile((prev) => ({ ...prev, name: e.target.value }));
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={profile.gender === 'male' ? 'Örn: Emre' : 'Örn: Zeynep'}
                    maxLength={28}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-100 placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                {/* Starter Status Badge ("Başlangıç: İşçi • ₺2.500") */}
                <div className="flex justify-center">
                  <div
                    data-testid="starter-status-badge"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7A9E7E] px-4 py-1.5 text-xs font-bold text-[#181F29]"
                  >
                    <span>Başlangıç: İşçi</span>
                    <span aria-hidden="true">•</span>
                    <span className="font-mono-num">{formatTL(STARTING_CASH)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT PANEL: 3 Strictly Separated Tabs + Primary CTA */}
          <section className="flex flex-col lg:col-span-8">
            <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]">
              {/* 3-Tab Header Bar ("Görünüm" | "Kıyafet" | "Geçmiş & Yetenek") */}
              <div
                role="tablist"
                aria-label="Karakter Özelleştirme Sekmeleri"
                className="grid grid-cols-3 border-b border-[#334155] bg-[#1D2633]"
              >
                {[
                  { id: 'appearance' as CreatorTabId, label: 'Görünüm', testId: 'tab-appearance' },
                  { id: 'outfit' as CreatorTabId, label: 'Kıyafet', testId: 'tab-outfit' },
                  { id: 'trait' as CreatorTabId, label: 'Geçmiş & Yetenek', testId: 'tab-trait' },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-testid={tab.testId}
                      onClick={() => {
                        soundEngine.playClick();
                        setActiveTab(tab.id);
                      }}
                      className={`min-h-[50px] border-r border-[#334155] px-3 text-xs font-semibold transition-colors last:border-r-0 sm:text-sm whitespace-nowrap ${
                        isActive
                          ? 'bg-[#2C3748] text-slate-100'
                          : 'text-slate-400 hover:bg-[#222B38] hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB PANEL CONTENT — STRICTLY ISOLATED PER TAB */}
              <div className="flex-1 p-5 lg:p-6">
                {/* TAB 1: GÖRÜNÜM (ONLY Hair Style, Hair Color, Skin Tone, Accessory) */}
                {activeTab === 'appearance' && (
                  <div data-testid="panel-appearance" className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Column 1: Hair Style + Hair Color */}
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
                          <h2 className="text-sm font-bold text-slate-100">Saç Stili</h2>
                          <span className="text-xs text-slate-400">
                            · {profile.gender === 'female' ? 'Kadın' : 'Erkek'}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {genderHairStyles.map((style) => {
                            const selected = profile.hairStyle === style.id;
                            return (
                              <button
                                key={style.id}
                                type="button"
                                data-testid={`hair-style-${style.id}`}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setProfile((prev) => ({ ...prev, hairStyle: style.id }));
                                }}
                                className={`min-h-[40px] rounded-[12px] border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                                  selected
                                    ? 'border-[#C8AE7D] bg-[#C8AE7D]/20 text-slate-100'
                                    : 'border-[#334155] bg-[#181F29] text-slate-300 hover:border-[#7E96B0]'
                                }`}
                              >
                                {style.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-sm font-bold text-slate-100">Saç Rengi</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {HAIR_COLOR_SWATCHES.map((swatch) => {
                            const selected = profile.hairColor === swatch.hex;
                            return (
                              <button
                                key={swatch.id}
                                type="button"
                                data-testid={`hair-color-${swatch.id}`}
                                aria-label={`Saç rengi: ${swatch.label}`}
                                title={swatch.label}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setProfile((prev) => ({ ...prev, hairColor: swatch.hex }));
                                }}
                                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform ${
                                  selected
                                    ? 'scale-105 border-[#C8AE7D] ring-2 ring-[#C8AE7D]/40'
                                    : 'border-[#334155] hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch.hex }}
                              >
                                {selected && (
                                  <Check className="h-4 w-4 text-slate-100" strokeWidth={2.5} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Skin Tone + Accessory */}
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-sm font-bold text-slate-100">Ten Rengi</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          {SKIN_TONE_SWATCHES.map((swatch) => {
                            const selected = profile.skinTone === swatch.hex;
                            return (
                              <button
                                key={swatch.id}
                                type="button"
                                data-testid={`skin-tone-${swatch.id}`}
                                aria-label={`Ten rengi: ${swatch.label}`}
                                title={swatch.label}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setProfile((prev) => ({ ...prev, skinTone: swatch.hex }));
                                }}
                                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform ${
                                  selected
                                    ? 'scale-105 border-[#C8AE7D] ring-2 ring-[#C8AE7D]/40'
                                    : 'border-[#334155] hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch.hex }}
                              >
                                {selected && (
                                  <Check className="h-4 w-4 text-[#181F29]" strokeWidth={2.5} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Glasses className="h-4 w-4 text-[#7E96B0]" strokeWidth={1.5} />
                          <h2 className="text-sm font-bold text-slate-100">Aksesuar</h2>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          {ACCESSORY_OPTIONS.map((acc) => {
                            const selected = profile.accessory === acc.id;
                            const isBeardOnFemale =
                              acc.id === 'sakal_biyik' && profile.gender === 'female';
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                data-testid={`accessory-${acc.id}`}
                                disabled={isBeardOnFemale}
                                onClick={() => {
                                  soundEngine.playClick();
                                  setProfile((prev) => ({
                                    ...prev,
                                    accessory: acc.id as CharacterAccessoryId,
                                  }));
                                }}
                                className={`flex min-h-[48px] flex-col items-start justify-center rounded-[12px] border px-3 py-2 text-left transition-colors ${
                                  selected
                                    ? 'border-[#C8AE7D] bg-[#C8AE7D]/18 text-slate-100'
                                    : 'border-[#334155] bg-[#181F29] text-slate-300 hover:border-[#7E96B0]'
                                } ${isBeardOnFemale ? 'cursor-not-allowed opacity-40' : ''}`}
                              >
                                <span className="text-xs font-bold">{acc.label}</span>
                                <span className="text-[10px] text-slate-400">{acc.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: KIYAFET (ONLY 4 Outfits + Outfit Color Palette + Auto Suit Career Note) */}
                {activeTab === 'outfit' && (
                  <div data-testid="panel-outfit" className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
                        <h2 className="text-sm font-bold text-slate-100">Başlangıç Kıyafeti</h2>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {OUTFIT_OPTIONS.map((item) => {
                          const selected = profile.outfit === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              data-testid={`outfit-${item.id}`}
                              onClick={() => handleSelectOutfit(item.id)}
                              className={`flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors ${
                                selected
                                  ? 'border-[#7A9E7E] bg-[#7A9E7E] text-[#181F29]'
                                  : 'border-[#334155] bg-[#181F29] text-slate-200 hover:border-[#7E96B0]'
                              }`}
                            >
                              <OutfitOutlineIcon outfit={item.id} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold">{item.label}</div>
                                <div
                                  className={`mt-0.5 text-[11px] leading-snug ${
                                    selected ? 'text-[#181F29]/80' : 'text-slate-400'
                                  }`}
                                >
                                  {item.shortDesc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-100">Kıyafet Rengi</h2>
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        {OUTFIT_COLOR_SWATCHES.map((swatch) => {
                          const selected = profile.outfitColor === swatch.hex;
                          return (
                            <button
                              key={swatch.id}
                              type="button"
                              data-testid={`outfit-color-${swatch.id}`}
                              aria-label={`Kıyafet rengi: ${swatch.label}`}
                              title={swatch.label}
                              onClick={() => {
                                soundEngine.playClick();
                                setProfile((prev) => ({ ...prev, outfitColor: swatch.hex }));
                              }}
                              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform ${
                                selected
                                  ? 'scale-105 border-[#C8AE7D] ring-2 ring-[#C8AE7D]/40'
                                  : 'border-[#334155] hover:scale-105'
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            >
                              {selected && (
                                <Check className="h-4 w-4 text-slate-100" strokeWidth={2.5} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Career Progression Auto-Suit Note */}
                    <div
                      data-testid="outfit-progression-note"
                      className="flex items-start gap-3 rounded-[14px] border border-[#C8AE7D]/40 bg-[#181F29] p-3.5"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C8AE7D]" strokeWidth={1.5} />
                      <div className="text-xs leading-relaxed text-slate-300">
                        <strong className="text-[#C8AE7D]">Kariyer İlerlemesi Notu:</strong>{' '}
                        Vardiyalarda terfi alıp <strong>Şube Müdürü</strong> kademesine ulaştıkça veya
                        kendi işletmelerini büyütüp holding seviyesine geçtikçe karakterin otomatik olarak{' '}
                        <strong className="text-slate-100">Takım Elbise</strong> görünümüne geçiş yapar.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GEÇMİŞ & YETENEK (ONLY 4 Permanent Starting Traits) */}
                {activeTab === 'trait' && (
                  <div data-testid="panel-trait" className="space-y-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-100">Başlangıç Yeteneği</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Seçtiğin yetenek oyun boyunca vardiyalarını, deneyimini ve işletme ekonomini kalıcı olarak etkiler.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {STARTING_TRAITS.map((trait) => {
                        const selected = profile.traitId === trait.id;
                        return (
                          <button
                            key={trait.id}
                            type="button"
                            data-testid={`trait-${trait.id}`}
                            onClick={() => {
                              soundEngine.playClick();
                              setProfile((prev) => ({ ...prev, traitId: trait.id }));
                            }}
                            className={`flex items-start gap-3 rounded-[14px] border p-3.5 text-left transition-colors ${
                              selected
                                ? 'border-[#7A9E7E] bg-[#7A9E7E] text-[#181F29]'
                                : 'border-[#334155] bg-[#181F29] text-slate-200 hover:border-[#7E96B0]'
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${
                                selected
                                  ? 'border-[#181F29]/25 bg-[#181F29]/10 text-[#181F29]'
                                  : 'border-[#334155] bg-[#222B38] text-[#C8AE7D]'
                              }`}
                            >
                              <TraitIcon id={trait.id} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="text-sm font-bold">{trait.title}</span>
                                <span
                                  className={`font-mono-num text-xs font-bold ${
                                    selected ? 'text-[#181F29]' : 'text-[#C8AE7D]'
                                  }`}
                                >
                                  ({trait.bonusBadge})
                                </span>
                              </div>
                              <p
                                className={`mt-1 text-[11px] leading-relaxed ${
                                  selected ? 'text-[#181F29]/85' : 'text-slate-400'
                                }`}
                              >
                                {trait.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Alert + Bottom-Right Primary CTA */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {displayedError ? (
                  <div
                    role="alert"
                    data-testid="creator-error-alert"
                    className="flex items-center gap-2 rounded-[14px] border border-[#B86B5E]/55 bg-[#B86B5E]/15 px-3.5 py-2 text-xs text-[#E8B4AA]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                    <span>{displayedError}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Aktif Yetenek:{' '}
                    <strong className="text-[#7A9E7E]">
                      {activeTrait.title} ({activeTrait.bonusBadge})
                    </strong>
                  </p>
                )}
              </div>

              <button
                type="button"
                data-testid="proceed-select-city-btn"
                onClick={handleProceedToCityStep}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C8AE7D] px-7 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E] whitespace-nowrap"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                <span>Merkez Şehri Seç ve Başla</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Corner Utility Footer (Matches Reference: v1.8.0 left, Ayarlar & Destek right) */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between px-4 pb-3 pt-1 text-xs text-slate-500 lg:px-6">
        <span className="font-mono-num">v{APP_VERSION}</span>
        <div className="flex items-center gap-4">
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
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            <span>Destek</span>
          </button>
        </div>
      </footer>

      {/* STEP 2 MODAL: 81-PROVINCE STARTING CITY PICKER (1 UNLOCKED, 80 LOCKED) */}
      {step === 'select_city' && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="creator-city-picker-modal"
          className="fixed inset-0 z-[1260] flex items-center justify-center bg-black/75 p-4"
        >
          <form
            onSubmit={handleFinishCitySelection}
            className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#C8AE7D]/60 bg-[#181F29]">
                  <CharacterAvatar2D profile={profile} mode="bust" className="h-full w-full" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                    Adım 2 / 2 · Merkez Şehir Seçimi
                  </p>
                  <h2 className="text-base font-bold text-slate-100">
                    {profile.name} için Başlangıç İlini Seç
                  </h2>
                  <p className="text-xs text-slate-400">
                    81 ilden seçeceğin 1 il açık başlar (80 il kilitli) · {activeTrait.title} ({activeTrait.bonusBadge})
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Karakter Düzenlemeye Dön"
                onClick={() => setStep('customize')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <label htmlFor="creator-city-search" className="font-semibold text-slate-200">
                81 İl Arasından Seç
              </label>
              <span className="font-semibold text-[#C8AE7D]">
                Seçili: {selectedProvince.code} {selectedProvince.name} ({selectedProvince.region})
              </span>
            </div>

            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                strokeWidth={1.5}
              />
              <input
                id="creator-city-search"
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Plaka, il veya bölge ara (ör. 32, Isparta, İstanbul, Ege)..."
                className="min-h-[38px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
              />
            </div>

            <div
              data-testid="province-picker-grid"
              className="mt-2.5 grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto rounded-[14px] border border-[#334155] bg-[#181F29] p-2 sm:grid-cols-3 panel-scroll"
            >
              {filteredProvinces.map((prov) => {
                const isSelected = prov.plate === selectedPlate;
                return (
                  <button
                    key={prov.plate}
                    type="button"
                    data-testid={`pick-province-${prov.plate}`}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedPlate(prov.plate);
                    }}
                    className={`flex items-center justify-between rounded-[10px] border px-2.5 py-2 text-left text-xs transition-colors ${
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#334155] bg-[#181F29] px-3.5 py-2.5 text-xs">
              <span className="text-slate-400">
                Statü: <strong className="text-slate-100">Çalışan</strong>
              </span>
              <span className="text-slate-400">
                Başlangıç Sermayesi:{' '}
                <strong className="font-mono-num text-[#7A9E7E]">{formatTL(STARTING_CASH)}</strong>
              </span>
              <span className="text-slate-400">
                Açık İl: <strong className="font-mono-num text-[#C8AE7D]">1 / 81</strong>
              </span>
            </div>

            {externalError && (
              <div
                role="alert"
                className="mt-3 flex items-center gap-2 rounded-[12px] border border-[#B86B5E]/55 bg-[#B86B5E]/15 px-3 py-2 text-xs text-[#E8B4AA]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                <span>{externalError}</span>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep('customize')}
                className="min-h-[42px] rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-300 hover:bg-[#2A3444]"
              >
                Geri Dön
              </button>
              <button
                type="submit"
                disabled={submitting}
                data-testid="confirm-city-start-btn"
                className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-55"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                <span>
                  {submitting
                    ? 'Kariyer Hazırlanıyor...'
                    : `${selectedProvince.name} İlinde Başla (${formatTL(STARTING_CASH)})`}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Help Modal */}
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1270] flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Karakter Oluşturma Rehberi</h2>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setHelpOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              Karakterinin görünümü ve seçtiğin başlangıç kıyafeti 2D vardiya sahnelerinde canlı olarak
              yer alır. Seçtiğin başlangıç yeteneği ise bahşiş, XP, kira veya günlük işletme giderlerinde
              kariyerin boyunca kalıcı avantaj sağlar.
            </p>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
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
