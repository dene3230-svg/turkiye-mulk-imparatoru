import { useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Coffee,
  Coins,
  FileSignature,
  Hotel,
  Lock,
  MapPin,
  ShoppingBag,
  Store,
  TrendingUp,
  X,
} from 'lucide-react';
import type { EmpireState, JobCategoryId, JobListing } from '../types/game';
import {
  CAREER_RANKS,
  JOB_CATEGORIES,
  canApplyForJob,
  createInitialCareerState,
  generateCityJobListings,
  getCareerRankDef,
  getNextCareerRank,
  getUnlockedCityPlates,
  type ShiftCompletionOutcome,
} from '../game/careerEngine';
import { FIRST_SHOP_ENTRY_COST } from '../game/catalog';
import { formatTL } from '../game/economy';
import {
  OUTFIT_OPTIONS,
  createDefaultCharacterProfile,
  getTraitOption,
  resolveEffectiveCharacterOutfit,
} from '../game/characterEngine';
import { getProvinceByPlate } from '../game/provinces81';
import { soundEngine } from '../services/soundEngine';
import { CharacterAvatar2D } from './CharacterAvatar2D';
import { ShiftScene2D } from './ShiftScene2D';

interface CareerWorkspaceProps {
  state: EmpireState;
  playerLevel: number;
  characterName: string;
  initialCityPlate: number;
  initialDistrictName?: string | null;
  onCollectTip: (amount: number) => void;
  onCompleteShift: (job: JobListing, uncollectedTips: number) => ShiftCompletionOutcome;
  onGoOpenFirstShop: () => void;
}

function JobCategoryIcon({ category }: { category: JobCategoryId }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (category) {
    case 'kafe_restoran':
      return <Coffee className={`${cls} text-[#C8AE7D]`} strokeWidth={1.5} />;
    case 'magaza':
      return <ShoppingBag className={`${cls} text-[#7A9E7E]`} strokeWidth={1.5} />;
    case 'ofis':
      return <Building2 className={`${cls} text-[#7E96B0]`} strokeWidth={1.5} />;
    case 'otel_turizm':
      return <Hotel className={`${cls} text-[#B89B72]`} strokeWidth={1.5} />;
  }
}

