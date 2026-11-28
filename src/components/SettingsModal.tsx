import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Loader2,
  LogOut,
  Map as MapIcon,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GameSettings, OtaCheckResult, UserProfile } from '../types/game';
import { APP_BUILD_DATE, APP_VERSION } from '../services/otaUpdate';
import { validateRegistrationInput } from '../lib/playerAuth';
import { MobileGameModal } from './MobileGameModal';

interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  user: UserProfile | null;
  otaResult: OtaCheckResult | null;
  checkingOta: boolean;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onCheckUpdates: () => void;
  onOpenUpdateModal: () => void;
  onUpgradeGuestAccount?: (input: {
    username: string;
    password: string;
    displayName: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onReplayTutorial?: () => void;
  onReturnToMainMenu?: () => void;
  onSignOut?: () => void;
  onResetGame: () => void;
}

export function SettingsModal({
  open,
  settings,
  user,
  otaResult,
  checkingOta,
  onClose,
  onUpdateSettings,
  onCheckUpdates,
  onOpenUpdateModal,
  onUpgradeGuestAccount,
  onReplayTutorial,
  onReturnToMainMenu,
  onSignOut,
  onResetGame,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [bindUsername, setBindUsername] = useState('');
  const [bindPassword, setBindPassword] = useState('');
  const [showBindPassword, setShowBindPassword] = useState(false);
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);

  if (!open) return null;

  const isGuest = user?.provider === 'guest';

  const handleBindGuestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !onUpgradeGuestAccount || bindingLoading) return;
    setBindError(null);
    setBindSuccess(null);

    const check = validateRegistrationInput({
      username: bindUsername,
      password: bindPassword,
      displayName: user.displayName || user.name,
    });
    if (!check.ok) {
      setBindError(check.error ?? 'Lütfen geçerli bir kullanıcı adı ve şifre girin.');
      return;
    }

    setBindingLoading(true);
    try {
      const res = await onUpgradeGuestAccount({
        username: check.username,
        password: bindPassword,
        displayName: check.displayName,
      });
      if (!res.ok) {
        setBindError(res.error ?? 'Hesap bağlama işlemi tamamlanamadı.');
      } else {
        setBindSuccess('İlerlemen sıfırlanmadan kalıcı Supabase hesabına bağlandı!');
        setBindUsername('');
        setBindPassword('');
      }
    } finally {
      setBindingLoading(false);
    }
  };

  return (
    <div data-testid="settings-modal">
      <MobileGameModal
        title="Ayarlar & Hesap Yönetimi"
        subtitle={`Sürüm v${APP_VERSION} (${APP_BUILD_DATE})`}
        icon={<Settings className="h-4 w-4" strokeWidth={1.5} />}
        onClose={onClose}
        zIndexClass="z-[1255]"
      >
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {/* Left Column: Audio, Notifications, Vector Map & Guest Account Binding */}
          <div className="space-y-3">
            <section className="flex items-center justify-between gap-3 rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-[#C8AE7D]" strokeWidth={1.5} />
                <div>
                  <div className="text-xs font-bold text-slate-100">Bildirimler</div>
                  <div className="text-xs text-slate-400">
                    Ciro, vardiya, gün sonu ve güncelleme uyarıları
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.notificationsEnabled}
                aria-label="Bildirimleri aç veya kapat"
                onClick={() =>
                  onUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled })
                }
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                  settings.notificationsEnabled ? 'bg-[#C8AE7D]' : 'bg-[#334155]'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-[#181F29] transition-transform ${
                    settings.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </section>

            <section className="flex items-center justify-between gap-3 rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-[#7A9E7E]" strokeWidth={1.5} />
                ) : (
                  <VolumeX className="h-5 w-5 text-slate-500" strokeWidth={1.5} />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-100">Ses Efektleri</div>
                  <div className="text-xs text-slate-400">
                    Bahşiş, tahsilat, vardiya ve yükseltme sesleri
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEnabled}
                aria-label="Ses efektlerini aç veya kapat"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-[#7A9E7E]' : 'bg-[#334155]'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-[#181F29] transition-transform ${
                    settings.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </section>

            <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <MapIcon className="h-4 w-4 text-[#7E96B0]" strokeWidth={1.5} />
                <span>Vektörel (SVG) 81 İl &amp; İlçe Haritası</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                v1.8.0 ile harici harita karoları kaldırıldı; 81 il ve ilçe sınırları doğrudan
                vektörel SVG motoru ile canlı Supabase senkronizasyonu üzerinden çalışır.
              </p>
            </section>

            {/* Guest Account -> Permanent Supabase Binding Section */}
            {isGuest && onUpgradeGuestAccount && (
              <section
                data-testid="guest-bind-account-section"
                className="rounded-[20px] border border-[#C8AE7D]/55 bg-[#222B38] p-4 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-slate-100">
                    Misafir Hesabı • İlerlemeni Kaydet
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">
                  Kullanıcı adı ve şifre belirleyerek mevcut nakdini, açık şehirlerini, XP ve
                  şubelerini sıfırlamadan kalıcı Supabase hesabına bağla.
                </p>

                <form onSubmit={handleBindGuestSubmit} noValidate className="space-y-2">
                  <div>
                    <label htmlFor="bind-username" className="block text-[11px] font-semibold text-slate-300">
                      Kullanıcı Adı
                    </label>
                    <input
                      id="bind-username"
                      data-testid="guest-bind-username-input"
                      type="text"
                      value={bindUsername}
                      onChange={(e) => {
                        setBindUsername(e.target.value.toLowerCase());
                        setBindError(null);
                      }}
                      placeholder="orn: emre34"
                      maxLength={24}
                      className="mt-1 min-h-[36px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="bind-password" className="block text-[11px] font-semibold text-slate-300">
                      Şifre
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="bind-password"
                        data-testid="guest-bind-password-input"
                        type={showBindPassword ? 'text' : 'password'}
                        value={bindPassword}
                        onChange={(e) => {
                          setBindPassword(e.target.value);
                          setBindError(null);
                        }}
                        placeholder="En az 4 karakter"
                        maxLength={64}
                        className="min-h-[36px] w-full rounded-[12px] border border-[#334155] bg-[#181F29] pl-3 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#C8AE7D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBindPassword((p) => !p)}
                        aria-label={showBindPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                      >
                        {showBindPassword ? (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>

                  {bindError && (
                    <div
                      role="alert"
                      className="flex items-start gap-1.5 rounded-[10px] border border-[#B86B5E]/50 bg-[#B86B5E]/15 px-2.5 py-2 text-[11px] text-[#E8B4AA]"
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B86B5E]" strokeWidth={1.5} />
                      <span>{bindError}</span>
                    </div>
                  )}

                  {bindSuccess && (
                    <div className="flex items-start gap-1.5 rounded-[10px] border border-[#7A9E7E]/50 bg-[#7A9E7E]/15 px-2.5 py-2 text-[11px] text-[#B7DFBC]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7A9E7E]" strokeWidth={1.5} />
                      <span>{bindSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={bindingLoading}
                    data-testid="guest-bind-submit-btn"
                    className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-60"
                  >
                    {bindingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                        <span>Hesaba Bağlanıyor...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                        <span>İlerlememi Kalıcı Hesaba Bağla</span>
                      </>
                    )}
                  </button>
                </form>
              </section>
            )}
          </div>

          {/* Right Column: OTA & Account Navigation */}
          <div className="space-y-3">
            <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">Canlı Güncelleme (OTA)</span>
                <span className="font-mono-num text-xs font-bold text-[#C8AE7D]">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Yeni APK indirmeye gerek kalmadan güncel harita ve özellikleri anında alın.
              </p>

              <button
                type="button"
                disabled={checkingOta}
                onClick={onCheckUpdates}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${checkingOta ? 'animate-spin' : ''}`}
                  strokeWidth={1.5}
                />
                <span>{checkingOta ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}</span>
              </button>

              {otaResult && (
                <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3 text-xs">
                  {otaResult.error ? (
                    <div className="flex items-start gap-2 text-[#C8AE7D]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                      <span>{otaResult.error}</span>
                    </div>
                  ) : otaResult.hasUpdate ? (
                    <div className="space-y-2">
                      <div className="font-bold text-[#7A9E7E]">
                        Yeni sürüm mevcut: v{otaResult.remoteManifest?.version}
                      </div>
                      <button
                        type="button"
                        onClick={onOpenUpdateModal}
                        className="min-h-[40px] w-full rounded-[12px] bg-[#7A9E7E] px-3 text-xs font-bold text-[#181F29] hover:bg-[#89AE8D]"
                      >
                        Güncelleme Notlarını Gör
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#7A9E7E]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        <span>
                          Uygulama güncel (v{otaResult.remoteManifest?.version ?? APP_VERSION})
                        </span>
                      </div>
                      {otaResult.remoteManifest?.notes?.[0] && (
                        <p className="text-slate-400">{otaResult.remoteManifest.notes[0]}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4 space-y-2.5">
              <div>
                <div className="text-sm font-bold text-slate-100">Hesap &amp; Navigasyon</div>
                <p data-testid="settings-account-label" className="mt-0.5 text-xs text-slate-400">
                  {user
                    ? user.provider === 'guest'
                      ? `${user.name} · Misafir Hesabı`
                      : `${user.name} (@${user.username}) · Kalıcı Hesap`
                    : 'Oturum açılmadı'}
                </p>
              </div>

              {onReturnToMainMenu && (
                <button
                  type="button"
                  data-testid="settings-main-menu-btn"
                  onClick={() => {
                    onClose();
                    onReturnToMainMenu();
                  }}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
                >
                  <Home className="h-4 w-4" strokeWidth={1.5} />
                  <span>Ana Menüye Dön</span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  data-testid="settings-signout-btn"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#C8AE7D]/40 bg-[#181F29] px-3 text-xs font-semibold text-[#C8AE7D] hover:bg-[#2A3444]"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  <span>Hesaptan Çıkış Yap</span>
                </button>
              )}

              {onReplayTutorial && (
                <button
                  type="button"
                  data-testid="replay-tutorial-btn"
                  onClick={() => {
                    onClose();
                    onReplayTutorial();
                  }}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#7E96B0]/40 bg-[#181F29] px-3 text-xs font-semibold text-[#7E96B0] hover:bg-[#2A3444]"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                  <span>Oyun Rehberini Tekrar Göster</span>
                </button>
              )}

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#B86B5E]/45 bg-[#B86B5E]/15 px-3 text-xs font-semibold text-[#E8B4AA] hover:bg-[#B86B5E]/25"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                  <span>Oyunu Sıfırla</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetGame();
                      setConfirmReset(false);
                    }}
                    className="min-h-[40px] flex-1 rounded-[14px] bg-[#B86B5E] text-xs font-bold text-white hover:bg-[#C6796C]"
                  >
                    Evet, Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[40px] flex-1 rounded-[14px] border border-[#334155] bg-[#181F29] text-xs font-semibold text-slate-200 hover:bg-[#2A3444]"
                  >
                    Vazgeç
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </MobileGameModal>
    </div>
  );
}
