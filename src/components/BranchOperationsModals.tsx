import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpCircle,
  Building2,
  Check,
  Coffee,
  Crown,
  Edit3,
  Hammer,
  LayoutGrid,
  List,
  MapPin,
  Megaphone,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type {
  AdCampaignTierId,
  BranchConceptIconId,
  BranchUpgradeTrackId,
  EmpireState,
  OwnedBusiness,
} from '../types/game';
import {
  BRANCH_BRAND_COLORS,
  BRANCH_CONCEPT_ICONS,
  BRANCH_FACILITY_MAX_LEVEL,
  BRANCH_MARKETING_CAMPAIGNS,
  BRANCH_UPGRADE_TRACKS,
  getBranchFacilityLevel,
  getBranchFacilityTotalMultiplier,
  getBranchFacilityUpgradeCost,
  getBranchTrackRevenueMultiplier,
  getDefaultConceptIconForSector,
} from '../game/branchOpsEngine';
import { getBlueprintById } from '../game/catalog';
import {
  calculateBusinessHourlyIncome,
  formatTL,
  isBusinessUnderConstruction,
} from '../game/economy';
import { getBranchStaffSlots } from '../game/hrEngine';
import { calculateBranchServiceQuality } from '../game/officeEngine';
import { isAdCampaignActive } from '../game/strategyEngine';

export function BranchConceptGlyph({
  iconId,
  className = 'h-4 w-4',
}: {
  iconId: BranchConceptIconId;
  className?: string;
}) {
  switch (iconId) {
    case 'coffee':
      return <Coffee className={className} />;
    case 'utensils':
      return <UtensilsCrossed className={className} />;
    case 'store':
      return <Store className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'building':
    default:
      return <Building2 className={className} />;
  }
}

