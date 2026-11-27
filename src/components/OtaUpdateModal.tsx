import { Download, RefreshCw, X } from 'lucide-react';
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
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/70 p-4 safe-inset"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] text-slate-100">
        <div className="flex items-start justify-between border-b border-[#334155] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#C8AE7D]/45 bg-[#181F29] text-[#C8AE7D]">
              <RefreshCw className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Güncelleme Mevcut</h2>
              <p className="font-mono-num text-xs text-[#7E96B0]">
                v{APP_VERSION} → v{manifest.version} · {manifest.buildDate}
              </p>
            </div>
          </div>

          {!manifest.mandatory && (
            <button
              type="button"
              onClick={onLater}
              aria-label="Güncelleme penceresini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#334155] bg-[#181F29] text-slate-400 hover:text-slate-100"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="text-xs font-semibold text-slate-300">
            Yenilikler ve İyileştirmeler
          </div>
          <ul className="mt-2.5 space-y-2 text-xs text-slate-300">
            {manifest.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C8AE7D]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-2.5">
            {!manifest.mandatory && (
              <button
                type="button"
                onClick={onLater}
                className="min-h-[42px] flex-1 rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-200 hover:bg-[#2A3444]"
              >
                Daha Sonra
              </button>
            )}
            <button
              type="button"
              disabled={updating}
              onClick={onUpdateNow}
              className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-60"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
              <span>{updating ? 'Güncelleniyor...' : 'Şimdi Güncelle'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
