import { useEffect, useState } from 'react';
import { Crown, Smartphone } from 'lucide-react';

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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#181F29] px-6 text-center text-slate-100 safe-inset"
    >
      <div className="flex max-w-sm flex-col items-center rounded-[20px] border border-[#334155] bg-[#222B38] p-7">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[20px] border border-[#334155] bg-[#181F29]">
          <div className="animate-rotate-phone text-[#C8AE7D]">
            <Smartphone className="h-10 w-10" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#7E96B0]">
          <Crown className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
          <span>MÜLK İMPARATORLUĞU</span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-100">
          Lütfen Cihazınızı Yatay Çevirin
        </h1>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
          Geniş harita ve holding yönetim panelleri için uygulama yalnızca yatay (landscape) ekran
          modunda çalışmaktadır.
        </p>
      </div>
    </div>
  );
}
