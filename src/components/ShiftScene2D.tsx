import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Sparkles,
  Store,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type {
  CareerState,
  CharacterOutfitId,
  CharacterProfile,
  JobCategoryId,
  JobListing,
} from '../types/game';
import {
  CAREER_RANKS,
  getCareerRankDef,
  getNextCareerRank,
  type ShiftCompletionOutcome,
} from '../game/careerEngine';
import {
  createDefaultCharacterProfile,
  getTraitOption,
} from '../game/characterEngine';
import { FIRST_SHOP_ENTRY_COST } from '../game/catalog';
import { formatTL } from '../game/economy';
import { soundEngine } from '../services/soundEngine';
import { CharacterAvatar2D } from './CharacterAvatar2D';

interface ShiftScene2DProps {
  job: JobListing;
  career: CareerState;
  playerCash: number;
  ownBusinessCount: number;
  characterName: string;
  character?: CharacterProfile;
  effectiveOutfit?: CharacterOutfitId;
  onCollectTip: (amount: number) => void;
  onCompleteShift: (job: JobListing, uncollectedTips: number) => ShiftCompletionOutcome;
  onExitShift: () => void;
  onGoOpenFirstShop: () => void;
}

interface FloatingBubble {
  id: string;
  text: string;
  tone: 'cash' | 'xp' | 'tip';
  x: number;
  y: number;
}

