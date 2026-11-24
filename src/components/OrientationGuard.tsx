import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Yatay Ekran Uyarısı"
      data-testid="orientation-guard"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080E1C] px-6 text-center text-white safe-inset"
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-amber-400/35 bg-slate-900 shadow-2xl">
        <div className="animate-rotate-phone text-amber-400">
          <Smartphone className="h-12 w-12" strokeWidth={1.75} />
        </div>
      </div>

      <div className="mb-4 flex h-14 w-14 overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-900 shadow-lg">
        <img
          src="./icon.png"
          alt="Türkiye Mülk İmparatoru"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-amber-300">
        Lütfen Cihazınızı Yatay Çevirin
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
        Türkiye Mülk İmparatoru, geniş harita ve yönetim panelleri için yalnızca yatay (landscape)
        ekran modunda çalışmaktadır.
      </p>
    </div>
  );
}
