import React from 'react';
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import type { DaySimAutoStopAlert } from '../types/game';
import { formatTL } from '../game/economy';

interface DaySimAutoStopModalProps {
  alert: DaySimAutoStopAlert | null;
  onClose: () => void;
  onPrimaryAction: (alert: DaySimAutoStopAlert) => void;
}

export const DaySimAutoStopModal: React.FC<DaySimAutoStopModalProps> = ({
  alert,
  onClose,
  onPrimaryAction,
}) => {
  if (!alert) return null;

  const styleMap = {
    construction_completed: {
      border: 'border-emerald-500/50',
      badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
      badgeText: 'İNŞAAT TAMAMLANDI',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      cta: 'İşletmelerimi Görüntüle',
      ctaClass: 'from-emerald-500 to-teal-500 text-slate-950',
    },
    payment_due: {
      border: 'border-amber-500/55',
      badge: 'bg-amber-500/20 text-amber-200 border-amber-400/45',
      badgeText: 'VADE / VERGİ UYARISI',
      icon: <CalendarClock className="w-6 h-6 text-amber-400" />,
      cta: 'Finans & Ödemelere Git',
      ctaClass: 'from-amber-400 to-orange-500 text-slate-950',
    },
    critical_cash: {
      border: 'border-rose-500/60',
      badge: 'bg-rose-500/20 text-rose-200 border-rose-400/50',
      badgeText: 'KRİTİK NAKİT KORUMASI',
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
      cta: 'Muhasebe Raporunu Aç',
      ctaClass: 'from-rose-500 to-red-500 text-white',
    },
  };

  const cfg = styleMap[alert.reason];

  return (
    <div
      className="fixed inset-0 z-[1550] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-label={alert.title}
      data-testid="day-sim-autostop-modal"
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-slate-950/96 border ${cfg.border} shadow-2xl overflow-hidden`}
      >
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/75">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${cfg.badge}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {cfg.badgeText}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {alert.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.message}</p>
            </div>
          </div>

          {alert.businessName && (
            <div className="rounded-xl bg-emerald-950/35 border border-emerald-500/35 px-3 py-2 flex items-center gap-2 text-xs text-emerald-200 font-bold">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{alert.businessName}</span>
            </div>
          )}

          {alert.amount !== undefined && alert.amount > 0 && (
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">İlgili Tutar</span>
              <span className="font-mono-num font-extrabold text-white">
                {formatTL(alert.amount)}
              </span>
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
            Otomatik Durdurma Koruması devreye girdi: Oyun hızı güvenli şekilde{' '}
            <strong className="text-amber-300">1x</strong> hızına düşürüldü.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200"
            >
              Haritada Kal
            </button>
            <button
              type="button"
              onClick={() => onPrimaryAction(alert)}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${cfg.ctaClass} font-extrabold text-xs shadow-lg`}
            >
              {cfg.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