function CutawayInteriorSvg({
  category,
  servingPulse,
  customerStep,
  workplaceName,
  character,
  effectiveOutfit,
}: {
  category: JobCategoryId;
  servingPulse: boolean;
  customerStep: number;
  workplaceName: string;
  character: CharacterProfile;
  effectiveOutfit?: CharacterOutfitId;
}) {
  const customerOffsetX = customerStep % 2 === 0 ? 0 : -14;

  return (
    <svg
      viewBox="0 0 640 320"
      className="h-full w-full select-none"
      role="img"
      aria-label={`${workplaceName} 2D vardiya çalışma sahnesi`}
    >
      {/* Matte Dark-Slate Architectural Cutaway Frame */}
      <rect x="0" y="0" width="640" height="320" rx="16" fill="#181F29" />

      {/* Back Wall */}
      <rect x="18" y="18" width="604" height="212" rx="10" fill="#202A37" stroke="#334155" strokeWidth="1.5" />
      {/* Subtle Wall Paneling Lines */}
      <line x1="18" y1="186" x2="622" y2="186" stroke="#2D3A4C" strokeWidth="1.5" />

      {/* Floor */}
      <rect x="18" y="230" width="604" height="72" rx="8" fill="#1C2430" stroke="#334155" strokeWidth="1.5" />
      <line x1="60" y1="265" x2="580" y2="265" stroke="#273344" strokeWidth="1" strokeDasharray="16 14" />

      {/* Ceiling Hanging Pendant Lamps */}
      {[170, 320, 470].map((lx) => (
        <g key={lx}>
          <line x1={lx} y1="18" x2={lx} y2="48" stroke="#475569" strokeWidth="2" />
          <path d={`M ${lx - 18} 58 Q ${lx} 42 ${lx + 18} 58 Z`} fill="#2C3848" stroke="#C8AE7D" strokeWidth="1.5" />
          <ellipse cx={lx} cy="60" rx="10" ry="3" fill="#C8AE7D" opacity="0.65" />
          <polygon points={`${lx - 14},62 ${lx + 14},62 ${lx + 54},175 ${lx - 54},175`} fill="#C8AE7D" opacity="0.05" />
        </g>
      ))}

      {/* Category-specific Back Wall Props */}
      {category === 'kafe_restoran' && (
        <g>
          {/* Chalkboard Menu */}
          <rect x="70" y="56" width="166" height="74" rx="8" fill="#181F29" stroke="#C8AE7D" strokeWidth="1.5" />
          <circle cx="102" cy="94" r="14" fill="#222B38" stroke="#C8AE7D" strokeWidth="1.5" />
          <path d="M 95 96 L 109 96 L 107 104 L 97 104 Z" fill="#C8AE7D" />
          <line x1="128" y1="76" x2="216" y2="76" stroke="#7E96B0" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="128" y1="92" x2="202" y2="92" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          <line x1="128" y1="108" x2="210" y2="108" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

          {/* Espresso Shelf */}
          <rect x="430" y="68" width="142" height="10" rx="4" fill="#334155" />
          {[446, 474, 502, 534].map((cx) => (
            <rect key={cx} x={cx} y="50" width="18" height="18" rx="3" fill="#2B3748" stroke="#7E96B0" strokeWidth="1.2" />
          ))}

          {/* Espresso Machine on Counter */}
          <rect x="78" y="144" width="76" height="50" rx="6" fill="#2D3A4B" stroke="#7E96B0" strokeWidth="1.6" />
          <rect x="90" y="154" width="52" height="14" rx="3" fill="#181F29" />
          <rect x="98" y="176" width="14" height="14" rx="2" fill="#C8AE7D" />
          <rect x="124" y="176" width="14" height="14" rx="2" fill="#E2E8F0" />
          {/* Animated Steam */}
          <path
            d="M 105 140 Q 100 130 107 122"
            fill="none"
            stroke="#C8AE7D"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="animate-shift-steam"
          />
          <path
            d="M 131 140 Q 136 130 129 122"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="animate-shift-steam"
          />
        </g>
      )}

      {category === 'magaza' && (
        <g>
          {/* Retail Shelves */}
          {[64, 210].map((sx) => (
            <g key={sx}>
              <rect x={sx} y="62" width="122" height="104" rx="6" fill="#1B2430" stroke="#334155" strokeWidth="1.5" />
              {[86, 114, 142].map((sy) => (
                <g key={sy}>
                  <line x1={sx + 8} y1={sy} x2={sx + 114} y2={sy} stroke="#334155" strokeWidth="2" />
                  <rect x={sx + 14} y={sy - 14} width="20" height="13" rx="2" fill="#7A9E7E" opacity="0.7" />
                  <rect x={sx + 42} y={sy - 16} width="24" height="15" rx="2" fill="#7E96B0" opacity="0.7" />
                  <rect x={sx + 74} y={sy - 13} width="28" height="12" rx="2" fill="#C8AE7D" opacity="0.75" />
                </g>
              ))}
            </g>
          ))}
          {/* Cash Register */}
          <rect x="92" y="156" width="66" height="38" rx="5" fill="#2D3A4B" stroke="#7A9E7E" strokeWidth="1.5" />
          <rect x="104" y="164" width="42" height="14" rx="2" fill="#181F29" />
          <text x="125" y="175" textAnchor="middle" fill="#7A9E7E" fontSize="9" fontWeight="700">
            ₺ POS
          </text>
        </g>
      )}

      {category === 'ofis' && (
        <g>
          {/* Panoramic Window with Matte City Skyline */}
          <rect x="64" y="48" width="240" height="108" rx="8" fill="#141B24" stroke="#334155" strokeWidth="1.5" />
          <rect x="82" y="88" width="28" height="68" fill="#243040" />
          <rect x="118" y="68" width="36" height="88" fill="#2B394D" />
          <rect x="164" y="78" width="32" height="78" fill="#243040" />
          <rect x="206" y="62" width="42" height="94" fill="#314158" />
          <rect x="256" y="96" width="30" height="60" fill="#243040" />
          {/* Chart Screen */}
          <rect x="430" y="62" width="136" height="74" rx="8" fill="#181F29" stroke="#7E96B0" strokeWidth="1.5" />
          <rect x="448" y="106" width="16" height="18" rx="2" fill="#7E96B0" />
          <rect x="472" y="96" width="16" height="28" rx="2" fill="#7A9E7E" />
          <rect x="496" y="84" width="16" height="40" rx="2" fill="#C8AE7D" />
          <rect x="520" y="74" width="16" height="50" rx="2" fill="#7A9E7E" />
          {/* Monitor on Desk */}
          <rect x="108" y="150" width="60" height="36" rx="4" fill="#222B38" stroke="#C8AE7D" strokeWidth="1.5" />
          <line x1="138" y1="186" x2="138" y2="196" stroke="#64748B" strokeWidth="3" />
        </g>
      )}

      {category === 'otel_turizm' && (
        <g>
          {/* Key Rack & Hotel Crest */}
          <rect x="74" y="58" width="170" height="96" rx="8" fill="#1B2330" stroke="#C8AE7D" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4].map((col) =>
            [0, 1, 2].map((row) => (
              <rect
                key={`${col}-${row}`}
                x={92 + col * 28}
                y={74 + row * 24}
                width="16"
                height="14"
                rx="3"
                fill="#263242"
                stroke="#C8AE7D"
                strokeWidth="1"
                opacity="0.8"
              />
            ))
          )}
          {/* Lobby Arch Window */}
          <path d="M 434 156 L 434 86 A 52 44 0 0 1 538 86 L 538 156 Z" fill="#161E28" stroke="#334155" strokeWidth="1.5" />
          <circle cx="486" cy="90" r="14" fill="#C8AE7D" opacity="0.2" />
        </g>
      )}

      {/* CUSTOMIZED PLAYER CHARACTER (Working behind Counter / Desk) */}
      <g
        transform={`translate(0, ${servingPulse ? -4 : 0})`}
        className="transition-transform duration-150"
      >
        <svg x="192" y="72" width="112" height="128" overflow="visible">
          <CharacterAvatar2D
            profile={character}
            effectiveOutfit={effectiveOutfit}
            mode="bust"
          />
        </svg>
        {/* Served Item (Cup / Package / Document) sliding across counter */}
        <rect
          x={servingPulse ? 300 : 290}
          y={servingPulse ? 166 : 174}
          width="18"
          height="18"
          rx="3"
          fill="#7A9E7E"
          stroke="#181F29"
          strokeWidth="1.6"
        />
      </g>

      {/* Main Counter / Desk Surface */}
      <rect x="44" y="192" width="356" height="16" rx="5" fill="#9E7E5B" stroke="#181F29" strokeWidth="1.8" />
      <rect x="52" y="208" width="340" height="72" rx="6" fill="#2A3545" stroke="#334155" strokeWidth="1.5" />
      <rect x="74" y="220" width="120" height="46" rx="6" fill="#222B38" stroke="#334155" strokeWidth="1" />
      <rect x="210" y="220" width="160" height="46" rx="6" fill="#222B38" stroke="#334155" strokeWidth="1" />

      {/* Counter Tip Jar Prop */}
      <g transform="translate(342, 162)">
        <rect x="0" y="6" width="26" height="24" rx="6" fill="#7E96B0" fillOpacity="0.22" stroke="#C8AE7D" strokeWidth="1.5" />
        <rect x="3" y="2" width="20" height="5" rx="2" fill="#C8AE7D" />
        <circle cx="9" cy="24" r="3" fill="#C8AE7D" />
        <circle cx="17" cy="23" r="3" fill="#C8AE7D" />
        <circle cx="13" cy="18" r="2.6" fill="#D2BB8E" />
      </g>

      {/* CUSTOMER 1 (Active at Counter) */}
      <g
        transform={`translate(${454 + customerOffsetX}, 126)`}
        className="transition-transform duration-300"
      >
        <circle cx="0" cy="0" r="15" fill="#E2BFA0" stroke="#181F29" strokeWidth="2" />
        <path d="M -14 -4 Q 0 -19 14 -3 Z" fill="#3B2F2F" />
        <circle cx="-4" cy="1" r="1.7" fill="#181F29" />
        <path d="M -18 22 Q 0 16 18 22 L 22 108 L -22 108 Z" fill="#7E96B0" stroke="#181F29" strokeWidth="2" />
        {/* Order Speech Bubble */}
        <g transform="translate(-52, -34)">
          <rect x="0" y="0" width="44" height="24" rx="10" fill="#222B38" stroke="#C8AE7D" strokeWidth="1.4" />
          <text x="22" y="15.5" textAnchor="middle" fill="#C8AE7D" fontSize="10" fontWeight="700">
            {servingPulse ? '✓' : 'Sipariş'}
          </text>
        </g>
      </g>

      {/* CUSTOMER 2 (Waiting in Queue) */}
      <g transform={`translate(${544 + customerOffsetX * 0.5}, 132)`} opacity="0.82">
        <circle cx="0" cy="0" r="14" fill="#D9B391" stroke="#181F29" strokeWidth="2" />
        <path d="M -13 -3 Q 0 -18 13 -2 Z" fill="#1E293B" />
        <path d="M -17 20 Q 0 15 17 20 L 20 102 L -20 102 Z" fill="#7A9E7E" stroke="#181F29" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function ShiftScene2D({
  job,
  career,
  playerCash,
  ownBusinessCount,
  characterName,
  character,
  effectiveOutfit,
  onCollectTip,
  onCompleteShift,
  onExitShift,
  onGoOpenFirstShop,
}: ShiftScene2DProps) {
  const resolvedCharacter = useMemo(
    () => character ?? createDefaultCharacterProfile(characterName, 'male'),
    [character, characterName]
  );
  const activeTrait = useMemo(
    () => (character ? getTraitOption(character.traitId) : null),
    [character]
  );
  const tipMultiplier = character?.traitId === 'sosyal' ? 1.2 : 1;

  const [elapsedSec, setElapsedSec] = useState(0);
  const [customersServed, setCustomersServed] = useState(0);
  const [tipJarAmount, setTipJarAmount] = useState(0);
  const [tipsCollectedInShift, setTipsCollectedInShift] = useState(0);
  const [servingPulse, setServingPulse] = useState(false);
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [outcome, setOutcome] = useState<ShiftCompletionOutcome | null>(null);

  const tipJarRef = useRef(0);
  tipJarRef.current = tipJarAmount;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onCompleteShift);
  onCompleteRef.current = onCompleteShift;

  const shiftDuration = Math.max(12, job.shiftDurationSec);
  const progressPct = Math.min(100, (elapsedSec / shiftDuration) * 100);

  const currentRank = useMemo(() => getCareerRankDef(career.rankId), [career.rankId]);
  const nextRank = useMemo(() => getNextCareerRank(career.rankId), [career.rankId]);

  const spawnBubble = useCallback((text: string, tone: FloatingBubble['tone'], x?: number, y?: number) => {
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const bx = x ?? 36 + Math.random() * 28;
    const by = y ?? 28 + Math.random() * 22;
    setBubbles((prev) => [...prev.slice(-7), { id, text, tone, x: bx, y: by }]);
    window.setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 1150);
  }, []);

  const serveOneCustomer = useCallback(
    (isManualBoost = false) => {
      if (completedRef.current) return;
      setServingPulse(true);
      window.setTimeout(() => setServingPulse(false), 240);

      setCustomersServed((c) => c + 1);
      const [minTip, maxTip] = job.tipRange;
      const tipGain =
        Math.round(
          (minTip + Math.random() * Math.max(10, maxTip - minTip)) * (isManualBoost ? 1.2 : 1)
        ) || minTip;
      setTipJarAmount((prev) => prev + tipGain);

      const sliceWage = Math.round(job.dailyWage / Math.max(8, Math.round(shiftDuration / 1.6)));
      spawnBubble(`+₺${sliceWage}`, 'cash', 38 + Math.random() * 14, 34);
      if (isManualBoost || Math.random() > 0.35) {
        spawnBubble(`+${Math.max(4, Math.round(job.xpReward / 10))} XP`, 'xp', 52 + Math.random() * 14, 24);
      }
      if (isManualBoost) {
        soundEngine.playClick();
        setElapsedSec((prev) => Math.min(shiftDuration, prev + 0.7));
      }
    },
    [job.dailyWage, job.tipRange, job.xpReward, shiftDuration, spawnBubble]
  );

  // Smooth shift progress timer (250ms ticks)
  useEffect(() => {
    if (outcome) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => Math.min(shiftDuration, prev + 0.25));
    }, 250);
    return () => window.clearInterval(timer);
  }, [outcome, shiftDuration]);

  // Complete shift cleanly outside state updater when timer finishes
  useEffect(() => {
    if (outcome || completedRef.current || elapsedSec < shiftDuration) return;
    completedRef.current = true;
    const res = onCompleteRef.current(job, tipJarRef.current);
    setTipJarAmount(0);
    setOutcome(res);
    soundEngine.playCashCollect();
  }, [elapsedSec, job, outcome, shiftDuration]);

  // Automatic customer service cycle every 1.65 seconds
  useEffect(() => {
    if (outcome) return;
    const serviceTimer = window.setInterval(() => {
      serveOneCustomer(false);
    }, 1650);
    return () => window.clearInterval(serviceTimer);
  }, [outcome, serveOneCustomer]);

  const handleCollectTipJar = () => {
    if (tipJarAmount <= 0 || outcome) return;
    const rawCollected = tipJarAmount;
    const credited = Math.round(rawCollected * tipMultiplier);
    setTipJarAmount(0);
    setTipsCollectedInShift((prev) => prev + credited);
    onCollectTip(rawCollected);
    soundEngine.playCashCollect();
    spawnBubble(`+₺${credited.toLocaleString('tr-TR')} Bahşiş!`, 'tip', 48, 42);
  };

  const handleStartAnotherShift = () => {
    soundEngine.playClick();
    completedRef.current = false;
    setOutcome(null);
    setElapsedSec(0);
    setCustomersServed(0);
    setTipJarAmount(0);
    setTipsCollectedInShift(0);
    setBubbles([]);
  };

  const canOpenFirstShop = ownBusinessCount === 0 && playerCash >= FIRST_SHOP_ENTRY_COST;

  return (
    <div
      data-testid="shift-scene-2d"
      className="flex h-full w-full flex-col gap-3 overflow-y-auto bg-[#181F29] p-3 lg:p-5 panel-scroll"
    >
      {/* Top Shift Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-[#334155] bg-[#222B38] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="exit-shift-btn"
            onClick={() => {
              soundEngine.playClick();
              onExitShift();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-200 hover:bg-[#2A3444]"
            aria-label="İş İlanlarına Dön"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 lg:text-base">
                {job.workplaceName} · {job.title}
              </h2>
              <span className="text-xs font-medium text-[#C8AE7D]">
                {job.cityName} / {job.districtName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Çalışan: {characterName} · Vardiya: {job.shiftHoursLabel} · Sabit Yevmiye:{' '}
              <span className="font-mono-num font-semibold text-[#7A9E7E]">
                {formatTL(job.dailyWage)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeTrait && (
            <div className="rounded-[14px] border border-[#C8AE7D]/45 bg-[#181F29] px-3 py-1.5">
              <span className="font-semibold text-[#C8AE7D]">{activeTrait.title}</span>
              <span className="ml-1 font-mono-num text-slate-300">({activeTrait.bonusBadge})</span>
            </div>
          )}
          <div className="rounded-[14px] border border-[#334155] bg-[#181F29] px-3 py-1.5">
            <span className="text-slate-400">Hizmet Edilen: </span>
            <span className="font-mono-num font-bold text-slate-100">{customersServed} Müşteri</span>
          </div>
          <div className="rounded-[14px] border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-3 py-1.5">
            <span className="text-slate-300">Kasa: </span>
            <span className="font-mono-num font-bold text-[#7A9E7E]">{formatTL(playerCash)}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Interactive Cutaway + Control Cards */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Left: 2D Animated Cutaway Interior */}
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38] p-3 lg:col-span-8">
          <div className="relative w-full overflow-hidden rounded-[16px] border border-[#334155]/80 bg-[#181F29]">
            <CutawayInteriorSvg
              category={job.category}
              servingPulse={servingPulse}
              customerStep={customersServed}
              workplaceName={job.workplaceName}
              character={resolvedCharacter}
              effectiveOutfit={effectiveOutfit}
            />

            {/* Floating +₺ and +XP Bubbles */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {bubbles.map((b) => (
                <div
                  key={b.id}
                  style={{ left: `${b.x}%`, top: `${b.y}%` }}
                  className={`animate-float-cash absolute rounded-full border px-2.5 py-0.5 font-mono-num text-xs font-bold whitespace-nowrap ${
                    b.tone === 'cash'
                      ? 'border-[#7A9E7E]/60 bg-[#181F29]/90 text-[#7A9E7E]'
                      : b.tone === 'tip'
                      ? 'border-[#C8AE7D]/70 bg-[#181F29]/95 text-[#C8AE7D]'
                      : 'border-[#7E96B0]/60 bg-[#181F29]/90 text-[#9EC0DF]'
                  }`}
                >
                  {b.text}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Service Action Strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-[#334155] bg-[#181F29] px-3.5 py-2.5">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100">Aktif Vardiya:</span> Karakterin müşterilere
              otomatik servis sunar; hızlı servis ederek vardiyayı hızlandırıp ekstra bahşiş kazanabilirsin.
            </div>
            <button
              type="button"
              data-testid="quick-serve-btn"
              disabled={Boolean(outcome)}
              onClick={() => serveOneCustomer(true)}
              className="flex min-h-[40px] items-center gap-1.5 rounded-[14px] bg-[#C8AE7D] px-4 py-2 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:opacity-50 whitespace-nowrap"
            >
              <Zap className="h-4 w-4" strokeWidth={1.75} />
              <span>Hızlı Servis Et</span>
            </button>
          </div>
        </div>

        {/* Right: Shift Progress, Clickable Tip Jar, Promotion Ladder */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* 1. Shift Duration Progress Card */}
          <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <Clock className="h-4 w-4 text-[#7E96B0]" strokeWidth={1.5} />
                <span>Vardiya Süresi</span>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#C8AE7D]">
                %{Math.round(progressPct)}
              </span>
            </div>

            <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-[#181F29] border border-[#334155]">
              <div
                data-testid="shift-progress-bar"
                className="h-full rounded-full bg-[#7A9E7E] transition-all duration-200"
                style={{ width: `${progressPct.toFixed(1)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{job.shiftHoursLabel}</span>
              <span className="font-mono-num">
                {Math.max(0, Math.ceil(shiftDuration - elapsedSec))} sn kaldı
              </span>
            </div>
          </section>

          {/* 2. Clickable Tip Jar Card */}
          <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <Coins className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
                <span>Bahşiş Kavanozu</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Bu vardiya: {formatTL(tipsCollectedInShift)}
              </span>
            </div>

            <button
              type="button"
              data-testid="collect-tip-jar-btn"
              disabled={tipJarAmount <= 0 || Boolean(outcome)}
              onClick={handleCollectTipJar}
              className={`mt-3 flex min-h-[56px] w-full items-center justify-between rounded-[16px] border px-4 py-2.5 text-left transition-colors ${
                tipJarAmount > 0 && !outcome
                  ? 'border-[#C8AE7D] bg-[#C8AE7D]/15 text-slate-100 hover:bg-[#C8AE7D]/25'
                  : 'border-[#334155] bg-[#181F29] text-slate-400'
              }`}
            >
              <div>
                <div className="text-xs font-bold">
                  {tipJarAmount > 0 ? 'Bahşiş Topla' : 'Bahşiş Birikiyor...'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {tipJarAmount > 0
                    ? 'Kavanoza tıkla, anında kasaya aktar'
                    : 'Müşteriler memnun oldukça dolar'}
                </div>
              </div>
              <div className="font-mono-num text-base font-bold text-[#C8AE7D]">
                +{formatTL(tipJarAmount)}
              </div>
            </button>
          </section>

          {/* 3. Promotion Progress Card */}
          <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <Award className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
                <span>Terfi İlerlemesi</span>
              </div>
              <span className="text-xs font-semibold text-[#7A9E7E]">{currentRank.title}</span>
            </div>

            <div className="mt-3 space-y-2">
              {CAREER_RANKS.map((rank) => {
                const reached = career.shiftsCompleted >= rank.minShifts;
                return (
                  <div
                    key={rank.id}
                    className={`flex items-center justify-between rounded-[12px] border px-3 py-1.5 text-xs ${
                      rank.id === currentRank.id
                        ? 'border-[#C8AE7D]/70 bg-[#C8AE7D]/12 text-slate-100'
                        : reached
                        ? 'border-[#7A9E7E]/40 bg-[#181F29] text-slate-300'
                        : 'border-[#334155] bg-[#181F29]/60 text-slate-500'
                    }`}
                  >
                    <span className="font-semibold">{rank.title}</span>
                    <span className="font-mono-num text-[11px]">
                      {rank.wageMultiplier.toFixed(2)}x Maaş
                    </span>
                  </div>
                );
              })}
            </div>

            {nextRank ? (
              <p className="mt-2.5 text-[11px] text-slate-400">
                Sonraki terfi (<strong className="text-slate-200">{nextRank.title}</strong>) için{' '}
                <span className="font-mono-num font-bold text-[#C8AE7D]">
                  {Math.max(0, nextRank.minShifts - career.shiftsCompleted)} vardiya
                </span>{' '}
                kaldı (+{formatTL(nextRank.promotionBonusCash)} terfi primi).
              </p>
            ) : (
              <p className="mt-2.5 text-[11px] text-[#7A9E7E]">
                En yüksek çalışan kademesine ulaştın! Artık kendi dükkânını açma zamanı.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Shift Completion Overlay Modal */}
      {outcome && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="shift-complete-modal"
          className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#7A9E7E]/60 bg-[#181F29] text-[#7A9E7E]">
                <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Vardiya Tamamlandı!</h3>
                <p className="text-xs text-slate-400">
                  {job.workplaceName} · {customersServed} müşteriye hizmet edildi
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-[16px] border border-[#334155] bg-[#181F29] p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Vardiya Maaşı</span>
                <span className="font-mono-num font-bold text-[#7A9E7E]">
                  +{formatTL(outcome.wagePaid)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Toplam Bahşişler</span>
                <span className="font-mono-num font-bold text-[#C8AE7D]">
                  +{formatTL(tipsCollectedInShift + outcome.tipsIncluded)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kazanılan Deneyim</span>
                <span className="font-mono-num font-bold text-[#7E96B0]">
                  +{outcome.xpEarned} XP
                </span>
              </div>
              {outcome.promotedTo && (
                <div className="mt-2 flex items-center justify-between rounded-[12px] border border-[#C8AE7D]/50 bg-[#C8AE7D]/15 px-3 py-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#C8AE7D]">
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    <span>Terfi: {outcome.promotedTo.title}!</span>
                  </div>
                  <span className="font-mono-num font-bold text-[#7A9E7E]">
                    +{formatTL(outcome.promotionBonus)}
                  </span>
                </div>
              )}
            </div>

            {canOpenFirstShop && (
              <div className="mt-3 rounded-[14px] border border-[#7A9E7E]/50 bg-[#7A9E7E]/12 px-3.5 py-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-1.5 font-bold text-[#7A9E7E]">
                  <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
                  <span>İlk Dükkân Sermayesi Hazır!</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Kasan {formatTL(playerCash)} oldu. Haritada bir ilçe seçip kendi ilk kafeni açabilirsin!
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                data-testid="shift-again-btn"
                onClick={handleStartAnotherShift}
                className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
              >
                <Briefcase className="h-4 w-4" strokeWidth={1.75} />
                <span>Yeni Vardiya Başlat</span>
              </button>

              {canOpenFirstShop && (
                <button
                  type="button"
                  data-testid="shift-open-first-shop-btn"
                  onClick={() => {
                    soundEngine.playClick();
                    onGoOpenFirstShop();
                  }}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#7A9E7E] px-4 text-xs font-bold text-[#181F29] hover:bg-[#89AE8D]"
                >
                  <Store className="h-4 w-4" strokeWidth={1.75} />
                  <span>Haritada İlk Dükkânımı Kur</span>
                </button>
              )}

              <button
                type="button"
                data-testid="shift-back-listings-btn"
                onClick={() => {
                  soundEngine.playClick();
                  onExitShift();
                }}
                className="flex min-h-[40px] w-full items-center justify-center rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-200 hover:bg-[#2A3444]"
              >
                İş İlanlarına Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
