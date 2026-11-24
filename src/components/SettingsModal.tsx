import { useState } from 'react';
import {
  X,
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
} from 'lucide-react';
import type { GameSettings, OtaCheckResult, UserProfile } from '../types/game';
import { APP_BUILD_DATE, APP_VERSION } from '../services/otaUpdate';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayarlar"
      data-testid="settings-modal"
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 p-4 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-lg lg:max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="compact-short-pad flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800 sm:px-5 sm:py-3">
          <div>
            <h2 className="text-sm font-bold sm:text-base">Ayarlar ve Canlı Güncelleme</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Türkiye Mülk İmparatoru · Sürüm {APP_VERSION} ({APP_BUILD_DATE})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Ayarları Kapat"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Two-column landscape body */}
        <div className="panel-scroll grid flex-1 min-h-0 grid-cols-1 gap-3.5 overflow-y-auto overscroll-contain p-3.5 sm:grid-cols-2 sm:p-4">
          {/* Left Column: Appearance & Preferences */}
          <div className="space-y-3">
            {/* Theme Switch */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Görünüm Teması</div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                  className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
                    settings.theme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-600" />
                  <span>Açık Tema</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                  className={`flex min-h-[36px] items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
                    settings.theme === 'dark'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Karanlık</span>
                </button>
              </div>
            </div>

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-xs font-bold">Bildirimler</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ciro, etkinlik ve güncelleme uyarıları
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
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  settings.notificationsEnabled
                    ? 'bg-amber-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
                <div>
                  <div className="text-xs font-bold">Ses Efektleri</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Map Layer Style */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <MapIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Harita Katmanı</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'osm' })}
                  className={`min-h-[34px] rounded-md text-xs font-semibold ${
                    settings.mapStyle === 'osm'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  OpenStreetMap
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ mapStyle: 'carto' })}
                  className={`min-h-[34px] rounded-md text-xs font-semibold ${
                    settings.mapStyle === 'carto'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  CARTO Harita
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live OTA Updates & Account */}
          <div className="flex flex-col justify-between space-y-3">
            {/* OTA Live Update Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Canlı Güncelleme (OTA)</span>
                <span className="font-mono-num text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                Yeni APK indirmeye gerek kalmadan güncel harita ve özellikleri anında alın.
              </p>

              <button
                type="button"
                disabled={checkingOta}
                onClick={onCheckUpdates}
                className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingOta ? 'animate-spin' : ''}`} />
                <span>{checkingOta ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}</span>
              </button>

              {otaResult && (
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] dark:border-slate-800 dark:bg-slate-900">
                  {otaResult.error ? (
                    <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{otaResult.error}</span>
                    </div>
                  ) : otaResult.hasUpdate ? (
                    <div className="space-y-2">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        Yeni sürüm mevcut: v{otaResult.remoteManifest?.version}
                      </div>
                      <button
                        type="button"
                        onClick={onOpenUpdateModal}
                        className="w-full rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Güncelleme Notlarını Gör
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Uygulama güncel (v{otaResult.remoteManifest?.version ?? APP_VERSION})</span>
                      </div>
                      {otaResult.remoteManifest?.notes?.[0] && (
                        <p className="text-slate-500 dark:text-slate-400">
                          {otaResult.remoteManifest.notes[0]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account, Tutorial Replay & Reset */}
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="text-xs font-bold">Hesap & Rehber</div>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {user
                  ? `${user.name} (${user.provider === 'google' ? 'Google OAuth' : 'Misafir'})`
                  : 'Oturum açılmadı'}
              </p>

              {onReplayTutorial && (
                <button
                  type="button"
                  data-testid="replay-tutorial-btn"
                  onClick={() => {
                    onClose();
                    onReplayTutorial();
                  }}
                  className="mt-2.5 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/80 px-3 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Oyun Rehberini Tekrar Göster</span>
                </button>
              )}

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="mt-2 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>İmparatorluğu Sıfırla</span>
                </button>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetGame();
                      setConfirmReset(false);
                    }}
                    className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Evet, Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs font-semibold dark:border-slate-700"
                  >
                    Vazgeç
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
