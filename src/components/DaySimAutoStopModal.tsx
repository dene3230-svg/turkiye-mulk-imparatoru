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
      border: 'border-[#7A9E7E]/45',
      badge: 'bg-[#7A9E7E]/15 text-[#7A9E7E] border-[#7A9E7E]/45',
      badgeText: 'İNŞAAT TAMAMLANDI',
      icon: <CheckCircle2 className="w-6 h-6 text-[#7A9E7E]" />,
      cta: 'İşletmelerimi Görüntüle',
      ctaClass: 'from-emerald-500 to-teal-500 text-[#181F29]',
    },
    payment_due: {
      border: 'border-[#C8AE7D]/45',
      badge: 'bg-[#C8AE7D]/15 text-[#C8AE7D] border-[#C8AE7D]/45',
      badgeText: 'VADE / VERGİ UYARISI',
      icon: <CalendarClock className="w-6 h-6 text-[#C8AE7D]" />,
      cta: 'Finans & Ödemelere Git',
      ctaClass: 'from-amber-400 to-orange-500 text-[#181F29]',
    },
    critical_cash: {
      border: 'border-[#B86B5E]/45',
      badge: 'bg-[#B86B5E]/15 text-[#B86B5E] border-[#B86B5E]/45',
      badgeText: 'KRİTİK NAKİT KORUMASI',
      icon: <ShieldAlert className="w-6 h-6 text-[#B86B5E]" />,
      cta: 'Muhasebe Raporunu Aç',
      ctaClass: 'from-rose-500 to-red-500 text-white',
    },
  };

  const cfg = styleMap[alert.reason];

  return (
    <div
      className="fixed inset-0 z-[1550] flex items-center justify-center bg-black/70 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={alert.title}
      data-testid="day-sim-autostop-modal"
    >
      <div
        className={`w-full max-w-md rounded-[20px] bg-[#181F29] border ${cfg.border}  overflow-hidden`}
      >
        <div className="px-4 py-3 border-b border-[#334155] flex items-center justify-between gap-2 bg-[#222B38]">
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
            className="w-7 h-7 rounded-lg bg-[#1D2532] hover:bg-[#2A3444] text-slate-300 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#222B38] border border-[#334155] flex items-center justify-center shrink-0">
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
            <div className="rounded-xl bg-emerald-950/35 border border-[#7A9E7E]/45 px-3 py-2 flex items-center gap-2 text-xs text-[#7A9E7E] font-bold">
              <Building2 className="w-4 h-4 text-[#7A9E7E] shrink-0" />
              <span className="truncate">{alert.businessName}</span>
            </div>
          )}

          {alert.amount !== undefined && alert.amount > 0 && (
            <div className="rounded-xl bg-[#222B38] border border-[#334155] px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">İlgili Tutar</span>
              <span className="font-mono-num font-extrabold text-white">
                {formatTL(alert.amount)}
              </span>
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-[#222B38] border border-[#334155] rounded-lg px-2.5 py-1.5">
            Otomatik Durdurma Koruması devreye girdi: Oyun hızı güvenli şekilde{' '}
            <strong className="text-[#C8AE7D]">1x</strong> hızına düşürüldü.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#1D2532] hover:bg-[#2A3444] border border-[#334155] text-xs font-bold text-slate-200"
            >
              Haritada Kal
            </button>
            <button
              type="button"
              onClick={() => onPrimaryAction(alert)}
              className={`px-4 py-2 rounded-xl bg-gradient-to-r ${cfg.ctaClass} font-extrabold text-xs `}
            >
              {cfg.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
