import { Download, Sparkles, X } from 'lucide-react';
import type { OtaVersionManifest } from '../types/game';
import { APP_VERSION } from '../services/otaUpdate';

interface OtaUpdateModalProps {
  manifest: OtaVersionManifest | null;
  open: boolean;
  updating: boolean;
  onUpdateNow: () => void;
  onLater: () => void;
}

export function OtaUpdateModal({
  manifest,
  open,
  updating,
  onUpdateNow,
  onLater,
}: OtaUpdateModalProps) {
  if (!open || !manifest) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Güncelleme Mevcut"
      data-testid="ota-update-modal"
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/60 p-4 safe-inset"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-300/70 bg-white text-slate-900 shadow-2xl dark:border-amber-700/70 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Güncelleme Mevcut</h2>
              <p className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                v{APP_VERSION} → v{manifest.version} · {manifest.buildDate}
              </p>
            </div>
          </div>

          {!manifest.mandatory && (
            <button
              type="button"
              onClick={onLater}
              aria-label="Güncelleme penceresini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Yenilikler ve İyileştirmeler
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {manifest.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-2.5">
            {!manifest.mandatory && (
              <button
                type="button"
                onClick={onLater}
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Daha Sonra
              </button>
            )}
            <button
              type="button"
              disabled={updating}
              onClick={onUpdateNow}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span>{updating ? 'Güncelleniyor...' : 'Şimdi Güncelle'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
