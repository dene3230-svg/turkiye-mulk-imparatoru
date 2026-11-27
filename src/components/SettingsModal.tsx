import { useState } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Map as MapIcon,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Settings,
  Home,
  LogOut,
} from 'lucide-react';
import type { GameSettings, OtaCheckResult, UserProfile } from '../types/game';
import { APP_BUILD_DATE, APP_VERSION } from '../services/otaUpdate';
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
  onReplayTutorial,
  onReturnToMainMenu,
  onSignOut,
  onResetGame,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  return (
    <div data-testid="settings-modal">
      <MobileGameModal
        title="Ayarlar & Canlı Güncelleme"
        subtitle={`Sürüm v${APP_VERSION} (${APP_BUILD_DATE})`}
        icon={<Settings className="h-4 w-4" strokeWidth={1.5} />}
        onClose={onClose}
        zIndexClass="z-[1255]"
      >
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {/* Controls & Map Style */}
          <div className="space-y-3">
            <section className="flex items-center justify-between gap-3 rounded-[20px] border border-[#334155] bg-[#222B38] p-3.5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-[#C8AE7D]" strokeWidth={1.5} />
                <div>
                  <div className="text-xs font-bold text-slate-100">Bildirimler</div>
                  <div className="text-xs text-slate-400">
                    Ciro, gün sonu, etkinlik ve güncelleme uyarıları
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
                    Pin, tahsilat ve yükseltme sesleri
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
                <span>Harita Katmanı</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'osm' })}
                  className={`min-h-[42px] rounded-[14px] text-xs font-semibold ${
                    settings.mapStyle === 'osm'
                      ? 'bg-[#7E96B0] text-[#181F29] font-bold'
                      : 'border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]'
                  }`}
                >
                  OpenStreetMap
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'carto' })}
                  className={`min-h-[42px] rounded-[14px] text-xs font-semibold ${
                    settings.mapStyle === 'carto'
                      ? 'bg-[#7E96B0] text-[#181F29] font-bold'
                      : 'border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]'
                  }`}
                >
                  CARTO Harita
                </button>
              </div>
            </section>
          </div>

          {/* OTA & Account */}
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
                  {user ? `${user.name} (@${user.username})` : 'Oturum açılmadı'}
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
                  <span>İmparatorluğu Sıfırla</span>
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
