import { X, ShieldAlert, MapPin, Handshake, Flame, Users, Building2, Swords, User } from 'lucide-react';
import type { RemoteBusinessRecord } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import { formatTL } from '../game/economy';
import {
  calculateCompetitiveBlitzCost,
  calculateDynamicTakeoverOffer,
} from '../game/strategyEngine';
import { isRealPlayerBusiness, parseOwnerAndHolding } from '../services/cityRoom';
import { BrandLogo } from './BrandLogo';

interface CompetitorInspectorProps {
  competitor: RemoteBusinessRecord;
  cash: number;
  ownBranchCount: number;
  maxBranches: number;
  hasBranchInCity: boolean;
  blitzActive: boolean;
  onTakeover: (record: RemoteBusinessRecord, multiplier?: number) => void;
  onLaunchBlitz: (record: RemoteBusinessRecord) => void;
  onOpenRivalsModal?: () => void;
  onClose: () => void;
}

export function CompetitorInspector({
  competitor,
  cash,
  ownBranchCount,
  maxBranches,
  hasBranchInCity,
  blitzActive,
  onTakeover,
  onLaunchBlitz,
  onOpenRivalsModal,
  onClose,
}: CompetitorInspectorProps) {
  const bp = getBlueprintById(competitor.business_type);
  const isRealPlayer = isRealPlayerBusiness(competitor);
  const { playerName, holdingName } = parseOwnerAndHolding(competitor.owner_name);
  const offer = calculateDynamicTakeoverOffer(competitor);
  const blitzCost = calculateCompetitiveBlitzCost(competitor);

  const hasQuota = ownBranchCount < maxBranches;
  const canAffordTakeover = cash >= offer.price;
  const canTakeover = hasQuota && canAffordTakeover;
  const canBlitz = hasBranchInCity && !blitzActive && cash >= blitzCost;

  return (
    <aside
      aria-label={`Rakip İşletme: ${competitor.business_name}`}
      data-testid="competitor-inspector"
      data-player-type={isRealPlayer ? 'real' : 'ai'}
      className={`pointer-events-auto flex h-full w-[clamp(290px,36vw,410px)] flex-col overflow-hidden rounded-2xl border bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl ${
        isRealPlayer ? 'border-cyan-400/60' : 'border-rose-500/50'
      }`}
    >
      {/* Fixed Header */}
      <div
        className={`flex shrink-0 items-start justify-between gap-2 border-b px-3.5 py-2.5 ${
          isRealPlayer
            ? 'border-cyan-500/35 bg-gradient-to-r from-rose-950/60 via-slate-900/95 to-cyan-950/60'
            : 'border-slate-800 bg-slate-900/90'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo brandKey={holdingName || competitor.owner_name} size={42} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase ${
                  isRealPlayer
                    ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-200'
                    : 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                }`}
              >
                {isRealPlayer ? (
                  <>
                    <Users className="h-3 w-3 shrink-0" />
                    <span>Canlı Oyuncu</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    <span>AI Holding</span>
                  </>
                )}
              </span>
              <span className="rounded-md border border-slate-600/70 bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                Sv.{competitor.level}
              </span>
            </div>
            <h2 className="mt-0.5 truncate text-sm font-black text-white">
              {competitor.business_name}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-300">
              <MapPin className="h-3 w-3 shrink-0 text-cyan-400" />
              <span className="truncate">
                {String(competitor.city_plate).padStart(2, '0')} {competitor.city_name} ·{' '}
                {competitor.district || competitor.city_name}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Rakip Panelini Kapat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-500/60 bg-slate-800/90 text-slate-100 transition-all duration-200 hover:border-rose-400/70 hover:bg-rose-500/20 active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="panel-scroll flex-1 min-h-0 space-y-2.5 overflow-y-auto overscroll-contain p-3">
        {/* Owner & Holding Identity Card */}
        <div
          className={`rounded-xl border p-2.5 space-y-1.5 ${
            isRealPlayer
              ? 'border-cyan-500/40 bg-cyan-950/20'
              : 'border-slate-700/80 bg-slate-900/80'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <User className="h-3.5 w-3.5 text-cyan-400" />
              <span>{isRealPlayer ? 'Oyuncu Adı' : 'Kurumsal Sahip'}</span>
            </span>
            <strong
              data-testid="competitor-owner-name"
              className="truncate font-bold text-white"
            >
              {playerName}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Şirket / Holding</span>
            </span>
            <strong
              data-testid="competitor-holding-name"
              className="truncate font-bold text-amber-300"
            >
              {holdingName}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-700/70 pt-1.5 text-xs">
            <span className="text-slate-400">Sektör</span>
            <span className="font-bold text-slate-100">
              {bp?.name ?? competitor.business_type} · 75m Koruma
            </span>
          </div>
        </div>

        {/* Revenue & Valuation Strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-2.5">
            <div className="text-[11px] text-slate-400">Saatlik Ciro</div>
            <div className="mt-0.5 font-mono-num text-sm font-black text-emerald-400">
              {formatTL(competitor.hourly_income)}/sa
            </div>
          </div>
          <div className="rounded-xl border border-slate-600/60 bg-slate-900/85 p-2.5">
            <div className="text-[11px] text-slate-400">Tahmini Piyasa Değeri</div>
            <div
              data-testid="competitor-valuation"
              className="mt-0.5 font-mono-num text-sm font-black text-white"
            >
              {formatTL(competitor.valuation)}
            </div>
          </div>
        </div>

        {/* Takeover Offer Card */}
        <div className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-amber-300">
              Satın Alma Teklifi (%{Math.round(offer.multiplier * 100)} Değer)
            </span>
            <span className="font-mono-num text-sm font-black text-amber-300">
              {formatTL(offer.price)}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {offer.distressLabel}. Teklifi onayladığınızda bu şube anında portföyünüze devredilir
            ve ortak haritada mülkiyet güncellenir.
          </p>

          {!hasQuota && (
            <p className="text-[11px] font-semibold text-rose-400">
              Şube kotanız dolu ({ownBranchCount}/{maxBranches}). Devralmak için şirket seviyenizi
              yükseltin.
            </p>
          )}

          <button
            type="button"
            data-testid="competitor-takeover-btn"
            disabled={!canTakeover}
            onClick={() => onTakeover(competitor, offer.multiplier)}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-amber-300/85 bg-amber-400 px-3 text-xs font-black text-slate-950 shadow-sm transition-all duration-200 hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
          >
            <Handshake className="h-4 w-4 shrink-0" />
            <span>
              {canTakeover
                ? `Satın Alma Teklifi Gönder · ${formatTL(offer.price, true)}`
                : !hasQuota
                ? 'Şube Kotası Dolu'
                : `Yetersiz Bakiye (${formatTL(offer.price, true)})`}
            </span>
          </button>
        </div>

        {/* Direct Competitive Blitz + Strategy Directory Actions */}
        <div className="space-y-2">
          <button
            type="button"
            data-testid="competitor-blitz-btn"
            disabled={!canBlitz}
            onClick={() => onLaunchBlitz(competitor)}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-rose-400/70 bg-rose-500/20 px-3 text-xs font-bold text-rose-100 transition-all duration-200 hover:bg-rose-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            <Flame className="h-4 w-4 shrink-0" />
            <span>
              {blitzActive
                ? 'Rekabet Hamlesi Aktif (+%25 Ciro)'
                : !hasBranchInCity
                ? `Rekabet İçin ${competitor.city_name}'de Şube Gerekir`
                : `Rekabet Hamlesi Başlat (+%25) · ${formatTL(blitzCost, true)}`}
            </span>
          </button>

          {onOpenRivalsModal && (
            <button
              type="button"
              data-testid="competitor-open-rivals-btn"
              onClick={onOpenRivalsModal}
              className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-500/60 bg-slate-800/90 px-3 text-xs font-bold text-slate-100 transition-all duration-200 hover:border-amber-400/70 hover:bg-slate-700 active:scale-[0.98]"
            >
              <Swords className="h-3.5 w-3.5 text-amber-300" />
              <span>Yönetim &gt; Rakip İşletmeler Listesi</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
