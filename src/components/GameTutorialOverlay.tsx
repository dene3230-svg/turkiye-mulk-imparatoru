import { useState } from 'react';
import {
  MapPin,
  Clock,
  Users,
  Landmark,
  Briefcase,
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
    title: '1. Haritada Pin Bırak & İlk Şubeni Kur',
    badge: 'Harita & Merkez Üs',
    body: 'Sol menüdeki "Harita" sekmesinden Türkiye haritasında dilediğiniz noktaya pin bırakıp 14 sektörden birini kurabilirsiniz. İlk işletmeniz holdinginizin Merkez Üssü (HQ) olur.',
    tip: 'Sağ alttaki "İşletmeleri Keşfet →" veya "+ Yeni İşletme / Şube Kur" kartı sizi doğrudan haritaya taşır.',
    icon: MapPin,
    positionClass: 'bottom-[max(44px,calc(var(--safe-bottom)+32px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '2. 30 Saniyelik Gün Döngüsü & Zaman Kontrolü',
    badge: 'Duraklat (⏸) / Normal Hız (▶)',
    body: 'Üst bilgi çubuğundaki "Gün X • Gün Adı" göstergesinin yanından zamanı Duraklat (⏸) veya Normal Hız (▶) konumuna alabilirsiniz. Her 30 saniyede 1 oyun günü tamamlanır.',
    tip: 'İnce dolum çubuğu her 30 saniyede dolduğunda günlük ciro, giderler, kira ve kredi taksitleri otomatik hesaplanır.',
    icon: Clock,
    positionClass: 'top-[max(68px,calc(var(--safe-top)+60px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '3. 6 Slotlu Personel Kadrosu & Verimlilik',
    badge: 'İK & Personel Yönetimi',
    body: 'Her şube için en fazla 4 Çalışan, 1 Müdür Yardımcısı ve 1 Şube Müdürü atayabilirsiniz. Müdürler stok yenileme, bakım ve hasılat takibini otomatikleştirir.',
    tip: 'Sağ paneldeki "Personel" kartından veya şube kartlarındaki "YÖNET" butonundan ekibinizi yönetin.',
    icon: Users,
    positionClass: 'bottom-[max(44px,calc(var(--safe-bottom)+32px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '4. Finans, Banka, Borsa & Kiralık Mülkler',
    badge: 'Finans & Yatırım',
    body: 'Sol menüdeki "Finans" sekmesinden veya sağdaki "Yatırımlar & Borsa", "Banka" ve "Kiralık İlanları" kartlarından kredi çekebilir, hisse alıp satabilir ve pasif kira geliri oluşturabilirsiniz.',
    tip: 'Reklam & Tanıtım kampanyalarıyla tanınırlığınızı artırıp Franchise başvuruları ve Günlük Teklifler kazanın.',
    icon: Landmark,
    positionClass: 'bottom-[max(44px,calc(var(--safe-bottom)+32px))] left-1/2 -translate-x-1/2',
  },
  {
    title: '5. Ofisim, Günlük Raporlar & Prestij',
    badge: 'Holding Büyümesi',
    body: 'Ofisinizi yükselterek banka faiz indirimleri ve prestij bonusları açın. "Günlük Raporlar" ile tüm şubelerinizin kârlılığını ve gider kırılımını analiz edin.',
    tip: 'İstediğiniz zaman sol menüdeki "Ayarlar" ekranından bu rehberi tekrar başlatabilirsiniz.',
    icon: Briefcase,
    positionClass: 'bottom-[max(44px,calc(var(--safe-bottom)+32px))] left-1/2 -translate-x-1/2',
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
      className="pointer-events-auto fixed inset-0 z-[1280] bg-black/60"
    >
      <div
        className={`fixed ${step.positionClass} w-[min(92vw,470px)] rounded-[20px] border border-[#334155] bg-[#222B38] p-4 text-slate-100`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[#C8AE7D]/45 bg-[#181F29] text-[#C8AE7D]">
              <Icon className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#7E96B0]">
                Rehber · {stepIdx + 1} / {TUTORIAL_STEPS.length} · {step.badge}
              </div>
              <h3 className="truncate text-xs font-bold text-slate-100 sm:text-sm">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            data-testid="tutorial-skip-btn"
            onClick={() => {
              setStepIdx(0);
              onSkip();
            }}
            className="flex min-h-[34px] shrink-0 items-center gap-1 rounded-[12px] border border-[#334155] bg-[#181F29] px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-[#2A3444] whitespace-nowrap"
          >
            <FastForward className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Rehberi Atla</span>
          </button>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
          {step.body}
        </p>

        <div className="mt-2.5 rounded-[14px] border border-[#334155] bg-[#181F29] px-3 py-2 text-[11px] text-[#C8AE7D]">
          <strong className="font-semibold">İpucu:</strong>{' '}
          <span className="text-slate-300">{step.tip}</span>
        </div>

        {/* Footer navigation */}
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIdx
                    ? 'w-5 bg-[#C8AE7D]'
                    : i < stepIdx
                    ? 'w-2 bg-[#7A9E7E]'
                    : 'w-2 bg-[#334155]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="flex min-h-[36px] items-center gap-1 rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-xs font-semibold text-slate-200 hover:bg-[#2A3444]"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Geri</span>
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                data-testid="tutorial-next-btn"
                onClick={() => setStepIdx((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1))}
                className="flex min-h-[36px] items-center gap-1 rounded-[12px] bg-[#C8AE7D] px-3.5 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
              >
                <span>İleri</span>
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                data-testid="tutorial-finish-btn"
                onClick={() => {
                  setStepIdx(0);
                  onComplete();
                }}
                className="flex min-h-[36px] items-center gap-1 rounded-[12px] bg-[#7A9E7E] px-3.5 text-xs font-bold text-[#181F29] hover:bg-[#89AE8D]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Oyuna Başla</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