/** Procedural isometric mini-storefront SVG colored with the branch's brand color */
function MiniStorefrontArt({
  accentColor,
  level,
  compact = false,
}: {
  accentColor: string;
  level: number;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 110 74"
      aria-hidden="true"
      className={compact ? 'h-12 w-16 shrink-0' : 'h-16 w-24 shrink-0 lg:h-20 lg:w-28'}
    >
      <defs>
        <linearGradient id={`roof-${accentColor.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#1E293B" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="56" cy="64" rx="42" ry="7" fill="#020617" opacity="0.55" />
      {/* Left building wall */}
      <polygon points="18,30 56,44 56,64 18,50" fill="#172542" stroke={accentColor} strokeOpacity="0.35" strokeWidth="1" />
      {/* Right building wall */}
      <polygon points="56,44 92,30 92,50 56,64" fill="#0F1B33" stroke={accentColor} strokeOpacity="0.28" strokeWidth="1" />
      {/* Upper floor if level >= 2 */}
      {level >= 2 && (
        <>
          <polygon points="24,18 56,29 56,40 24,29" fill="#1E3156" stroke={accentColor} strokeOpacity="0.35" strokeWidth="0.9" />
          <polygon points="56,29 86,18 86,29 56,40" fill="#132240" stroke={accentColor} strokeOpacity="0.28" strokeWidth="0.9" />
        </>
      )}
      {/* Roof */}
      <polygon
        points={level >= 2 ? '56,8 88,18 56,29 22,18' : '56,16 94,30 56,44 16,30'}
        fill={`url(#roof-${accentColor.replace('#', '')})`}
        stroke={accentColor}
        strokeWidth="1.2"
      />
      {/* Awning stripes */}
      <polygon points="22,36 52,47 50,51 20,40" fill={accentColor} opacity="0.9" />
      {/* Lit shop windows */}
      <polygon points="26,43 38,47 38,54 26,50" fill="#FDE68A" opacity="0.88" />
      <polygon points="42,49 50,52 50,60 42,57" fill="#38BDF8" opacity="0.82" />
      <polygon points="62,48 74,43 74,52 62,57" fill="#FDE68A" opacity="0.72" />
      <polygon points="78,41 86,38 86,47 78,50" fill="#38BDF8" opacity="0.6" />
      {/* Glowing sign pill on roof */}
      <rect x="44" y={level >= 2 ? '11' : '22'} width="24" height="5" rx="2.5" fill={accentColor} />
    </svg>
  );
}

/* ============================================================================
   ADIM 2 — ŞUBE SEÇİMİ EKRANI (KART & LİSTE GÖRÜNÜMÜ)
   ============================================================================ */
interface BranchSelectorModalProps {
  state: EmpireState;
  now: number;
  viewMode: 'card' | 'list';
  selectedBranchId: string | null;
  onChangeViewMode: (mode: 'card' | 'list') => void;
  onSelectBranch: (businessId: string) => void;
  onManageBranch: (businessId: string) => void;
  onFocusOnMap: (businessId: string) => void;
  onEnterInterior: (businessId: string) => void;
  onGoMapNewBranch: () => void;
  onClose: () => void;
}

export function BranchSelectorModal({
  state,
  now,
  viewMode,
  selectedBranchId,
  onChangeViewMode,
  onSelectBranch,
  onManageBranch,
  onFocusOnMap,
  onEnterInterior,
  onGoMapNewBranch,
  onClose,
}: BranchSelectorModalProps) {
  const businesses = state.businesses;
  const activeSelected =
    businesses.find((b) => b.id === selectedBranchId) ?? businesses[0] ?? null;

  const getBranchStats = (biz: OwnedBusiness) => {
    const bp = getBlueprintById(biz.blueprintId);
    const underConst = isBusinessUnderConstruction(biz);
    const hourly = underConst
      ? 0
      : calculateBusinessHourlyIncome(biz, state.activeEvent, now, businesses, state);
    const dailyRevenue = Math.max(0, Math.round(hourly * 24));
    const quality = calculateBranchServiceQuality(biz, state.cityManagers ?? [], businesses);
    const slots = getBranchStaffSlots(biz);
    const staffCount = slots.workers + slots.assistantManagers + slots.branchManagers;
    const staffSlots = slots.maxWorkers + slots.maxAssistantManagers + slots.maxBranchManagers;
    const accentColor = biz.brandColor || BRANCH_BRAND_COLORS[0];
    const conceptIcon = biz.conceptIcon || getDefaultConceptIconForSector(biz.blueprintId);
    const facilityMult = getBranchFacilityTotalMultiplier(biz);
    return {
      bp,
      underConst,
      dailyRevenue,
      quality,
      staffCount,
      staffSlots,
      accentColor,
      conceptIcon,
      facilityMult,
    };
  };

  return (
    <div
      data-testid="branch-selector-modal"
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-[#050A17]/78 p-2 lg:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#334155] bg-[#0D162A]/90 px-3 py-2 lg:px-5 lg:py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide lg:text-base">
              <span className="text-slate-400">İŞLETMELERİM</span>
              <span className="text-[#7E96B0]">&gt;</span>
              <span className="text-white">ŞUBE SEÇ</span>
              <span className="ml-1 rounded-full border border-[#334155] bg-[#7E96B0]/15 px-2 py-0.5 font-mono-num text-[10px] font-bold text-[#7E96B0]">
                {businesses.length} Şube
              </span>
            </div>
            <p className="text-[10px] text-slate-400 lg:text-xs">
              İşlemlerini yönetmek ve özelleştirmek istediğin şubeyi seç
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#0A1224] p-0.5">
              <span className="hidden pl-2 text-[9px] font-bold tracking-wider text-slate-400 sm:inline">
                GÖRÜNÜM:
              </span>
              <button
                type="button"
                data-testid="branch-view-card-btn"
                onClick={() => onChangeViewMode('card')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-all lg:text-xs ${
                  viewMode === 'card'
                    ? 'bg-[#7E96B0]/15 text-cyan-100 ring-1 ring-cyan-400/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="h-3 w-3" />
                KART
              </button>
              <button
                type="button"
                data-testid="branch-view-list-btn"
                onClick={() => onChangeViewMode('list')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition-all lg:text-xs ${
                  viewMode === 'list'
                    ? 'bg-[#7E96B0]/15 text-cyan-100 ring-1 ring-cyan-400/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="h-3 w-3" />
                LİSTE
              </button>
            </div>

            <button
              type="button"
              data-testid="branch-selector-close-btn"
              onClick={onClose}
              aria-label="Şube seçimini kapat"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#334155] bg-[#1D2532] text-slate-300 transition-colors hover:border-[#B86B5E]/45 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="panel-scroll min-h-0 flex-1 p-2.5 lg:p-4">
          {businesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#334155] bg-[#0D1629]/70 px-6 py-10 text-center">
              <Building2 className="h-10 w-10 text-[#7E96B0]/75" />
              <h3 className="mt-2.5 text-sm font-extrabold text-white lg:text-base">
                Henüz Açılmış Şubeniz Yok
              </h3>
              <p className="mt-1 max-w-md text-xs text-slate-400">
                Türkiye haritasında istediğiniz il ve caddeye pin bırakarak sınırsız sayıda yeni şube kurabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoMapNewBranch();
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-4 py-2 text-xs font-extrabold text-amber-100 hover:bg-[#C8AE7D]/15"
              >
                <MapPin className="h-4 w-4" />
                Haritada İlk Şubeni Kur
              </button>
            </div>
          ) : viewMode === 'card' ? (
            /* ==================== KART GÖRÜNÜMÜ ==================== */
            <div
              data-testid="branch-selector-card-grid"
              className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3"
            >
              {businesses.map((biz) => {
                const s = getBranchStats(biz);
                const isSelected = activeSelected?.id === biz.id;
                return (
                  <div
                    key={biz.id}
                    data-testid={`branch-card-${biz.id}`}
                    onClick={() => onSelectBranch(biz.id)}
                    style={{
                      borderColor: isSelected ? s.accentColor : `${s.accentColor}55`,
                    }}
                    className={`group flex cursor-pointer flex-col justify-between rounded-[20px] border bg-[#222B38] p-2.5 transition-all hover:brightness-110 lg:p-3.5 ${
                      isSelected ? '' : ''
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border lg:h-9 lg:w-9"
                          style={{
                            borderColor: `${s.accentColor}70`,
                            backgroundColor: `${s.accentColor}22`,
                            color: s.accentColor,
                          }}
                        >
                          <BranchConceptGlyph iconId={s.conceptIcon} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-extrabold text-white lg:text-sm">
                            {biz.customName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 lg:text-[11px]">
                            <span className="font-mono-num font-bold text-[#7E96B0]">
                              Sv. {biz.level}
                            </span>
                            <span>·</span>
                            <span className="truncate">{s.bp?.name ?? biz.blueprintId}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          s.underConst
                            ? 'bg-[#C8AE7D]/15 text-[#C8AE7D]'
                            : 'bg-[#7A9E7E]/15 text-[#7A9E7E]'
                        }`}
                      >
                        {s.underConst ? `${biz.constructionDaysRemaining}G` : 'Aktif'}
                      </span>
                    </div>

                    {/* Middle Illustration + Revenue & Stars */}
                    <div className="my-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[9.5px] text-slate-400 lg:text-[11px]">
                          {biz.cityName} / {biz.districtName}
                        </div>
                        {s.underConst ? (
                          <div className="flex items-center gap-1 font-mono-num text-[11px] font-bold text-[#C8AE7D] lg:text-xs">
                            <Hammer className="h-3.5 w-3.5" />
                            İnşaat Sürüyor
                          </div>
                        ) : (
                          <div className="font-mono-num text-xs font-extrabold text-[#7A9E7E] lg:text-sm">
                            {formatTL(s.dailyRevenue, true)}
                            <span className="ml-0.5 text-[9.5px] font-semibold text-slate-400">
                              /gün
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 font-mono-num text-[10px] text-[#C8AE7D]">
                          <Star className="h-3 w-3 fill-amber-400 text-[#C8AE7D]" />
                          <span>{s.quality.stars.toFixed(1)}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-300">
                            {s.staffCount}/{s.staffSlots} Pers.
                          </span>
                        </div>
                      </div>
                      <MiniStorefrontArt
                        accentColor={s.accentColor}
                        level={biz.level}
                        compact
                      />
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      data-testid={`branch-manage-btn-${biz.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageBranch(biz.id);
                      }}
                      className="flex min-h-[30px] w-full items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-cyan-500/20 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-amber-100 transition-all hover:brightness-125 active:scale-[0.98] lg:min-h-[36px] lg:text-xs"
                    >
                      YÖNET & ÖZELLEŞTİR
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==================== LİSTE GÖRÜNÜMÜ (SOL SATIRLAR + SAĞ DETAY) ==================== */
            <div
              data-testid="branch-selector-list-view"
              className="grid grid-cols-12 gap-2.5 lg:gap-4"
            >
              {/* Left Branch Rows */}
              <div className="col-span-7 space-y-1.5">
                {businesses.map((biz) => {
                  const s = getBranchStats(biz);
                  const isSelected = activeSelected?.id === biz.id;
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      data-testid={`branch-list-row-${biz.id}`}
                      onClick={() => onSelectBranch(biz.id)}
                      style={{
                        borderColor: isSelected ? s.accentColor : 'rgba(51,65,85,0.7)',
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-all lg:px-3.5 lg:py-2.5 ${
                        isSelected
                          ? 'bg-[#172848]/95 '
                          : 'bg-[#101A30]/85 hover:bg-[#152340]/90'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                          style={{
                            borderColor: `${s.accentColor}65`,
                            backgroundColor: `${s.accentColor}20`,
                            color: s.accentColor,
                          }}
                        >
                          <BranchConceptGlyph iconId={s.conceptIcon} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[11px] font-extrabold text-white lg:text-xs">
                              {biz.customName}
                            </span>
                            <span className="shrink-0 font-mono-num text-[10px] font-bold text-[#7E96B0]">
                              (Sv. {biz.level})
                            </span>
                          </div>
                          <div className="truncate text-[9.5px] text-slate-400 lg:text-[11px]">
                            {s.bp?.name ?? biz.blueprintId} · {biz.cityName}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-mono-num text-[11px] font-extrabold text-[#7A9E7E] lg:text-xs">
                          {s.underConst
                            ? `${biz.constructionDaysRemaining}G İnşaat`
                            : formatTL(s.dailyRevenue, true)}
                        </div>
                        <div className="font-mono-num text-[9.5px] text-[#C8AE7D]">
                          ★ {s.quality.stars.toFixed(1)} · {s.staffCount}/{s.staffSlots}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Selected Branch Detail Panel */}
              {activeSelected && (() => {
                const s = getBranchStats(activeSelected);
                return (
                  <div
                    data-testid="branch-list-detail-panel"
                    style={{ borderColor: `${s.accentColor}65` }}
                    className="col-span-5 flex flex-col justify-between rounded-[20px] border bg-[#222B38] p-3 lg:p-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                            style={{
                              borderColor: `${s.accentColor}70`,
                              backgroundColor: `${s.accentColor}22`,
                              color: s.accentColor,
                            }}
                          >
                            <BranchConceptGlyph iconId={s.conceptIcon} className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3
                              data-testid="branch-list-detail-name"
                              className="truncate text-xs font-extrabold text-white lg:text-sm"
                            >
                              {activeSelected.customName}
                            </h3>
                            <p className="text-[10px] font-bold text-[#7E96B0] lg:text-xs">
                              Sv. {activeSelected.level} ·{' '}
                              <span
                                className={
                                  s.underConst ? 'text-[#C8AE7D]' : 'text-[#7A9E7E]'
                                }
                              >
                                {s.underConst ? 'İnşaatta' : 'Aktif'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="my-2.5 flex items-center justify-center rounded-xl border border-[#334155] bg-[#0A1224]/75 py-2">
                        <MiniStorefrontArt
                          accentColor={s.accentColor}
                          level={activeSelected.level}
                        />
                      </div>

                      <div className="space-y-1.5 rounded-xl border border-[#334155] bg-[#0B1325]/85 p-2.5 text-[10.5px] lg:text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Günlük Gelir:</span>
                          <span className="font-mono-num font-extrabold text-[#7A9E7E]">
                            {formatTL(s.dailyRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Personel:</span>
                          <span className="font-mono-num font-extrabold text-white">
                            {s.staffCount} / {s.staffSlots}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Hizmet Kalitesi:</span>
                          <span className="flex items-center gap-1 font-mono-num font-extrabold text-[#C8AE7D]">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-[#C8AE7D]" />
                            {s.quality.stars.toFixed(1)} / 5
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Geliştirme Çarpanı:</span>
                          <span className="font-mono-num font-extrabold text-[#7E96B0]">
                            x{s.facilityMult.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <button
                        type="button"
                        data-testid="branch-list-manage-btn"
                        onClick={() => onManageBranch(activeSelected.id)}
                        className="flex min-h-[34px] w-full items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D] px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-amber-100 transition-all hover:brightness-115 lg:min-h-[40px] lg:text-xs"
                      >
                        YÖNET & ÖZELLEŞTİR
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onFocusOnMap(activeSelected.id);
                          }}
                          className="rounded-lg border border-[#334155] bg-[#1D2532] py-1 text-[10px] font-bold text-slate-200 hover:bg-[#2A3444]"
                        >
                          Haritada Gör
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEnterInterior(activeSelected.id);
                          }}
                          className="rounded-lg border border-[#334155] bg-[#1D2532] py-1 text-[10px] font-bold text-slate-200 hover:bg-[#2A3444]"
                        >
                          İç Mekan 3D
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ADIM 3 — ŞUBE YÖNETİM & ÖZELLEŞTİRME PENCERESİ (3 SÜTUN)
   ============================================================================ */
interface BranchManagementModalProps {
  state: EmpireState;
  business: OwnedBusiness;
  now: number;
  onBackToSelector: () => void;
  onClose: () => void;
  onCustomizeBranch: (
    businessId: string,
    updates: {
      customName: string;
      brandColor: string;
      conceptIcon: BranchConceptIconId;
    }
  ) => boolean;
  onLaunchMarketing: (businessId: string, tierId: AdCampaignTierId) => boolean;
  onUpgradeFacility: (businessId: string, trackId: BranchUpgradeTrackId) => boolean;
}

export function BranchManagementModal({
  state,
  business,
  now,
  onBackToSelector,
  onClose,
  onCustomizeBranch,
  onLaunchMarketing,
  onUpgradeFacility,
}: BranchManagementModalProps) {
  const [nameDraft, setNameDraft] = useState(business.customName);
  const [colorDraft, setColorDraft] = useState(
    business.brandColor || BRANCH_BRAND_COLORS[0]
  );
  const [iconDraft, setIconDraft] = useState<BranchConceptIconId>(
    business.conceptIcon || getDefaultConceptIconForSector(business.blueprintId)
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setNameDraft(business.customName);
    setColorDraft(business.brandColor || BRANCH_BRAND_COLORS[0]);
    setIconDraft(
      business.conceptIcon || getDefaultConceptIconForSector(business.blueprintId)
    );
    setSavedNotice(false);
  }, [business.id, business.customName, business.brandColor, business.conceptIcon, business.blueprintId]);

  const hourly = isBusinessUnderConstruction(business)
    ? 0
    : calculateBusinessHourlyIncome(
        business,
        state.activeEvent,
        now,
        state.businesses,
        state
      );
  const dailyRevenue = Math.max(0, Math.round(hourly * 24));
  const totalFacilityMult = getBranchFacilityTotalMultiplier(business);
  const activeCampaign = isAdCampaignActive(business.activeAdCampaign, state.gameMinutes)
    ? business.activeAdCampaign
    : null;

  const handleSaveIdentity = () => {
    const ok = onCustomizeBranch(business.id, {
      customName: nameDraft,
      brandColor: colorDraft,
      conceptIcon: iconDraft,
    });
    if (ok) {
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2200);
    }
  };

  return (
    <div
      data-testid="branch-management-modal"
      className="fixed inset-0 z-[1060] flex items-center justify-center bg-[#050A17]/80 p-2 lg:p-5"
      onClick={onClose}
    >
      <div
        className="flex max-h-[93vh] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] border border-[#334155] bg-[#222B38]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Back Arrow & Close */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#334155] bg-[#0C1528]/95 px-3 py-2 lg:px-5 lg:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              data-testid="branch-manage-back-btn"
              onClick={onBackToSelector}
              aria-label="Şube seçimine geri dön"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0] transition-colors hover:bg-[#7E96B0]/15"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate text-xs font-extrabold tracking-wide lg:text-base">
                <span className="hidden text-slate-400 sm:inline">İŞLETMELERİM</span>
                <span className="hidden text-[#7E96B0] sm:inline">&gt;</span>
                <span
                  data-testid="branch-manage-title"
                  className="truncate uppercase text-white"
                >
                  {business.customName} YÖNETİMİ
                </span>
              </div>
              <p className="text-[10px] text-slate-400 lg:text-xs">
                İsim Değiştir, Reklam Ver, Geliştir · Günlük Ciro:{' '}
                <strong className="font-mono-num text-[#7A9E7E]">
                  {formatTL(dailyRevenue, true)}
                </strong>{' '}
                · Toplam Çarpan:{' '}
                <strong className="font-mono-num text-[#7E96B0]">
                  x{totalFacilityMult.toFixed(2)}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="branch-manage-close-btn"
            onClick={onClose}
            aria-label="Yönetim penceresini kapat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#1D2532] text-slate-300 transition-colors hover:border-[#B86B5E]/45 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Column Management Grid */}
        <div className="panel-scroll grid min-h-0 flex-1 grid-cols-1 gap-2.5 p-2.5 sm:grid-cols-3 lg:gap-3.5 lg:p-4">
          {/* ==============================================================
              COLUMN 1: İŞLETME ÖZELLEŞTİRME
             ============================================================== */}
          <div
            data-testid="branch-manage-col-customize"
            className="flex flex-col justify-between rounded-[20px] border border-[#334155] bg-[#222B38] p-3 lg:p-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#334155] bg-[#7E96B0]/15 text-[#7E96B0]">
                  <Store className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-extrabold tracking-wide text-white lg:text-sm">
                  İŞLETME ÖZELLEŞTİRME
                </h3>
              </div>

              {/* Branch Name Input */}
              <div>
                <label
                  htmlFor="branch-custom-name-input"
                  className="mb-1 block text-[10px] font-bold text-slate-300 lg:text-xs"
                >
                  İşletme İsmi
                </label>
                <div className="relative">
                  <input
                    id="branch-custom-name-input"
                    data-testid="branch-name-input"
                    type="text"
                    maxLength={42}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Örn: Kadıköy Kafe"
                    className="w-full rounded-xl border border-slate-600/80 bg-[#0A1224] py-1.5 pl-3 pr-8 text-xs font-bold text-white outline-none transition-colors focus:border-[#334155] lg:py-2 lg:text-sm"
                  />
                  <Edit3 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Brand Color Swatches */}
              <div>
                <div className="mb-1.5 text-[10px] font-bold text-slate-300 lg:text-xs">
                  Logo & Konsept Rengi
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BRANCH_BRAND_COLORS.map((hex) => {
                    const active = colorDraft === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        data-testid={`branch-color-${hex.replace('#', '')}`}
                        onClick={() => setColorDraft(hex)}
                        aria-label={`Renk ${hex}`}
                        style={{ backgroundColor: hex }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform ${
                          active
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0E182D]'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-[#181F29]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concept Icon Picker */}
              <div>
                <div className="mb-1.5 text-[10px] font-bold text-slate-300 lg:text-xs">
                  Konsept İkonu
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {BRANCH_CONCEPT_ICONS.map((item) => {
                    const active = iconDraft === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`branch-icon-${item.id}`}
                        onClick={() => setIconDraft(item.id)}
                        style={{
                          borderColor: active ? colorDraft : 'rgba(51,65,85,0.7)',
                          backgroundColor: active ? `${colorDraft}24` : 'rgba(10,18,36,0.8)',
                        }}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border py-1.5 text-[9.5px] font-bold text-slate-200 transition-all hover:brightness-110 lg:py-2"
                      >
                        <span style={{ color: active ? colorDraft : '#94A3B8' }}>
                          <BranchConceptGlyph iconId={item.id} className="h-4 w-4" />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="branch-save-customize-btn"
              onClick={handleSaveIdentity}
              className="mt-3 flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#334155] bg-[#7E96B0] px-3 py-1.5 text-xs font-extrabold tracking-wide text-cyan-50 transition-all hover:brightness-115 active:scale-[0.98] lg:min-h-[40px]"
            >
              {savedNotice ? (
                <>
                  <Check className="h-4 w-4 text-[#7A9E7E]" />
                  KAYDEDİLDİ
                </>
              ) : (
                'KAYDET'
              )}
            </button>
          </div>

          {/* ==============================================================
              COLUMN 2: REKLAM & PAZARLAMA
             ============================================================== */}
          <div
            data-testid="branch-manage-col-marketing"
            className="flex flex-col justify-between rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] p-3 lg:p-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D]">
                  <Megaphone className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-extrabold tracking-wide text-white lg:text-sm">
                  REKLAM & PAZARLAMA
                </h3>
              </div>

              {activeCampaign && (
                <div
                  data-testid="branch-active-campaign-banner"
                  className="rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2.5 py-1.5 text-[10px] text-[#7A9E7E] lg:text-[11px]"
                >
                  <div className="font-extrabold">
                    Aktif Kampanya: {activeCampaign.label}
                  </div>
                  <div className="font-mono-num text-[9.5px] text-[#7A9E7E]">
                    +%{Math.round(activeCampaign.customerBoost * 100)} müşteri · +%
                    {Math.round(activeCampaign.revenueBoost * 100)} ciro
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {BRANCH_MARKETING_CAMPAIGNS.map((camp) => {
                  const canAfford = state.cash >= camp.cost;
                  const isRunningThis = activeCampaign?.tierId === camp.id;
                  return (
                    <div
                      key={camp.id}
                      data-testid={`branch-campaign-${camp.id}`}
                      className="rounded-xl border border-[#334155] bg-[#0C1428]/90 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-extrabold text-white lg:text-xs">
                            {camp.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-mono-num text-[10px]">
                            <span className="font-bold text-[#C8AE7D]">
                              {formatTL(camp.cost)}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="font-bold text-[#7A9E7E]">
                              +%{camp.customerBoostPct} müşteri
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono-num text-[9.5px] font-bold text-slate-400">
                          {camp.durationGameHours}s
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid={`branch-campaign-btn-${camp.id}`}
                        disabled={!canAfford}
                        onClick={() => onLaunchMarketing(business.id, camp.id)}
                        className={`mt-2 flex min-h-[28px] w-full items-center justify-center rounded-lg border px-2.5 py-1 text-[10px] font-extrabold tracking-wide transition-all lg:min-h-[32px] lg:text-[11px] ${
                          !canAfford
                            ? 'cursor-not-allowed border-[#334155] bg-[#1D2532] text-slate-500'
                            : isRunningThis
                            ? 'border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-emerald-100 hover:bg-[#7A9E7E]/15'
                            : camp.id === 'brochure'
                            ? 'border-[#334155] bg-[#7E96B0]/15 text-cyan-100 hover:bg-[#7E96B0]/15'
                            : 'border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-amber-100 hover:bg-[#C8AE7D]/15'
                        }`}
                      >
                        {!canAfford
                          ? 'YETERSİZ BAKİYE'
                          : isRunningThis
                          ? 'SÜREYİ YENİLE'
                          : camp.id === 'brochure'
                          ? 'YAYINLA'
                          : 'SATIN AL / YAYINLA'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ==============================================================
              COLUMN 3: ŞUBE GELİŞTİRMELERİ
             ============================================================== */}
          <div
            data-testid="branch-manage-col-upgrades"
            className="flex flex-col justify-between rounded-[20px] border border-[#C8AE7D]/45 bg-[#222B38] p-3 lg:p-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 text-[#C8AE7D]">
                  <ArrowUpCircle className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-extrabold tracking-wide text-white lg:text-sm">
                  ŞUBE GELİŞTİRMELERİ
                </h3>
              </div>

              <div className="space-y-2">
                {BRANCH_UPGRADE_TRACKS.map((track) => {
                  const lvl = getBranchFacilityLevel(business, track.id);
                  const isMax = lvl >= BRANCH_FACILITY_MAX_LEVEL;
                  const cost = getBranchFacilityUpgradeCost(business, track.id);
                  const currentMult = getBranchTrackRevenueMultiplier(business, track.id);
                  const nextMult = Number((currentMult + track.revenueStepBonus).toFixed(2));
                  const pct = Math.round((lvl / BRANCH_FACILITY_MAX_LEVEL) * 100);
                  const canAfford = !isMax && state.cash >= cost;

                  return (
                    <div
                      key={track.id}
                      data-testid={`branch-upgrade-track-${track.id}`}
                      className="rounded-xl border border-[#334155] bg-[#0C1428]/90 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-extrabold text-white lg:text-xs">
                          {track.name}
                        </span>
                        <span
                          data-testid={`branch-upgrade-lvl-${track.id}`}
                          className="shrink-0 font-mono-num text-[10px] font-extrabold text-[#7E96B0]"
                        >
                          Sv. {lvl}/{BRANCH_FACILITY_MAX_LEVEL}
                        </span>
                      </div>

                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1D2532]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-300 transition-all"
                          style={{ width: `${Math.max(10, pct)}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[9.5px] lg:text-[10.5px]">
                        <span className="text-slate-400">Günlük Gelir Çarpanı:</span>
                        <span className="font-mono-num font-extrabold text-[#C8AE7D]">
                          x{currentMult.toFixed(2)}
                          {!isMax && (
                            <span className="ml-1 text-[#7A9E7E]">
                              → x{nextMult.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid={`branch-upgrade-btn-${track.id}`}
                        disabled={!canAfford}
                        onClick={() => onUpgradeFacility(business.id, track.id)}
                        className={`mt-2 flex min-h-[28px] w-full items-center justify-center rounded-lg border px-2.5 py-1 text-[10px] font-extrabold tracking-wide transition-all lg:min-h-[32px] lg:text-[11px] ${
                          isMax
                            ? 'cursor-default border-[#7A9E7E]/45 bg-[#7A9E7E]/15 text-[#7A9E7E]'
                            : !canAfford
                            ? 'cursor-not-allowed border-[#334155] bg-[#1D2532] text-slate-500'
                            : 'border-[#334155] bg-[#7E96B0] text-[#181F29] hover:brightness-125'
                        }`}
                      >
                        {isMax
                          ? 'MAKSİMUM SEVİYE'
                          : `YÜKSELT ${formatTL(cost, true)}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
