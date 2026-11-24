import { useState } from 'react';
import {
  MapPin,
  Clock,
  Users,
  Landmark,
  Trophy,
  ChevronRight,
  ChevronLeft,
  FastForward,
  CheckCircle2,
} from 'lucide-react';

interface GameTutorialOverlayProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  badge: string;
  body: string;
  tip: string;
  icon: typeof MapPin;
  positionClass: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '1. Haritada Pin Bırak & Merkez Üssünü Kur',
    badge: 'Harita & Merkez Üs (HQ)',
    body: 'Türkiye haritasında kara üzerinde herhangi bir caddeye tıklayarak 13 sektörden birini (Kafe, Restoran, Süpermarket, Otopark, Fabrika, AVM...) kurabilirsiniz. Kurduğunuz ilk işletme kalıcı Merkez Üssünüz (HQ) olur.',
    tip: 'Alt bardaki "Harita" butonu sizi doğrudan Merkez Üssünüze odaklar; deniz/göl alanları ve 75m içindeki şubeler otomatik korunur.',
    icon: MapPin,
    positionClass: 'bottom-[max(76px,calc(var(--safe-bottom)+72px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '2. Hasılatı Yönet & Zaman Hızını Kontrol Et',
    badge: 'Zaman Kontrolü (⏸ / 1x / 2x / 4x)',
    body: 'Üst bardaki takvim ve zaman kapsülüyle oyunu Durdur (⏸) moduna alıp planlama yapabilir, ya da 2x / 4x hızına alarak ciroları, fabrika üretimini ve borsayı hızlandırabilirsiniz.',
    tip: 'Şubelerde biriken hasılatı alttaki "Yönetim > İşletmelerim" ekranından tek tek veya "Tümünü Topla" ile kasaya aktarın.',
    icon: Clock,
    positionClass: 'top-[max(68px,calc(var(--safe-top)+64px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '3. Personel Kadrosu & Tam Otomasyon',
    badge: 'Yönetim · İK & Çalışanlar',
    body: 'Alttaki "Yönetim > İK & Çalışanlar" sekmesinden her şube için en fazla 4 Çalışan, 1 Müdür Yardımcısı ve 1 Şube Müdürü işe alın. Şube Müdürü, Bölge Sorumlusu ve Genel Müdür hasılatı her oyun saatinde otomatik tahsil eder!',
    tip: 'Müdür Yardımcısı stoğu otomatik yeniler; Şube Müdürü ise stok, bakım ve saatlik gelir tahsilatını tamamen otomatikleştirir.',
    icon: Users,
    positionClass: 'bottom-[max(76px,calc(var(--safe-bottom)+72px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '4. Muhasebe, Kredi Slider, Borsa & Yatırımlarım',
    badge: 'Finans Merkezi (4 Sekme)',
    body: 'Alttaki "Finans" panelinde Muhasebe bilançosu, kaydırma çubuklu (slider) Banka & Kredi piyasası, canlı BIST/IPO Borsası ve sahip olduğunuz hisseleri kâr-zararıyla takip ettiğiniz Yatırımlarım ekranı bir aradadır.',
    tip: 'Fabrika ve Zincir Market indirimlerinin net kârınıza etkisini Muhasebe sekmesinde canlı izleyin.',
    icon: Landmark,
    positionClass: 'bottom-[max(76px,calc(var(--safe-bottom)+72px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '5. Piyasa Haberleri, Dinamik Görevler & Menü',
    badge: 'Haberler · Görevler · Menü',
    body: 'Alt bardaki "Haberler" butonuyla ekonomik gündem ve faiz bültenini izleyin, "Görevler" ile sürekli yenilenen hedeflerden Nakit + XP kazanın. Liderlik, Holding & Franchise, Patron Sohbeti ve Ayarlar ise "Menü" altındadır.',
    tip: 'İstediğiniz zaman Menü > Oyun Rehberi veya Ayarlar üzerinden bu tura geri dönebilirsiniz.',
    icon: Trophy,
    positionClass: 'bottom-[max(76px,calc(var(--safe-bottom)+72px))] left-1/2 -translate-x-1/2',
  },
];

export function GameTutorialOverlay({
  open,
  onComplete,
  onSkip,
}: GameTutorialOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!open) return null;

  const step = TUTORIAL_STEPS[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === TUTORIAL_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Başlangıç Rehberi"
      data-testid="tutorial-overlay"
      className="pointer-events-auto fixed inset-0 z-[1280] bg-slate-950/45"
    >
      <div
        className={`fixed ${step.positionClass} w-[min(92vw,470px)] rounded-2xl border-2 border-amber-400/90 bg-white/98 p-3.5 text-slate-900 shadow-2xl dark:border-amber-500/80 dark:bg-slate-900/98 dark:text-slate-100`}
      >
        {/* Top bar: Step badge + Progress dots + Skip button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Rehber · {stepIdx + 1} / {TUTORIAL_STEPS.length} · {step.badge}
              </div>
              <h3 className="truncate text-xs font-extrabold sm:text-sm">{step.title}</h3>
            </div>
          </div>

          <button
            type="button"
            data-testid="tutorial-skip-btn"
            onClick={() => {
              setStepIdx(0);
              onSkip();
            }}
            className="flex min-h-[34px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <FastForward className="h-3.5 w-3.5" />
            <span>Rehberi Atla</span>
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
          {step.body}
        </p>

        <div className="mt-2 rounded-xl bg-amber-50/90 px-2.5 py-1.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>İpucu:</strong> {step.tip}
        </div>

        {/* Footer navigation */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx
                    ? 'w-5 bg-amber-600'
                    : i < stepIdx
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Geri</span>
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                data-testid="tutorial-next-btn"
                onClick={() => setStepIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
                className="flex min-h-[36px] items-center gap-1 rounded-xl bg-amber-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
              >
                <span>İleri</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="tutorial-finish-btn"
                onClick={() => {
                  setStepIdx(0);
                  onComplete();
                }}
                className="flex min-h-[36px] items-center gap-1 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Oyuna Başla</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