export function CareerWorkspace({
  state,
  playerLevel,
  characterName,
  initialCityPlate,
  initialDistrictName,
  onCollectTip,
  onCompleteShift,
  onGoOpenFirstShop,
}: CareerWorkspaceProps) {
  const unlockedPlates = useMemo(() => getUnlockedCityPlates(state), [state]);
  const [selectedCityPlate, setSelectedCityPlate] = useState<number>(() =>
    unlockedPlates.includes(initialCityPlate) ? initialCityPlate : unlockedPlates[0] ?? 34
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrictName || '');
  const [categoryFilter, setCategoryFilter] = useState<JobCategoryId | 'all'>('all');
  const [contractJob, setContractJob] = useState<JobListing | null>(null);
  const [activeShiftJob, setActiveShiftJob] = useState<JobListing | null>(null);

  const career = state.career ?? createInitialCareerState();
  const currentRank = getCareerRankDef(career.rankId);
  const nextRank = getNextCareerRank(career.rankId);
  const activeProv = getProvinceByPlate(selectedCityPlate);

  const allListings = useMemo(
    () =>
      generateCityJobListings(
        selectedCityPlate,
        selectedDistrict || undefined,
        career.rankId
      ),
    [selectedCityPlate, selectedDistrict, career.rankId]
  );

  const filteredListings = useMemo(() => {
    if (categoryFilter === 'all') return allListings;
    return allListings.filter((job) => job.category === categoryFilter);
  }, [allListings, categoryFilter]);

  const firstShopPct = Math.min(100, Math.round((state.cash / FIRST_SHOP_ENTRY_COST) * 100));

  const resolvedCharacter = useMemo(
    () => state.character ?? createDefaultCharacterProfile(characterName, 'male'),
    [state.character, characterName]
  );
  const effectiveOutfit = useMemo(
    () => resolveEffectiveCharacterOutfit(resolvedCharacter, state),
    [resolvedCharacter, state]
  );
  const activeTrait = useMemo(
    () => (state.character ? getTraitOption(state.character.traitId) : null),
    [state.character]
  );
  const effectiveOutfitLabel =
    effectiveOutfit === 'takim_elbise'
      ? 'Takım Elbise (Yönetici)'
      : OUTFIT_OPTIONS.find((o) => o.id === effectiveOutfit)?.label ?? 'Başlangıç Kıyafeti';

  if (activeShiftJob) {
    return (
      <ShiftScene2D
        job={activeShiftJob}
        career={career}
        playerCash={state.cash}
        ownBusinessCount={state.businesses.length}
        characterName={characterName}
        character={resolvedCharacter}
        effectiveOutfit={effectiveOutfit}
        onCollectTip={onCollectTip}
        onCompleteShift={onCompleteShift}
        onExitShift={() => setActiveShiftJob(null)}
        onGoOpenFirstShop={() => {
          setActiveShiftJob(null);
          onGoOpenFirstShop();
        }}
      />
    );
  }

  return (
    <div
      data-testid="career-workspace"
      className="flex h-full w-full flex-col gap-3 overflow-y-auto bg-[#181F29] p-3 lg:p-5 panel-scroll"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-slate-100 lg:text-xl">
            KİŞİSEL &amp; İŞ HAYATI
          </h2>
          <p className="text-xs text-slate-400">
            {activeProv.code} {activeProv.name} açık iş ilanları · Statü:{' '}
            <span className="font-semibold text-[#C8AE7D]">{currentRank.title}</span>
          </p>
        </div>

        {/* Unlocked City & District Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-[14px] border border-[#334155] bg-[#222B38] px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
            <select
              aria-label="Açık Şehir Seç"
              value={selectedCityPlate}
              onChange={(e) => {
                setSelectedCityPlate(Number(e.target.value));
                setSelectedDistrict('');
              }}
              className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none"
            >
              {unlockedPlates.map((plate) => {
                const p = getProvinceByPlate(plate);
                return (
                  <option key={plate} value={plate} className="bg-[#222B38] text-slate-100">
                    {p.code} {p.name}
                  </option>
                );
              })}
            </select>
          </div>

          <select
            aria-label="İlçe Filtrele"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="min-h-[34px] rounded-[14px] border border-[#334155] bg-[#222B38] px-3 text-xs font-medium text-slate-200 focus:border-[#C8AE7D] focus:outline-none"
          >
            <option value="">Tüm İlçeler ({activeProv.name})</option>
            {activeProv.districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* First Shop Capital Milestone Strip (Visible while player is saving for 1st business) */}
      {state.businesses.length === 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
              <Store className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
              <span>İlk Dükkânını Kurma Hedefi (Mikro Kafe Girişimci Desteği)</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#334155] bg-[#181F29]">
              <div
                className="h-full rounded-full bg-[#C8AE7D] transition-all duration-300"
                style={{ width: `${firstShopPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Mevcut Sermaye:{' '}
                <strong className="font-mono-num text-[#7A9E7E]">{formatTL(state.cash)}</strong>
              </span>
              <span>
                Hedef:{' '}
                <strong className="font-mono-num text-[#C8AE7D]">
                  {formatTL(FIRST_SHOP_ENTRY_COST)}
                </strong>{' '}
                (%{firstShopPct})
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={state.cash < FIRST_SHOP_ENTRY_COST}
            onClick={() => {
              soundEngine.playClick();
              onGoOpenFirstShop();
            }}
            className={`min-h-[40px] shrink-0 rounded-[14px] px-4 text-xs font-bold whitespace-nowrap ${
              state.cash >= FIRST_SHOP_ENTRY_COST
                ? 'bg-[#7A9E7E] text-[#181F29] hover:bg-[#89AE8D]'
                : 'border border-[#334155] bg-[#181F29] text-slate-500 cursor-not-allowed'
            }`}
          >
            {state.cash >= FIRST_SHOP_ENTRY_COST
              ? 'İlk Dükkânı Aç → Harita'
              : `${formatTL(Math.max(0, FIRST_SHOP_ENTRY_COST - state.cash))} daha biriktir`}
          </button>
        </section>
      )}

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="İş İlanı Kategorileri"
        className="flex flex-wrap items-center gap-1.5"
      >
        {JOB_CATEGORIES.map((cat) => {
          const active = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`job-filter-${cat.id}`}
              onClick={() => {
                soundEngine.playClick();
                setCategoryFilter(cat.id);
              }}
              className={`min-h-[34px] rounded-[12px] border px-3 text-xs font-semibold whitespace-nowrap ${
                active
                  ? 'border-[#C8AE7D]/70 bg-[#334155] text-slate-100'
                  : 'border-[#334155] bg-[#222B38] text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Layout: Listings + Career Progress */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Job Listings Grid */}
        <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:col-span-8">
          {filteredListings.map((job) => {
            const check = canApplyForJob(job, playerLevel, career.rankId);
            return (
              <article
                key={job.id}
                data-testid={`job-card-${job.id}`}
                className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[#334155] bg-[#181F29]">
                        <JobCategoryIcon category={job.category} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-100">{job.title}</h3>
                        <p className="truncate text-xs text-slate-400">
                          {job.workplaceName} · {job.districtName}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono-num text-sm font-bold text-[#7A9E7E]">
                      {formatTL(job.dailyWage)}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{job.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#7E96B0]" strokeWidth={1.5} />
                      {job.shiftHoursLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-[#C8AE7D]" strokeWidth={1.5} />
                      Bahşiş: ₺{job.tipRange[0]}–₺{job.tipRange[1]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#7E96B0]">
                      +{job.xpReward} XP
                    </span>
                    <span className="text-slate-400">Gereken: Sv.{job.requiredLevel}</span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#334155]/70">
                  {check.eligible ? (
                    <button
                      type="button"
                      data-testid={`select-job-btn-${job.id}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setContractJob(job);
                      }}
                      className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#C8AE7D] px-3 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
                    >
                      <FileSignature className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>Sözleşme Detayları</span>
                    </button>
                  ) : (
                    <div className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#334155] bg-[#181F29] px-3 text-[11px] font-medium text-slate-400">
                      <Lock className="h-3.5 w-3.5 text-[#B86B5E]" strokeWidth={1.5} />
                      <span>{check.reason}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Right Sidebar: Career Stats & Promotion Ladder */}
        <aside className="flex flex-col gap-3 lg:col-span-4">
          <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
              <Briefcase className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
              <span>Kariyer Özeti</span>
            </div>

            {/* Character Identity & Active Trait Strip */}
            <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-[#334155] bg-[#181F29] p-2.5">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[12px] border border-[#334155] bg-[#222B38]">
                <CharacterAvatar2D
                  profile={resolvedCharacter}
                  effectiveOutfit={effectiveOutfit}
                  mode="bust"
                />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="truncate font-bold text-slate-100">{characterName}</div>
                <div className="mt-0.5 truncate text-[11px] text-[#C8AE7D]">
                  Kıyafet: {effectiveOutfitLabel}
                </div>
                {activeTrait && (
                  <div className="mt-0.5 truncate text-[11px] text-[#7A9E7E]">
                    Yetenek: {activeTrait.title} ({activeTrait.bonusBadge})
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3">
                <div className="text-[11px] text-slate-400">Tamamlanan Vardiya</div>
                <div className="mt-1 font-mono-num text-base font-bold text-slate-100">
                  {career.shiftsCompleted}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3">
                <div className="text-[11px] text-slate-400">Kariyer XP</div>
                <div className="mt-1 font-mono-num text-base font-bold text-[#7E96B0]">
                  {career.careerXp} XP
                </div>
              </div>
              <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3">
                <div className="text-[11px] text-slate-400">Toplam Maaş</div>
                <div className="mt-1 font-mono-num text-sm font-bold text-[#7A9E7E]">
                  {formatTL(career.totalWagesEarned)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#334155] bg-[#181F29] p-3">
                <div className="text-[11px] text-slate-400">Toplam Bahşiş</div>
                <div className="mt-1 font-mono-num text-sm font-bold text-[#C8AE7D]">
                  {formatTL(career.totalTipsEarned)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#334155] bg-[#222B38] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
              <Award className="h-4 w-4 text-[#C8AE7D]" strokeWidth={1.5} />
              <span>Terfi Basamakları</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {CAREER_RANKS.map((rank) => {
                const isCurrent = rank.id === currentRank.id;
                const isDone = career.shiftsCompleted >= rank.minShifts;
                return (
                  <div
                    key={rank.id}
                    className={`rounded-[14px] border p-3 ${
                      isCurrent
                        ? 'border-[#C8AE7D]/70 bg-[#C8AE7D]/10'
                        : 'border-[#334155] bg-[#181F29]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-100">{rank.title}</span>
                      <span className="font-mono-num text-[11px] font-semibold text-[#7A9E7E]">
                        {rank.wageMultiplier.toFixed(2)}x Maaş
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400">
                      {rank.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className={isDone ? 'text-[#7A9E7E]' : 'text-slate-500'}>
                        {isDone ? 'Açıldı' : `${rank.minShifts} vardiya gerekli`}
                      </span>
                      {rank.promotionBonusCash > 0 && (
                        <span className="font-mono-num text-[#C8AE7D]">
                          +{formatTL(rank.promotionBonusCash)} prim
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {nextRank && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-[#7A9E7E]" strokeWidth={1.5} />
                <span>
                  {nextRank.title} terfisine{' '}
                  <strong className="text-slate-100">
                    {Math.max(0, nextRank.minShifts - career.shiftsCompleted)} vardiya
                  </strong>{' '}
                  kaldı.
                </span>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Contract Details Modal */}
      {contractJob && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="job-contract-modal"
          className="fixed inset-0 z-[1240] flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-[20px] border border-[#334155] bg-[#222B38] p-5 text-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C8AE7D]">
                  Sözleşme Detayları
                </p>
                <h3 className="mt-0.5 text-base font-bold text-slate-100">
                  {contractJob.workplaceName}
                </h3>
                <p className="text-xs text-slate-400">
                  Pozisyon: {contractJob.title} · {contractJob.cityName} / {contractJob.districtName}
                </p>
              </div>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setContractJob(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#334155] bg-[#181F29] text-slate-300 hover:bg-[#2A3444]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-[16px] border border-[#334155] bg-[#181F29] p-3.5 text-xs">
              <div>
                <div className="text-[11px] text-slate-400">Günlük Vardiya Maaşı</div>
                <div className="mt-0.5 font-mono-num text-sm font-bold text-[#7A9E7E]">
                  {formatTL(contractJob.dailyWage)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Vardiya Saatleri</div>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-slate-100">
                  {contractJob.shiftHoursLabel}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Müşteri Başı Bahşiş</div>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-[#C8AE7D]">
                  ₺{contractJob.tipRange[0]} – ₺{contractJob.tipRange[1]}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Vardiya Deneyimi</div>
                <div className="mt-0.5 font-mono-num text-sm font-semibold text-[#7E96B0]">
                  +{contractJob.xpReward} XP
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {contractJob.perks.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#7A9E7E]" strokeWidth={1.5} />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setContractJob(null)}
                className="min-h-[42px] rounded-[14px] border border-[#334155] bg-[#181F29] px-4 text-xs font-semibold text-slate-300 hover:bg-[#2A3444]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                data-testid="sign-contract-start-btn"
                onClick={() => {
                  soundEngine.playClick();
                  const jobToStart = contractJob;
                  setContractJob(null);
                  setActiveShiftJob(jobToStart);
                }}
                className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#C8AE7D] px-4 text-xs font-bold text-[#181F29] hover:bg-[#D2BB8E]"
              >
                <FileSignature className="h-4 w-4" strokeWidth={1.75} />
                <span>Sözleşmeyi İmzala ve İşe Başla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
