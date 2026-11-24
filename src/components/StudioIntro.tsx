import { useEffect, useState } from 'react';
import { APP_VERSION } from '../services/otaUpdate';

interface StudioIntroProps {
  onComplete: () => void;
}

export function StudioIntro({ onComplete }: StudioIntroProps) {
  const [progress, setProgress] = useState(12);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(58), 220);
    const t2 = setTimeout(() => setProgress(100), 950);
    const t3 = setTimeout(() => setFading(true), 1550);
    const t4 = setTimeout(() => onComplete(), 1900);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        onComplete();
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
  }, [onComplete]);

  return (
    <div
      data-testid="studio-intro"
      onClick={onComplete}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080E1C] text-white transition-opacity duration-300 safe-inset cursor-pointer ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center px-6 text-center">
        {/* Framed App Logo */}
        <div className="relative mb-5 rounded-[26px] p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_18px_50px_rgba(217,119,6,0.28)]">
          <div className="h-[clamp(80px,18vh,124px)] w-[clamp(80px,18vh,124px)] overflow-hidden rounded-[22px] bg-[#0B1426]">
            <img
              src="./icon.png"
              alt="Türkiye Mülk İmparatoru Logosu"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* fu Games Studio Wordmark */}
        <div className="text-[clamp(1.65rem,3.4vw,2.5rem)] font-extrabold tracking-tight text-white">
          <span className="text-amber-400">fu</span> Games
        </div>
        <p className="mt-1 font-display text-[clamp(0.85rem,1.5vw,1.1rem)] tracking-[0.14em] text-amber-200/90">
          TÜRKİYE MÜLK İMPARATORU
        </p>

        {/* Smooth loading progress bar */}
        <div className="mt-6 w-[clamp(180px,28vw,280px)] overflow-hidden rounded-full bg-slate-800/90 h-1.5">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Sürüm {APP_VERSION} · Geçmek için dokunun
        </p>
      </div>
    </div>
  );
}
