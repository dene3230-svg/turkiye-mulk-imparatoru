import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import { APP_VERSION } from '../services/otaUpdate';

interface StudioIntroProps {
  onComplete: () => void;
}

export function StudioIntro({ onComplete }: StudioIntroProps) {
  const [progress, setProgress] = useState(14);
  const [fading, setFading] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(58), 220);
    const t2 = setTimeout(() => setProgress(100), 900);
    const t3 = setTimeout(() => setFading(true), 1450);
    const t4 = setTimeout(() => finishIntro(), 1800);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', onKey);
    };
  }, [finishIntro]);

  return (
    <div
      data-testid="studio-intro"
      onClick={finishIntro}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#181F29] text-slate-100 transition-opacity duration-300 safe-inset cursor-pointer ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center rounded-[20px] border border-[#334155] bg-[#222B38] px-10 py-8 text-center">
        {/* Minimal Matte Crown Emblem */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#C8AE7D]/55 bg-[#181F29]">
          <Crown className="h-8 w-8 text-[#C8AE7D]" strokeWidth={1.5} />
        </div>

        {/* Studio & Game Title */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7E96B0]">
          fu Games
        </p>
        <h1 className="mt-1.5 text-[clamp(1.25rem,2.4vw,1.8rem)] font-bold tracking-[0.14em] text-slate-100">
          MÜLK İMPARATORLUĞU
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Türkiye Ticaret &amp; Gayrimenkul Simülasyonu
        </p>

        {/* Matte Progress Bar */}
        <div className="mt-6 h-1.5 w-[clamp(190px,28vw,270px)] overflow-hidden rounded-full bg-[#181F29] border border-[#334155]/70">
          <div
            className="h-full rounded-full bg-[#C8AE7D] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-[11px] text-slate-400 font-mono-num">
          Sürüm {APP_VERSION} · Geçmek için dokunun
        </p>
      </div>
    </div>
  );
}
