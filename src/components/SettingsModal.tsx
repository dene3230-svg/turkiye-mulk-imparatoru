import { useState } from 'react';
import {
  Sun,
  Moon,
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
  onResetGame,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  return (
    <div data-testid="settings-modal">
      <MobileGameModal
        title="Ayarlar & Canlı Güncelleme"
        subtitle={`Sürüm v${APP_VERSION} (${APP_BUILD_DATE})`}
        icon={<Settings className="h-4 w-4" />}
        onClose={onClose}
        zIndexClass="z-[1255]"
      >
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {/* Appearance & Controls */}
          <div className="space-y-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-xs font-bold text-white">Görünüm Teması</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
                    settings.theme === 'light'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  <span>Açık Tema</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition ${
                    settings.theme === 'dark'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  <span>Karanlık</span>
                </button>
              </div>
            </section>

            <section className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">Bildirimler</div>
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
                  settings.notificationsEnabled ? 'bg-amber-400' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-slate-950 shadow transition-transform ${
                    settings.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </section>

            <section className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <VolumeX className="h-5 w-5 text-slate-500" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">Ses Efektleri</div>
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
                  settings.soundEnabled ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-slate-950 shadow transition-transform ${
                    settings.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <MapIcon className="h-4 w-4 text-sky-400" />
                <span>Harita Katmanı</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'osm' })}
                  className={`min-h-[42px] rounded-xl text-xs font-bold ${
                    settings.mapStyle === 'osm'
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  OpenStreetMap
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'carto' })}
                  className={`min-h-[42px] rounded-xl text-xs font-bold ${
                    settings.mapStyle === 'carto'
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'border border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  CARTO Harita
                </button>
              </div>
            </section>
          </div>

          {/* OTA & Account */}
          <div className="space-y-3">
            <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Canlı Güncelleme (OTA)</span>
                <span className="font-mono-num text-xs font-black text-amber-300">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Yeni APK indirmeye gerek kalmadan güncel harita ve özellikleri anında alın.
              </p>

              <button
                type="button"
                disabled={checkingOta}
                onClick={onCheckUpdates}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${checkingOta ? 'animate-spin' : ''}`} />
                <span>{checkingOta ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}</span>
              </button>

              {otaResult && (
                <div className="rounded-xl border border-slate-700 bg-slate-950/90 p-3 text-xs">
                  {otaResult.error ? (
                    <div className="flex items-start gap-2 text-amber-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{otaResult.error}</span>
                    </div>
                  ) : otaResult.hasUpdate ? (
                    <div className="space-y-2">
                      <div className="font-bold text-emerald-400">
                        Yeni sürüm mevcut: v{otaResult.remoteManifest?.version}
                      </div>
                      <button
                        type="button"
                        onClick={onOpenUpdateModal}
                        className="min-h-[40px] w-full rounded-xl bg-emerald-500 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                      >
                        Güncelleme Notlarını Gör
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          Uygulama güncel (v{otaResult.remoteManifest?.version ?? APP_VERSION})
                        </span>
                      </div>
                      {otaResult.remoteManifest?.notes?.[0] && (
                        <p className="text-slate-300">{otaResult.remoteManifest.notes[0]}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2.5">
              <div>
                <div className="text-sm font-bold text-white">Hesap & Rehber</div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {user
                    ? `${user.name} (${user.provider === 'google' ? 'Google OAuth' : 'Misafir'})`
                    : 'Oturum açılmadı'}
                </p>
              </div>

              {onReplayTutorial && (
                <button
                  type="button"
                  data-testid="replay-tutorial-btn"
                  onClick={() => {
                    onClose();
                    onReplayTutorial();
                  }}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Oyun Rehberini Tekrar Göster</span>
                </button>
              )}

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                >
                  <RotateCcw className="h-4 w-4" />
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
                    className="min-h-[42px] flex-1 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
                  >
                    Evet, Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200"
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
